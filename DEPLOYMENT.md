# Production Deployment Guide for Render

This guide covers deploying the SEMI application to Render platform.

## Prerequisites

1. **Render Account**: Create an account at [render.com](https://render.com)
2. **PostgreSQL Database**: Set up a PostgreSQL database on Render
3. **SendGrid Account**: Obtain a SendGrid API key for email functionality

## Environment Variables

Configure these environment variables in your Render service:

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string from Render database
- `SENDGRID_API_KEY`: Your SendGrid API key for email functionality
- `NODE_ENV`: Set to `production`
- `SESSION_SECRET`: A secure random string (generate with `openssl rand -base64 32`)

### Optional Variables
- `PORT`: Set by Render automatically (defaults to 5000 if not set)
- `FRONTEND_URL`: Your deployed application URL (e.g., `https://your-app.onrender.com`)

## Render Configuration

### 1. Create Web Service
1. Connect your GitHub repository to Render
2. Select "Web Service" 
3. Configure the following:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
   - **Node Version**: 20 or later

### 2. Environment Setup
Add the environment variables listed above in the Render dashboard under "Environment".

### 3. Database Setup
1. Create a PostgreSQL database in Render
2. Copy the `DATABASE_URL` from the database info page
3. Add it to your web service environment variables

## Build Process

The application uses the following build process:

1. **Frontend Build**: Vite compiles React app to `dist/public/`
2. **Backend Build**: ESBuild compiles TypeScript server to `dist/`
3. **Static Serving**: Express serves the built frontend and handles API routes

## Features in Production

✅ **Static File Serving**: Built frontend served with caching headers  
✅ **Document Downloads**: Upload files served with proper content types  
✅ **PostgreSQL Sessions**: Persistent sessions with automatic cleanup  
✅ **Security Headers**: HTTPS enforcement, secure cookies, CSRF protection  
✅ **Email Service**: SendGrid integration for notifications and invitations  
✅ **Error Handling**: Production-ready error responses and logging  

## Post-Deployment Setup

1. **Database Migration**: Run `npm run db:push` to create database tables
2. **Admin Account**: Register first user through the application UI
3. **System Configuration**: Configure activity settings and form templates through admin panel

## Monitoring

- Check Render logs for application startup and error messages
- Monitor database connection status in PostgreSQL dashboard
- Verify email delivery through SendGrid dashboard

## Support

For deployment issues:
1. Check Render build and runtime logs
2. Verify all environment variables are set correctly
3. Ensure PostgreSQL database is accessible
4. Test SendGrid API key functionality

## Local Production Testing

To test production build locally:

```bash
# Build the application
npm run build

# Start in production mode
NODE_ENV=production npm run start
```

Ensure you have a local `.env` file with required environment variables for testing.