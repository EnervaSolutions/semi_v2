# SEMI Program Production Deployment Guide

## Production Environment Setup

### 1. Environment Variables Required

```bash
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database
SENDGRID_API_KEY=your_sendgrid_api_key_here
FRONTEND_URL=https://your-domain.com
SESSION_SECRET=your_super_secure_session_secret_here
PORT=5000
```

### 2. Render.com Deployment

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Use these settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
   - **Plan**: Starter (or higher)

4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your Neon/PostgreSQL connection string
   - `SENDGRID_API_KEY`: Your SendGrid API key
   - `FRONTEND_URL`: Your Render app URL (e.g., `https://your-app.onrender.com`)
   - `SESSION_SECRET`: Generate a secure random string

### 3. Database Setup (Neon/PostgreSQL)

1. Create a Neon database or PostgreSQL instance
2. Run migrations: `npm run db:push`
3. Ensure `DATABASE_URL` is correctly set

### 4. File Upload Configuration

The application creates an `uploads/` directory automatically in production.
Files are stored with hash-based names for security.

### 5. Production Features

- ✅ Production-ready file downloads
- ✅ ZIP export functionality  
- ✅ Email system with dynamic URLs
- ✅ Session-based authentication
- ✅ Role-based access controls
- ✅ Document management
- ✅ Contractor team management
- ✅ Admin oversight tools

### 6. Verification Steps

After deployment, verify:

1. **Authentication**: Login works correctly
2. **File Uploads**: Documents can be uploaded to applications
3. **File Downloads**: Documents can be downloaded 
4. **Email System**: Password resets and invitations work
5. **Database**: All CRUD operations function properly
6. **Admin Tools**: System admin can manage users/companies

### 7. Troubleshooting

- **File Downloads Fail**: Check uploads directory exists and has proper permissions
- **Email Links Wrong**: Verify `FRONTEND_URL` environment variable
- **Database Errors**: Confirm `DATABASE_URL` is correct and accessible
- **Session Issues**: Ensure `SESSION_SECRET` is set and consistent

### 8. Performance Notes

- File upload limit: 50MB per file
- Maximum 10 files per upload
- Session timeout: 24 hours
- Database connection pooling enabled