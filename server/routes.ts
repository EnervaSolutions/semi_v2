import { type Express, type Request, Response } from "express";
import { storage as dbStorage } from "./storage";
import { requireAuth, setupAuth } from "./auth";
import { createServer } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { v4 as uuidv4 } from 'uuid';
import { canInviteUsers, canEditPermissions, canCreateEdit, hasPermissionLevel } from './permissions';

// Configure multer for file uploads with proper file path handling
const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export function registerRoutes(app: Express) {
  setupAuth(app);
  const server = createServer(app);

  // ============================================================================
  // CRITICAL: DIRECT FILE SERVING FOR UPLOADS TO BYPASS VITE MIDDLEWARE
  // ============================================================================
  // Serve uploaded files directly through API endpoint to bypass Vite interference
  app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    console.log(`[UPLOADS] Direct file request: ${filename}, path: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`[UPLOADS] File not found: ${filePath}`);
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Get file stats for content-type detection
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }
    
    console.log(`[UPLOADS] Serving ${filename} as ${contentType}`);
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  });

  // ============================================================================
  // CRITICAL: API ROUTE PROTECTION FROM VITE MIDDLEWARE INTERFERENCE
  // ============================================================================
  // Add early API route handler to prevent Vite middleware from intercepting
  app.use('/api/*', (req, res, next) => {
    // Ensure API routes are processed by Express, not Vite
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // ========================================
  // CRITICAL AUTHENTICATION ENDPOINT: USER LOGIN
  // DO NOT REMOVE - REQUIRED FOR ALL USER AUTHENTICATION
  // NOTE: Duplicate login endpoint in auth.ts has been removed to prevent conflicts
  // ========================================
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password, twoFactorCode } = req.body;
      
      console.log(`[LOGIN] Login attempt - Email: ${email}, Has Password: ${!!password}, Password Length: ${password?.length || 0}`);
      console.log(`[LOGIN] Raw password received: "${password}"`);
      
      if (!email || !password) {
        console.log(`[LOGIN] Missing credentials - Email: ${!!email}, Password: ${!!password}`);
        return res.status(400).json({ message: "Email and password are required" });
      }

      console.log(`[LOGIN] Attempting login for email: ${email}`);
      const user = await dbStorage.getUserByEmail(email);
      if (!user) {
        console.log(`[LOGIN] User not found: ${email}`);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      console.log(`[LOGIN] User found: ${user.id}, role: ${user.role}, isActive: ${user.isActive}, passwordLength: ${user.password?.length || 0}`);
      console.log(`[LOGIN] Stored hash starts with: ${user.password?.substring(0, 15) || 'NULL'}...`);
      
      // Check if user account is active
      if (user.isActive === false) {
        console.log(`[LOGIN] Login rejected - user account is deactivated: ${email}`);
        return res.status(403).json({ message: "Your account has been deactivated. Please contact support." });
      }
      
      const isValidPassword = await dbStorage.verifyPassword(password, user.password || '');
      if (!isValidPassword) {
        console.log(`[LOGIN] Password validation failed for: ${email}`);
        console.log(`[LOGIN] Supplied: "${password}" vs Stored hash: ${user.password?.substring(0, 20) || 'NULL'}...`);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.twoFactorEnabled && !twoFactorCode) {
        return res.status(200).json({ requiresTwoFactor: true });
      }

      if (user.twoFactorEnabled && twoFactorCode) {
        console.log(`[LOGIN] Verifying 2FA code for user: ${user.id}`);
        const isValidTwoFactor = await dbStorage.verifyTwoFactorCode(user.id, twoFactorCode);
        if (!isValidTwoFactor) {
          console.log(`[LOGIN] 2FA verification failed for user: ${user.id}`);
          return res.status(401).json({ message: "Invalid two-factor code" });
        }
        console.log(`[LOGIN] 2FA verification successful for user: ${user.id}`);
      }

      // Set session
      console.log(`[LOGIN] Setting session for user: ${user.id}`);
      (req as any).session.userId = user.id;
      
      // Check if user has a temporary password
      const isTemporaryPassword = user.isTemporaryPassword || false;
      
      res.json({ 
        user: { ...user, password: undefined },
        isTemporaryPassword
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get('/api/auth/user', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      // Always include permissionLevel, default to 'viewer' if missing
      res.json({ ...user, permissionLevel: user.permissionLevel || 'viewer', password: undefined });
    } catch (error) {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  app.post('/api/auth/logout', (req: any, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // ============================================================================
  // FORGOT PASSWORD SYSTEM
  // ============================================================================
  // Email-based temporary password reset functionality

  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      console.log(`[FORGOT PASSWORD] Reset request for email: ${email}`);

      // Generate temporary password and send email
      const result = await dbStorage.createPasswordResetToken(email);
      
      if (!result) {
        // Don't reveal if user exists - return success anyway for security
        return res.json({ message: "If an account with that email exists, a temporary password has been sent" });
      }

      // Generate 8-character temporary password (user-friendly)
      const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Set temporary password in database
      await dbStorage.setTemporaryPassword(email, tempPassword);

      // Send email via SendGrid with proper login URL
      const { sendEmail } = await import('./sendgrid');
      
      // Get the correct base URL for login links
      let baseUrl = process.env.FRONTEND_URL;
      if (!baseUrl) {
        if (process.env.REPLIT_DEV_DOMAIN) {
          baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
        } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
          baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.app`;
        } else {
          baseUrl = 'http://localhost:5000';
        }
      }
      
      const loginUrl = `${baseUrl}/auth`;
      console.log(`[FORGOT PASSWORD] Using login URL: ${loginUrl}`);
      
      const emailSent = await sendEmail({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'harsanjit.bhullar@enerva.ca',
        subject: 'SEMI Program - Temporary Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0; font-size: 28px;">SEMI Program</h1>
                <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 16px;">Strategic Energy Management Initiative</p>
              </div>
              
              <h2 style="color: #333; margin-bottom: 20px;">Temporary Password Request</h2>
              <p style="color: #555; line-height: 1.6; margin-bottom: 15px;">
                You requested a password reset for your SEMI Program account.
              </p>
              
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Your Temporary Password</h3>
                <p style="margin: 5px 0; color: #92400e; font-size: 20px; font-family: monospace;">
                  <strong>${tempPassword}</strong>
                </p>
              </div>
              
              <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                Use this temporary password to log in and you'll be prompted to set a new password.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                  Log In to SEMI Program
                </a>
              </div>
              
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  <strong>Important:</strong> This temporary password will be replaced once you set a new one. If you didn't request this password reset, please contact support.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  SEMI Program - Strategic Energy Management Initiative<br>
                  If you have any questions, please contact support.
                </p>
              </div>
            </div>
          </div>
        `,
      });

      if (!emailSent) {
        console.error('[FORGOT PASSWORD] Failed to send email');
        return res.status(500).json({ message: "Failed to send reset email" });
      }

      console.log(`[FORGOT PASSWORD] Temporary password sent successfully to ${email}`);
      res.json({ message: "If an account with that email exists, a temporary password has been sent" });
    } catch (error) {
      console.error('[FORGOT PASSWORD] Error:', error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post('/api/auth/change-password', requireAuth, async (req: any, res: Response) => {
    try {
      const { newPassword } = req.body;
      const userId = req.user.id;
      
      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }

      // Validate password strength (same as registration)
      if (newPassword.length < 8 || newPassword.length > 64) {
        return res.status(400).json({ message: "Password must be between 8 and 64 characters" });
      }

      const hasUppercase = /[A-Z]/.test(newPassword);
      const hasLowercase = /[a-z]/.test(newPassword);
      const hasDigit = /\d/.test(newPassword);
      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(newPassword);

      if (!hasUppercase || !hasLowercase || !hasDigit || !hasSymbol) {
        return res.status(400).json({ 
          message: "Password must contain at least one uppercase letter, lowercase letter, digit, and special character" 
        });
      }

      console.log(`[CHANGE PASSWORD] User ${userId} changing password`);

      // Update password and clear temporary flag
      await dbStorage.changePassword(userId, newPassword);

      console.log(`[CHANGE PASSWORD] Password changed successfully for user ${userId}`);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error('[CHANGE PASSWORD] Error:', error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // ============================================================================
  // PROFILE AND COMPANY UPDATE ENDPOINTS - CRITICAL FOR USER SETTINGS
  // ============================================================================
  
  // PATCH /api/auth/profile - Update user profile information  
  app.patch('/api/auth/profile', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const { firstName, lastName } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
      }

      await dbStorage.updateUserProfile(user.id, { firstName, lastName });
      res.json({ message: "Profile updated successfully" });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // PATCH /api/companies/current - Update current user's company information
  app.patch('/api/companies/current', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      
      if (!user.companyId) {
        return res.status(400).json({ message: "User must be associated with a company" });
      }

      // Only company admins can update company information
      if (user.role !== 'company_admin' && user.role !== 'contractor_individual') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { name, address, phone, website } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Company name is required" });
      }

      await dbStorage.updateCompanyInfo(user.companyId, { name, address, phone, website });
      res.json({ message: "Company information updated successfully" });
    } catch (error: any) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company information" });
    }
  });

  // ============================================================================ 
  // COMPANY STATUS MANAGEMENT ENDPOINTS - CRITICAL FOR ADMIN OPERATIONS
  // ============================================================================
  
  // PATCH /api/admin/companies/:id/toggle-status - Toggle company active status
  app.patch('/api/admin/companies/:id/toggle-status', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const companyId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      console.log(`[ADMIN] Toggling company ${companyId} status to: ${isActive}`);
      
      await dbStorage.updateCompanyStatus(companyId, isActive);
      res.json({ message: "Company status updated successfully" });
    } catch (error: any) {
      console.error("Error updating company status:", error);
      res.status(500).json({ message: error.message || "Failed to update company status" });
    }
  });

  // ============================================================================ 
  // USER MANAGEMENT ENDPOINTS - CRITICAL FOR TEAM OPERATIONS
  // ============================================================================
  
  // PATCH /api/users/:userId/deactivate - Deactivate user account
  app.patch('/api/users/:userId/deactivate', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const { userId } = req.params;
      
      // Permission check: company_admin or system_admin or manager level
      if (user.role !== 'company_admin' && 
          user.role !== 'system_admin' && 
          !(user.role === 'team_member' && ['manager', 'owner'].includes(user.permissionLevel))) {
        return res.status(403).json({ message: "Insufficient permissions to deactivate users" });
      }
      
      // Prevent deactivating yourself
      if (user.id === userId) {
        return res.status(400).json({ message: "You cannot deactivate yourself" });
      }
      
      console.log(`[USER DEACTIVATION] Deactivating user ${userId} by ${user.id}`);
      
      await dbStorage.deactivateUser(userId);
      res.json({ message: "User deactivated successfully" });
    } catch (error: any) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ message: error.message || "Failed to deactivate user" });
    }
  });

  // ============================================================================ 
  // COMPANY INFORMATION PROPAGATION FIX - CRITICAL FOR USER-ADMIN SYNC
  // ============================================================================
  
  // Add missing endpoint for company information updates to propagate to user views
  app.patch('/api/companies/current/refresh', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (!user?.companyId) {
        return res.status(400).json({ message: "User must be associated with a company" });
      }
      
      console.log(`[COMPANY REFRESH] Refreshing company data for user ${user.id}, company ${user.companyId}`);
      
      // Get updated company information
      const company = await dbStorage.getCompanyById(user.companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Return refreshed company data
      res.json({ 
        company,
        message: "Company information refreshed successfully" 
      });
    } catch (error: any) {
      console.error("Error refreshing company information:", error);
      res.status(500).json({ message: error.message || "Failed to refresh company information" });
    }
  });

  // ============================================================================ 
  // TEAM MEMBER PERMISSION MANAGEMENT ENDPOINTS - CRITICAL FIX
  // ============================================================================
  
  // PATCH /api/team/:userId/permission-level - Update team member permission level
  app.patch('/api/team/:userId/permission-level', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const { userId } = req.params;
      const { permissionLevel } = req.body;
      
      console.log(`[TEAM PERMISSION] Update request from ${user.id} for user ${userId} to ${permissionLevel}`);
      
      // Permission check: company_admin or system_admin or manager level
      if (user.role !== 'company_admin' && 
          user.role !== 'system_admin' && 
          !(user.role === 'team_member' && ['manager', 'owner'].includes(user.permissionLevel))) {
        return res.status(403).json({ message: "Insufficient permissions to update user permissions" });
      }
      
      // Validate permission level
      const validPermissions = ['viewer', 'editor', 'manager', 'owner'];
      if (!validPermissions.includes(permissionLevel)) {
        return res.status(400).json({ message: "Invalid permission level" });
      }
      
      // Prevent changing own permissions (except system admin)
      if (user.id === userId && user.role !== 'system_admin') {
        return res.status(400).json({ message: "You cannot change your own permissions" });
      }
      
      // Update user permissions
      await dbStorage.updateUserPermissions(userId, permissionLevel);
      
      console.log(`[TEAM PERMISSION] Successfully updated user ${userId} permission to ${permissionLevel}`);
      
      // Ensure JSON response with proper headers
      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        success: true,
        message: "Permission level updated successfully",
        userId,
        permissionLevel 
      });
    } catch (error: any) {
      console.error("Error updating team member permission level:", error);
      res.status(500).json({ message: error.message || "Failed to update permission level" });
    }
  });

  // ============================================================================
  // TEAM ADMIN TRANSFER ENDPOINT - CRITICAL FOR MANAGEMENT FUNCTIONALITY
  // ============================================================================
  
  // PATCH /api/team/transfer-admin - Transfer admin/manager role to another team member
  app.patch('/api/team/transfer-admin', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const { newAdminId } = req.body;
      
      console.log(`[TEAM TRANSFER] Admin transfer request from ${user.id} to ${newAdminId}`);
      
      // Permission check: only company_admin and system_admin can transfer admin role
      if (user.role !== 'company_admin' && user.role !== 'system_admin') {
        return res.status(403).json({ message: "Only company admins can transfer manager role" });
      }
      
      // Validate required fields
      if (!newAdminId) {
        return res.status(400).json({ message: "New admin user ID is required" });
      }
      
      // Get target user to verify they exist and are in the same company
      const targetUser = await dbStorage.getUser(newAdminId);
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }
      
      if (targetUser.companyId !== user.companyId) {
        return res.status(403).json({ message: "Can only transfer admin role to team members in your company" });
      }
      
      // Cannot transfer to yourself
      if (user.id === newAdminId) {
        return res.status(400).json({ message: "Cannot transfer admin role to yourself" });
      }
      
      // Update roles: new admin becomes company_admin, current admin becomes team_member with manager permission
      await dbStorage.updateUserRole(newAdminId, 'company_admin');
      await dbStorage.updateUserRole(user.id, 'team_member');
      await dbStorage.updateUserPermissions(user.id, 'manager');
      
      console.log(`[TEAM TRANSFER] Successfully transferred admin role from ${user.id} to ${newAdminId}`);
      
      // Ensure JSON response with proper headers
      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        success: true,
        message: "Manager role transferred successfully",
        newAdminId,
        previousAdminId: user.id
      });
    } catch (error: any) {
      console.error("Error transferring admin role:", error);
      res.status(500).json({ message: error.message || "Failed to transfer manager role" });
    }
  });

  // ============================================================================
  // CRITICAL ADMIN ENDPOINTS - DO NOT MODIFY WITHOUT CAREFUL CONSIDERATION
  // ============================================================================
  
  // Admin users endpoint with company data enrichment
  // IMPORTANT: Uses getAdminUsers() method to include company names and contractor status
  // DO NOT change to getAllUsers() as it will cause "Data Issue" display problems
  app.get('/api/admin/users', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      // CRITICAL: Must use getAdminUsers() to get enriched data with company information
      const users = await dbStorage.getAdminUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/companies', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const companies = await dbStorage.getAllCompaniesForAdmin();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get('/api/admin/companies/:id/details', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const companyId = parseInt(req.params.id);
      const companyDetails = await dbStorage.getCompanyWithDetails(companyId);
      if (!companyDetails) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(companyDetails);
    } catch (error) {
      console.error("Error fetching company details:", error);
      res.status(500).json({ message: "Failed to fetch company details" });
    }
  });

  // CRITICAL ADMIN COMPANY CREATION ENDPOINT
  // DO NOT REMOVE - Required for Add Company functionality in admin interface
  app.post('/api/admin/companies', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const result = await dbStorage.createAdminCompany(req.body);
      res.json(result);
    } catch (error) {
      console.error("Error creating company:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create company" });
      }
    }
  });

  // ============================================================================
  // CRITICAL ADMIN COMPANY MANAGEMENT ENDPOINTS - DO NOT REMOVE
  // ============================================================================
  // These endpoints handle company editing, short name updates, and deletion
  // CRITICAL: Required for admin interface company management functionality
  // PROTECTIVE COMMENTS: Added to prevent accidental deletion during development
  
  // PATCH /api/admin/companies/:id - Update company information
  app.patch('/api/admin/companies/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const companyId = parseInt(req.params.id);
      const updates = req.body;
      
      console.log(`[ADMIN] Updating company ${companyId} with:`, updates);
      
      const updatedCompany = await dbStorage.updateAdminCompany(companyId, updates);
      res.json(updatedCompany);
    } catch (error: any) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: error.message || "Failed to update company" });
    }
  });

  // PATCH /api/admin/companies/:id/shortname - Update company short name and application IDs
  app.patch('/api/admin/companies/:id/shortname', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const companyId = parseInt(req.params.id);
      const { shortName } = req.body;
      
      if (!shortName || typeof shortName !== 'string') {
        return res.status(400).json({ message: "Short name is required" });
      }
      
      console.log(`[ADMIN] Updating company ${companyId} short name to: ${shortName}`);
      
      const result = await dbStorage.updateCompanyShortName(companyId, shortName.trim().toUpperCase());
      res.json(result);
    } catch (error: any) {
      console.error("Error updating company short name:", error);
      res.status(500).json({ message: error.message || "Failed to update company short name" });
    }
  });

  // DELETE /api/admin/companies/:id - Delete company (admin only)
  app.delete('/api/admin/companies/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const companyId = parseInt(req.params.id);
      
      console.log(`[ADMIN] Deleting company ${companyId} by admin ${user.email}`);
      
      await dbStorage.deleteAdminCompany(companyId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: error.message || "Failed to delete company" });
    }
  });

  // CRITICAL ADMIN USER CREATION ENDPOINT
  // DO NOT REMOVE - Required for Add User functionality in admin interface
  app.post('/api/admin/users', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const result = await dbStorage.createAdminUser(req.body);
      res.json(result);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  // ============================================================================
  // CRITICAL ADMIN USER MANAGEMENT ENDPOINTS
  // ============================================================================
  // DO NOT REMOVE - Required for admin user management functionality

  // Update user endpoint
  app.patch('/api/admin/users/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const userId = req.params.id;
      const result = await dbStorage.updateUser(userId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  // Delete user endpoint
  app.delete('/api/admin/users/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const userId = req.params.id;
      await dbStorage.deleteAdminUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to delete user" });
      }
    }
  });

  // Bulk delete users endpoint
  app.post('/api/admin/users/bulk-delete', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { userIds } = req.body;
      for (const userId of userIds) {
        await dbStorage.deleteAdminUser(userId);
      }
      res.json({ message: `${userIds.length} users deleted successfully` });
    } catch (error) {
      console.error("Error bulk deleting users:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to delete users" });
      }
    }
  });

  // ========================================
  // CRITICAL ADMIN ENDPOINT: USER PASSWORD RESET
  // DO NOT REMOVE - SYSTEM ADMIN FUNCTIONALITY
  // ========================================
  app.post('/api/admin/users/:id/reset-password', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const userId = req.params.id;
      const { password } = req.body;
      
      console.log(`[ADMIN RESET] Resetting password for user: ${userId} with raw password: "${password}"`);
      
      // Pass raw password to storage method - it will handle the hashing
      await dbStorage.resetUserPassword(userId, password);
      
      console.log(`[ADMIN RESET] Password reset completed for user: ${userId}`);
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to reset password" });
      }
    }
  });

  // ============================================================================
  // CRITICAL ADMIN APPLICATION MANAGEMENT ENDPOINTS
  // ============================================================================
  // DO NOT REMOVE - Required for admin application management functionality

  // ========================================
  // CRITICAL ADMIN ENDPOINT: APPLICATION DELETION
  // DO NOT REMOVE - SYSTEM ADMIN FUNCTIONALITY
  // ========================================
  app.delete('/api/admin/applications/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const applicationId = parseInt(req.params.id);
      await dbStorage.deleteApplication(applicationId);
      res.json({ message: "Application deleted successfully" });
    } catch (error) {
      console.error("Error deleting application:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to delete application" });
      }
    }
  });

  // Update company endpoint
  app.patch('/api/admin/companies/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const companyId = parseInt(req.params.id);
      const result = await dbStorage.updateCompany(companyId, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error updating company:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to update company" });
      }
    }
  });

  // ============================================================================
  // CRITICAL ADMIN COMPANY DELETION ENDPOINTS
  // ============================================================================
  // DO NOT REMOVE - Required for admin company management functionality

  // Delete company endpoint
  app.delete('/api/admin/companies/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const companyId = parseInt(req.params.id);
      await dbStorage.deleteAdminCompany(companyId);
      res.json({ message: "Company deleted successfully" });
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: error.message || "Failed to delete company" });
    }
  });

  // Bulk delete companies endpoint
  app.post('/api/admin/companies/bulk-delete', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { companyIds } = req.body;
      for (const companyId of companyIds) {
        await dbStorage.deleteAdminCompany(companyId);
      }
      res.json({ message: `${companyIds.length} companies deleted successfully` });
    } catch (error) {
      console.error("Error bulk deleting companies:", error);
      res.status(500).json({ message: error.message || "Failed to delete companies" });
    }
  });

  // ============================================================================
  // CRITICAL GHOST APPLICATION ID ENDPOINTS
  // ============================================================================
  // DO NOT REMOVE - Required for ghost ID management functionality

  // ========================================
  // CRITICAL ADMIN ENDPOINT: GHOST APPLICATION IDS
  // DO NOT REMOVE - PREVENTS DELETED APPLICATION ID REUSE
  // ========================================
  app.get('/api/admin/ghost-application-ids', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const ghostIds = await dbStorage.getAllGhostApplicationIds();
      console.log(`[GHOST API] Returning ${ghostIds.length} ghost IDs to frontend`);
      res.json(ghostIds);
    } catch (error) {
      console.error("Error fetching ghost IDs:", error);
      res.status(500).json({ message: "Failed to fetch ghost IDs" });
    }
  });

  // ========================================
  // CRITICAL ADMIN ENDPOINT: CLEAR SINGLE GHOST APPLICATION ID
  // DO NOT REMOVE - ALLOWS ADMIN TO CLEAR INDIVIDUAL GHOST IDS
  // ========================================
  app.delete('/api/admin/clear-ghost-application-id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { applicationId } = req.body;
      if (!applicationId) {
        return res.status(400).json({ message: "Application ID is required" });
      }
      
      await dbStorage.clearGhostApplicationId(applicationId);
      console.log(`[GHOST API] Successfully cleared ghost ID: ${applicationId}`);
      res.json({ 
        message: `Ghost ID ${applicationId} cleared successfully`
      });
    } catch (error) {
      console.error("Error clearing ghost ID:", error);
      res.status(500).json({ message: "Failed to clear ghost ID" });
    }
  });

  // ========================================
  // CRITICAL ADMIN ENDPOINT: BULK CLEAR GHOST APPLICATION IDS
  // DO NOT REMOVE - ALLOWS ADMIN TO CLEAR MULTIPLE GHOST IDS
  // ========================================
  app.delete('/api/admin/bulk-clear-ghost-application-ids', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { applicationIds } = req.body;
      if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
        return res.status(400).json({ message: "Application IDs array is required" });
      }
      
      const clearedCount = await dbStorage.clearGhostApplicationIds(applicationIds);
      console.log(`[GHOST API] Successfully cleared ${clearedCount} ghost IDs:`, applicationIds);
      res.json({ 
        message: `${clearedCount} ghost IDs cleared successfully`,
        clearedCount 
      });
    } catch (error) {
      console.error("Error clearing ghost IDs:", error);
      res.status(500).json({ message: "Failed to clear ghost IDs" });
    }
  });

  app.get('/api/admin/applications', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      // Fetch all applications
      const applications = await dbStorage.getAllApplications();
      // For each application, fetch its activity submissions and determine status
      const enhancedApplications = await Promise.all(applications.map(async (app: any) => {
        // Fetch all activity submissions for this application
        const activitySubmissions = await dbStorage.getActivityTemplateSubmissions(app.id);
        // Sort by submittedAt or createdAt to find the latest
        const sorted = activitySubmissions
          .filter(sub => sub.status === 'submitted' || sub.status === 'approved' || sub.status === 'completed')
          .sort((a, b) => {
            const aDate = a.submittedAt ? new Date(a.submittedAt) : new Date(a.createdAt);
            const bDate = b.submittedAt ? new Date(b.submittedAt) : new Date(b.createdAt);
            return bDate.getTime() - aDate.getTime();
          });
        let detailedStatus = 'Draft';
        if (sorted.length > 0) {
          // Use the status of the last submitted/completed/approved activity
          const last = sorted[0];
          if (last.status === 'approved') {
            detailedStatus = `Approved: ${last.activityType || last.activityTemplateId || ''}`;
          } else if (last.status === 'completed') {
            detailedStatus = `Completed: ${last.activityType || last.activityTemplateId || ''}`;
          } else if (last.status === 'submitted') {
            detailedStatus = `Submitted: ${last.activityType || last.activityTemplateId || ''}`;
          } else {
            detailedStatus = last.status;
          }
        } else if (activitySubmissions.length > 0) {
          // If there are drafts, show the latest draft
          const lastDraft = activitySubmissions.sort((a, b) => {
            const aDate = a.updatedAt ? new Date(a.updatedAt) : new Date(a.createdAt);
            const bDate = b.updatedAt ? new Date(b.updatedAt) : new Date(b.createdAt);
            return bDate.getTime() - aDate.getTime();
          })[0];
          detailedStatus = lastDraft.status === 'draft' ? 'Draft' : lastDraft.status;
        }
        // Only enable the next activity after explicit approval (not here)
        return {
          ...app,
          detailedStatus,
        };
      }));
      res.json(enhancedApplications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // ========================================
  // CRITICAL ADMIN ENDPOINT: APPLICATION CREATION
  // DO NOT REMOVE - SYSTEM ADMIN FUNCTIONALITY
  // ========================================
  app.post('/api/admin/applications', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      console.log('[ADMIN APP CREATE] Creating application on behalf of user with data:', req.body);
      
      const { companyId, facilityId, activityType, title, description } = req.body;
      
      // Validate required fields
      if (!companyId || !facilityId || !activityType) {
        return res.status(400).json({ message: "Missing required fields: companyId, facilityId, activityType" });
      }
      
      // Create application using the admin storage method
      const application = await dbStorage.createAdminApplication({
        companyId: parseInt(companyId),
        facilityId: parseInt(facilityId),
        activityType,
        title: title || `${activityType} Application`,
        description: description || null,
        createdBy: user.id
      });
      
      console.log('[ADMIN APP CREATE] Application created successfully:', application.applicationId);
      res.json(application);
    } catch (error) {
      console.error("Error creating admin application:", error);
      res.status(500).json({ message: error.message || "Failed to create application" });
    }
  });

  app.get('/api/admin/pending-submissions', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const submissions = await dbStorage.getPendingSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending submissions" });
    }
  });

  // System Announcements API Routes
  app.get('/api/admin/announcements', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const announcements = await dbStorage.getAllSystemAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.get('/api/announcements/active', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const announcements = await dbStorage.getActiveSystemAnnouncements(user.role);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching active announcements:", error);
      res.status(500).json({ message: "Failed to fetch active announcements" });
    }
  });

  app.post('/api/admin/announcements', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const announcementData = {
        ...req.body,
        createdBy: user.id
      };

      const announcement = await dbStorage.createSystemAnnouncement(announcementData);
      res.json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.patch('/api/admin/announcements/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const announcement = await dbStorage.updateSystemAnnouncement(parseInt(id), req.body);
      res.json(announcement);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  app.delete('/api/admin/announcements/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      await dbStorage.deleteSystemAnnouncement(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  app.post('/api/announcements/:id/acknowledge', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const { id } = req.params;
      
      const acknowledgment = await dbStorage.acknowledgeAnnouncement(parseInt(id), user.id);
      res.json(acknowledgment);
    } catch (error) {
      console.error("Error acknowledging announcement:", error);
      res.status(500).json({ message: "Failed to acknowledge announcement" });
    }
  });

  app.get('/api/admin/announcements/:id/stats', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const stats = await dbStorage.getAnnouncementStats(parseInt(id));
      res.json(stats);
    } catch (error) {
      console.error("Error fetching announcement stats:", error);
      res.status(500).json({ message: "Failed to fetch announcement stats" });
    }
  });

  // ============================================================================
  // CRITICAL FACILITY MANAGEMENT ENDPOINTS - DO NOT REMOVE
  // ============================================================================
  // These endpoints are essential for facility CRUD operations
  // User facility endpoints for company owners and team members
  
  // GET all facilities for company
  app.get('/api/facilities', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (!user?.companyId) {
        return res.status(400).json({ message: "User must be associated with a company" });
      }
      const facilities = await dbStorage.getFacilitiesByCompany(user.companyId);
      res.json(facilities);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // GET individual facility - CRITICAL FOR FACILITY EDITING
  // DO NOT REMOVE - Required for user facility editing form initialization
  app.get('/api/facilities/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const facilityId = parseInt(req.params.id);
      
      // Fetch facility from database
      const facility = await dbStorage.getFacilityById(facilityId);
      if (!facility) {
        return res.status(404).json({ message: "Facility not found" });
      }
      
      // Verify facility belongs to user's company
      if (facility.companyId !== user.companyId) {
        return res.status(403).json({ message: "Access denied - facility not owned by your company" });
      }
      
      console.log('[FACILITY API] Returning facility data:', {
        id: facility.id,
        hasEMIS: facility.hasEMIS,
        emisRealtimeMonitoring: facility.emisRealtimeMonitoring,
        emisDescription: facility.emisDescription,
        hasEnergyManager: facility.hasEnergyManager,
        energyManagerFullTime: facility.energyManagerFullTime,
      });
      
      res.json(facility);
    } catch (error) {
      console.error("Error fetching facility:", error);
      res.status(500).json({ message: "Failed to fetch facility" });
    }
  });

  // PATCH update facility - CRITICAL FOR FACILITY EDITING
  // DO NOT REMOVE - Required for user facility update functionality
  app.patch('/api/facilities/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const facilityId = parseInt(req.params.id);
      
      // Verify facility belongs to user's company
      const existingFacility = await dbStorage.getFacilityById(facilityId);
      if (!existingFacility || existingFacility.companyId !== user.companyId) {
        return res.status(403).json({ message: "Access denied - facility not found or not owned by your company" });
      }

      console.log('Updating facility with data:', req.body);
      
      // Prepare facility data with update timestamp
      const facilityData = {
        ...req.body,
        updatedAt: new Date()
      };
      
      const facility = await dbStorage.updateFacility(facilityId, facilityData);
      console.log('Facility updated successfully:', facility);
      
      // Ensure JSON response
      res.setHeader('Content-Type', 'application/json');
      res.json(facility);
    } catch (error) {
      console.error("Error updating facility:", error);
      res.status(500).json({ message: error.message || "Failed to update facility" });
    }
  });

  // ============================================================================
  // CRITICAL ENDPOINT DOCUMENTATION AND PROTECTION
  // ============================================================================
  // The following endpoints are ESSENTIAL and should NEVER be removed:
  //
  // FACILITY ENDPOINTS:
  // - GET    /api/facilities                    - User facility list
  // - POST   /api/facilities                    - User facility creation  
  // - PATCH  /api/facilities/:id               - User facility update (CRITICAL)
  // - GET    /api/admin/facilities             - Admin facility list
  // - PATCH  /api/admin/facilities/:id         - Admin facility update (CRITICAL)
  // - POST   /api/admin/companies/:id/facilities - Admin facility creation
  //
  // APPLICATION ENDPOINTS:
  // - GET    /api/applications                  - User application list
  // - POST   /api/applications                  - Company user application creation
  // - GET    /api/applications/:id             - Application details
  // - PATCH  /api/applications/:id             - Application updates
  // - DELETE /api/applications/:id             - Application deletion
  //
  // ADMIN ENDPOINTS:
  // - All /api/admin/* endpoints are critical for system administration
  // - User management, company management, approval workflows
  //
  // AUTHENTICATION ENDPOINTS:
  // - POST   /api/auth/login                   - User login (CRITICAL)
  // - GET    /api/auth/user                    - Session validation
  // - POST   /api/auth/logout                  - User logout
  //
  // Before removing ANY endpoint, verify it's not used in the frontend
  // Search for the endpoint path in all .tsx files to check usage
  // ============================================================================

  // ============================================================================
  // CRITICAL APPLICATION CREATION ENDPOINT FOR COMPANY USERS
  // ============================================================================
  // DO NOT REMOVE - Required for company user application creation
  app.post('/api/applications', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (!user?.companyId) {
        return res.status(400).json({ message: "User must be associated with a company" });
      }

      // Check if user has permission to create applications (editors, managers, owners, company_admin)
      const hasCreatePermission = user.permissionLevel && ['editor', 'manager', 'owner'].includes(user.permissionLevel) ||
                                   user.role === 'company_admin';
      
      if (!hasCreatePermission) {
        return res.status(403).json({ message: "Insufficient permissions. Only editors, managers, and owners can create applications." });
      }

      console.log('[COMPANY APP CREATE] Creating application for company user with data:', req.body);
      
      const { facilityId, activityType } = req.body;
      
      // Validate required fields
      if (!facilityId || !activityType) {
        return res.status(400).json({ message: "Missing required fields: facilityId, activityType" });
      }
      
      // Verify facility belongs to user's company
      const facility = await dbStorage.getFacilityById(parseInt(facilityId));
      if (!facility || facility.companyId !== user.companyId) {
        return res.status(403).json({ message: "Access denied - facility not found or not owned by your company" });
      }
      
      // Create application for the user's company
      const application = await dbStorage.createAdminApplication({
        companyId: user.companyId,
        facilityId: parseInt(facilityId),
        activityType,
        title: `${activityType} Application`,
        description: null,
        createdBy: user.id
      });
      
      console.log('[COMPANY APP CREATE] Application created successfully:', application.applicationId);
      res.json(application);
    } catch (error) {
      console.error("Error creating company application:", error);
      res.status(500).json({ message: error.message || "Failed to create application" });
    }
  });

  // ============================================================================
  // APPLICATION ID PREDICTION ENDPOINT FOR COMPANY USERS
  // ============================================================================
  // DO NOT REMOVE - Required for application creation dialog
  app.get('/api/predict-application-id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (!user?.companyId) {
        return res.status(400).json({ message: "User must be associated with a company" });
      }

      const { facilityId, activityType } = req.query;
      
      if (!facilityId || !activityType) {
        return res.status(400).json({ message: "Missing required parameters: facilityId, activityType" });
      }

      // Verify facility belongs to user's company
      const facility = await dbStorage.getFacilityById(parseInt(facilityId as string));
      if (!facility || facility.companyId !== user.companyId) {
        return res.status(403).json({ message: "Access denied - facility not found or not owned by your company" });
      }

      // Get company for short name
      const company = await dbStorage.getCompanyById(user.companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Generate the predicted application ID
      const predictedId = await dbStorage.generateApplicationId(
        company.shortName,
        facility.code,
        activityType as string
      );
      
      res.setHeader('Content-Type', 'text/plain');
      res.send(predictedId);
    } catch (error) {
      console.error("Error predicting application ID:", error);
      res.status(500).json({ message: error.message || "Failed to predict application ID" });
    }
  });

  // ============================================================================
  // CRITICAL FACILITY CREATION ENDPOINT  
  // ============================================================================
  // DO NOT REMOVE - Required for user facility creation functionality
  // This endpoint allows company users to create new facilities
  app.post('/api/facilities', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (!user?.companyId) {
        return res.status(400).json({ message: "User must be associated with a company" });
      }

      // Generate facility code if not provided
      let code = req.body.code;
      if (!code) {
        const facilities = await dbStorage.getFacilitiesByCompany(user.companyId);
        const nextNum = (facilities?.length || 0) + 1;
        code = String(nextNum).padStart(3, '0'); // '001', '002', ...
      }
      // Truncate code to 3 chars (for VARCHAR(3))
      code = code.slice(0, 3);
      // Prepare facility data with company association
      const facilityData = {
        ...req.body,
        code,
        companyId: user.companyId,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      console.log('[FACILITY CREATE DEBUG] facilityData:', facilityData);
      const facility = await dbStorage.createFacility(facilityData);
      console.log('Facility created successfully:', facility);
      res.json(facility);
    } catch (error) {
      console.error("Error creating facility:", error);
      res.status(500).json({ message: error.message || "Failed to create facility" });
    }
  });

  // Additional company management routes
  app.get('/api/companies/:id/facilities', requireAuth, async (req: any, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const facilities = await dbStorage.getFacilitiesByCompany(companyId);
      res.json(facilities);
    } catch (error) {
      console.error("Error fetching company facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  app.get('/api/companies/:id/applications', requireAuth, async (req: any, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const applications = await dbStorage.getApplicationsByCompany(companyId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching company applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // ============================================================================
  // CRITICAL ADMIN FACILITY ENDPOINTS - DO NOT REMOVE
  // ============================================================================
  // These endpoints are essential for system admin facility management
  
  // GET all facilities for system admin
  app.get('/api/admin/facilities', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const facilities = await dbStorage.getAllFacilities();
      res.json(facilities);
    } catch (error) {
      console.error("Error fetching all facilities:", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // GET facilities for specific company (admin access) - CRITICAL FOR FACILITY ACTIVITIES PAGE
  // DO NOT REMOVE - Required for admin facility activity management
  app.get('/api/admin/facilities/:companyId', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const companyId = parseInt(req.params.companyId);
      const facilities = await dbStorage.getFacilitiesByCompany(companyId);
      res.json(facilities);
    } catch (error) {
      console.error("Error fetching company facilities (admin):", error);
      res.status(500).json({ message: "Failed to fetch facilities" });
    }
  });

  // DELETE facility endpoint - CRITICAL FOR ADMIN FACILITY MANAGEMENT
  // DO NOT REMOVE - Required for system admin facility deletion with archiving
  app.delete('/api/admin/facilities/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const facilityId = parseInt(req.params.id);
      await dbStorage.deleteFacility(facilityId);
      res.json({ message: "Facility archived successfully" });
    } catch (error) {
      console.error("Error archiving facility:", error);
      res.status(500).json({ message: error.message || "Failed to archive facility" });
    }
  });

  // PATCH update facility by admin - CRITICAL FOR ADMIN FACILITY EDITING
  // DO NOT REMOVE - Required for system admin facility update functionality
  app.patch('/api/admin/facilities/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const facilityId = parseInt(req.params.id);
      console.log('Admin updating facility with data:', req.body);
      
      // Prepare facility data with update timestamp
      const facilityData = {
        ...req.body,
        updatedAt: new Date()
      };
      
      const facility = await dbStorage.updateFacility(facilityId, facilityData);
      console.log('Admin facility updated successfully:', facility);
      
      // Ensure JSON response
      res.setHeader('Content-Type', 'application/json');
      res.json(facility);
    } catch (error) {
      console.error("Error updating facility (admin):", error);
      res.status(500).json({ message: error.message || "Failed to update facility" });
    }
  });

  // POST create facility for specific company (admin only)
  // DO NOT REMOVE - Required for admin facility creation functionality
  app.post('/api/admin/companies/:companyId/facilities', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const companyId = parseInt(req.params.companyId);
      // Generate facility code if not provided
      let code = req.body.code;
      if (!code) {
        const facilities = await dbStorage.getFacilitiesByCompany(companyId);
        const nextNum = (facilities?.length || 0) + 1;
        code = String(nextNum).padStart(3, '0'); // '001', '002', ...
      }
      // Truncate code to 3 chars (for VARCHAR(3))
      code = code.slice(0, 3);
      // Prepare facility data with company association
      const facilityData = {
        ...req.body,
        code,
        companyId: companyId,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      console.log('[FACILITY CREATE DEBUG] facilityData:', facilityData);
      const facility = await dbStorage.createFacility(facilityData);
      console.log('Admin facility created successfully:', facility);
      res.json(facility);
    } catch (error) {
      console.error("Error creating facility (admin):", error);
      res.status(500).json({ message: error.message || "Failed to create facility" });
    }
  });

  // Facility activity endpoints
  app.get('/api/facilities/:id/activities', requireAuth, async (req: any, res: Response) => {
    try {
      const facilityId = parseInt(req.params.id);
      const activitySettings = await dbStorage.getFacilityActivitySettings(facilityId);
      
      // Check if FRA has been explicitly disabled
      const fraExplicitSetting = activitySettings.find((setting: any) => setting.activityType === 'FRA');
      const fraExplicitlyDisabled = fraExplicitSetting && !fraExplicitSetting.isEnabled;
      
      const enabledActivities = activitySettings
        .filter((setting: any) => setting.isEnabled)
        .map((setting: any) => setting.activityType);
      
      // FRA is enabled by default unless explicitly disabled by admin
      if (!fraExplicitlyDisabled && !enabledActivities.includes('FRA')) {
        enabledActivities.push('FRA');
      }
      
      res.json({ enabledActivities });
    } catch (error) {
      console.error("Error fetching facility activities:", error);
      res.json({ enabledActivities: ['FRA'] }); // Fallback to FRA
    }
  });

  // ============================================================================
  // CRITICAL ADMIN FACILITY ACTIVITY ENDPOINTS - DO NOT REMOVE
  // ============================================================================
  // These endpoints are essential for admin facility activity management
  
  // GET facility activity settings for admin (facility activities page)
  // DO NOT REMOVE - Required for admin facility activity management page
  app.get('/api/admin/facility-activities/:facilityId', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const facilityId = parseInt(req.params.facilityId);
      console.log('Admin fetching facility activity settings for facility:', facilityId);
      
      const activitySettings = await dbStorage.getFacilityActivitySettings(facilityId);
      console.log('Found facility activity settings:', activitySettings);
      
      res.json(activitySettings);
    } catch (error) {
      console.error("Error fetching facility activity settings (admin):", error);
      res.status(500).json({ message: "Failed to fetch facility activity settings" });
    }
  });

  // PATCH update facility activity setting (admin)
  // DO NOT REMOVE - Required for admin facility activity toggle functionality
  app.patch('/api/admin/facility-activities/:facilityId/:activityType', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const facilityId = parseInt(req.params.facilityId);
      const activityType = req.params.activityType;
      const { isEnabled } = req.body;
      
      console.log('Admin updating facility activity:', { facilityId, activityType, isEnabled });
      
      const updatedSetting = await dbStorage.updateFacilityActivitySetting(facilityId, activityType, isEnabled);
      console.log('Facility activity setting updated:', updatedSetting);
      
      res.json(updatedSetting);
    } catch (error) {
      console.error("Error updating facility activity setting (admin):", error);
      res.status(500).json({ message: "Failed to update facility activity setting" });
    }
  });

  // APPLICATION MANAGEMENT ENDPOINTS
  // ================================
  // These endpoints handle individual application operations and details
  // DO NOT REMOVE - Critical for application viewing and management functionality
  
  // GET all applications for company
  app.get('/api/applications', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (!user?.companyId) {
        return res.status(400).json({ message: "User must be associated with a company" });
      }
      
      // Check if user is a contractor - if so, use contractor applications endpoint
      if (user.role && user.role.includes('contractor')) {
        console.log(`[CONTRACTOR APPLICATIONS] Contractor ${user.email} accessing applications for company ${user.companyId}`);
        
        // Check contractor permission level
        if (user.role === 'contractor_individual' || user.role === 'contractor_account_owner' || user.role === 'contractor_manager') {
          // Account owners and managers can see all company applications
          console.log(`[CONTRACTOR APPLICATIONS] Account owner/manager ${user.email} - showing all company applications`);
          const applications = await dbStorage.getContractorApplications(user.companyId);
          res.json(applications);
        } else if (user.role === 'contractor_team_member') {
          // Regular team members can only see applications specifically assigned to them
          console.log(`[CONTRACTOR APPLICATIONS] Team member ${user.email} - showing only assigned applications`);
          const applications = await dbStorage.getContractorUserAssignedApplications(user.id);
          res.json(applications);
        } else {
          // Fallback for unknown contractor roles
          console.log(`[CONTRACTOR APPLICATIONS] Unknown contractor role ${user.role} for ${user.email} - showing all company applications`);
          const applications = await dbStorage.getContractorApplications(user.companyId);
          res.json(applications);
        }
      } else {
        // Regular company owner/admin - show owned applications
        console.log(`[COMPANY APPLICATIONS] Company user ${user.email} accessing applications for company ${user.companyId}`);
        const applications = await dbStorage.getApplicationsByCompany(user.companyId);
        res.json(applications);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // ============================================================================
  // CRITICAL APPLICATION CREATION ENDPOINT
  // ============================================================================
  // DO NOT REMOVE - Required for application creation functionality
  
  // POST create new application - CRITICAL for application creation
  app.post('/api/applications', requireAuth, async (req: any, res: Response) => {
    try {
      console.log("[APPLICATION CREATION] Starting application creation process");
      console.log("[APPLICATION CREATION] Request body:", JSON.stringify(req.body, null, 2));
      
      const user = req.user;
      console.log("[APPLICATION CREATION] User info:", {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      });
      
      if (!user?.companyId) {
        console.log("[APPLICATION CREATION] ERROR: User not associated with company");
        return res.status(400).json({ message: "User must be associated with a company" });
      }

      const { facilityId, activityType, title } = req.body;
      
      if (!facilityId || !activityType) {
        console.log("[APPLICATION CREATION] ERROR: Missing required fields", { facilityId, activityType });
        return res.status(400).json({ message: "Facility ID and activity type are required" });
      }

      console.log("[APPLICATION CREATION] Validating facility access...");
      
      // Verify facility belongs to user's company
      const facility = await dbStorage.getFacilityById(facilityId);
      if (!facility) {
        console.log("[APPLICATION CREATION] ERROR: Facility not found", facilityId);
        return res.status(404).json({ message: "Facility not found" });
      }
      
      if (facility.companyId !== user.companyId) {
        console.log("[APPLICATION CREATION] ERROR: Access denied to facility", {
          facilityCompanyId: facility.companyId,
          userCompanyId: user.companyId
        });
        return res.status(403).json({ message: "Access denied to this facility" });
      }

      console.log("[APPLICATION CREATION] Facility validation passed. Creating application...");
      
      // Create application
      const applicationData = {
        facilityId: parseInt(facilityId),
        activityType,
        title: title || "",
        companyId: user.companyId,
        createdBy: user.id,
        status: "draft",
        phase: "pre_activity"
      };
      
      console.log("[APPLICATION CREATION] Application data to create:", applicationData);
      
      const application = await dbStorage.createApplication(applicationData);
      
      console.log("[APPLICATION CREATION] Application created successfully:", {
        id: application.id,
        applicationId: application.applicationId,
        status: application.status,
        phase: application.phase
      });
      
      res.status(201).json(application);
    } catch (error) {
      console.error("[APPLICATION CREATION] Error creating application:", error);
      res.status(500).json({ 
        message: error.message || "Failed to create application",
        details: error.stack 
      });
    }
  });

  // GET individual application by ID - CRITICAL for application details page
  app.get('/api/applications/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await dbStorage.getApplicationById(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Check if user has access to this application
      const user = req.user;
      let hasAccess = false;
      
      // System admin always has access
      if (user.role === 'system_admin') {
        hasAccess = true;
      }
      // Company owner/team members have access to their own applications
      else if (application.companyId === user.companyId) {
        hasAccess = true;
      }
      // Contractors have access to applications assigned to their company
      else if (user.role === 'contractor_individual' || user.role === 'contractor_account_owner' || user.role === 'contractor_manager' || user.role === 'contractor_team_member') {
        // Check if this application is assigned to the contractor's company
        const contractorApplications = await dbStorage.getContractorApplications(user.companyId);
        hasAccess = contractorApplications.some(app => app.id === applicationId);
      }
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Calculate detailed status for this application using the same logic as applications list
      const applicationsWithStatus = await dbStorage.getApplicationsByCompany(application.companyId);
      const appWithDetailedStatus = applicationsWithStatus.find(app => app.id === applicationId);
      
      // Merge the detailed status into the application object
      const enhancedApplication = {
        ...application,
        detailedStatus: appWithDetailedStatus?.detailedStatus || 'Draft'
      };
      
      res.json(enhancedApplication);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  // GET application submissions - CRITICAL for application workflow
  app.get('/api/applications/:id/submissions', requireAuth, async (req: any, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const submissions = await dbStorage.getApplicationSubmissions(applicationId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching application submissions:", error);
      res.status(500).json({ message: "Failed to fetch application submissions" });
    }
  });

  // GET assigned contractors for application - CRITICAL for contractor workflow
  app.get('/api/applications/:id/assigned-contractors', requireAuth, async (req: any, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const contractors = await dbStorage.getApplicationAssignedContractors(applicationId);
      res.json(contractors);
    } catch (error) {
      console.error("Error fetching assigned contractors:", error);
      res.status(500).json({ message: "Failed to fetch assigned contractors" });
    }
  });

  // ===============================
  // CRITICAL ENDPOINT: Contractor Search for Assignment
  // DO NOT REMOVE - Required for contractor assignment dialog
  // ===============================
  app.get('/api/contractors/search', requireAuth, async (req: any, res: Response) => {
    try {
      const { activityType, region } = req.query;
      
      console.log('Contractor search request:', { activityType, region, user: req.user?.email });
      
      // Get all contractors from the database
      const contractors = await dbStorage.getAllContractors();
      
      // Filter contractors based on activity type and region
      let filteredContractors = contractors.filter(contractor => {
        // Filter by activity type if specified
        if (activityType && activityType !== 'FRA' && activityType !== 'SEM') {
          const supportedActivities = contractor.supportedActivities || [];
          if (!supportedActivities.includes(activityType as string)) {
            return false;
          }
        }
        
        // Filter by region if specified
        if (region && region !== 'all') {
          const serviceRegions = contractor.serviceRegions || [];
          if (!serviceRegions.includes(region as string)) {
            return false;
          }
        }
        
        return true;
      });
      
      console.log(`Found ${filteredContractors.length} contractors matching criteria`);
      res.json(filteredContractors);
    } catch (error) {
      console.error("Error searching contractors:", error);
      res.status(500).json({ message: "Failed to search contractors" });
    }
  });

  // ===============================
  // CONTRACTOR DASHBOARD ENDPOINTS
  // Required for contractor dashboard functionality
  // ===============================
  
  // Get contractor company information
  app.get('/api/contractor/company', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get user's company info
      const user = await dbStorage.getUserById(userId);
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Contractor company not found" });
      }

      const company = await dbStorage.getCompanyById(user.companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Return company info with contractor-specific fields
      res.json({
        id: company.id,
        name: company.name,
        shortName: company.shortName,
        serviceRegions: company.serviceRegions || [],
        supportedActivities: company.supportedActivities || [],
        capitalRetrofitTechnologies: company.capitalRetrofitTechnologies || [],
        isActive: company.isActive ?? true,
        phone: company.phone,
        website: company.website,
        streetAddress: company.streetAddress,
        city: company.city,
        province: company.province,
        country: company.country,
        postalCode: company.postalCode
      });
    } catch (error) {
      console.error("Error fetching contractor company:", error);
      res.status(500).json({ message: "Failed to fetch contractor company information" });
    }
  });

  // Get contractor team members
  app.get('/api/contractor/team', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await dbStorage.getUserById(userId);
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Contractor company not found" });
      }

      console.log('[CONTRACTOR TEAM] User details:', { role: user.role, permissionLevel: user.permissionLevel, companyId: user.companyId });

      // Check if user is contractor account owner or manager (including contractor team members with manager permissions)
      const hasTeamManagementAccess = user.role === 'contractor_individual' || 
                                       user.role === 'contractor_account_owner' || 
                                       user.role === 'contractor_manager' ||
                                       (user.role === 'team_member' && user.permissionLevel === 'manager') ||
                                       (user.role === 'contractor_team_member' && user.permissionLevel === 'manager');
      
      console.log('[CONTRACTOR TEAM] Team management access check:', { hasTeamManagementAccess, 
        isContractorIndividual: user.role === 'contractor_individual',
        isContractorAccountOwner: user.role === 'contractor_account_owner', 
        isContractorManager: user.role === 'contractor_manager',
        isTeamMemberWithManager: user.role === 'team_member' && user.permissionLevel === 'manager',
        isContractorTeamMemberWithManager: user.role === 'contractor_team_member' && user.permissionLevel === 'manager'
      });
      
      if (!hasTeamManagementAccess) {
        return res.status(403).json({ message: "Only contractor managers and account owners can view team members" });
      }

      // Get all team members for this company
      const teamMembers = await dbStorage.getTeamMembersByCompany(user.companyId);
      
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching contractor team:", error);
      res.status(500).json({ message: "Failed to fetch contractor team members" });
    }
  });

  // Alternative endpoint name for compatibility
  app.get('/api/contractor/team-members', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await dbStorage.getUserById(userId);
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Contractor company not found" });
      }

      // Check if user is contractor account owner or manager (including contractor team members with manager permissions)
      const hasTeamManagementAccess = user.role === 'contractor_individual' || 
                                       user.role === 'contractor_account_owner' || 
                                       user.role === 'contractor_manager' ||
                                       (user.role === 'team_member' && user.permissionLevel === 'manager') ||
                                       (user.role === 'contractor_team_member' && user.permissionLevel === 'manager');
      
      if (!hasTeamManagementAccess) {
        return res.status(403).json({ message: "Only contractor managers and account owners can view team members" });
      }

      // Get all team members for this company
      const teamMembers = await dbStorage.getTeamMembersByCompany(user.companyId);
      
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching contractor team:", error);
      res.status(500).json({ message: "Failed to fetch contractor team members" });
    }
  });

  // ============================================================================
  // CONTRACTOR APPLICATION ASSIGNMENT ENDPOINTS - CRITICAL FOR TEAM MANAGEMENT
  // ============================================================================
  // DO NOT REMOVE - Required for contractor team member assignment to applications

  // POST /api/contractor/applications/:id/assign - Assign team member to application
  app.post('/api/contractor/applications/:applicationId/assign', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const { applicationId } = req.params;
      const { userId, permissions } = req.body;
      
      console.log(`[CONTRACTOR ASSIGNMENT] Assigning user ${userId} to application ${applicationId} by ${user.id}`);
      
      // Check if user has contractor management permissions
      const hasAssignmentAccess = user.role === 'contractor_individual' || 
                                  user.role === 'contractor_account_owner' || 
                                  user.role === 'contractor_manager' ||
                                  (user.role === 'contractor_team_member' && user.permissionLevel === 'manager');
      
      if (!hasAssignmentAccess) {
        return res.status(403).json({ message: "Only contractor managers and account owners can assign team members" });
      }
      
      // Validate required fields
      if (!userId || !permissions) {
        return res.status(400).json({ message: "User ID and permissions are required" });
      }
      
      // Check if application exists and is accessible to this contractor
      const application = await dbStorage.getApplicationById(parseInt(applicationId));
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Check if target user is in the same company
      const targetUser = await dbStorage.getUser(userId);
      if (!targetUser || targetUser.companyId !== user.companyId) {
        return res.status(403).json({ message: "Can only assign team members from your company" });
      }
      
      // Create team assignment record
      await dbStorage.assignUserToApplication(parseInt(applicationId), userId, permissions, user.id);
      
      console.log(`[CONTRACTOR ASSIGNMENT] Successfully assigned user ${userId} to application ${applicationId}`);
      res.json({ 
        success: true, 
        message: "Team member assigned to application successfully",
        applicationId: parseInt(applicationId),
        userId,
        permissions
      });
    } catch (error: any) {
      console.error("[CONTRACTOR ASSIGNMENT] Error assigning team member to application:", error);
      res.status(500).json({ message: error.message || "Failed to assign team member to application" });
    }
  });

  // POST /api/contractor/applications/:id/unassign - Remove team member from application
  app.post('/api/contractor/applications/:applicationId/unassign', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const { applicationId } = req.params;
      const { userId } = req.body;
      
      console.log(`[CONTRACTOR UNASSIGNMENT] Removing user ${userId} from application ${applicationId} by ${user.id}`);
      
      // Check if user has contractor management permissions
      const hasAssignmentAccess = user.role === 'contractor_individual' || 
                                  user.role === 'contractor_account_owner' || 
                                  user.role === 'contractor_manager' ||
                                  (user.role === 'contractor_team_member' && user.permissionLevel === 'manager');
      
      if (!hasAssignmentAccess) {
        return res.status(403).json({ message: "Only contractor managers and account owners can remove team member assignments" });
      }
      
      // Validate required fields
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Remove team assignment record
      await dbStorage.removeUserFromApplication(parseInt(applicationId), userId);
      
      console.log(`[CONTRACTOR UNASSIGNMENT] Successfully removed user ${userId} from application ${applicationId}`);
      res.json({ 
        success: true, 
        message: "Team member removed from application successfully",
        applicationId: parseInt(applicationId),
        userId
      });
    } catch (error: any) {
      console.error("[CONTRACTOR UNASSIGNMENT] Error removing team member from application:", error);
      res.status(500).json({ message: error.message || "Failed to remove team member from application" });
    }
  });

  // Get pending team invitations
  app.get('/api/contractor/team-invitations', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await dbStorage.getUserById(userId);
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Contractor company not found" });
      }

      // Check if user is contractor account owner or manager (including contractor team members with manager permissions)
      const hasInvitationAccess = user.role === 'contractor_individual' || 
                                   user.role === 'contractor_account_owner' || 
                                   user.role === 'contractor_manager' ||
                                   (user.role === 'team_member' && user.permissionLevel === 'manager') ||
                                   (user.role === 'contractor_team_member' && user.permissionLevel === 'manager');
      
      if (!hasInvitationAccess) {
        return res.status(403).json({ message: "Only contractor managers and account owners can view team invitations" });
      }

      // Get pending invitations for this company
      const invitations = await dbStorage.getPendingTeamInvitations(user.companyId);
      
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching contractor team invitations:", error);
      res.status(500).json({ message: "Failed to fetch contractor team invitations" });
    }
  });

  // Invite contractor team member (SENDGRID EMAIL INVITATION)
  app.post('/api/contractor/invite-team-member', requireAuth, async (req: any, res: Response) => {
    try {
      console.log('[ROUTE] SendGrid email invitation route called for contractor team member');
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await dbStorage.getUserById(userId);
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Contractor company not found" });
      }

      console.log('[INVITE] User details:', { role: user.role, permissionLevel: user.permissionLevel, companyId: user.companyId });

      // Check if user is contractor account owner or manager (including contractor team members with manager permissions)
      const hasInviteAccess = user.role === 'contractor_individual' || 
                               user.role === 'contractor_account_owner' || 
                               user.role === 'contractor_manager' ||
                               (user.role === 'team_member' && user.permissionLevel === 'manager') ||
                               (user.role === 'contractor_team_member' && user.permissionLevel === 'manager');
      
      console.log('[INVITE] Invite access check:', { hasInviteAccess, 
        isContractorIndividual: user.role === 'contractor_individual',
        isContractorAccountOwner: user.role === 'contractor_account_owner', 
        isContractorManager: user.role === 'contractor_manager',
        isTeamMemberWithManager: user.role === 'team_member' && user.permissionLevel === 'manager',
        isContractorTeamMemberWithManager: user.role === 'contractor_team_member' && user.permissionLevel === 'manager'
      });
      
      if (!hasInviteAccess) {
        return res.status(403).json({ message: "Only contractor managers and account owners can invite team members" });
      }

      const { email, firstName, lastName, permissionLevel, message } = req.body;
      console.log('[ROUTE] Creating contractor team invitation for:', email);

      // Check if user already exists
      const existingUser = await dbStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Check if there's already a pending invitation for this email at this company
      const existingInvitation = await dbStorage.getTeamInvitationByEmail(email, user.companyId);
      if (existingInvitation && existingInvitation.status === 'pending') {
        return res.status(400).json({ message: "An invitation has already been sent to this email address" });
      }

      // Get contractor company details for email
      const contractorCompany = await dbStorage.getCompanyById(user.companyId);
      if (!contractorCompany) {
        return res.status(404).json({ message: "Contractor company not found" });
      }

      // Create invitation record
      console.log('[ROUTE] Creating team invitation record...');
      const invitation = await dbStorage.createTeamInvitation({
        email,
        firstName,
        lastName,
        permissionLevel,
        role: 'contractor_team_member',
        companyId: user.companyId,
        invitedByUserId: user.id,
        message
      });

      // Send SendGrid email invitation
      console.log('[ROUTE] Sending contractor team invitation email...');
      const { sendContractorTeamInvitationEmail } = await import('./sendgrid');
      const emailSuccess = await sendContractorTeamInvitationEmail({
        to: email,
        invitedBy: `${user.firstName} ${user.lastName}`,
        invitedByEmail: user.email,
        contractorCompany: contractorCompany.name,
        firstName,
        lastName,
        permissionLevel,
        invitationToken: invitation.invitationToken,
        customMessage: message
      });

      if (!emailSuccess) {
        console.error('[ROUTE] Failed to send contractor invitation email');
        // Don't fail the request if email fails - invitation is still created
      }

      console.log('[ROUTE] Successfully created contractor team invitation:', invitation.id);

      res.json({ 
        success: true, 
        invitation: {
          id: invitation.id,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          permissionLevel: invitation.permissionLevel,
          status: invitation.status,
          createdAt: invitation.createdAt
        },
        emailSent: emailSuccess
      });
    } catch (error) {
      console.error("Error inviting contractor team member:", error);
      
      // Handle specific database errors for better user feedback
      if (error.code === '23505' || error.message.includes('duplicate key')) {
        return res.status(400).json({ message: "User with this email already exists or invitation already sent" });
      }
      
      // Generic error response
      res.status(500).json({ message: error.message || "Failed to invite contractor team member" });
    }
  });

  // Update team member permissions
  app.patch('/api/contractor/update-permissions', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await dbStorage.getUserById(userId);
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Contractor company not found" });
      }

      // Check if user is contractor account owner
      if (user.role !== 'contractor_individual' && user.role !== 'contractor_account_owner') {
        return res.status(403).json({ message: "Only contractor account owners can update permissions" });
      }

      const { userId: targetUserId, permissionLevel } = req.body;

      // Update user permissions
      await dbStorage.updateUserPermissions(targetUserId, permissionLevel);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating contractor team member permissions:", error);
      res.status(500).json({ message: "Failed to update contractor team member permissions" });
    }
  });

  // Transfer ownership
  app.patch('/api/contractor/transfer-ownership', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await dbStorage.getUserById(userId);
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Contractor company not found" });
      }

      // Check if user is contractor account owner
      if (user.role !== 'contractor_individual' && user.role !== 'contractor_account_owner') {
        return res.status(403).json({ message: "Only contractor account owners can transfer ownership" });
      }

      const { newOwnerId } = req.body;

      // Transfer ownership
      await dbStorage.transferContractorOwnership(userId, newOwnerId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error transferring contractor ownership:", error);
      res.status(500).json({ message: "Failed to transfer contractor ownership" });
    }
  });

  // Remove team member from contractor company (preserves user account)
  app.delete('/api/contractor/delete-member', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await dbStorage.getUserById(userId);
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Contractor company not found" });
      }

      // Check if user is contractor account owner, manager, or team member with manager permissions
      const hasDeleteAccess = user.role === 'contractor_individual' || 
                              user.role === 'contractor_account_owner' || 
                              user.role === 'contractor_manager' ||
                              (user.role === 'contractor_team_member' && user.permissionLevel === 'manager');

      if (!hasDeleteAccess) {
        return res.status(403).json({ message: "Only contractor account owners and managers can remove team members" });
      }

      const { userId: targetUserId } = req.body;

      // Remove team member from company (preserves user account)
      await dbStorage.deleteTeamMember(targetUserId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing contractor team member from company:", error);
      res.status(500).json({ message: "Failed to remove contractor team member" });
    }
  });

  // Accept invitation
  app.post('/api/contractor/accept-invitation/:token', requireAuth, async (req: any, res: Response) => {
    try {
      const { token } = req.params;

      // Accept invitation
      await dbStorage.acceptTeamInvitation(token);

      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting contractor team invitation:", error);
      res.status(500).json({ message: "Failed to accept contractor team invitation" });
    }
  });

  // Update contractor services and regions
  app.patch('/api/contractor/services', requireAuth, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await dbStorage.getUserById(userId);
      if (!user || !user.companyId) {
        return res.status(404).json({ message: "Contractor company not found" });
      }

      // Check if user is contractor account owner or has permission to edit
      if (user.role !== 'contractor_individual') {
        return res.status(403).json({ message: "Only contractor account owners can update services" });
      }

      const { serviceRegions, supportedActivities, capitalRetrofitTechnologies } = req.body;

      // Update company services
      await dbStorage.updateCompanyServices(user.companyId, {
        serviceRegions: serviceRegions || [],
        supportedActivities: supportedActivities || [],
        capitalRetrofitTechnologies: capitalRetrofitTechnologies || []
      });

      res.json({ message: "Services updated successfully" });
    } catch (error) {
      console.error("Error updating contractor services:", error);
      res.status(500).json({ message: "Failed to update contractor services" });
    }
  });

  // ===============================
  // CRITICAL ENDPOINT: Contractor Assignment to Applications
  // DO NOT REMOVE - Required for contractor assignment dialog functionality
  // ===============================
  app.post('/api/applications/:id/assign-contractor', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const applicationId = parseInt(req.params.id);
      const { contractorCompanyIds } = req.body;
      
      console.log('Contractor assignment request:', { applicationId, contractorCompanyIds, user: user.email });
      
      // Validate input
      if (!contractorCompanyIds || !Array.isArray(contractorCompanyIds)) {
        return res.status(400).json({ message: "Invalid contractor company IDs provided" });
      }
      
      // Check if user has access to this application
      const application = await dbStorage.getApplicationById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Check user permissions
      if (user.role !== 'system_admin' && 
          (!user.companyId || application.companyId !== user.companyId)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Remove existing assignments for this application
      await dbStorage.removeApplicationContractorAssignments(applicationId);
      
      // Add new contractor assignments
      for (const contractorCompanyId of contractorCompanyIds) {
        await dbStorage.assignContractorToApplication(applicationId, contractorCompanyId, user.id);
      }
      
      console.log(`Successfully assigned ${contractorCompanyIds.length} contractors to application ${applicationId}`);
      res.json({ 
        message: "Contractors assigned successfully",
        assignedCount: contractorCompanyIds.length 
      });
    } catch (error) {
      console.error("Error assigning contractors:", error);
      res.status(500).json({ message: "Failed to assign contractors" });
    }
  });

  // GET application documents - CRITICAL for document management
  app.get('/api/applications/:id/documents', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const applicationId = parseInt(req.params.id);
      
      // Check if user has access to this application
      const application = await dbStorage.getApplicationById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Check user permissions
      if (user.role === 'system_admin' || 
          (user.companyId && application.companyId === user.companyId) ||
          user.role?.startsWith('contractor_')) {
        const documents = await dbStorage.getDocumentsByApplication(applicationId);
        console.log(`[API DEBUG] /api/applications/${applicationId}/documents returning:`, documents.length, 'documents:', documents.map(d => ({ id: d.id, originalName: d.originalName, size: d.size })));
        res.json(documents);
      } else {
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error) {
      console.error("Error fetching application documents:", error);
      res.status(500).json({ message: "Failed to fetch application documents" });
    }
  });

  // POST start application phase - CRITICAL for application workflow
  app.post('/api/applications/:id/start-phase', requireAuth, async (req: any, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { phase } = req.body;
      const user = req.user;
      
      const result = await dbStorage.startApplicationPhase(applicationId, phase, user.id);
      res.json(result);
    } catch (error) {
      console.error("Error starting application phase:", error);
      res.status(500).json({ message: "Failed to start application phase" });
    }
  });

  // ============================================================================
  // CRITICAL DOCUMENT MANAGEMENT ENDPOINTS - DO NOT REMOVE
  // ============================================================================
  // These endpoints handle file uploads and document management for applications
  // ESSENTIAL for file upload functionality in template forms
  
  // Upload documents endpoint
  app.post('/api/documents/upload', requireAuth, (req: any, res: Response, next: any) => {
    console.log('[UPLOAD] Starting upload process...');
    upload.array('files', 10)(req, res, (err: any) => {
      if (err) {
        console.log('[UPLOAD] Multer error:', err);
        return res.status(500).json({ message: 'Upload middleware error', error: err.message });
      }
      console.log('[UPLOAD] Multer processing complete');
      next();
    });
  }, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const { applicationId, documentType = 'other' } = req.body;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      console.log(`[UPLOAD] User ${user.id} uploading ${req.files.length} files for application ${applicationId}`);
      console.log(`[UPLOAD] Full req.files object:`, JSON.stringify(req.files, null, 2));
      
      // Verify user has access to this application
      if (applicationId) {
        const application = await dbStorage.getApplicationById(parseInt(applicationId));
        if (!application) {
          return res.status(404).json({ message: "Application not found" });
        }
        
        // Check user permissions
        if (user.role !== 'system_admin' && 
            (!user.companyId || application.companyId !== user.companyId) &&
            !user.role?.startsWith('contractor_')) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const uploadedDocuments = [];
      
      for (const file of req.files) {
        console.log(`[UPLOAD DEBUG] Raw file object keys:`, Object.keys(file));
        console.log(`[UPLOAD DEBUG] File object:`, {
          originalname: file.originalname,
          filename: file.filename,
          path: file.path,
          destination: file.destination,
          size: file.size,
          mimetype: file.mimetype
        });
        
        // Build file path from available properties
        let filePath = file.path;
        if (!filePath && file.destination && file.filename) {
          filePath = path.join(file.destination, file.filename);
        }
        if (!filePath && file.filename) {
          filePath = path.join('uploads', file.filename);
        }
        if (!filePath) {
          // Find the actual uploaded file in uploads directory
          const uploadDir = 'uploads/';
          const files = fs.readdirSync(uploadDir);
          const latestFile = files
            .filter(f => f.includes(file.originalname.split('.')[0]) || f.startsWith('files-'))
            .sort((a, b) => {
              const statA = fs.statSync(path.join(uploadDir, a));
              const statB = fs.statSync(path.join(uploadDir, b));
              return statB.mtime.getTime() - statA.mtime.getTime();
            })[0];
          
          if (latestFile) {
            filePath = path.join(uploadDir, latestFile);
          } else {
            filePath = path.join('uploads', file.originalname);
          }
        }
        
        console.log(`[UPLOAD DEBUG] Final file path: ${filePath}`);
        
        // Verify file exists on disk
        if (!fs.existsSync(filePath)) {
          console.log(`[UPLOAD ERROR] File does not exist at path: ${filePath}`);
          return res.status(500).json({ message: `File not found at ${filePath}` });
        }
        
        const document = await dbStorage.createDocument({
          applicationId: applicationId ? parseInt(applicationId) : null,
          documentType,
          originalName: file.originalname,
          filename: file.filename,
          filePath: filePath,
          size: file.size,
          mimeType: file.mimetype,
          uploadedBy: user.id
        });
        uploadedDocuments.push(document);
        console.log(`[UPLOAD] Document created: ${document.id} - ${file.originalname} at ${filePath}`);
      }
      
      res.json(uploadedDocuments);
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      res.status(500).json({ message: 'Error uploading documents', error: error.message });
    }
  });
  
  // Get documents by application endpoint
  app.get('/api/documents/application/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const applicationId = parseInt(req.params.id);
      
      console.log(`[DOCS] Fetching documents for application ${applicationId} by user ${user.id}`);
      
      // Check if user has access to this application
      const application = await dbStorage.getApplicationById(applicationId);
      if (!application) {
        console.log(`[DOCS] Application ${applicationId} not found`);
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Check user permissions
      if (user.role === 'system_admin' || 
          (user.companyId && application.companyId === user.companyId) ||
          user.role?.startsWith('contractor_')) {
        const documents = await dbStorage.getDocumentsByApplication(applicationId);
        console.log(`[DOCS] Found ${documents.length} documents for application ${applicationId}`);
        res.json(documents);
      } else {
        console.log(`[DOCS] Access denied for user ${user.id} to application ${applicationId}`);
        res.status(403).json({ message: "Access denied" });
      }
    } catch (error: any) {
      console.error('Error fetching application documents:', error);
      res.status(500).json({ message: 'Error fetching application documents', error: error.message });
    }
  });
  
  // Download document endpoint
  app.get('/api/documents/:id/download', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const documentId = parseInt(req.params.id);
      
      const document = await dbStorage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check user permissions for document access
      if (document.applicationId) {
        const application = await dbStorage.getApplicationById(document.applicationId);
        if (application && user.role !== 'system_admin' && 
            (!user.companyId || application.companyId !== user.companyId) &&
            !user.role?.startsWith('contractor_')) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Set appropriate headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      
      // Stream the file
      const filePath = path.resolve(document.filePath);
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        res.status(404).json({ message: "File not found on disk" });
      }
    } catch (error: any) {
      console.error('Error downloading document:', error);
      res.status(500).json({ message: 'Error downloading document', error: error.message });
    }
  });
  
  // Delete document endpoint
  app.delete('/api/documents/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const documentId = parseInt(req.params.id);
      
      const document = await dbStorage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check user permissions
      if (document.applicationId) {
        const application = await dbStorage.getApplicationById(document.applicationId);
        if (application && user.role !== 'system_admin' && 
            (!user.companyId || application.companyId !== user.companyId)) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Delete file from disk
      try {
        if (fs.existsSync(document.filePath)) {
          fs.unlinkSync(document.filePath);
        }
      } catch (fileError) {
        console.error('Error deleting file from disk:', fileError);
      }
      
      // Delete from database
      await dbStorage.deleteDocument(documentId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: 'Error deleting document', error: error.message });
    }
  });

  // DELETE application - CRITICAL for application management
  app.delete('/api/applications/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const user = req.user;
      
      // Only system admin or application owner can delete
      const application = await dbStorage.getApplicationById(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      if (user.role !== 'system_admin' && application.companyId !== user.companyId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await dbStorage.deleteApplication(applicationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting application:", error);
      res.status(500).json({ message: "Failed to delete application" });
    }
  });

  // Activity settings endpoint
  app.get('/api/activity-settings', requireAuth, async (req: any, res: Response) => {
    try {
      const activitySettings = await dbStorage.getActivitySettings();
      res.json(activitySettings);
    } catch (error) {
      console.error("Error fetching activity settings:", error);
      res.status(500).json({ message: "Failed to fetch activity settings" });
    }
  });

  // ============================================================================
  // CRITICAL DOCUMENTS ENDPOINT - DO NOT REMOVE
  // ============================================================================
  // GET documents by company - Required for Documents tab functionality
  app.get('/api/documents', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (!user.companyId) {
        return res.status(400).json({ message: "User not associated with a company" });
      }
      
      console.log(`[DOCUMENTS API] Fetching documents for company ${user.companyId}`);
      const documents = await dbStorage.getDocumentsByCompany(user.companyId);
      console.log(`[DOCUMENTS API] Found ${documents.length} documents for company ${user.companyId}`);
      
      res.json(documents);
    } catch (error) {
      console.error("Error fetching company documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // GET document templates - For document management page  
  app.get('/api/documents/templates', requireAuth, async (req: any, res: Response) => {
    try {
      console.log('[DOCUMENTS TEMPLATES] Fetching template documents');
      const templates = await dbStorage.getTemplateDocuments();
      console.log(`[DOCUMENTS TEMPLATES] Found ${templates.length} template documents`);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching document templates:", error);
      res.status(500).json({ message: "Failed to fetch document templates" });
    }
  });

  // ============================================================================
  // CRITICAL ACTIVITY SETTINGS UPDATE ENDPOINT
  // ============================================================================ 
  // DO NOT REMOVE - Required for application limits management functionality
  // This endpoint allows system admins to update activity settings including limits
  app.patch('/api/admin/activity-settings/:activityType', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { activityType } = req.params;
      const updates = { ...req.body, updatedBy: user.id };
      
      console.log('Updating activity settings for:', activityType, 'with:', updates);
      
      const updatedSetting = await dbStorage.updateActivitySetting(activityType, updates);
      
      console.log('Activity setting updated successfully:', updatedSetting);
      res.json(updatedSetting);
    } catch (error) {
      console.error("Error updating activity settings:", error);
      res.status(500).json({ message: error.message || "Failed to update activity settings" });
    }
  });

  // ============================================================================
  // CONTRACTOR ASSIGNMENT SETTINGS ENDPOINT
  // ============================================================================
  // DO NOT REMOVE - Required for contractor assignment configuration functionality
  // This endpoint allows system admins to update contractor assignment settings per activity
  app.put('/api/activity-settings/:activityType/contractor-assignment', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Access denied. System admin required." });
      }
      
      const { activityType } = req.params;
      const { allowContractorAssignment, contractorFilterType, requiredContractorActivities } = req.body;
      
      console.log('Updating contractor assignment settings for:', activityType, 'with:', req.body);
      
      // Create the update object with contractor assignment fields
      const updates = {
        allowContractorAssignment: allowContractorAssignment || false,
        contractorFilterType: contractorFilterType || 'all',
        requiredContractorActivities: requiredContractorActivities || [],
        updatedBy: user.id
      };
      
      // Use existing updateActivitySetting method
      const updatedSetting = await dbStorage.updateActivitySetting(activityType, updates);
      
      console.log('Contractor assignment settings updated successfully:', updatedSetting);
      res.json(updatedSetting);
    } catch (error) {
      console.error("Error updating contractor assignment settings:", error);
      res.status(500).json({ message: error.message || "Failed to update contractor assignment settings" });
    }
  });

  // FORM TEMPLATE MANAGEMENT ENDPOINTS
  // =================================
  // These endpoints manage the form templates used in the system admin form builder
  // DO NOT REMOVE - Critical for form builder functionality
  
  // GET all form templates for admin form builder
  app.get('/api/admin/form-templates', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const templates = await dbStorage.getAllFormTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching form templates:', error);
      res.status(500).json({ message: 'Error fetching form templates', error: error.message });
    }
  });

  // CREATE new form template
  // ===============================
  // CRITICAL ENDPOINT: Form Builder Template Creation
  // DO NOT REMOVE - Required for admin form builder to save new templates
  // ===============================
  app.post('/api/admin/form-templates', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      console.log('[FORM TEMPLATE API] Creating template with data:', req.body);
      
      const templateData = {
        ...req.body,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Ensure formFields is properly set and not null
        formFields: req.body.formFields || '[]'
      };
      
      console.log('[FORM TEMPLATE API] Prepared template data:', templateData);
      
      const template = await dbStorage.createFormTemplate(templateData);
      console.log('[FORM TEMPLATE API] Created template successfully:', template.id);
      res.json(template);
    } catch (error: any) {
      console.error('[FORM TEMPLATE API] Error creating form template:', error);
      res.status(500).json({ message: 'Error creating form template', error: error.message });
    }
  });

  // UPDATE existing form template  
  // ===============================
  // CRITICAL ENDPOINT: Form Builder Template Updates
  // DO NOT REMOVE - Required for admin form builder to save template changes
  // ===============================
  app.put('/api/admin/form-templates/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      console.log('[FORM TEMPLATE API] Updating template:', req.params.id, 'with data:', req.body);
      
      const templateId = parseInt(req.params.id);
      const updates = {
        ...req.body,
        updatedAt: new Date(),
        // Ensure formFields is properly set and not null
        formFields: req.body.formFields || '[]'
      };
      
      console.log('[FORM TEMPLATE API] Prepared update data:', updates);
      
      const template = await dbStorage.updateFormTemplate(templateId, updates);
      console.log('[FORM TEMPLATE API] Updated template successfully:', template.id);
      res.json(template);
    } catch (error: any) {
      console.error('[FORM TEMPLATE API] Error updating form template:', error);
      res.status(500).json({ message: 'Error updating form template', error: error.message });
    }
  });

  app.patch('/api/admin/form-templates/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const templateId = parseInt(req.params.id);
      console.log('[FORM TEMPLATE API] PATCH Updating template:', templateId, 'with data:', req.body);
      
      // Filter out read-only fields and frontend-only fields that cause database errors
      const { id, createdAt, updatedAt, fields, form_fields, fieldCount, ...cleanData } = req.body;
      
      const updates = {
        ...cleanData,
        // Ensure formFields is properly serialized
        formFields: typeof req.body.formFields === 'string' 
          ? req.body.formFields 
          : JSON.stringify(req.body.form_fields || req.body.fields || [])
      };
      
      console.log('[FORM TEMPLATE API] Prepared clean update data:', updates);
      
      const template = await dbStorage.updateFormTemplate(templateId, updates);
      console.log('[FORM TEMPLATE API] PATCH Updated template successfully:', template.id);
      res.json(template);
    } catch (error: any) {
      console.error('Error updating form template:', error);
      res.status(500).json({ message: 'Error updating form template', error: error.message });
    }
  });

  // DELETE form template
  app.delete('/api/admin/form-templates/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const templateId = parseInt(req.params.id);
      
      // Check if template has submissions
      const hasSubmissions = await dbStorage.checkFormTemplateHasSubmissions(templateId);
      
      if (hasSubmissions) {
        // Deactivate instead of delete to preserve data integrity
        await dbStorage.updateFormTemplate(templateId, { isActive: false });
        res.json({ success: true, preservedData: true });
      } else {
        await dbStorage.deleteFormTemplate(templateId);
        res.json({ success: true });
      }
    } catch (error: any) {
      console.error('Error deleting form template:', error);
      res.status(500).json({ message: 'Error deleting form template', error: error.message });
    }
  });

  // SUBMISSION REVIEW ENDPOINTS
  // ===========================
  // These endpoints manage the admin approval system for application submissions
  // DO NOT REMOVE - Critical for admin approval workflow
  
  // Get detailed submission for review
  app.get('/api/admin/submission-details/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const submissionId = parseInt(req.params.id);
      const submissionDetails = await dbStorage.getSubmissionDetails(submissionId);
      res.json(submissionDetails);
    } catch (error: any) {
      console.error('Error fetching submission details:', error);
      res.status(500).json({ message: 'Error fetching submission details', error: error.message });
    }
  });

  // Approve submission
  app.post('/api/admin/submissions/:id/approve', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const submissionId = parseInt(req.params.id);
      const { reviewNotes } = req.body;
      
      const submission = await dbStorage.approveSubmission(submissionId, user.id, reviewNotes);
      res.json(submission);
    } catch (error: any) {
      console.error('Error approving submission:', error);
      res.status(500).json({ message: 'Error approving submission', error: error.message });
    }
  });

  // ACTIVITY TEMPLATES ENDPOINT - CRITICAL FOR TEMPLATE SYSTEM
  // ========================================================
  // This endpoint provides the sophisticated template system for applications
  // CRITICAL: Must fetch from form_templates table (admin form builder) NOT activity_templates
  // DO NOT REMOVE - Required for progress bars and template rendering in application details
  // ========================================================
  
  app.get('/api/activity-templates/:activityType', requireAuth, async (req: any, res: Response) => {
    try {
      const { activityType } = req.params;
      console.log(`[TEMPLATE API] Fetching form builder templates for activity type: ${activityType}`);
      
      // This calls getActivityTemplates which now correctly fetches from form_templates table
      const templates = await dbStorage.getActivityTemplates(activityType);
      console.log(`[TEMPLATE API] Found ${templates.length} form builder templates for ${activityType}`);
      console.log(`[TEMPLATE API] Template names:`, templates.map(t => t.name));
      
      res.json(templates);
    } catch (error: any) {
      console.error('[TEMPLATE API] Error fetching activity templates:', error);
      res.status(500).json({ message: 'Error fetching activity templates', error: error.message });
    }
  });

  // ACTIVITY TEMPLATE SUBMISSIONS ENDPOINT - CRITICAL FOR TEMPLATE SYSTEM
  // ================================================================
  // This endpoint handles template submissions for the sophisticated template system
  // DO NOT REMOVE - Required for template progress and contractor workflow
  
  app.post('/api/activity-template-submissions', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      
      // Check if user has permission to submit templates
      // System admins can submit regardless of permission level
      // Other users need editor/manager/owner permission level or specific roles
      const hasSubmitPermission = user.role === 'system_admin' ||
                                   user.role === 'company_admin' ||
                                   user.role.includes('contractor') ||
                                   (user.permissionLevel && ['editor', 'manager', 'owner'].includes(user.permissionLevel));
      
      if (!hasSubmitPermission) {
        return res.status(403).json({ message: "Insufficient permissions. Only editors, managers, owners, and admins can submit templates." });
      }
      
      const {
        applicationId,
        activityTemplateId,
        formData,
        submissionData,
        templateSnapshot,
        status = 'draft'
      } = req.body;
      
      console.log(`[SUBMISSION] === TEMPLATE SUBMISSION DEBUG ===`);
      console.log(`[SUBMISSION] User: ${user.email} (${user.role})`);
      console.log(`[SUBMISSION] Application ID: ${applicationId}`);
      console.log(`[SUBMISSION] Activity Template ID: ${activityTemplateId}`);
      console.log(`[SUBMISSION] Status: ${status}`);
      console.log(`[SUBMISSION] Form data keys:`, formData ? Object.keys(formData) : 'none');
      console.log(`[SUBMISSION] Raw request body:`, JSON.stringify(req.body, null, 2));
      
      // Create the template submission
      const submission = await dbStorage.createActivityTemplateSubmission({
        applicationId,
        activityTemplateId,
        submissionData: submissionData || JSON.stringify(formData),
        templateSnapshot: templateSnapshot || '{}',
        submittedBy: user.id,
        status,
        submittedAt: status === 'submitted' ? new Date() : null
      });
      
      console.log(`[SUBMISSION] Created submission with ID: ${submission.id}`);
      
      // If this is a submission (not draft), update application status to enable next phase
      if (status === 'submitted') {
        console.log(`[SUBMISSION] Template submitted - recalculating application status for ${applicationId}`);
        
        try {
          // Get the application to determine current company
          const application = await dbStorage.getApplicationById(applicationId);
          if (application) {
            // Recalculate detailed status by getting updated applications list
            const applicationsWithStatus = await dbStorage.getApplicationsByCompany(application.companyId);
            const updatedApp = applicationsWithStatus.find(app => app.id === applicationId);
            
            if (updatedApp) {
              console.log(`[SUBMISSION] Recalculated status for ${applicationId}: "${updatedApp.detailedStatus}"`);
              
              // Update application with the new detailed status information
              await dbStorage.updateApplication(applicationId, {
                status: 'in_progress' // Keep basic status as in_progress for workflow
              });
              
              console.log(`[SUBMISSION] Successfully updated application ${applicationId} status`);
            }
          }
        } catch (updateError) {
          console.error(`[SUBMISSION] Error updating application status:`, updateError);
          // Don't fail the entire submission if status update fails
        }
      }
      
      res.json(submission);
    } catch (error: any) {
      console.error('[SUBMISSION] Error creating template submission:', error);
      res.status(500).json({ message: 'Error creating template submission', error: error.message });
    }
  });

  // Reject submission
  app.post('/api/admin/submissions/:id/reject', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const submissionId = parseInt(req.params.id);
      const { reviewNotes } = req.body;
      
      const submission = await dbStorage.rejectSubmission(submissionId, user.id, reviewNotes);
      res.json(submission);
    } catch (error: any) {
      console.error('Error rejecting submission:', error);
      res.status(500).json({ message: 'Error rejecting submission', error: error.message });
    }
  });

  // ============================================================================
  // COMPANY INFORMATION ENDPOINTS - CRITICAL FOR DASHBOARD AND PROFILE FUNCTIONALITY
  // ============================================================================
  // These endpoints provide company data for user dashboards and contractor profiles
  // DO NOT REMOVE - Required for contractor dashboard and company management
  
  // Get current user's company information
  app.get('/api/companies/current', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (!user?.companyId) {
        return res.status(400).json({ message: "User must be associated with a company" });
      }
      
      const company = await dbStorage.getCompanyById(user.companyId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching current company:", error);
      res.status(500).json({ message: "Error fetching company information" });
    }
  });

  // ============================================================================
  // COMPANY NAME VALIDATION ENDPOINTS - CRITICAL FOR REGISTRATION FLOW
  // ============================================================================
  // These endpoints support real-time company name validation and short name preview
  // DO NOT REMOVE - Required for company owner registration workflow
  
  // Company name existence check
  app.get('/api/companies/check-name', async (req: Request, res: Response) => {
    try {
      const { name } = req.query;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Company name is required" });
      }
      
      const existingCompany = await dbStorage.getCompanyByName(name.trim());
      res.json({ exists: !!existingCompany });
    } catch (error) {
      console.error("Error checking company name:", error);
      res.status(500).json({ message: "Error checking company name" });
    }
  });

  // Company short name preview
  app.post('/api/companies/preview-shortname', async (req: Request, res: Response) => {
    try {
      const { companyName } = req.body;
      if (!companyName || typeof companyName !== 'string') {
        return res.status(400).json({ message: "Company name is required" });
      }
      
      // Generate base short name
      const baseShortName = generateShortName(companyName.trim());
      
      // Check for uniqueness and generate final short name
      const finalShortName = await generateUniqueShortName(baseShortName, dbStorage);
      
      res.json({ shortName: finalShortName });
    } catch (error) {
      console.error("Error generating short name preview:", error);
      res.status(500).json({ message: "Error generating short name preview" });
    }
  });

  // Admin endpoint to download all documents for a specific activity type as ZIP
  app.get('/api/admin/export/documents/:activityType', requireAuth, async (req: any, res: Response) => {
    try {
      console.log('=== DOCUMENT EXPORT DEBUG START ===');
      console.log(`[EXPORT] User: ${req.user?.email} (${req.user?.role})`);
      
      // Check admin permission
      if (req.user?.role !== 'system_admin') {
        console.log('[EXPORT] Access denied - not system admin');
        return res.status(403).json({ message: "Admin access required" });
      }

      const { activityType } = req.params;
      console.log(`[EXPORT] Activity type requested: ${activityType}`);
      
      // Get all applications for this activity type
      console.log('[EXPORT] Fetching all applications...');
      const applications = await dbStorage.getAllApplications();
      console.log(`[EXPORT] Total applications found: ${applications.length}`);
      
      const filteredApplications = applications.filter((app: any) => app.activityType === activityType);
      console.log(`[EXPORT] Applications for ${activityType}: ${filteredApplications.length}`);
      console.log('[EXPORT] Filtered applications:', filteredApplications.map((app: any) => ({
        id: app.id,
        applicationId: app.applicationId,
        activityType: app.activityType,
        companyName: app.company?.name
      })));
      
      if (filteredApplications.length === 0) {
        console.log(`[EXPORT] No applications found for ${activityType}`);
        return res.status(404).json({ message: `No applications found for ${activityType}` });
      }

      // Get all documents for these applications
      console.log('[EXPORT] Fetching documents for each application...');
      let allDocuments: any[] = [];
      for (const app of filteredApplications) {
        try {
          console.log(`[EXPORT] Fetching documents for application ${app.id} (${app.applicationId})`);
          const docs = await dbStorage.getDocumentsByApplication(app.id);
          console.log(`[EXPORT] Found ${docs.length} documents for application ${app.id}`);
          
          if (docs.length > 0) {
            console.log(`[EXPORT] Documents for app ${app.id}:`, docs.map((doc: any) => ({
              id: doc.id,
              filename: doc.filename,
              originalName: doc.original_name,
              filePath: doc.file_path,
              size: doc.size
            })));
          }
          
          const enrichedDocs = docs.map((doc: any) => ({
            ...doc,
            applicationId: app.applicationId,
            companyName: app.company?.name || 'Unknown',
            companyShortName: app.company?.shortName || 'UNK',
            facilityName: app.facility?.name || 'Unknown',
            filePath: doc.filePath || doc.file_path // Handle both field names
          }));
          
          allDocuments = allDocuments.concat(enrichedDocs);
        } catch (error) {
          console.error(`[EXPORT] Error fetching documents for application ${app.id}:`, error);
        }
      }

      console.log(`[EXPORT] Total documents collected: ${allDocuments.length}`);
      console.log('[EXPORT] All documents summary:', allDocuments.map((doc: any) => ({
        id: doc.id,
        applicationId: doc.applicationId,
        filename: doc.filename,
        originalName: doc.original_name || doc.originalName,
        filePath: doc.filePath,
        exists: doc.filePath ? fs.existsSync(path.join(process.cwd(), doc.filePath)) : false
      })));

      if (allDocuments.length === 0) {
        console.log(`[EXPORT] No documents found for ${activityType} applications`);
        return res.status(404).json({ message: `No documents found for ${activityType} applications` });
      }

      console.log('[EXPORT] Starting ZIP creation...');
      // Create ZIP file
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      // Set response headers
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `SEMI_${activityType}_Documents_${timestamp}.zip`;
      console.log(`[EXPORT] ZIP filename: ${filename}`);
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Pipe archive to response
      archive.pipe(res);

      // Add files to archive
      console.log('[EXPORT] Adding files to archive...');
      let filesAdded = 0;
      for (const doc of allDocuments) {
        const filePath = path.join(process.cwd(), doc.filePath || '');
        console.log(`[EXPORT] Checking file: ${filePath}`);
        console.log(`[EXPORT] Document details:`, {
          id: doc.id,
          filename: doc.filename,
          originalName: doc.originalName || doc.original_name,
          filePath: doc.filePath,
          companyName: doc.companyName,
          companyShortName: doc.companyShortName,
          facilityName: doc.facilityName,
          applicationId: doc.applicationId
        });
        
        if (doc.filePath && fs.existsSync(filePath)) {
          // Create folder structure: Company (SHORTNAME)/Facility/Application/filename
          const companyFolder = `${doc.companyName} (${doc.companyShortName})`;
          const facilityFolder = doc.facilityName;
          const applicationFolder = doc.applicationId;
          const filename = doc.originalName || doc.original_name || doc.filename;
          
          const archivePath = `${companyFolder}/${facilityFolder}/${applicationFolder}/${filename}`;
          
          console.log(`[EXPORT] Adding file to ZIP: ${archivePath}`);
          archive.file(filePath, { name: archivePath });
          filesAdded++;
        } else {
          console.warn(`[EXPORT] File not found or path missing: ${filePath} (doc.filePath: ${doc.filePath})`);
        }
      }

      console.log(`[EXPORT] Files added to archive: ${filesAdded}/${allDocuments.length}`);
      
      // Finalize archive
      console.log('[EXPORT] Finalizing archive...');
      await archive.finalize();
      console.log('[EXPORT] Archive finalized successfully');
      console.log('=== DOCUMENT EXPORT DEBUG END ===');
      
    } catch (error: any) {
      console.error('[EXPORT] Document export error:', error);
      console.error('[EXPORT] Error stack:', error.stack);
      res.status(500).json({ message: 'Failed to export documents' });
    }
  });

  // ============================================================================
  // ARCHIVE MANAGEMENT API ENDPOINTS
  // ============================================================================
  // Provides comprehensive archive functionality to resolve foreign key constraint issues

  // Get archived entities with statistics
  app.get('/api/admin/archive/entities', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const archivedEntities = await dbStorage.getArchivedEntities();
      res.json(archivedEntities);
    } catch (error) {
      console.error("Error fetching archived entities:", error);
      res.status(500).json({ message: "Failed to fetch archived entities" });
    }
  });

  // Get detailed information for an archived entity
  app.get('/api/admin/archive/entities/:id/:type', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { id, type } = req.params;
      const entityDetails = await dbStorage.getArchivedEntityDetails(parseInt(id), type);
      
      if (!entityDetails) {
        return res.status(404).json({ message: "Archived entity not found" });
      }
      
      res.json(entityDetails);
    } catch (error) {
      console.error("Error fetching archived entity details:", error);
      res.status(500).json({ message: "Failed to fetch archived entity details" });
    }
  });

  // Get archive statistics
  app.get('/api/admin/archive/stats', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = await dbStorage.getArchiveStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching archive stats:", error);
      res.status(500).json({ message: "Failed to fetch archive statistics" });
    }
  });

  // Get foreign key constraint issues
  app.get('/api/admin/archive/constraint-issues', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const issues = await dbStorage.getConstraintIssues();
      res.json(issues);
    } catch (error) {
      console.error("Error fetching constraint issues:", error);
      res.status(500).json({ message: "Failed to fetch constraint issues" });
    }
  });

  // Bulk archive entities
  app.post('/api/admin/archive/bulk', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { entityType, entityIds, reason, includeRelated } = req.body;
      
      if (!entityType || !entityIds || !Array.isArray(entityIds) || entityIds.length === 0) {
        return res.status(400).json({ message: "Invalid archive request parameters" });
      }

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: "Archive reason is required" });
      }

      const result = await dbStorage.bulkArchiveEntities({
        entityType,
        entityIds,
        reason: reason.trim(),
        includeRelated: includeRelated || false,
        archivedBy: user.email
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error archiving entities:", error);
      res.status(500).json({ message: error.message || "Failed to archive entities" });
    }
  });

  // Restore archived entities
  app.post('/api/admin/archive/restore', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { entityIds } = req.body;
      
      if (!entityIds || !Array.isArray(entityIds) || entityIds.length === 0) {
        return res.status(400).json({ message: "Invalid restore request parameters" });
      }

      const result = await dbStorage.restoreEntities(entityIds, user.email);
      res.json(result);
    } catch (error: any) {
      console.error("Error restoring entities:", error);
      res.status(500).json({ message: error.message || "Failed to restore entities" });
    }
  });

  // Permanent delete archived entities
  app.post('/api/admin/archive/delete', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { entityIds } = req.body;
      
      if (!entityIds || !Array.isArray(entityIds) || entityIds.length === 0) {
        return res.status(400).json({ message: "Invalid delete request parameters" });
      }

      const result = await dbStorage.permanentDeleteEntities(entityIds);
      res.json(result);
    } catch (error: any) {
      console.error("Error permanently deleting entities:", error);
      res.status(500).json({ message: error.message || "Failed to permanently delete entities" });
    }
  });

  // ============================================================================
  // GHOST APPLICATION ID MANAGEMENT ENDPOINTS
  // ============================================================================
  // Provides comprehensive ghost ID management to prevent application ID reuse

  // Get all ghost application IDs
  app.get('/api/admin/ghost-application-ids', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const ghostIds = await dbStorage.getAllGhostApplicationIds();
      res.json(ghostIds);
    } catch (error: any) {
      console.error("Error fetching ghost application IDs:", error);
      res.status(500).json({ message: "Failed to fetch ghost application IDs" });
    }
  });

  // Delete specific ghost application ID (make it reusable)
  app.delete('/api/admin/ghost-application-ids/:id', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const ghostId = parseInt(req.params.id);
      if (isNaN(ghostId)) {
        return res.status(400).json({ message: "Invalid ghost ID" });
      }

      await dbStorage.deleteGhostApplicationId(ghostId);
      res.json({ message: "Ghost application ID deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting ghost application ID:", error);
      res.status(500).json({ message: "Failed to delete ghost application ID" });
    }
  });

  // Clear all ghost application IDs
  app.delete('/api/admin/ghost-application-ids', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await dbStorage.clearAllGhostApplicationIds();
      res.json({ message: "All ghost application IDs cleared successfully" });
    } catch (error: any) {
      console.error("Error clearing all ghost application IDs:", error);
      res.status(500).json({ message: "Failed to clear all ghost application IDs" });
    }
  });

  // ============================================================================
  // RECOGNITION SYSTEM API ROUTES
  // ============================================================================

  // Recognition Badge Management Routes
  app.get("/api/admin/recognition/badges", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const badges = await dbStorage.getAllBadges();
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/recognition/badges", requireAuth, upload.single('image'), async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log("Badge creation - Request body:", req.body);
      console.log("Badge creation - File:", req.file);

      const { name, description, imageUrl } = req.body;
      const imageFile = req.file?.filename;

      // Validate required fields
      if (!name || !description) {
        return res.status(400).json({ 
          message: "Name and description are required", 
          received: { name, description, imageUrl } 
        });
      }

      const badge = await dbStorage.createBadge({
        name,
        description,
        imageUrl,
        imageFile,
        createdBy: user.id,
      });

      res.json(badge);
    } catch (error) {
      console.error("Error creating badge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/recognition/badges/:id", requireAuth, upload.single('image'), async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const badgeId = parseInt(req.params.id);
      const { name, description, imageUrl } = req.body;
      const updates: any = { name, description, imageUrl };
      
      if (req.file) {
        updates.imageFile = req.file.filename;
      }

      const badge = await dbStorage.updateBadge(badgeId, updates);
      res.json(badge);
    } catch (error) {
      console.error("Error updating badge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/recognition/badges/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const badgeId = parseInt(req.params.id);
      await dbStorage.deleteBadge(badgeId);
      res.json({ message: "Badge deleted successfully" });
    } catch (error) {
      console.error("Error deleting badge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Company Badge Assignment Routes
  app.post("/api/admin/recognition/company-badges", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { companyId, badgeId, awardNote, displayOrder } = req.body;
      
      const assignment = await dbStorage.assignBadgeToCompany({
        companyId,
        badgeId,
        awardedBy: user.id,
        awardNote,
        displayOrder,
      });

      res.json(assignment);
    } catch (error) {
      console.error("Error assigning badge to company:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/recognition/company-badges/:companyId", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const companyId = parseInt(req.params.companyId);
      const badges = await dbStorage.getCompanyBadges(companyId);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching company badges:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/recognition/company-badges/:companyId/:badgeId", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const companyId = parseInt(req.params.companyId);
      const badgeId = parseInt(req.params.badgeId);
      
      await dbStorage.removeBadgeFromCompany(companyId, badgeId);
      res.json({ message: "Badge removed from company successfully" });
    } catch (error) {
      console.error("Error removing badge from company:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Recognition Content Management Routes
  app.post("/api/admin/recognition/content", requireAuth, upload.single('image'), async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log("Content creation - Request body:", req.body);
      console.log("Content creation - File:", req.file);

      const { companyId, contentType, title, content, imageUrl, imageSize, displayOrder } = req.body;
      const imageFile = req.file?.filename;

      // Validate required fields
      if (!companyId || isNaN(parseInt(companyId))) {
        return res.status(400).json({ 
          message: "Valid company ID is required", 
          received: { companyId, contentType, title, content } 
        });
      }

      const recognitionContent = await dbStorage.createRecognitionContent({
        companyId: parseInt(companyId),
        contentType: contentType || 'content',
        title: title || '',
        content: content || '',
        imageUrl: imageUrl || '',
        imageFile: imageFile || '',
        imageSize: imageSize || 'medium',
        displayOrder: displayOrder && !isNaN(parseInt(displayOrder)) ? parseInt(displayOrder) : 0,
        createdBy: user.id,
      });

      res.json(recognitionContent);
    } catch (error) {
      console.error("Error creating recognition content:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/recognition/content/:companyId", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const companyId = parseInt(req.params.companyId);
      const content = await dbStorage.getRecognitionContent(companyId);
      res.json(content);
    } catch (error) {
      console.error("Error fetching recognition content:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/recognition/content/:id", requireAuth, upload.single('image'), async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const contentId = parseInt(req.params.id);
      const { title, content, imageUrl, imageSize, displayOrder } = req.body;
      const updates: any = { title, content, imageUrl, imageSize, updatedBy: user.id };
      
      if (displayOrder) {
        updates.displayOrder = parseInt(displayOrder);
      }
      
      if (req.file) {
        updates.imageFile = req.file.filename;
      }

      const updatedContent = await dbStorage.updateRecognitionContent(contentId, updates);
      res.json(updatedContent);
    } catch (error) {
      console.error("Error updating recognition content:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/recognition/content/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const contentId = parseInt(req.params.id);
      await dbStorage.deleteRecognitionContent(contentId);
      res.json({ message: "Recognition content deleted successfully" });
    } catch (error) {
      console.error("Error deleting recognition content:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Recognition Page Settings Routes
  app.get("/api/admin/recognition/settings/:companyId", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const companyId = parseInt(req.params.companyId);
      const settings = await dbStorage.getRecognitionPageSettings(companyId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching recognition page settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/recognition/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { companyId, isEnabled, pageTitle, welcomeMessage, badgesSectionTitle, contentSectionTitle } = req.body;
      
      const settings = await dbStorage.createOrUpdateRecognitionPageSettings({
        companyId: parseInt(companyId),
        isEnabled,
        pageTitle,
        welcomeMessage,
        badgesSectionTitle,
        contentSectionTitle,
        createdBy: user.id,
        updatedBy: user.id,
      });

      res.json(settings);
    } catch (error) {
      console.error("Error creating/updating recognition page settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Participant Recognition View Route (For Company Users and System Admins)
  app.get("/api/recognition", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      
      // Allow system admins to access without company ID
      if (user?.role === 'system_admin') {
        // For system admins, return a default view or redirect to admin panel
        return res.json({
          settings: { isEnabled: true },
          badges: [],
          content: [],
          companyName: "System Administrator",
          isSystemAdmin: true
        });
      }

      if (!user || !user.companyId) {
        return res.status(403).json({ message: "Access denied - company membership required" });
      }

      // Contractors should not see recognition page
      if (user.role && (user.role.includes('contractor') || user.role === 'contractor_individual')) {
        return res.status(403).json({ message: "Recognition page not available for contractors" });
      }

      const recognitionData = await dbStorage.getCompanyRecognitionPage(user.companyId);
      
      // Check if recognition is enabled for this company
      if (!recognitionData.settings || !recognitionData.settings.isEnabled) {
        return res.status(404).json({ message: "Recognition page not available for your company" });
      }

      res.json(recognitionData);
    } catch (error) {
      console.error("Error fetching company recognition page:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Full Recognition Page Data for Admin Management
  app.get("/api/admin/recognition/page/:companyId", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user || user.role !== "system_admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const companyId = parseInt(req.params.companyId);
      const recognitionData = await dbStorage.getCompanyRecognitionPage(companyId);
      res.json(recognitionData);
    } catch (error) {
      console.error("Error fetching admin recognition page:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================================================
  // CONTRACTOR MANAGEMENT ENDPOINTS
  // ============================================================================

  // Get all contractors for admin management
  app.get('/api/admin/contractors', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const contractors = await dbStorage.getAllContractors();
      res.json(contractors);
    } catch (error) {
      console.error("Error fetching contractors:", error);
      res.status(500).json({ message: "Failed to fetch contractors" });
    }
  });

  // Toggle contractor status (active/inactive)
  app.patch('/api/admin/contractors/:id/toggle-status', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const contractorId = parseInt(req.params.id);
      if (isNaN(contractorId)) {
        return res.status(400).json({ message: "Invalid contractor ID" });
      }

      const updatedContractor = await dbStorage.toggleContractorStatus(contractorId);
      res.json(updatedContractor);
    } catch (error) {
      console.error("Error toggling contractor status:", error);
      res.status(500).json({ message: "Failed to update contractor status" });
    }
  });

  // Update contractor services and regions
  app.patch('/api/admin/contractors/:id/services', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (user.role !== 'system_admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const contractorId = parseInt(req.params.id);
      if (isNaN(contractorId)) {
        return res.status(400).json({ message: "Invalid contractor ID" });
      }

      const { supportedActivities, serviceRegions, capitalRetrofitTechnologies } = req.body;
      
      const updatedContractor = await dbStorage.updateContractorServices(contractorId, {
        supportedActivities,
        serviceRegions,
        capitalRetrofitTechnologies
      });
      
      res.json(updatedContractor);
    } catch (error) {
      console.error("Error updating contractor services:", error);
      res.status(500).json({ message: "Failed to update contractor services" });
    }
  });

  // Add after authentication endpoints, before admin endpoints:
  app.get('/api/team', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (!user?.companyId) {
        return res.status(400).json({ message: "User must be associated with a company" });
      }
      // Get all users for this company
      const teamMembers = await dbStorage.getTeamMembersByCompany(user.companyId);
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Add after GET /api/team endpoint:
  app.post('/api/team/invite', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const { email, firstName, lastName, message, permissionLevel, companyId, invitedByUserId } = req.body;

      if (!email || !firstName || !lastName || !permissionLevel) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Only company_admin or team_member with manager permission can invite
      if (
        user.role !== 'company_admin' &&
        !(user.role === 'team_member' && user.permissionLevel === 'manager')
      ) {
        return res.status(403).json({ message: "Insufficient permissions to invite team members" });
      }

      // Check if user already exists
      const existingUser = await dbStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Create invitation
      await dbStorage.createTeamInvitation({
        email,
        firstName,
        lastName,
        permissionLevel,
        role: 'team_member',
        companyId: companyId || user.companyId,
        invitedByUserId: invitedByUserId || user.id,
        message,
      });

      // After await dbStorage.createTeamInvitation({ ... }) in POST /api/team/invite:
      const invitationRecord = await dbStorage.getTeamInvitationByEmail(email, companyId || user.companyId);
      if (invitationRecord && invitationRecord.invitationToken) {
        const protocol = req.protocol;
        const host = req.get('host');
        const acceptUrl = `${protocol}://${host}/accept-invite/${invitationRecord.invitationToken}`;
        const { sendTeamInvitationEmail } = await import('./sendgrid');
        await sendTeamInvitationEmail({
          to: email,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
              <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #2563eb;">You're Invited to Join SEMI Program!</h2>
                <p>Hi <strong>${firstName}</strong>,</p>
                <p>${user.firstName || 'A manager'} has invited you to join their company in the SEMI Program Portal.</p>
                <p>Click the button below to accept your invitation and set your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${acceptUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Accept Invitation</a>
                </div>
                <p>If you did not expect this invitation, you can ignore this email.</p>
              </div>
            </div>
          `
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error inviting team member:", error);
      res.status(500).json({ message: "Failed to invite team member" });
    }
  });

  // Add after POST /api/team/invite endpoint:
  app.post('/api/team/accept-invitation/:token', async (req: any, res: Response) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      console.log('[INVITE_ACCEPT_DEBUG] Token:', token);
      if (!password || password.length < 8) {
        console.log('[INVITE_ACCEPT_DEBUG] Password too short');
        return res.status(400).json({ message: 'Password must be at least 8 characters.' });
      }
      // Find invitation
      const invitation = await dbStorage.getTeamInvitation(token);
      console.log('[INVITE_ACCEPT_DEBUG] Invitation:', invitation);
      if (!invitation || invitation.status !== 'pending') {
        console.log('[INVITE_ACCEPT_DEBUG] Invalid or expired invitation');
        return res.status(400).json({ message: 'Invalid or expired invitation.' });
      }
      // Check if user already exists
      const existingUser = await dbStorage.getUserByEmail(invitation.email);
      console.log('[INVITE_ACCEPT_DEBUG] Existing user:', existingUser);
      if (existingUser) {
        console.log('[INVITE_ACCEPT_DEBUG] User with this email already exists');
        return res.status(400).json({ message: 'User with this email already exists.' });
      }
      // Hash password before creating user
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(password);
      // Create user
      try {
        const newUser = await dbStorage.createUser({
          id: uuidv4(),
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          password: hashedPassword, // Store hashed password
          role: invitation.role || 'team_member',
          permissionLevel: invitation.permissionLevel,
          companyId: invitation.companyId,
          isActive: true,
          isEmailVerified: true,
        });
        // If contractor main user, create contractor details
        if (newUser.role === 'contractor_individual' || newUser.role === 'contractor_account_owner') {
          await dbStorage.createContractorDetails({
            userId: newUser.id,
            // Add any default or empty fields as needed
          });
        }
      } catch (createUserError) {
        console.error('[INVITE_ACCEPT_DEBUG] Error creating user:', createUserError);
        throw createUserError;
      }
      // Mark invitation as accepted
      try {
        await dbStorage.updateTeamInvitation(invitation.id, { status: 'accepted' });
      } catch (updateInviteError) {
        console.error('[INVITE_ACCEPT_DEBUG] Error updating invitation:', updateInviteError);
        throw updateInviteError;
      }
      res.json({ success: true });
    } catch (error) {
      console.error('[INVITE_ACCEPT_DEBUG] Error accepting team invitation:', error, error?.stack);
      res.status(500).json({ message: error?.message || JSON.stringify(error), code: 'INVITE_ACCEPT_DEBUG' });
    }
  });

  // Accept contractor team invitation
  app.post('/api/accept-contractor-invite/:token', async (req: Request, res: Response) => {
    try {
      console.log('[CONTRACTOR_INVITE_ACCEPT] Processing contractor invitation acceptance');
      
      const { token } = req.params;
      const { password } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Invitation token is required" });
      }

      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      // Get invitation by token
      const invitation = await dbStorage.getTeamInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      // Allow password setup for both pending and accepted invitations
      // Accepted invitations mean the user account exists but may need password setup
      if (invitation.status !== 'pending' && invitation.status !== 'accepted') {
        return res.status(400).json({ message: "This invitation is no longer valid" });
      }
      
      console.log('[CONTRACTOR_INVITE_ACCEPT] Invitation status:', invitation.status);

      // Check if invitation has expired
      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ message: "This invitation has expired" });
      }

      // Check if user already exists - if they do, this is password setup
      const existingUser = await dbStorage.getUserByEmail(invitation.email);
      if (existingUser) {
        console.log('[CONTRACTOR_INVITE_ACCEPT] User exists, updating password for:', existingUser.id);
        
        // Update existing user's password
        const { hashPassword } = await import('./auth');
        const hashedPassword = await hashPassword(password);
        
        await dbStorage.updateUserPassword(existingUser.id, hashedPassword);
        
        console.log('[CONTRACTOR_INVITE_ACCEPT] Password updated for existing user:', existingUser.id);
        
        res.json({ 
          success: true,
          message: "Password has been set successfully. You can now log in.",
          user: {
            id: existingUser.id,
            email: existingUser.email,
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            role: existingUser.role,
            permissionLevel: existingUser.permissionLevel
          }
        });
        return;
      }

      // Hash the password
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(password);

      // Create the contractor team member user
      console.log('[CONTRACTOR_INVITE_ACCEPT] Creating contractor team member user');
      const { randomUUID } = await import('crypto');
      const newUser = await dbStorage.createUser({
        id: randomUUID(),
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        password: hashedPassword,
        role: 'contractor_team_member',
        permissionLevel: invitation.permissionLevel,
        companyId: invitation.companyId,
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      });

      // Create contractor details for the new team member
      console.log('[CONTRACTOR_INVITE_ACCEPT] Creating contractor details');
      await dbStorage.createContractorDetails({
        userId: newUser.id,
        // Add any default or empty fields as needed
      });

      // Mark invitation as accepted
      await dbStorage.updateTeamInvitation(invitation.id, { status: 'accepted' });

      console.log('[CONTRACTOR_INVITE_ACCEPT] Successfully created contractor team member:', newUser.id);

      res.json({ 
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          permissionLevel: newUser.permissionLevel
        }
      });
    } catch (error) {
      console.error('[CONTRACTOR_INVITE_ACCEPT] Error accepting contractor invitation:', error);
      res.status(500).json({ message: error.message || "Failed to accept contractor invitation" });
    }
  });

  // Remove team member from company (preserves user account)
  app.delete('/api/team/member/:userId', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      const { userId: targetUserId } = req.params;

      if (!user?.companyId) {
        return res.status(400).json({ message: "User must be associated with a company" });
      }

      // Get target user to verify they're in the same company
      const targetUser = await dbStorage.getUser(targetUserId);
      if (!targetUser || targetUser.companyId !== user.companyId) {
        return res.status(404).json({ message: "Team member not found or not in your company" });
      }

      // Permission logic:
      // - company_admin and system_admin can remove anyone
      // - owner permission level can remove anyone except other owners
      // - manager permission level can remove editors and viewers (not managers or owners)
      // - editor/viewer permission levels cannot remove anyone
      let canRemove = false;
      
      if (user.role === 'company_admin' || user.role === 'system_admin') {
        canRemove = true;
      } else if (user.permissionLevel === 'owner') {
        // Owners can remove anyone except other owners (unless they're also company_admin)
        if (targetUser.permissionLevel !== 'owner' || user.role === 'company_admin') {
          canRemove = true;
        }
      } else if (user.permissionLevel === 'manager') {
        // Managers can only remove editors and viewers
        if (['editor', 'viewer'].includes(targetUser.permissionLevel)) {
          canRemove = true;
        }
      }

      if (!canRemove) {
        return res.status(403).json({ 
          message: "Insufficient permissions. Managers can only remove editors/viewers. Only owners/admins can remove managers/owners." 
        });
      }

      // Prevent removing yourself
      if (user.id === targetUserId) {
        return res.status(400).json({ message: "You cannot remove yourself from the team" });
      }

      // Remove team member from company (preserves user account)
      await dbStorage.deleteTeamMember(targetUserId);

      res.json({ success: true, message: "Team member removed from company successfully" });
    } catch (error: any) {
      console.error("Error removing team member from company:", error);
      res.status(500).json({ message: error?.message || "Failed to remove team member from company" });
    }
  });



  // Dashboard stats endpoint for company users
  app.get('/api/dashboard/stats', requireAuth, async (req: any, res: Response) => {
    try {
      const user = req.user;
      if (!user?.companyId) {
        return res.status(400).json({ message: "User must be associated with a company" });
      }
      // Get all applications for this company
      const applications = await dbStorage.getApplicationsByCompany(user.companyId);
      // Get all team members for this company
      const teamMembers = await dbStorage.getTeamMembersByCompany(user.companyId);
      // Calculate stats
      const totalApplications = applications.length;
      const approvedApplications = applications.filter((app: any) => app.status === 'approved').length;
      const pendingReviewApplications = applications.filter((app: any) => app.status === 'pending_review').length;
      const draftApplications = applications.filter((app: any) => app.status === 'draft').length;
      res.json({
        totalApplications,
        approvedApplications,
        pendingReviewApplications,
        draftApplications,
        teamMembers: teamMembers.length
      });
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  return server;
}

// Helper function to generate short name from company name
function generateShortName(companyName: string): string {
  if (!companyName) return "";
  
  const cleaned = companyName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .toUpperCase();
  
  const words = cleaned.split(/\s+/);
  
  if (words.length === 1) {
    return words[0].substring(0, 6);
  }
  
  if (words.length === 2) {
    return words[0].substring(0, 3) + words[1].substring(0, 3);
  }
  
  return words.slice(0, 3).map(word => word.substring(0, 2)).join("");
}

// Helper function to generate unique short name
async function generateUniqueShortName(baseShortName: string, storage: any): Promise<string> {
  let shortName = baseShortName;
  let counter = 2;
  
  // Check if base short name is unique
  const existingCompany = await dbStorage.getCompanyByShortName(shortName);
  if (!existingCompany) {
    return shortName; // Base name is unique
  }
  
  // Generate unique name with counter
  while (counter <= 99) {
    if (counter <= 9) {
      shortName = `${baseShortName.substring(0, 5)}${counter}`;
    } else {
      shortName = `${baseShortName.substring(0, 4)}${counter}`;
    }
    
    const conflictCompany = await dbStorage.getCompanyByShortName(shortName);
    if (!conflictCompany) {
      return shortName; // Found unique name
    }
    
    counter++;
  }
  
  // If we can't find a unique name, return the base with timestamp
  return `${baseShortName.substring(0, 4)}${Date.now().toString().slice(-2)}`;
}

// Backend permission helpers (match frontend logic)
function hasPermissionLevel(user: any, level: string): boolean {
  if (!user) return false;
  const levels = ['viewer', 'editor', 'manager', 'owner'];
  const userLevel = user.permissionLevel || 'viewer';
  return levels.indexOf(userLevel) >= levels.indexOf(level);
}
function canCreateEdit(user: any): boolean {
  return user && (user.role === 'company_admin' || (user.role === 'team_member' && hasPermissionLevel(user, 'editor')));
}
function canInviteUsers(user: any): boolean {
  return user && (user.role === 'company_admin' || (user.role === 'team_member' && hasPermissionLevel(user, 'manager')));
}
function canEditPermissions(user: any): boolean {
  return user && (user.role === 'company_admin' || (user.role === 'team_member' && hasPermissionLevel(user, 'manager')));
}



