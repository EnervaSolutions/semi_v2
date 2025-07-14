import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Production vs Development setup
  const isProduction = process.env.NODE_ENV === "production";
  
  if (!isProduction) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Production-ready port configuration for Render deployment
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  const host = isProduction ? "0.0.0.0" : "127.0.0.1";
  
  server.listen({
    port,
    host
  }, () => {
    log(`SEMI application serving on ${isProduction ? 'production' : 'development'} at ${host}:${port}`);
    if (isProduction) {
      console.log('✅ Production mode: Static files served, PostgreSQL sessions enabled');
    } else {
      console.log('🛠️  Development mode: Vite HMR enabled');
    }
  });
})();
