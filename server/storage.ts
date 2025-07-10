import {
  users,
  companies,
  facilities,
  applications,
  documents,
  contractorDetails,
  applicationAssignments,
  activitySettings,
  facilityActivitySettings,
  activityTemplates,
  activityTemplateSubmissions,
  formTemplates,
  applicationSubmissions,
  messages,
  notifications,
  teamInvitations,
  ghostApplicationIds,
  systemAnnouncements,
  announcementAcknowledgments,
  companyApplicationAssignments,
  badges,
  companyBadges,
  recognitionContent,
  recognitionPageSettings,

  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Facility,
  type InsertFacility,
  type Application,
  type InsertApplication,
  type Document,
  type InsertDocument,
  type ContractorDetails,
  type InsertContractorDetails,
  type ApplicationAssignment,
  type InsertApplicationAssignment,
  type ActivitySettings,
  type InsertActivitySettings,
  type ActivityTemplate,
  type InsertActivityTemplate,
  type ActivityTemplateSubmission,
  type InsertActivityTemplateSubmission,
  type FormTemplate,
  type InsertFormTemplate,
  type ApplicationSubmission,
  type InsertApplicationSubmission,
  type Message,
  type InsertMessage,
  type Notification,
  type InsertNotification,
  type TeamInvitation,
  type InsertTeamInvitation,
  type Badge,
  type InsertBadge,
  type CompanyBadge,
  type InsertCompanyBadge,
  type RecognitionContent,
  type InsertRecognitionContent,
  type RecognitionPageSettings,
  type InsertRecognitionPageSettings,
  type SystemAnnouncement,
  type InsertSystemAnnouncement,
  type AnnouncementAcknowledgment,
  type InsertAnnouncementAcknowledgment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, or, isNull, isNotNull, like, exists, ne, count, lte, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from './auth';

// Add at the top of the file or near the facility methods:
const PROCESS_SYSTEMS_MAP = [
  { key: 'processCombinedHeatPower', label: 'Combined Heat and Power (CHP)' },
  { key: 'processCompressedAir', label: 'Compressed Air Systems' },
  { key: 'processControlSystem', label: 'Control Systems' },
  { key: 'processElectrochemical', label: 'Electrochemical Processes' },
  { key: 'processFacilityNonProcess', label: 'Facility Non-Process' },
  { key: 'processFacilitySubmetering', label: 'Facility Submetering' },
  { key: 'processHVAC', label: 'HVAC' },
  { key: 'processIndustrialGases', label: 'Industrial Gases' },
  { key: 'processLighting', label: 'Lighting' },
  { key: 'processMotors', label: 'Motors' },
  { key: 'processOther', label: 'Other' },
  { key: 'processPumpingFans', label: 'Pumping/Fans' },
  { key: 'processRefrigeration', label: 'Refrigeration' },
  { key: 'processWasteHeatRecovery', label: 'Waste Heat Recovery' },
  { key: 'processMaterialProcessing', label: 'Material Processing' },
  { key: 'processProcessCooling', label: 'Process Cooling' },
  { key: 'processProcessHeating', label: 'Process Heating' },
  { key: 'processPumps', label: 'Pumps' },
  { key: 'processSteamSystem', label: 'Steam System' },
  { key: 'processOtherSystems', label: 'Other Systems' },
  { key: 'processFansBlowers', label: 'Fans and Blowers' },
  { key: 'processMaterialHandling', label: 'Material Handling' },
];

function buildProcessAndSystemsSummary(facility: any): string[] {
  return PROCESS_SYSTEMS_MAP
    .filter(({ key }) => facility[key])
    .map(({ label }) => label);
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getAdminUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company operations
  createCompany(company: InsertCompany): Promise<Company>;
  getCompanyById(id: number): Promise<Company | undefined>;
  getCompanyByShortName(shortName: string): Promise<Company | undefined>;
  getCompanyByName(name: string): Promise<Company | undefined>;
  getCompanies(): Promise<Company[]>;
  updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company>;
  searchCompanies(query: string): Promise<Company[]>;
  
  // Facility operations
  createFacility(facility: InsertFacility): Promise<Facility>;
  getFacilitiesByCompany(companyId: number): Promise<Facility[]>;
  getFacilityById(id: number): Promise<Facility | undefined>;
  updateFacility(id: number, updates: Partial<InsertFacility>): Promise<Facility>;
  
  // Application operations
  createApplication(application: InsertApplication): Promise<Application>;
  createAdminApplication(application: any): Promise<Application>;
  getApplicationById(id: number): Promise<Application | undefined>;
  getApplicationByApplicationId(applicationId: string): Promise<Application | undefined>;
  getApplicationsByCompany(companyId: number): Promise<Application[]>;
  getAllApplications(): Promise<Application[]>;
  getApplicationsByUser(userId: string): Promise<Application[]>;
  getApplicationsByFacilityAndActivity(facilityId: number, activityType: string): Promise<Application[]>;
  updateApplication(id: number, updates: Partial<InsertApplication>): Promise<Application>;
  generateApplicationId(companyId: number, facilityId: number, activityType: string): Promise<string>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsByApplication(applicationId: number): Promise<Document[]>;
  getDocumentsByCompany(companyId: number): Promise<Document[]>;
  getAllDocuments(): Promise<Document[]>;
  getGlobalTemplates(): Promise<Document[]>;
  getDocumentById(id: number): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<void>;
  
  // Team management
  getUsersByCompany(companyId: number): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<User>;
  
  // Password reset methods
  createPasswordResetToken(email: string): Promise<{ token: string; expiry: Date } | null>;
  setTemporaryPassword(email: string, tempPassword: string): Promise<void>;
  changePassword(userId: string, newPassword: string): Promise<void>;
  
  // Activity settings operations
  getFacilityActivitySettings(facilityId: number): Promise<any[]>;
  getActivitySettings(): Promise<any[]>;
  
  // Contractor assignment operations
  getAssignedContractors(applicationId: number): Promise<any[]>;
  removeApplicationContractorAssignments(applicationId: number): Promise<void>;
  deactivateUser(userId: string): Promise<User>;
  
  // Contractor operations
  createContractorDetails(details: InsertContractorDetails): Promise<ContractorDetails>;
  getContractorDetails(userId: string): Promise<ContractorDetails | undefined>;
  updateContractorDetails(userId: string, updates: Partial<InsertContractorDetails>): Promise<ContractorDetails>;
  getContractorCompany(companyId: number): Promise<Company | undefined>;
  getContractorApplications(companyId: number): Promise<any[]>;
  getContractorUserAssignedApplications(userId: string): Promise<any[]>;
  getContractorTeamMembers(companyId: number): Promise<User[]>;
  createContractorTeamMember(memberData: { email: string; firstName: string; lastName: string; permissionLevel: string; role: string; companyId: number; tempPassword: string; }): Promise<User>;
  updateContractorServices(companyId: number, updates: { serviceRegions: string[]; supportedActivities: string[] }): Promise<Company>;
  updateCompanyServices(companyId: number, updates: { serviceRegions: string[]; supportedActivities: string[]; capitalRetrofitTechnologies?: string[] }): Promise<void>;
  createContractorInvitation(invitation: any): Promise<any>;
  assignApplicationToContractor(assignment: any): Promise<any>;
  searchContractors(filters: { activityType?: string; region?: string }): Promise<Company[]>;
  getAllContractors(): Promise<Company[]>;
  
  // Application assignments
  createApplicationAssignment(assignment: InsertApplicationAssignment): Promise<ApplicationAssignment>;
  getApplicationAssignments(applicationId: number): Promise<ApplicationAssignment[]>;
  getUserAssignments(userId: string): Promise<ApplicationAssignment[]>;
  removeApplicationAssignment(applicationId: number, userId: string): Promise<void>;
  
  // Contractor assignment operations
  assignContractorToApplication(applicationId: number, contractorCompanyId: number, assignedBy: string): Promise<void>;
  removeApplicationContractorAssignments(applicationId: number): Promise<void>;
  
  // Company helper functions
  generateShortName(companyName: string): Promise<string>;
  
  // Activity settings
  getActivitySettings(): Promise<ActivitySettings[]>;
  updateActivitySetting(activityType: string, updates: { isEnabled?: boolean; maxApplications?: number; description?: string; updatedBy: string }): Promise<ActivitySettings>;
  
  // Facility-specific activity settings
  getFacilityActivitySettings(facilityId: number): Promise<any[]>;
  updateFacilityActivitySetting(facilityId: number, activityType: string, isEnabled: boolean): Promise<any>;
  
  // Application submission operations
  createApplicationSubmission(submission: InsertApplicationSubmission): Promise<ApplicationSubmission>;
  getApplicationSubmissions(applicationId: number): Promise<ApplicationSubmission[]>;
  updateApplicationSubmission(id: number, updates: Partial<InsertApplicationSubmission>): Promise<ApplicationSubmission>;
  
  // Activity template operations (new flexible system)
  createActivityTemplate(template: InsertActivityTemplate): Promise<ActivityTemplate>;
  getActivityTemplates(activityType: string): Promise<ActivityTemplate[]>;
  getAllActivityTemplates(): Promise<ActivityTemplate[]>;
  updateActivityTemplate(id: number, updates: Partial<InsertActivityTemplate>): Promise<ActivityTemplate>;
  deleteActivityTemplate(id: number): Promise<void>;
  getActivityTemplateById(id: number): Promise<ActivityTemplate | undefined>;
  
  // Activity template submission operations
  createActivityTemplateSubmission(submission: InsertActivityTemplateSubmission): Promise<ActivityTemplateSubmission>;
  getActivityTemplateSubmissions(applicationId: number): Promise<ActivityTemplateSubmission[]>;
  updateActivityTemplateSubmission(id: number, updates: Partial<InsertActivityTemplateSubmission>): Promise<ActivityTemplateSubmission>;
  
  // Approval operations
  getPendingSubmissions(): Promise<any[]>;
  approveSubmission(submissionId: number, reviewedBy: string, reviewNotes?: string): Promise<ActivityTemplateSubmission>;
  rejectSubmission(submissionId: number, reviewedBy: string, reviewNotes: string): Promise<ActivityTemplateSubmission>;
  getSubmissionDetails(submissionId: number): Promise<any>;
  getApplicationWithFullDetails(applicationId: number): Promise<any>;
  
  // Form template operations (legacy)
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  getFormTemplates(activityType: string): Promise<FormTemplate[]>;
  getFormTemplatesByActivity(activityType: string): Promise<FormTemplate[]>;
  getAllFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplateById(id: number): Promise<FormTemplate | undefined>;
  updateFormTemplate(id: number, updates: Partial<InsertFormTemplate>): Promise<FormTemplate>;
  deleteFormTemplate(id: number): Promise<void>;
  checkFormTemplateHasSubmissions(templateId: number): Promise<boolean>;
  getApplication(id: number): Promise<Application | undefined>;
  
  // Form submission operations
  createFormSubmission(submission: InsertApplicationSubmission): Promise<ApplicationSubmission>;
  

  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getAdminUsers(): Promise<any[]>; // Enhanced user data with company information - CRITICAL for admin interface
  getAllApplications(): Promise<Application[]>;
  getApplicationStats(): Promise<any>;
  createAdminCompany(companyData: any): Promise<any>; // CRITICAL for admin company creation - DO NOT REMOVE
  createAdminUser(userData: any): Promise<any>; // CRITICAL for admin user creation - DO NOT REMOVE
  deleteAdminUser(userId: string): Promise<void>; // CRITICAL for admin user deletion - DO NOT REMOVE
  resetUserPassword(userId: string, password: string): Promise<void>; // CRITICAL for password reset - DO NOT REMOVE
  updateCompany(companyId: number, updates: any): Promise<any>; // CRITICAL for company updates - DO NOT REMOVE
  verifyPassword(supplied: string, stored: string): Promise<boolean>; // CRITICAL for authentication - DO NOT REMOVE
  
  // Messaging operations
  createMessage(message: InsertMessage): Promise<Message>;
  getUserMessages(userId: string): Promise<Message[]>;
  getMessageThread(parentMessageId: number): Promise<Message[]>;
  getMessageWithDetails(messageId: number): Promise<Message | undefined>;
  getAllMessages(): Promise<Message[]>;
  markMessageAsRead(messageId: number, userId: string): Promise<void>;
  markThreadAsResolved(messageId: number): Promise<void>;
  updateMessageStatus(messageId: number, status: string): Promise<Message>;
  generateTicketNumber(): Promise<string>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number, userId: string): Promise<void>;
  
  // Enhanced application operations
  updateApplicationStatus(applicationId: number, updates: { status: string; reviewNotes?: string; reviewedBy?: string; reviewedAt?: Date }): Promise<Application>;
  
  // Archive management
  getArchivedEntityDetails(entityId: number, entityType: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    return { ...user, permissionLevel: user.permissionLevel || 'viewer' };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return undefined;
    return { ...user, permissionLevel: user.permissionLevel || 'viewer' };
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    if (!user) return undefined;
    return { ...user, permissionLevel: user.permissionLevel || 'viewer' };
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Company operations
  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async getCompanyById(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyByShortName(shortName: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.shortName, shortName));
    return company;
  }

  async getCompanyByName(name: string): Promise<Company | undefined> {
    // Exclude archived companies to allow reuse of archived company names
    const [company] = await db.select().from(companies).where(
      and(
        eq(companies.name, name),
        or(
          eq(companies.isArchived, false),
          isNull(companies.isArchived)
        )
      )
    );
    return company;
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(companies.name);
  }

  async updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  async searchCompanies(query: string): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(
        or(
          like(companies.name, `%${query}%`),
          like(companies.shortName, `%${query}%`)
        )
      )
      .orderBy(companies.name)
      .limit(10);
  }

  // Facility operations
  async createFacility(facility: InsertFacility): Promise<Facility> {
    // Build processAndSystems summary from booleans
    const processAndSystems = buildProcessAndSystemsSummary(facility);
    const [newFacility] = await db.insert(facilities).values({ ...facility, processAndSystems }).returning();
    return newFacility;
  }

  async getFacilitiesByCompany(companyId: number): Promise<any[]> {
    return await db
      .select({
        id: facilities.id,
        name: facilities.name,
        code: facilities.code,
        facilityCode: facilities.code,
        description: facilities.description,
        companyId: facilities.companyId,
        
        // NAICS Information
        naicsCode: facilities.naicsCode,
        facilitySector: facilities.facilitySector,
        facilityCategory: facilities.facilityCategory,
        facilityType: facilities.facilityType,
        facilityPhotoUrl: facilities.facilityPhotoUrl,
        
        // Address Information
        unitNumber: facilities.unitNumber,
        streetNumber: facilities.streetNumber,
        streetName: facilities.streetName,
        city: facilities.city,
        province: facilities.province,
        country: facilities.country,
        postalCode: facilities.postalCode,
        address: facilities.address,
        
        // Facility Details
        grossFloorArea: facilities.grossFloorArea,
        yearBuilt: facilities.yearBuilt,
        weeklyOperatingHours: facilities.weeklyOperatingHours,
        numberOfWorkersMainShift: facilities.numberOfWorkersMainShift,
        typeOfOperation: facilities.typeOfOperation,
        
        // Energy Management - CRITICAL FOR EDITING
        hasEMIS: facilities.hasEMIS,
        emisRealtimeMonitoring: facilities.emisRealtimeMonitoring,
        emisDescription: facilities.emisDescription,
        hasEnergyManager: facilities.hasEnergyManager,
        energyManagerFullTime: facilities.energyManagerFullTime,
        
        // Temporary Value Checkboxes
        grossFloorAreaUnit: facilities.grossFloorAreaUnit,
        grossFloorAreaIsTemporary: facilities.grossFloorAreaIsTemporary,
        weeklyOperatingHoursIsTemporary: facilities.weeklyOperatingHoursIsTemporary,
        numberOfWorkersMainShiftIsTemporary: facilities.numberOfWorkersMainShiftIsTemporary,
        
        // Individual Process/Systems Checkboxes
        processCompressedAir: facilities.processCompressedAir,
        processControlSystem: facilities.processControlSystem,
        processElectrochemical: facilities.processElectrochemical,
        processFacilityNonProcess: facilities.processFacilityNonProcess,
        processFacilitySubmetering: facilities.processFacilitySubmetering,
        processHVAC: facilities.processHVAC,
        processIndustrialGases: facilities.processIndustrialGases,
        processLighting: facilities.processLighting,
        processMotors: facilities.processMotors,
        processOther: facilities.processOther,
        processPumpingFans: facilities.processPumpingFans,
        processRefrigeration: facilities.processRefrigeration,
        processWasteHeatRecovery: facilities.processWasteHeatRecovery,
        processMaterialProcessing: facilities.processMaterialProcessing,
        processProcessCooling: facilities.processProcessCooling,
        processProcessHeating: facilities.processProcessHeating,
        processPumps: facilities.processPumps,
        processSteamSystem: facilities.processSteamSystem,
        processOtherSystems: facilities.processOtherSystems,

        // Additional Individual Process/Systems Checkboxes (added for completeness)
        // processCombinedHeatPower: (facilities as any).processCombinedHeatPower ?? (facilities as any).process_combined_heat_power,
        // processFansBlowers: (facilities as any).processFansBlowers ?? (facilities as any).process_fans_blowers,
        // processMaterialHandling: (facilities as any).processMaterialHandling ?? (facilities as any).process_material_handling,
        processCombinedHeatPower: facilities.processCombinedHeatPower,
        processFansBlowers: facilities.processFansBlowers,
        processMaterialHandling: facilities.processMaterialHandling,
        
        // Process and Systems Array
        processAndSystems: facilities.processAndSystems,
        
        isActive: facilities.isActive,
        createdAt: facilities.createdAt,
        updatedAt: facilities.updatedAt,
        
        // Include company name
        companyName: companies.name
      })
      .from(facilities)
      .leftJoin(companies, eq(facilities.companyId, companies.id))
      .where(and(eq(facilities.companyId, companyId), eq(facilities.isActive, true)))
      .orderBy(facilities.name);
  }

  async getFacilityById(id: number): Promise<Facility | undefined> {
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, id));
    console.log('[FACILITY DEBUG] Raw facility from database:', {
      id: facility?.id,
      hasEMIS: facility?.hasEMIS,
      emisRealtimeMonitoring: facility?.emisRealtimeMonitoring,
      emisDescription: facility?.emisDescription,
      hasEnergyManager: facility?.hasEnergyManager,
      energyManagerFullTime: facility?.energyManagerFullTime,
    });
    return facility;
  }

  async getAllFacilities(): Promise<any[]> {
    return await db
      .select({
        id: facilities.id,
        name: facilities.name,
        code: facilities.code,
        facilityCode: facilities.code,
        description: facilities.description,
        companyId: facilities.companyId,
        
        // NAICS Information
        naicsCode: facilities.naicsCode,
        facilitySector: facilities.facilitySector,
        facilityCategory: facilities.facilityCategory,
        facilityType: facilities.facilityType,
        facilityPhotoUrl: facilities.facilityPhotoUrl,
        
        // Address Information
        unitNumber: facilities.unitNumber,
        streetNumber: facilities.streetNumber,
        streetName: facilities.streetName,
        city: facilities.city,
        province: facilities.province,
        country: facilities.country,
        postalCode: facilities.postalCode,
        address: facilities.address,
        
        // Facility Details
        grossFloorArea: facilities.grossFloorArea,
        yearBuilt: facilities.yearBuilt,
        weeklyOperatingHours: facilities.weeklyOperatingHours,
        numberOfWorkersMainShift: facilities.numberOfWorkersMainShift,
        typeOfOperation: facilities.typeOfOperation,
        
        // Energy Management
        hasEMIS: facilities.hasEMIS,
        hasEnergyManager: facilities.hasEnergyManager,
        
        // Temporary Value Checkboxes
        grossFloorAreaUnit: facilities.grossFloorAreaUnit,
        grossFloorAreaIsTemporary: facilities.grossFloorAreaIsTemporary,
        weeklyOperatingHoursIsTemporary: facilities.weeklyOperatingHoursIsTemporary,
        numberOfWorkersMainShiftIsTemporary: facilities.numberOfWorkersMainShiftIsTemporary,
        
        // Process and Systems Information
        processCompressedAir: facilities.processCompressedAir,
        processControlSystem: facilities.processControlSystem,
        processElectrochemical: facilities.processElectrochemical,
        processFacilityNonProcess: facilities.processFacilityNonProcess,
        processFacilitySubmetering: facilities.processFacilitySubmetering,
        processHVAC: facilities.processHVAC,
        processIndustrialGases: facilities.processIndustrialGases,
        processLighting: facilities.processLighting,
        processMotors: facilities.processMotors,
        processOther: facilities.processOther,
        processPumpingFans: facilities.processPumpingFans,
        processRefrigeration: facilities.processRefrigeration,
        processWasteHeatRecovery: facilities.processWasteHeatRecovery,
        processMaterialProcessing: facilities.processMaterialProcessing,
        processProcessCooling: facilities.processProcessCooling,
        processProcessHeating: facilities.processProcessHeating,
        processPumps: facilities.processPumps,
        processSteamSystem: facilities.processSteamSystem,
        processOtherSystems: facilities.processOtherSystems,
        processAndSystems: facilities.processAndSystems,
        // Additional Individual Process/Systems Checkboxes (added for completeness)
        // processCombinedHeatPower: (facilities as any).processCombinedHeatPower ?? (facilities as any).process_combined_heat_power,
        // processFansBlowers: (facilities as any).processFansBlowers ?? (facilities as any).process_fans_blowers,
        // processMaterialHandling: (facilities as any).processMaterialHandling ?? (facilities as any).process_material_handling,
        processCombinedHeatPower: facilities.processCombinedHeatPower,
        processFansBlowers: facilities.processFansBlowers,
        processMaterialHandling: facilities.processMaterialHandling,
        
        isActive: facilities.isActive,
        created_at: facilities.createdAt,
        createdAt: facilities.createdAt,
        updatedAt: facilities.updatedAt,
        
        // Include company name
        companyName: companies.name
      })
      .from(facilities)
      .leftJoin(companies, eq(facilities.companyId, companies.id))
      .where(eq(facilities.isActive, true))
      .orderBy(facilities.createdAt);
  }

  async updateFacility(id: number, updates: Partial<InsertFacility>): Promise<Facility> {
    // Build processAndSystems summary from booleans
    const processAndSystems = buildProcessAndSystemsSummary(updates);
    const [facility] = await db
      .update(facilities)
      .set({ ...updates, processAndSystems })
      .where(eq(facilities.id, id))
      .returning();
    return facility;
  }

  async getAllCompaniesForAdmin(): Promise<any[]> {
    // Return all non-archived companies for admin management
    // Archived companies are hidden from regular admin interfaces
    return await db
      .select()
      .from(companies)
      .where(
        or(
          eq(companies.isArchived, false),
          isNull(companies.isArchived)
        )
      )
      .orderBy(companies.createdAt);
  }

  async getCompanyWithDetails(companyId: number): Promise<any> {
    // Get company details
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) return null;

    // Get users for this company
    const companyUsers = await db
      .select()
      .from(users)
      .where(eq(users.companyId, companyId))
      .orderBy(users.createdAt);

    // Get facilities for this company
    const companyFacilities = await db
      .select()
      .from(facilities)
      .where(eq(facilities.companyId, companyId))
      .orderBy(facilities.createdAt);

    // Get applications for this company
    const companyApplications = await db
      .select()
      .from(applications)
      .where(eq(applications.companyId, companyId))
      .orderBy(applications.createdAt);

    return {
      ...company,
      users: companyUsers,
      facilities: companyFacilities,
      applications: companyApplications
    };
  }

  async toggleCompanyStatus(companyId: number, isActive: boolean): Promise<any> {
    const [company] = await db
      .update(companies)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();
    return company;
  }

  async updateAdminCompany(companyId: number, updates: any): Promise<any> {
    try {
      console.log(`[ADMIN] Updating company ${companyId} with updates:`, updates);
      
      // Prepare update object with proper field mapping
      const updateData: any = {
        updatedAt: new Date()
      };
      
      // Map frontend fields to database columns
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.businessNumber !== undefined) updateData.businessNumber = updates.businessNumber;
      if (updates.website !== undefined) updateData.website = updates.website;
      if (updates.streetAddress !== undefined) updateData.streetAddress = updates.streetAddress;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.province !== undefined) updateData.province = updates.province;
      if (updates.country !== undefined) updateData.country = updates.country;
      if (updates.postalCode !== undefined) updateData.postalCode = updates.postalCode;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.isContractor !== undefined) updateData.isContractor = updates.isContractor;
      if (updates.serviceRegions !== undefined) updateData.serviceRegions = updates.serviceRegions;
      if (updates.supportedActivities !== undefined) updateData.supportedActivities = updates.supportedActivities;
      if (updates.capitalRetrofitTechnologies !== undefined) updateData.capitalRetrofitTechnologies = updates.capitalRetrofitTechnologies;
      
      console.log(`[ADMIN] Mapped update data:`, updateData);
      
      const [updatedCompany] = await db
        .update(companies)
        .set(updateData)
        .where(eq(companies.id, companyId))
        .returning();
      
      if (!updatedCompany) {
        throw new Error('Company not found');
      }
      
      console.log(`[ADMIN] Company ${companyId} updated successfully`);
      return updatedCompany;
    } catch (error: any) {
      console.error(`[ADMIN] Error updating company ${companyId}:`, error);
      throw new Error(error.message || 'Failed to update company');
    }
  }

  async updateCompanyShortName(companyId: number, newShortName: string): Promise<any> {
    // Get current company info
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) throw new Error('Company not found');

    const oldShortName = company.shortName;

    // Update company shortname
    const [updatedCompany] = await db
      .update(companies)
      .set({ shortName: newShortName, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();

    // Update all application IDs for this company
    const companyApplications = await db
      .select()
      .from(applications)
      .where(eq(applications.companyId, companyId));

    for (const app of companyApplications) {
      // Replace old shortname with new shortname in application ID
      const newApplicationId = app.applicationId.replace(oldShortName, newShortName);
      
      await db
        .update(applications)
        .set({ applicationId: newApplicationId, updatedAt: new Date() })
        .where(eq(applications.id, app.id));
    }

    return {
      company: updatedCompany,
      updatedApplications: companyApplications.length
    };
  }

  async getUsersByCompanyId(companyId: number): Promise<any[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.companyId, companyId))
      .orderBy(users.createdAt);
  }

  async getFacilitiesByCompanyId(companyId: number): Promise<any[]> {
    return await db
      .select()
      .from(facilities)
      .where(eq(facilities.companyId, companyId))
      .orderBy(facilities.createdAt);
  }

  async getApplicationsByCompanyId(companyId: number): Promise<any[]> {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.companyId, companyId))
      .orderBy(applications.createdAt);
  }

  async getFacilitiesByCompanyForAdmin(companyId: number): Promise<{ id: number; name: string; naicsCode: string | null; }[]> {
    return await db
      .select({
        id: facilities.id,
        name: facilities.name,
        naicsCode: facilities.naicsCode
      })
      .from(facilities)
      .where(eq(facilities.companyId, companyId))
      .orderBy(facilities.name);
  }

  async getNextApplicationNumber(companyId: number, activityType: string): Promise<number> {
    // This method is deprecated - use generateApplicationId instead
    throw new Error('getNextApplicationNumber is deprecated - use generateApplicationId for consistent ID generation');
  }

  // Application operations
  async createApplication(applicationData: any): Promise<Application> {
    console.log("[STORAGE] Creating application with data:", applicationData);
    
    // Generate application ID first
    const applicationId = await this.generateApplicationId(
      applicationData.companyId, 
      applicationData.facilityId, 
      applicationData.activityType
    );
    
    console.log("[STORAGE] Generated application ID:", applicationId);
    
    // Prepare the complete application object
    const application: InsertApplication = {
      applicationId,
      facilityId: applicationData.facilityId,
      activityType: applicationData.activityType as any,
      title: applicationData.title || "",
      companyId: applicationData.companyId,
      createdBy: applicationData.createdBy,
      status: applicationData.status as any || "draft",
      phase: applicationData.phase as any || "pre_activity",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log("[STORAGE] Final application object:", application);
    
    const [newApplication] = await db
      .insert(applications)
      .values([application])
      .returning();
      
    console.log("[STORAGE] Application created successfully:", newApplication);
    return newApplication;
  }

  // ========================================
  // ADMIN APPLICATION CREATION METHOD
  // DO NOT REMOVE - SYSTEM ADMIN FUNCTIONALITY  
  // ========================================
  async createAdminApplication(applicationData: any): Promise<Application> {
    console.log("[ADMIN STORAGE] Creating application on behalf of user with data:", applicationData);
    
    // Generate application ID first  
    const applicationId = await this.generateApplicationId(
      applicationData.companyId, 
      applicationData.facilityId, 
      applicationData.activityType
    );
    
    console.log("[ADMIN STORAGE] Generated application ID:", applicationId);
    
    // Prepare the complete application object
    const application: InsertApplication = {
      applicationId,
      facilityId: applicationData.facilityId,
      activityType: applicationData.activityType as any,
      title: applicationData.title || `${applicationData.activityType} Application`,
      description: applicationData.description || null,
      companyId: applicationData.companyId,
      createdBy: applicationData.createdBy, // Admin who created it on behalf
      status: "draft" as any,
      phase: "pre_activity" as any,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log("[ADMIN STORAGE] Final application object:", application);
    
    const [newApplication] = await db
      .insert(applications)
      .values([application])
      .returning();
      
    console.log("[ADMIN STORAGE] Application created successfully:", newApplication);
    return newApplication;
  }

  async getApplicationById(id: number): Promise<Application | undefined> {
    const [application] = await db
      .select({
        id: applications.id,
        applicationId: applications.applicationId,
        companyId: applications.companyId,
        facilityId: applications.facilityId,
        activityType: applications.activityType,
        title: applications.title,
        description: applications.description,
        status: applications.status,
        submittedBy: applications.submittedBy,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        facility: {
          id: facilities.id,
          name: facilities.name,
          code: facilities.code,
          description: facilities.description,
        }
      })
      .from(applications)
      .leftJoin(facilities, eq(applications.facilityId, facilities.id))
      .where(eq(applications.id, id));
    
    return application;
  }

  async getApplicationByApplicationId(applicationId: string): Promise<Application | undefined> {
    const [application] = await db
      .select({
        id: applications.id,
        applicationId: applications.applicationId,
        companyId: applications.companyId,
        facilityId: applications.facilityId,
        activityType: applications.activityType,
        title: applications.title,
        description: applications.description,
        status: applications.status,
        submittedBy: applications.submittedBy,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        facility: {
          id: facilities.id,
          name: facilities.name,
          code: facilities.code,
          description: facilities.description,
        }
      })
      .from(applications)
      .leftJoin(facilities, eq(applications.facilityId, facilities.id))
      .where(eq(applications.applicationId, applicationId));
    
    return application;
  }

  async getApplicationsByCompany(companyId: number): Promise<any[]> {
    const appsWithFacilities = await db
      .select({
        id: applications.id,
        applicationId: applications.applicationId,
        title: applications.title,
        description: applications.description,
        activityType: applications.activityType,
        status: applications.status,
        submittedAt: applications.submittedAt,
        submittedBy: applications.submittedBy,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        facilityId: applications.facilityId,
        companyId: applications.companyId,
        facilityName: facilities.name,
      })
      .from(applications)
      .leftJoin(facilities, eq(applications.facilityId, facilities.id))
      .where(
        and(
          eq(applications.companyId, companyId),
          or(
            eq(applications.isArchived, false),
            isNull(applications.isArchived)
          )
        )
      )
      .orderBy(desc(applications.createdAt));
    
    // Get submission data for each application to determine detailed status
    const appsWithSubmissions = await Promise.all(
      appsWithFacilities.map(async (app) => {
        const submissions = await this.getApplicationSubmissions(app.id);
        console.log(`[COMPANY APPS] Application ${app.applicationId} has ${submissions.length} submissions:`, submissions.map(s => ({ id: s.id, status: s.status, templateId: s.formTemplateId })));
        
        const submittedActivities = submissions.filter(s => s.status === 'submitted');
        
        let detailedStatus = 'draft';
        
        // Determine workflow status based on actual submissions
        if (submittedActivities.length > 0) {
          // Sort submissions by submission time (most recent first)
          const sortedSubmissions = submittedActivities.sort((a, b) => {
            const timeA = new Date(a.submittedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.submittedAt || b.createdAt || 0).getTime();
            return timeB - timeA; // Most recent first
          });
          
          // Get template names for submitted activities in chronological order
          const templateNamesWithTime = await Promise.all(
            sortedSubmissions.map(async (s) => {
              // Try to get from form_templates first (admin created templates)
              const formTemplate = await db
                .select({ name: formTemplates.name })
                .from(formTemplates)
                .where(eq(formTemplates.id, s.formTemplateId))
                .limit(1);
              
              if (formTemplate[0]) {
                return {
                  name: formTemplate[0].name,
                  submittedAt: s.submittedAt || s.createdAt
                };
              }
              
              // Fallback to activity_templates (hardcoded templates)
              const activityTemplate = await db
                .select({ templateName: activityTemplates.templateName })
                .from(activityTemplates)
                .where(eq(activityTemplates.id, s.formTemplateId))
                .limit(1);
              
              return {
                name: activityTemplate[0]?.templateName || 'Activity',
                submittedAt: s.submittedAt || s.createdAt
              };
            })
          );
          
          const submittedTemplateNames = templateNamesWithTime.filter(t => t.name).map(t => t.name);
          console.log(`[COMPANY APPS] Application ${app.applicationId} submitted templates (latest first): ${submittedTemplateNames.join(', ')}`);
          
          if (submittedTemplateNames.length > 0) {
            // Show the most recent template submitted (first in sorted array)
            const latestTemplate = submittedTemplateNames[0]; // First in sorted array is most recent
            
            // Get total number of available templates for this activity type to show fraction
            const totalTemplates = await db
              .select({ count: sql`count(*)` })
              .from(formTemplates)
              .where(
                and(
                  eq(formTemplates.activityType, app.activityType),
                  eq(formTemplates.isActive, true)
                )
              );
            
            const totalCount = Number(totalTemplates[0]?.count) || submittedTemplateNames.length;
            const submittedCount = submittedTemplateNames.length;
            
            if (submittedCount === 1 && totalCount === 1) {
              // Single template and it's completed
              detailedStatus = `${latestTemplate} Submitted`;
            } else {
              // Multiple templates or partially completed
              detailedStatus = `${latestTemplate} Submitted (${submittedCount}/${totalCount} activities)`;
            }
          } else {
            detailedStatus = `${submittedActivities.length} Activities Submitted`;
          }
        } else if (submissions.length > 0) {
          // Has drafts/started activities but nothing submitted
          detailedStatus = 'Activities Started';
        }
        
        return {
          ...app,
          detailedStatus,
          hasPreActivitySubmission: submittedActivities.length > 0,
          hasPostActivitySubmission: false, // Legacy field
        };
      })
    );
    
    return appsWithSubmissions;
  }

  async getAllApplications(): Promise<any[]> {
    console.log('getAllApplications - Starting data retrieval');
    const appsWithDetails = await db
      .select({
        id: applications.id,
        applicationId: applications.applicationId,
        title: applications.title,
        description: applications.description,
        activityType: applications.activityType,
        status: applications.status,
        submittedAt: applications.submittedAt,
        submittedBy: applications.submittedBy,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        facilityId: applications.facilityId,
        companyId: applications.companyId,
        reviewNotes: applications.reviewNotes,
        reviewedBy: applications.reviewedBy,
        reviewedAt: applications.reviewedAt,
        // Company details - ALL fields needed for Excel export
        companyName: companies.name,
        companyShortName: companies.shortName,
        companyBusinessNumber: companies.businessNumber,
        companyPhone: companies.phone,
        companyWebsite: companies.website,
        companyAddress: companies.address,
        companyCity: companies.city,
        companyProvince: companies.province,
        companyPostalCode: companies.postalCode,
        // Facility details - ALL fields needed for Excel export
        facilityName: facilities.name,
        facilityCity: facilities.city,
        facilityProvince: facilities.province,
        facilityAddress: facilities.address,
        facilityNaicsCode: facilities.naicsCode,
        facilityGrossFloorArea: facilities.grossFloorArea,
        facilityWeeklyOperatingHours: facilities.weeklyOperatingHours,
        facilityNumberOfWorkersMainShift: facilities.numberOfWorkersMainShift,
        facilityHasEmis: facilities.hasEMIS,
        facilityHasEnergyManager: facilities.hasEnergyManager,
        facilityEmisRealtimeMonitoring: facilities.emisRealtimeMonitoring,
        facilityEnergyManagerFullTime: facilities.energyManagerFullTime,
        // Submitter details
        submitterFirstName: users.firstName,
        submitterLastName: users.lastName,
        submitterEmail: users.email
      })
      .from(applications)
      .leftJoin(facilities, eq(applications.facilityId, facilities.id))
      .leftJoin(companies, eq(applications.companyId, companies.id))
      .leftJoin(users, eq(applications.submittedBy, users.id))
      .where(or(
        eq(applications.isArchived, false),
        isNull(applications.isArchived)
      ))
      .orderBy(desc(applications.createdAt));
    
    if (appsWithDetails.length > 0) {
      console.log('DEBUG: First app raw result:', {
        id: appsWithDetails[0].id,
        applicationId: appsWithDetails[0].applicationId,
        submittedAt: appsWithDetails[0].submittedAt,
        reviewedAt: appsWithDetails[0].reviewedAt,
        reviewNotes: appsWithDetails[0].reviewNotes,
        companyName: appsWithDetails[0].companyName,
        companyWebsite: appsWithDetails[0].companyWebsite,
        facilityHasEmis: appsWithDetails[0].facilityHasEmis,
        facilityHasEnergyManager: appsWithDetails[0].facilityHasEnergyManager
      });
    }
    
    // Get all application IDs
    const appIds = appsWithDetails.map(app => app.id);
    // Get assigned contractor company names for each application
    const contractorAssignments = appIds.length > 0 ? await db
      .select({
        applicationId: companyApplicationAssignments.applicationId,
        contractorCompanyId: companyApplicationAssignments.contractorCompanyId,
        contractorName: companies.name,
      })
      .from(companyApplicationAssignments)
      .innerJoin(companies, eq(companyApplicationAssignments.contractorCompanyId, companies.id))
      .where(inArray(companyApplicationAssignments.applicationId, appIds)) : [];
    // Build a map of applicationId -> array of contractor names
    const contractorMap = new Map<number, string[]>();
    contractorAssignments.forEach(a => {
      if (!contractorMap.has(a.applicationId)) {
        contractorMap.set(a.applicationId, []);
      }
      contractorMap.get(a.applicationId)!.push(a.contractorName);
    });
    // Get submission data for each application to determine detailed status
    const appsWithSubmissions = await Promise.all(
      appsWithDetails.map(async (app) => {
        const submissions = await this.getApplicationSubmissions(app.id);
        const hasPreActivity = submissions.some(s => s.phase === 'pre_activity');
        const hasPostActivity = submissions.some(s => s.phase === 'post_activity');
        let detailedStatus = 'Draft';
        // Determine workflow status based on submissions and application status
        if (hasPostActivity) {
          detailedStatus = 'PostActivity Submitted';
        } else if (hasPreActivity) {
          if (app.status === 'under_review') {
            detailedStatus = 'PostActivity Started';
          } else {
            detailedStatus = 'PreActivity Submitted';
          }
        } else if (app.status === 'under_review') {
          detailedStatus = 'PreActivity Started';
        } else if (submissions.length > 0) {
          // Check for specific template names from form_templates
          const submissionData = await Promise.all(
            submissions.map(async (s) => {
              const template = await db
                .select({ name: formTemplates.name })
                .from(formTemplates)
                .where(eq(formTemplates.id, s.templateId))
                .limit(1);
              return template[0]?.name || 'Activity';
            })
          );
          const templateNames = submissionData.join(', ');
          if (templateNames.includes('TEst')) {
            detailedStatus = app.status === 'submitted' ? 'TEst Submitted' : 'TEst Started';
          } else if (templateNames.includes('PreActivity')) {
            detailedStatus = app.status === 'submitted' ? 'PreActivity Submitted' : 'PreActivity Started';
          }
        }
        return {
          ...app,
          detailedStatus,
          assignedContractors: contractorMap.get(app.id) || [],
          // Keep both formats for compatibility
          companyName: app.companyName,
          companyShortName: app.companyShortName,
          facilityName: app.facilityName,
          // Complete company object for Excel export
          company: app.companyName ? {
            id: app.companyId,
            name: app.companyName,
            shortName: app.companyShortName,
            businessNumber: app.companyBusinessNumber,
            phone: app.companyPhone,
            website: app.companyWebsite,
            address: app.companyAddress,
            city: app.companyCity,
            province: app.companyProvince,
            postalCode: app.companyPostalCode
          } : null,
          // Complete facility object for Excel export
          facility: app.facilityName ? {
            id: app.facilityId,
            name: app.facilityName,
            city: app.facilityCity,
            province: app.facilityProvince,
            address: app.facilityAddress,
            naicsCode: app.facilityNaicsCode,
            grossFloorArea: app.facilityGrossFloorArea,
            weeklyOperatingHours: app.facilityWeeklyOperatingHours,
            numberOfWorkersMainShift: app.facilityNumberOfWorkersMainShift,
            hasEmis: app.facilityHasEmis,
            hasEnergyManager: app.facilityHasEnergyManager,
            emisRealtimeMonitoring: app.facilityEmisRealtimeMonitoring,
            energyManagerFullTime: app.facilityEnergyManagerFullTime
          } : null,
          submitterName: app.submitterFirstName && app.submitterLastName 
            ? `${app.submitterFirstName} ${app.submitterLastName}`
            : app.submitterEmail || 'Unknown'
        };
      })
    );
    return appsWithSubmissions;
  }

  async getApplicationsByUser(userId: string): Promise<Application[]> {
    const user = await this.getUser(userId);
    if (!user?.companyId) return [];
    
    return await this.getApplicationsByCompany(user.companyId);
  }

  async getAllApplicationsByFacility(facilityId: number): Promise<Application[]> {
    const apps = await db.select().from(applications).where(eq(applications.facilityId, facilityId));
    return apps;
  }

  async getApplicationsByFacilityAndActivity(facilityId: number, activityType: string): Promise<Application[]> {
    const results = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.facilityId, facilityId),
          eq(applications.activityType, activityType as any),
          or(
            eq(applications.isArchived, false),
            isNull(applications.isArchived)
          )
        )
      )
      .orderBy(desc(applications.createdAt));
    
    console.log(`[STORAGE] Found ${results.length} active ${activityType} applications for facility ${facilityId}`);
    return results;
  }

  async updateApplication(id: number, updates: Partial<InsertApplication>): Promise<Application> {
    const [application] = await db
      .update(applications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return application;
  }

  async generateApplicationId(companyId: number, facilityId: number, activityType: string): Promise<string> {
    const company = await this.getCompanyById(companyId);
    const facility = await this.getFacilityById(facilityId);
    
    if (!company || !facility) {
      throw new Error("Company or facility not found");
    }

    // Generate facility code based on position among company facilities  
    const companyFacilities = await this.getFacilitiesByCompany(companyId);
    const facilityIndex = companyFacilities.findIndex(f => f.id === facilityId);
    const facilityCode = String(facilityIndex + 1).padStart(3, '0');
    
    // Activity ID mapping per specification: 1=FRA, 2=EAA, 3=SEM, 4=EMIS, 5=CR
    const activityId = activityType === 'FRA' ? '1' : 
                      activityType === 'EAA' ? '2' : 
                      activityType === 'SEM' ? '3' : 
                      activityType === 'EMIS' ? '4' : 
                      activityType === 'CR' ? '5' : '1';
    
    // Find the next available application number for this specific activity type at this facility
    const existingAppsForActivity = await this.getApplicationsByFacilityAndActivity(facilityId, activityType);
    
    // Get ALL non-archived applications GLOBALLY to prevent any ID reuse
    // Archived applications are excluded since their IDs should be available for reuse once cleared from ghost IDs
    // Use raw SQL to ensure accurate querying
    const allGlobalAppsResult = await db.execute(sql`
      SELECT application_id FROM applications 
      WHERE is_archived = false OR is_archived IS NULL
    `);
    
    // Handle query result properly - use .rows property like other raw SQL queries
    const allGlobalApps = (allGlobalAppsResult as any).rows?.map((row: any) => ({ 
      applicationId: row.application_id 
    })) || [];
    
    console.log(`[COLLISION DEBUG] Found ${allGlobalApps.length} non-archived applications globally:`, allGlobalApps.map(a => a.applicationId));
    
    // Get ghost IDs to avoid reusing them - CRITICAL for preventing deleted ID reuse
    const ghostIds = await this.getGhostApplicationIds();
    
    // Create comprehensive set of ALL IDs that have ever been used anywhere
    const usedIds = new Set([
      ...allGlobalApps.map(app => app.applicationId), // All existing IDs globally
      ...ghostIds.map(ghost => ghost.applicationId) // All ghost IDs (deleted applications)
    ]);
    
    console.log(`[GHOST DEBUG] Ghost IDs in system:`, ghostIds.map(g => g.applicationId));
    console.log(`[GHOST DEBUG] Total protected IDs:`, Array.from(usedIds).sort());
    
    console.log(`[COLLISION DEBUG] Activity: ${activityType}, Existing for this activity: ${existingAppsForActivity.length}`);
    console.log(`[COLLISION DEBUG] All global used IDs:`, Array.from(usedIds).sort());
    console.log(`[COLLISION DEBUG] Looking for next available ID with format: ${company.shortName}-${facilityCode}-${activityId}XX`);
    
    // Find the next available application number that doesn't conflict with ANY used ID globally
    let appNumber = 1;
    let testAppId: string;
    let iterations = 0;
    
    do {
      const appNumberStr = String(appNumber).padStart(2, '0');
      testAppId = `${company.shortName}-${facilityCode}-${activityId}${appNumberStr}`;
      
      console.log(`[COLLISION CHECK] Testing ID: ${testAppId}, Used: ${usedIds.has(testAppId)}`);
      
      if (!usedIds.has(testAppId)) {
        break;
      }
      
      appNumber++;
      iterations++;
      
      // Safety check to prevent infinite loops
      if (iterations > 100) {
        console.error(`[ERROR] Too many collision detection iterations for ${testAppId}`);
        break;
      }
    } while (true);
    
    const finalAppNumber = appNumber;
    const appNumberStr = String(finalAppNumber).padStart(2, '0');
    const finalApplicationId = `${company.shortName}-${facilityCode}-${activityId}${appNumberStr}`;
    
    console.log(`[COLLISION RESULT] Final ID: ${finalApplicationId} (checked ${iterations} iterations)`);
    
    return finalApplicationId;
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async getDocumentsByApplication(applicationId: number): Promise<Document[]> {
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId))
      .orderBy(desc(documents.createdAt));
    
    console.log(`[STORAGE DEBUG] getDocumentsByApplication(${applicationId}) returning ${docs.length} documents:`, docs.map(d => ({ id: d.id, originalName: d.originalName, size: d.size })));
    
    return docs;
  }

  async getDocumentsByCompany(companyId: number): Promise<Document[]> {
    console.log(`[STORAGE DEBUG] getDocumentsByCompany fetching documents for company ${companyId}`);
    
    // Get documents directly associated with the company (general uploads)
    const companyDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.companyId, companyId))
      .orderBy(desc(documents.createdAt));

    console.log(`[STORAGE DEBUG] Found ${companyDocuments.length} direct company documents`);

    // Get documents from applications owned by this company
    const applicationDocuments = await db
      .select({
        id: documents.id,
        applicationId: documents.applicationId,
        companyId: documents.companyId,
        filename: documents.filename,
        originalName: documents.originalName,
        mimeType: documents.mimeType,
        size: documents.size,
        documentType: documents.documentType,
        isTemplate: documents.isTemplate,
        isGlobal: documents.isGlobal,
        uploadedBy: documents.uploadedBy,
        filePath: documents.filePath,
        createdAt: documents.createdAt
      })
      .from(documents)
      .innerJoin(applications, eq(documents.applicationId, applications.id))
      .where(eq(applications.companyId, companyId))  // Application belongs to this company
      .orderBy(desc(documents.createdAt));

    console.log(`[STORAGE DEBUG] Found ${applicationDocuments.length} application documents`);

    // Combine and deduplicate documents
    const allDocuments = [...companyDocuments, ...applicationDocuments];
    const uniqueDocuments = allDocuments.filter((doc, index, self) => 
      self.findIndex(d => d.id === doc.id) === index
    );

    console.log(`[STORAGE DEBUG] Total unique documents: ${uniqueDocuments.length}`);
    
    return uniqueDocuments.sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .orderBy(desc(documents.createdAt));
  }

  async getGlobalTemplates(): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(and(eq(documents.isTemplate, true), eq(documents.isGlobal, true)))
      .orderBy(documents.originalName);
  }

  async getTemplateDocuments(): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.isTemplate, true))
      .orderBy(documents.originalName);
  }

  async getDocumentById(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async deleteApplication(id: number): Promise<void> {
    try {
      console.log('Archiving application (soft delete):', id);
      
      // Get the application to create ghost ID and archive it
      const app = await this.getApplicationById(id);
      if (!app) {
        throw new Error('Application not found');
      }
      
      console.log('Creating ghost ID for application:', app.applicationId);
      // Create ghost ID before archiving
      await this.addGhostApplicationId(
        app.applicationId,
        `Application deletion: ${app.title || 'Deleted Application'}`
      );
      
      // Archive the application instead of deleting
      console.log('Archiving application record...');
      await db
        .update(applications)
        .set({
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: 'system_admin' // TODO: Pass user ID
        })
        .where(eq(applications.id, id));
      
      console.log('Application archived successfully and ghost ID created');
    } catch (error) {
      console.error('Error archiving application:', error);
      throw error;
    }
  }

  // ========================================
  // CRITICAL METHOD: GHOST APPLICATION ID RETRIEVAL
  // DO NOT REMOVE - PREVENTS DELETED APPLICATION ID REUSE
  // ========================================
  async getAllGhostApplicationIds(): Promise<any[]> {
    console.log(`[GHOST DEBUG] Getting ALL ghost IDs for admin view`);
    
    try {
      const result = await db
        .select({
          id: ghostApplicationIds.id,
          applicationId: ghostApplicationIds.applicationId,
          companyId: ghostApplicationIds.companyId,
          facilityId: ghostApplicationIds.facilityId,
          activityType: ghostApplicationIds.activityType,
          originalTitle: ghostApplicationIds.originalTitle,
          deletedAt: ghostApplicationIds.deletedAt,
          companyName: companies.name,
          companyShortName: companies.shortName,
          facilityName: facilities.name,
        })
        .from(ghostApplicationIds)
        .leftJoin(companies, eq(ghostApplicationIds.companyId, companies.id))
        .leftJoin(facilities, eq(ghostApplicationIds.facilityId, facilities.id))
        .orderBy(desc(ghostApplicationIds.deletedAt));

      console.log(`[GHOST DEBUG] Found ${result.length} ghost IDs with company data`);
      return result;
    } catch (error) {
      console.error('[GHOST DEBUG] Error fetching ghost IDs:', error);
      throw error;
    }
  }

  async getGhostApplicationIds(companyId?: number): Promise<any[]> {
    console.log(`[GHOST DEBUG] Getting ghost IDs, companyId filter: ${companyId}`);
    
    try {
      // Use raw SQL for more reliable querying
      let query = `
        SELECT 
          g.id,
          g.application_id as "applicationId",
          g.company_id as "companyId",
          g.facility_id as "facilityId",
          g.activity_type as "activityType",
          g.original_title as "originalTitle",
          g.deleted_at as "deletedAt",
          c.name as "companyName",
          c.short_name as "companyShortName",
          f.name as "facilityName"
        FROM ghost_application_ids g
        LEFT JOIN companies c ON g.company_id = c.id
        LEFT JOIN facilities f ON g.facility_id = f.id
      `;
      
      if (companyId) {
        query += ` WHERE g.company_id = $1 ORDER BY g.application_id`;
        const result = await db.execute(sql`${sql.raw(query)}`.bind([companyId]));
        return result.rows || [];
      } else {
        query += ` ORDER BY g.application_id`;
        const result = await db.execute(sql`${sql.raw(query)}`);
        return result.rows || [];
      }
    } catch (error) {
      console.error(`[GHOST DEBUG] Error accessing ghost IDs (table may not exist yet):`, error);
      // Return empty array if table doesn't exist yet, don't block application creation
      return [];
    }
  }

  // ========================================
  // CRITICAL METHOD: CLEAR SINGLE GHOST APPLICATION ID
  // DO NOT REMOVE - ALLOWS ADMIN TO CLEAR INDIVIDUAL GHOST IDS
  // ========================================
  async clearGhostApplicationId(applicationId: string): Promise<void> {
    try {
      const result = await db.delete(ghostApplicationIds).where(eq(ghostApplicationIds.applicationId, applicationId));
      console.log(`[GHOST DEBUG] Cleared ghost application ID: ${applicationId}`);
    } catch (error) {
      console.error(`[GHOST DEBUG] Error clearing ghost ID ${applicationId}:`, error);
      throw error; // Throw error so frontend can handle it properly
    }
  }

  // ========================================
  // CRITICAL METHOD: CLEAR MULTIPLE GHOST APPLICATION IDS
  // DO NOT REMOVE - ALLOWS ADMIN TO BULK CLEAR GHOST IDS
  // ========================================
  async clearGhostApplicationIds(applicationIds: string[]): Promise<number> {
    try {
      const result = await db.delete(ghostApplicationIds).where(inArray(ghostApplicationIds.applicationId, applicationIds));
      console.log(`[GHOST DEBUG] Cleared ${applicationIds.length} ghost application IDs:`, applicationIds);
      return applicationIds.length;
    } catch (error) {
      console.error(`[GHOST DEBUG] Error clearing ghost IDs:`, error);
      throw error; // Throw error so frontend can handle it properly
    }
  }

  async bulkClearGhostApplicationIds(applicationIds: string[]): Promise<number> {
    try {
      console.log(`[GHOST DEBUG] Bulk clearing ${applicationIds.length} ghost application IDs:`, applicationIds);
      
      let clearedCount = 0;
      for (const applicationId of applicationIds) {
        try {
          const result = await db
            .delete(ghostApplicationIds)
            .where(eq(ghostApplicationIds.applicationId, applicationId))
            .returning();
          
          if (result.length > 0) {
            clearedCount++;
            console.log(`[GHOST DEBUG] Successfully cleared: ${applicationId}`);
          } else {
            console.log(`[GHOST DEBUG] Ghost ID not found: ${applicationId}`);
          }
        } catch (error) {
          console.error(`[GHOST DEBUG] Error clearing individual ghost ID ${applicationId}:`, error);
        }
      }
      
      console.log(`[GHOST DEBUG] Bulk clear completed: ${clearedCount}/${applicationIds.length} successfully cleared`);
      return clearedCount;
    } catch (error) {
      console.error(`[GHOST DEBUG] Error in bulk clear operation:`, error);
      return 0;
    }
  }

  async addGhostApplicationId(applicationId: string, reason: string): Promise<void> {
    try {
      console.log(`[GHOST DEBUG] Creating ghost ID for ${applicationId} with reason: ${reason}`);
      
      // Find the application to get company and facility IDs directly
      const app = await db
        .select({
          id: applications.id,
          companyId: applications.companyId,
          facilityId: applications.facilityId,
          activityType: applications.activityType,
          title: applications.title
        })
        .from(applications)
        .where(eq(applications.applicationId, applicationId))
        .limit(1);

      if (app.length === 0) {
        console.error(`[GHOST DEBUG] Application not found: ${applicationId}`);
        return;
      }

      const application = app[0];
      console.log(`[GHOST DEBUG] Found application:`, {
        id: application.id,
        companyId: application.companyId,
        facilityId: application.facilityId,
        activityType: application.activityType
      });

      await db.insert(ghostApplicationIds).values({
        applicationId,
        companyId: application.companyId,
        facilityId: application.facilityId,
        activityType: application.activityType as any,
        originalTitle: application.title || reason,
        deletedAt: new Date()
      }).onConflictDoUpdate({
        target: ghostApplicationIds.applicationId,
        set: { deletedAt: new Date(), originalTitle: application.title || reason }
      });

      console.log(`[GHOST DEBUG] Successfully added ghost application ID: ${applicationId}`);
    } catch (error) {
      console.error(`[GHOST DEBUG] Error adding ghost ID ${applicationId}:`, error);
      // Don't throw error to prevent blocking deletion operations
    }
  }

  // Team management
  async getUsersByCompany(companyId: number): Promise<User[]> {
    const usersList = await db.select().from(users).where(eq(users.companyId, companyId));
    return usersList.map(user => ({ ...user, permissionLevel: user.permissionLevel || 'viewer' }));
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return undefined;
    return { ...user, permissionLevel: user.permissionLevel || 'viewer' };
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deactivateUser(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Contractor operations
  async createContractorDetails(details: InsertContractorDetails): Promise<ContractorDetails> {
    const [contractorDetailsResult] = await db.insert(contractorDetails).values(details).returning();
    return contractorDetailsResult;
  }

  async getContractorDetails(userId: string): Promise<ContractorDetails | undefined> {
    const [details] = await db.select().from(contractorDetails).where(eq(contractorDetails.userId, userId));
    return details;
  }

  async updateContractorDetails(userId: string, updates: Partial<InsertContractorDetails>): Promise<ContractorDetails> {
    const [details] = await db
      .update(contractorDetails)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contractorDetails.userId, userId))
      .returning();
    return details;
  }

  // Application assignments
  async createApplicationAssignment(assignment: InsertApplicationAssignment): Promise<ApplicationAssignment> {
    const [newAssignment] = await db.insert(applicationAssignments).values(assignment).returning();
    return newAssignment;
  }

  async getApplicationAssignments(applicationId: number): Promise<ApplicationAssignment[]> {
    return await db
      .select()
      .from(applicationAssignments)
      .where(eq(applicationAssignments.applicationId, applicationId));
  }

  async getUserAssignments(userId: string): Promise<ApplicationAssignment[]> {
    return await db
      .select()
      .from(applicationAssignments)
      .where(eq(applicationAssignments.userId, userId));
  }

  async removeApplicationAssignment(applicationId: number, userId: string): Promise<void> {
    await db
      .delete(applicationAssignments)
      .where(
        and(
          eq(applicationAssignments.applicationId, applicationId),
          eq(applicationAssignments.userId, userId)
        )
      );
  }

  // Activity settings
  async getActivitySettings(): Promise<ActivitySettings[]> {
    return await db.select().from(activitySettings).orderBy(activitySettings.activityType);
  }

  async updateActivitySetting(activityType: string, updates: { 
    isEnabled?: boolean; 
    maxApplications?: number; 
    description?: string; 
    allowContractorAssignment?: boolean;
    contractorFilterType?: string;
    requiredContractorActivities?: string[];
    updatedBy: string 
  }): Promise<ActivitySettings> {
    const [settings] = await db
      .update(activitySettings)
      .set({ 
        ...updates,
        updatedAt: new Date() 
      })
      .where(eq(activitySettings.activityType, activityType as any))
      .returning();
    return settings;
  }

  // Facility-specific activity settings
  async getFacilityActivitySettings(facilityId: number): Promise<any[]> {
    return await db
      .select()
      .from(facilityActivitySettings)
      .where(eq(facilityActivitySettings.facilityId, facilityId));
  }

  async updateFacilityActivitySetting(facilityId: number, activityType: string, isEnabled: boolean): Promise<any> {
    try {
      console.log('[STORAGE] Updating facility activity setting:', { facilityId, activityType, isEnabled });
      
      // Try to update existing record first
      const existing = await db
        .select()
        .from(facilityActivitySettings)
        .where(
          and(
            eq(facilityActivitySettings.facilityId, facilityId),
            eq(facilityActivitySettings.activityType, activityType as any)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        const [updated] = await db
          .update(facilityActivitySettings)
          .set({
            isEnabled,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(facilityActivitySettings.facilityId, facilityId),
              eq(facilityActivitySettings.activityType, activityType as any)
            )
          )
          .returning();
        
        console.log('[STORAGE] Updated existing facility activity setting:', updated);
        return updated;
      } else {
        // Create new record
        const [created] = await db
          .insert(facilityActivitySettings)
          .values({
            facilityId,
            activityType: activityType as any,
            isEnabled,
            enabledBy: 'system_admin', // This should be the actual admin user ID
            enabledAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        console.log('[STORAGE] Created new facility activity setting:', created);
        return created;
      }
    } catch (error) {
      console.error('[STORAGE] Error updating facility activity setting:', error);
      throw error;
    }
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    const usersList = await db.select().from(users);
    return usersList.map(user => ({ ...user, permissionLevel: user.permissionLevel || 'viewer' }));
  }

  async getCompanyUsers(companyId: number): Promise<User[]> {
    const usersList = await db.select().from(users).where(eq(users.companyId, companyId));
    return usersList.map(user => ({ ...user, permissionLevel: user.permissionLevel || 'viewer' }));
  }

  async getAdminUsers(): Promise<User[]> {
    const usersList = await db.select().from(users).where(eq(users.role, 'company_admin'));
    return usersList.map(user => ({ ...user, permissionLevel: user.permissionLevel || 'viewer' }));
  }

  async getContractorTeamMembers(companyId: number): Promise<User[]> {
    const usersList = await db.select().from(users).where(eq(users.companyId, companyId)).where(eq(users.role, 'contractor_team_member'));
    return usersList.map(user => ({ ...user, permissionLevel: user.permissionLevel || 'viewer' }));
  }

  // This method has been replaced by the enriched version below
  // async getAllApplications(): Promise<Application[]> {
  //   return await db.select().from(applications).orderBy(desc(applications.createdAt));
  // }

  async getApplicationStats(): Promise<any> {
    const stats = await db
      .select({
        status: applications.status,
        count: sql<number>`count(*)`,
      })
      .from(applications)
      .groupBy(applications.status);

    return stats.reduce((acc, stat) => {
      acc[stat.status] = stat.count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Application submission operations
  async createApplicationSubmission(submission: InsertApplicationSubmission): Promise<ApplicationSubmission> {
    const [created] = await db
      .insert(applicationSubmissions)
      .values(submission)
      .returning();
    return created;
  }

  async getApplicationSubmissions(applicationId: number): Promise<ApplicationSubmission[]> {
    console.log(`[SUBMISSIONS] Looking for submissions for application ${applicationId}`);
    
    // Get submissions from activityTemplateSubmissions table where actual submissions are stored
    const submissions = await db
      .select()
      .from(activityTemplateSubmissions)
      .where(eq(activityTemplateSubmissions.applicationId, applicationId))
      .orderBy(desc(activityTemplateSubmissions.createdAt));
    
    console.log(`[SUBMISSIONS] Raw query result:`, submissions);
    
    // Map the results to match the expected ApplicationSubmission interface
    const mappedSubmissions = submissions.map(sub => ({
      id: sub.id,
      applicationId: sub.applicationId,
      formTemplateId: sub.activityTemplateId, // Map activity template to form template for compatibility
      data: sub.data,
      status: sub.status,
      approvalStatus: sub.approvalStatus,
      submittedAt: sub.submittedAt,
      submittedBy: sub.submittedBy,
      reviewedBy: sub.reviewedBy,
      reviewedAt: sub.reviewedAt,
      reviewNotes: sub.reviewNotes,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt
    }));
    
    console.log(`[SUBMISSIONS] Found ${mappedSubmissions.length} activity template submissions for application ${applicationId}`);
    console.log(`[SUBMISSIONS] Mapped submissions:`, mappedSubmissions);
    return mappedSubmissions as any;
  }

  async updateApplicationSubmission(id: number, updates: Partial<InsertApplicationSubmission>): Promise<ApplicationSubmission> {
    const [submission] = await db
      .update(applicationSubmissions)
      .set(updates)
      .where(eq(applicationSubmissions.id, id))
      .returning();
    return submission;
  }

  // Activity template operations (new flexible system)
  async createActivityTemplate(template: InsertActivityTemplate): Promise<ActivityTemplate> {
    const [created] = await db
      .insert(activityTemplates)
      .values(template)
      .returning();
    return created;
  }

  // CRITICAL: This method must fetch from form_templates table (created by admin form builder)
  // NOT from activity_templates table (contains old hardcoded data)
  async getActivityTemplates(activityType: string): Promise<ActivityTemplate[]> {
    console.log(`[TEMPLATE FETCH] Getting form builder templates for activity type: ${activityType}`);
    
    // Fetch from form_templates table - these are created through the admin form builder
    const templates = await db
      .select()
      .from(formTemplates)
      .where(and(
        eq(formTemplates.activityType, activityType as any),
        eq(formTemplates.isActive, true)
      ))
      .orderBy(formTemplates.id); // Use ID order since form_templates doesn't have displayOrder
    
    console.log(`[TEMPLATE FETCH] Found ${templates.length} form builder templates for ${activityType}`);
    console.log(`[TEMPLATE FETCH] Raw template descriptions:`, templates.map(t => ({ id: t.id, name: t.name, description: t.description })));
    
    // Map form_templates to expected ActivityTemplate format
    const mappedTemplates = templates.map((template, index) => ({
      id: template.id,
      activityType: template.activityType,
      templateName: template.name, // form_templates uses 'name' field
      name: template.name, // Alias for frontend compatibility
      displayOrder: index + 1, // Generate display order since form_templates doesn't have it
      description: template.description || '', // Use actual description from form builder, not hardcoded text
      formFields: template.formFields || '[]', // form_templates uses 'formFields' field, not 'formData'
      fields: template.formFields ? JSON.parse(template.formFields) : [], // Parse for frontend
      isRequired: true,
      prerequisiteTemplateId: null,
      isActive: template.isActive,
      allowContractorAssignment: false,
      contractorFilterType: 'all',
      requiredContractorActivities: [],
      createdBy: template.createdBy || 'system',
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      order: index + 1 // Alias for frontend compatibility
    }));
    
    console.log(`[TEMPLATE FETCH] Mapped templates:`, mappedTemplates.map(t => ({ id: t.id, name: t.name, activityType: t.activityType })));
    
    return mappedTemplates;
  }

  async getAllActivityTemplates(): Promise<ActivityTemplate[]> {
    return await db
      .select()
      .from(activityTemplates)
      .where(eq(activityTemplates.isActive, true))
      .orderBy(activityTemplates.activityType, activityTemplates.displayOrder);
  }

  async updateActivityTemplate(id: number, updates: Partial<InsertActivityTemplate>): Promise<ActivityTemplate> {
    const [updated] = await db
      .update(activityTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(activityTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteActivityTemplate(id: number): Promise<void> {
    await db
      .update(activityTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(activityTemplates.id, id));
  }

  async getActivityTemplateById(id: number): Promise<ActivityTemplate | undefined> {
    const [template] = await db
      .select()
      .from(activityTemplates)
      .where(eq(activityTemplates.id, id));
    return template;
  }

  // Activity template submission operations
  async createActivityTemplateSubmission(submission: any): Promise<ActivityTemplateSubmission> {
    console.log(`[STORAGE] Creating activity template submission for activityTemplateId: ${submission.activityTemplateId}`);
    
    // CRITICAL FIX: Check if activityTemplateId exists in form_templates table (not activity_templates)
    // The frontend is sending form template IDs, but we're trying to insert into activity_template_submissions
    // which expects activity_templates table IDs that don't exist
    
    const formTemplate = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.id, submission.activityTemplateId))
      .limit(1);
      
    if (formTemplate.length === 0) {
      console.error(`[STORAGE] Form template ID ${submission.activityTemplateId} not found in form_templates table`);
      throw new Error(`Form template with ID ${submission.activityTemplateId} not found`);
    }
    
    console.log(`[STORAGE] Found form template: ${formTemplate[0].name} (ID: ${formTemplate[0].id})`);
    
    // Check if there's a corresponding activity_templates entry
    const activityTemplate = await db
      .select()
      .from(activityTemplates)
      .where(eq(activityTemplates.id, submission.activityTemplateId))
      .limit(1);
      
    if (activityTemplate.length === 0) {
      console.log(`[STORAGE] No corresponding activity_templates entry found. Creating one for form template ${submission.activityTemplateId}`);
      
      // Create activity_templates entry to satisfy foreign key constraint
      // We need to use the SAME ID to maintain referential integrity
      try {
        const orderValue = formTemplate[0].order || 1;
        const fieldsValue = formTemplate[0].formFields || '[]';
        
        await db.execute(sql`
          INSERT INTO activity_templates (id, activity_type, template_name, description, is_active, display_order, form_fields, created_at, updated_at, created_by)
          VALUES (${submission.activityTemplateId}, ${formTemplate[0].activityType}, ${formTemplate[0].name}, ${formTemplate[0].description || ''}, ${formTemplate[0].isActive}, ${orderValue}, ${fieldsValue}, NOW(), NOW(), 'system_bridge')
          ON CONFLICT (id) DO NOTHING
        `);
        
        console.log(`[STORAGE] Created/ensured activity_templates entry with ID: ${submission.activityTemplateId}`);
      } catch (insertError) {
        console.error(`[STORAGE] Error creating activity_templates entry:`, insertError);
        throw new Error(`Failed to create activity template bridge record: ${insertError}`);
      }
    }
    
    console.log(`[STORAGE] Proceeding with activityTemplateSubmissions insert...`);
    
    const [created] = await db
      .insert(activityTemplateSubmissions)
      .values({
        applicationId: submission.applicationId,
        activityTemplateId: submission.activityTemplateId,
        submittedBy: submission.submittedBy,
        status: submission.status || 'draft',
        submittedAt: submission.submittedAt,
        data: typeof submission.submissionData === 'string' ? JSON.parse(submission.submissionData) : (submission.submissionData || {}),
        templateSnapshot: typeof submission.templateSnapshot === 'string' ? JSON.parse(submission.templateSnapshot) : (submission.templateSnapshot || {})
      })
      .returning();
      
    console.log(`[STORAGE] Successfully created activity template submission: ${created.id}`);
    return created;
  }

  async getActivityTemplateSubmissions(applicationId: number): Promise<ActivityTemplateSubmission[]> {
    return await db
      .select()
      .from(activityTemplateSubmissions)
      .where(eq(activityTemplateSubmissions.applicationId, applicationId))
      .orderBy(activityTemplateSubmissions.submittedAt);
  }

  async updateActivityTemplateSubmission(id: number, updates: Partial<InsertActivityTemplateSubmission>): Promise<ActivityTemplateSubmission> {
    const [updated] = await db
      .update(activityTemplateSubmissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(activityTemplateSubmissions.id, id))
      .returning();
    return updated;
  }

  // Form template operations (legacy)
  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    console.log('[STORAGE] Creating form template:', template);
    
    // Ensure formFields is not null - use empty array if not provided
    const templateData = {
      ...template,
      formFields: template.formFields || '[]'
    };
    
    console.log('[STORAGE] Template data for insert:', templateData);
    
    const [created] = await db
      .insert(formTemplates)
      .values(templateData)
      .returning();
    return created;
  }

  async getFormTemplates(activityType: string): Promise<FormTemplate[]> {
    return await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.activityType, activityType as any));
  }

  async getFormTemplatesByActivity(activityType: string): Promise<FormTemplate[]> {
    return await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.activityType, activityType as any));
  }

  async getAllFormTemplates(): Promise<FormTemplate[]> {
    try {
      const templates = await db.select().from(formTemplates).orderBy(formTemplates.createdAt);
      
      // Parse form_fields JSON and ensure proper field mapping
      return templates.map(template => {
        let parsedFields = [];
        
        // Parse the formFields JSON string from database
        if (template.formFields) {
          try {
            if (typeof template.formFields === 'string') {
              parsedFields = JSON.parse(template.formFields);
            } else if (Array.isArray(template.formFields)) {
              parsedFields = template.formFields;
            }
          } catch (e) {
            console.error('Error parsing form fields for template', template.id, ':', e);
            parsedFields = [];
          }
        }
        
        return {
          ...template,
          fields: parsedFields,
          form_fields: parsedFields,
          // Ensure we have a proper field count
          fieldCount: Array.isArray(parsedFields) ? parsedFields.length : 0
        };
      });
    } catch (error) {
      console.error('Error fetching form templates:', error);
      return [];
    }
  }

  async getFormTemplateById(id: number): Promise<FormTemplate | undefined> {
    const [template] = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.id, id));
    return template;
  }

  async updateFormTemplate(id: number, updates: Partial<InsertFormTemplate>): Promise<FormTemplate> {
    console.log('[STORAGE] Updating form template:', id, updates);
    
    // Filter out frontend-only fields and ensure only valid database fields are passed
    const { fields, form_fields, fieldCount, createdAt, ...validUpdates } = updates as any;
    
    const updateData = {
      ...validUpdates,
      formFields: updates.formFields || '[]',
      updatedAt: new Date()
    };
    
    console.log('[STORAGE] Filtered update data for template:', updateData);
    
    const [updated] = await db
      .update(formTemplates)
      .set(updateData)
      .where(eq(formTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteFormTemplate(id: number): Promise<void> {
    await db.delete(formTemplates).where(eq(formTemplates.id, id));
  }

  async checkFormTemplateHasSubmissions(templateId: number): Promise<boolean> {
    // Check if any applications have used this template
    // For now, return false to allow deletion - can be enhanced later to check actual submissions
    return false;
  }

  async getApplication(id: number): Promise<Application | undefined> {
    return this.getApplicationById(id);
  }

  async createFormSubmission(submission: InsertApplicationSubmission): Promise<ApplicationSubmission> {
    const [created] = await db
      .insert(applicationSubmissions)
      .values(submission)
      .returning();
    return created;
  }

  // APPLICATION SUPPORT METHODS
  // ===========================
  // These methods support the application endpoints - DO NOT REMOVE

  async getApplicationAssignedContractors(applicationId: number): Promise<any[]> {
    try {
      console.log(`[CONTRACTORS] Fetching assigned contractors for application: ${applicationId}`);
      
      // Use raw SQL since Drizzle ORM seems to have schema issues
      const rawResult = await db.execute(sql`
        SELECT caa.*, c.name, c.short_name, c.is_contractor, c.service_regions, 
               c.supported_activities, c.capital_retrofit_technologies
        FROM company_application_assignments caa
        LEFT JOIN companies c ON c.id = caa.contractor_company_id
        WHERE caa.application_id = ${applicationId} AND caa.is_active = true
      `);
      
      console.log(`[CONTRACTORS] Raw SQL found ${rawResult.rows.length} assignments`);
      
      // Format the results
      const result = rawResult.rows.map((row: any) => ({
        id: row.id,
        contractorCompanyId: row.contractor_company_id,
        assignedAt: row.assigned_at,
        assignedBy: row.assigned_by,
        isActive: row.is_active,
        contractorCompany: row.contractor_company_id ? {
          id: row.contractor_company_id,
          name: row.name,
          shortName: row.short_name,
          isContractor: row.is_contractor,
          serviceRegions: row.service_regions,
          supportedActivities: row.supported_activities,
          capitalRetrofitTechnologies: row.capital_retrofit_technologies
        } : null
      }));
      
      console.log(`[CONTRACTORS] Returning ${result.length} formatted contractor assignments`);
      return result;
    } catch (error) {
      console.error('[CONTRACTORS] Error fetching assigned contractors:', error);
      return [];
    }
  }

  async getApplicationDocuments(applicationId: number): Promise<any[]> {
    try {
      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.applicationId, applicationId))
        .orderBy(desc(documents.uploadedAt));
      
      return docs;
    } catch (error) {
      console.error('Error fetching application documents:', error);
      return [];
    }
  }

  async startApplicationPhase(applicationId: number, phase: string, userId: string): Promise<any> {
    try {
      // Update application status to reflect phase start
      const statusMap: { [key: string]: string } = {
        'pre_activity': 'under_review',
        'post_activity': 'under_review'
      };
      
      const newStatus = statusMap[phase] || 'under_review';
      
      const [updated] = await db
        .update(applications)
        .set({ 
          status: newStatus as any,
          updatedAt: new Date()
        })
        .where(eq(applications.id, applicationId))
        .returning();
      
      return { success: true, application: updated };
    } catch (error) {
      console.error('Error starting application phase:', error);
      throw error;
    }
  }

  // Messaging operations
  async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const existingTickets = await db.select().from(messages);
    const nextNumber = String(existingTickets.length + 1).padStart(4, "0");
    return `TKT-${year}-${nextNumber}`;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    // Use provided ticket number for replies, or generate new one for original messages
    const ticketNumber = messageData.ticketNumber || await this.generateTicketNumber();
    
    const [created] = await db
      .insert(messages)
      .values({
        ...messageData,
        ticketNumber,
        status: 'open',
        priority: 'normal'
      })
      .returning();
    return created;
  }

  async getUserMessages(userId: string): Promise<Message[]> {
    return await db
      .select({
        id: messages.id,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        subject: messages.subject,
        message: messages.message,
        isRead: messages.isRead,
        isAdminMessage: messages.isAdminMessage,
        isResolved: messages.isResolved,
        isArchived: messages.isArchived,
        isDeleted: messages.isDeleted,
        status: messages.status,
        priority: messages.priority,
        ticketNumber: messages.ticketNumber,
        parentMessageId: messages.parentMessageId,
        applicationId: messages.applicationId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        fromUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          companyId: users.companyId,
        },
      })
      .from(messages)
      .leftJoin(users, eq(messages.fromUserId, users.id))
      .where(and(
        or(eq(messages.fromUserId, userId), eq(messages.toUserId, userId)),
        eq(messages.isDeleted, false)
      ))
      .orderBy(desc(messages.createdAt)) as Message[];
  }

  async getMessageThread(parentMessageId: number): Promise<Message[]> {
    return await db
      .select({
        id: messages.id,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        subject: messages.subject,
        message: messages.message,
        isRead: messages.isRead,
        isAdminMessage: messages.isAdminMessage,
        applicationId: messages.applicationId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        fromUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          companyId: users.companyId,
        },
      })
      .from(messages)
      .leftJoin(users, eq(messages.fromUserId, users.id))
      .orderBy(messages.createdAt) as Message[];
  }

  async getMessagesByTicketOrSubject(ticketNumber: string): Promise<Message[]> {
    return await db
      .select({
        id: messages.id,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        subject: messages.subject,
        message: messages.message,
        isRead: messages.isRead,
        isAdminMessage: messages.isAdminMessage,
        applicationId: messages.applicationId,
        ticketNumber: messages.ticketNumber,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        fromUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          companyId: users.companyId,
        },
      })
      .from(messages)
      .leftJoin(users, eq(messages.fromUserId, users.id))
      .where(eq(messages.ticketNumber, ticketNumber))
      .orderBy(messages.createdAt) as Message[];
  }

  async getMessagesBySubject(subject: string): Promise<Message[]> {
    return await db
      .select({
        id: messages.id,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        subject: messages.subject,
        message: messages.message,
        isRead: messages.isRead,
        isAdminMessage: messages.isAdminMessage,
        applicationId: messages.applicationId,
        ticketNumber: messages.ticketNumber,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        fromUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          companyId: users.companyId,
        },
      })
      .from(messages)
      .leftJoin(users, eq(messages.fromUserId, users.id))
      .where(eq(messages.subject, subject))
      .orderBy(messages.createdAt) as Message[];
  }

  async getMessageWithDetails(messageId: number): Promise<Message | undefined> {
    const [message] = await db
      .select({
        id: messages.id,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        subject: messages.subject,
        message: messages.message,
        isRead: messages.isRead,
        isAdminMessage: messages.isAdminMessage,
        applicationId: messages.applicationId,
        status: messages.status,
        priority: messages.priority,
        ticketNumber: messages.ticketNumber,
        parentMessageId: messages.parentMessageId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        fromUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          companyId: users.companyId,
        },
        application: {
          id: applications.id,
          applicationId: applications.applicationId,
          title: applications.title,
        },
        company: {
          id: companies.id,
          name: companies.name,
          shortName: companies.shortName,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.fromUserId, users.id))
      .leftJoin(applications, eq(messages.applicationId, applications.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(messages.id, messageId));
    
    return message as Message | undefined;
  }

  async updateMessageStatus(messageId: number, status: string): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({ isRead: status === 'closed', updatedAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning();
    return message;
  }

  async getAllMessages(): Promise<Message[]> {
    const allMessages = await db
      .select({
        id: messages.id,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        subject: messages.subject,
        message: messages.message,
        isAdminMessage: messages.isAdminMessage,
        isRead: messages.isRead,
        isResolved: messages.isResolved,
        isArchived: messages.isArchived,
        isDeleted: messages.isDeleted,
        status: messages.status,
        priority: messages.priority,
        ticketNumber: messages.ticketNumber,
        parentMessageId: messages.parentMessageId,
        applicationId: messages.applicationId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        fromUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          companyId: users.companyId,
        },
        company: {
          id: companies.id,
          name: companies.name,
          shortName: companies.shortName,
        },
        application: {
          id: applications.id,
          applicationId: applications.applicationId,
          title: applications.title,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.fromUserId, users.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .leftJoin(applications, eq(messages.applicationId, applications.id))
      .where(eq(messages.isDeleted, false))
      .orderBy(desc(messages.createdAt));
    
    return allMessages as Message[];
  }

  async markMessageAsRead(messageId: number, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.id, messageId), eq(messages.toUserId, userId)));
  }

  async markThreadAsResolved(messageId: number): Promise<void> {
    // Mark the specific message as resolved
    await db
      .update(messages)
      .set({ isResolved: true, updatedAt: new Date() })
      .where(eq(messages.id, messageId));
  }

  async getAllMessagesWithContext(): Promise<any[]> {
    return await db
      .select({
        id: messages.id,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        subject: messages.subject,
        message: messages.message,
        isRead: messages.isRead,
        isAdminMessage: messages.isAdminMessage,
        isResolved: messages.isResolved,
        isArchived: messages.isArchived,
        isDeleted: messages.isDeleted,
        status: messages.status,
        priority: messages.priority,
        ticketNumber: messages.ticketNumber,
        parentMessageId: messages.parentMessageId,
        applicationId: messages.applicationId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        fromUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          companyId: users.companyId,
          role: users.role,
        },
        company: {
          id: companies.id,
          name: companies.name,
          shortName: companies.shortName,
          phone: companies.phone,
          address: companies.address,
        },
        application: {
          id: applications.id,
          applicationId: applications.applicationId,
          title: applications.title,
          status: applications.status,
          activityType: applications.activityType,
          facilityName: facilities.name,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.fromUserId, users.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .leftJoin(applications, eq(messages.applicationId, applications.id))
      .leftJoin(facilities, eq(applications.facilityId, facilities.id))
      .where(eq(messages.isDeleted, false))
      .orderBy(desc(messages.createdAt));
  }

  async updateTicketPriority(ticketNumber: string, priority: string): Promise<void> {
    await db
      .update(messages)
      .set({ priority, updatedAt: new Date() })
      .where(eq(messages.ticketNumber, ticketNumber));
  }

  async resolveTicket(ticketNumber: string): Promise<void> {
    await db
      .update(messages)
      .set({ isResolved: true, status: 'resolved', updatedAt: new Date() })
      .where(eq(messages.ticketNumber, ticketNumber));
  }

  // ============================================================================
  // CRITICAL ADMIN COMPANY CREATION METHOD
  // ============================================================================
  // Creates companies with optional user assignment from admin interface
  // DO NOT REMOVE - Required for admin company management functionality
  async createAdminCompany(companyData: any): Promise<any> {
    try {
      console.log('Creating admin company with data:', companyData);
      console.log('User assignment fields:', {
        assignUser: companyData.assignUser,
        userEmail: companyData.userEmail,
        userPassword: companyData.userPassword ? '***SET***' : 'NOT_SET',
        userFirstName: companyData.userFirstName,
        userLastName: companyData.userLastName,
        userRole: companyData.userRole,
        userPermissionLevel: companyData.userPermissionLevel
      });
      
      // Generate short name from company name
      const shortName = await this.generateShortName(companyData.name);
      
      // Create company record
      const [company] = await db.insert(companies).values({
        name: companyData.name,
        shortName,
        businessNumber: companyData.businessNumber || null,
        website: companyData.website || null,
        streetAddress: companyData.streetAddress || null,
        city: companyData.city || null,
        province: companyData.province || null,
        country: companyData.country || "Canada",
        postalCode: companyData.postalCode || null,
        phone: companyData.phone || null,
        isContractor: companyData.isContractor || false,
        serviceRegions: companyData.serviceRegions || [],
        supportedActivities: companyData.supportedActivities || [],
        capitalRetrofitTechnologies: companyData.capitalRetrofitTechnologies || [],
        howHeardAbout: companyData.howHeardAbout || null,
        howHeardAboutOther: companyData.howHeardAboutOther || null,
        isActive: true
      }).returning();

      console.log('Company created:', company);

      // Create user if requested
      let user = null;
      if (companyData.assignUser && companyData.userEmail && companyData.userPassword) {
        console.log('Creating user with admin company...');
        
        // Validate required user fields
        if (!companyData.userFirstName || !companyData.userLastName || !companyData.userRole) {
          throw new Error('Missing required user fields: firstName, lastName, or role');
        }
        
        const hashedPassword = await hashPassword(companyData.userPassword);
        console.log('Password hashed successfully');
        
        const userId = nanoid();
        
        try {
          [user] = await db.insert(users).values({
            id: userId,
            firstName: companyData.userFirstName,
            lastName: companyData.userLastName,
            email: companyData.userEmail,
            password: hashedPassword,
            role: companyData.userRole as any,
            permissionLevel: companyData.userPermissionLevel as any || 'viewer',
            companyId: company.id,
            isActive: true,
            isEmailVerified: true, // Admin-created users are auto-verified
            emailVerifiedAt: new Date()
          }).returning();

          console.log('User created successfully:', { id: user.id, email: user.email, role: user.role });
        } catch (userError) {
          console.error('Error creating user:', userError);
          throw new Error(`Failed to create user: ${userError.message}`);
        }
      } else {
        console.log('User assignment skipped - missing required fields or not requested');
      }

      return {
        company,
        user,
        message: `Company "${company.name}" created successfully${user ? ` with user ${user.email} assigned` : ''}`
      };
    } catch (error) {
      console.error('Error creating admin company:', error);
      throw new Error(error.message || 'Failed to create company');
    }
  }

  // ============================================================================
  // CRITICAL ADMIN USER CREATION METHOD
  // ============================================================================
  // Creates individual users (system admins, etc.) from admin interface
  // DO NOT REMOVE - Required for admin user management functionality
  async createAdminUser(userData: any): Promise<any> {
    try {
      console.log('Creating admin user with data:', {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        hasPassword: !!userData.password
      });
      
      // Validate required user fields
      if (!userData.firstName || !userData.lastName || !userData.email || !userData.password || !userData.role) {
        throw new Error('Missing required user fields: firstName, lastName, email, password, or role');
      }

      // Check if user already exists
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      const hashedPassword = await hashPassword(userData.password);
      console.log('Password hashed successfully');
      
      const userId = nanoid();
      
      const [user] = await db.insert(users).values({
        id: userId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        role: userData.role as any,
        permissionLevel: userData.permissionLevel as any || 'viewer',
        companyId: userData.companyId || null,
        isActive: true,
        isEmailVerified: true, // Admin-created users are auto-verified
        emailVerifiedAt: new Date()
      }).returning();

      console.log('User created successfully:', { id: user.id, email: user.email, role: user.role });

      return {
        user,
        message: `User "${user.firstName} ${user.lastName}" (${user.email}) created successfully`
      };
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw new Error(error.message || 'Failed to create user');
    }
  }

  // ============================================================================
  // CRITICAL ADMIN USER MANAGEMENT METHODS
  // ============================================================================
  // DO NOT REMOVE - Required for admin user management functionality

  async deleteAdminUser(userId: string): Promise<void> {
    try {
      console.log('Removing user from system (admin operation):', userId);
      
      // For admin deletion, we actually DO want to remove the user entirely
      // But this should be a rare administrative action, not team member removal
      
      // Handle foreign key constraints using direct SQL for reliability
      await db.execute(sql`UPDATE applications SET submitted_by = 'deleted_user' WHERE submitted_by = ${userId}`);
      await db.execute(sql`UPDATE application_submissions SET submitted_by = 'deleted_user' WHERE submitted_by = ${userId}`);
      await db.execute(sql`UPDATE activity_template_submissions SET submitted_by = 'deleted_user' WHERE submitted_by = ${userId}`);
      await db.execute(sql`UPDATE documents SET uploaded_by = 'deleted_user' WHERE uploaded_by = ${userId}`);
      await db.execute(sql`UPDATE team_invitations SET invited_by_user_id = 'deleted_user' WHERE invited_by_user_id = ${userId}`);
      await db.execute(sql`UPDATE messages SET from_user_id = 'deleted_user' WHERE from_user_id = ${userId}`);
      await db.execute(sql`UPDATE messages SET to_user_id = 'deleted_user' WHERE to_user_id = ${userId}`);
      await db.execute(sql`UPDATE notifications SET user_id = 'deleted_user' WHERE user_id = ${userId}`);
      
      // Remove contractor details
      await db.execute(sql`DELETE FROM contractor_details WHERE user_id = ${userId}`);
      
      // Delete the user (this is an admin action for complete removal)
      await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
      
      console.log('User completely removed from system (admin deletion)');
    } catch (error) {
      console.error('Error deleting admin user:', error);
      throw new Error((error as any)?.message || 'Failed to delete user');
    }
  }

  // ========================================
  // CRITICAL METHOD: ADMIN PASSWORD RESET
  // ========================================
  // Used by system admin to reset user passwords via admin panel
  // Called from: server/routes.ts POST /api/admin/users/:id/reset-password
  // Always hashes passwords with bcrypt before storing
  async resetUserPassword(userId: string, password: string): Promise<void> {
    try {
      console.log('Resetting password for user:', userId);
      console.log('Raw password being reset:', password);
      
      // ========================================
      // HASH PASSWORD WITH BCRYPT
      // ========================================
      // Import hashPassword function from auth.ts
      // This ensures consistency with all other password hashing in the system
      const hashedPassword = await hashPassword(password);
      console.log('Generated hash starts with:', hashedPassword.substring(0, 10));
      
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));
        
      console.log('Password reset successfully - new hash stored');
    } catch (error) {
      console.error('Error resetting password:', error);
      throw new Error(error.message || 'Failed to reset password');
    }
  }

  // ========================================
  // CRITICAL AUTHENTICATION METHOD: PASSWORD VERIFICATION
  // DO NOT REMOVE - REQUIRED FOR LOGIN FUNCTIONALITY
  // ========================================
  async verifyPassword(supplied: string, stored: string): Promise<boolean> {
    try {
      console.log(`[LOGIN] Comparing password for stored hash starting with: ${stored.substring(0, 10)}...`);
      console.log(`[LOGIN] Supplied password: "${supplied}" (length: ${supplied.length})`);
      console.log(`[LOGIN] Stored hash length: ${stored.length}`);
      
      // Import the comparePasswords function from auth.ts
      const { default: bcrypt } = await import('bcrypt');
      const { scrypt, timingSafeEqual } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);
      
      // Check if it's a bcrypt hash (starts with $2b$)
      if (stored.startsWith('$2b$')) {
        console.log(`[LOGIN] Using bcrypt verification for hash`);
        const result = await bcrypt.compare(supplied, stored);
        console.log(`[LOGIN] Bcrypt comparison result: ${result}`);
        return result;
      }
      
      // Legacy format for existing passwords (scrypt with salt)
      const [hashed, salt] = stored.split(".");
      if (salt) {
        console.log(`[LOGIN] Using legacy scrypt verification`);
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        const result = timingSafeEqual(hashedBuf, suppliedBuf);
        console.log(`[LOGIN] Legacy comparison result: ${result}`);
        return result;
      }
      
      // ========================================
      // FALLBACK: PLAIN TEXT PASSWORD MIGRATION
      // ========================================
      // This handles legacy plain text passwords and automatically migrates them
      // to bcrypt hashes on successful login for improved security
      console.log(`[LOGIN] Detected plain text password - comparing directly and migrating to hash`);
      const isPlainTextMatch = supplied === stored;
      console.log(`[LOGIN] Plain text comparison result: ${isPlainTextMatch}`);
      
      if (isPlainTextMatch) {
        // ========================================
        // MIGRATE PLAIN TEXT TO BCRYPT HASH
        // ========================================
        // Automatically upgrade plain text passwords to bcrypt hashes
        // Uses same salt rounds (10) as hashPassword function for consistency
        console.log(`[LOGIN] Migrating plain text password to bcrypt hash`);
        const hashedPassword = await bcrypt.hash(supplied, 10);
        await db.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.password, stored)); // Update by current plain text password
        console.log(`[LOGIN] Password migrated successfully`);
      }
      
      return isPlainTextMatch;
    } catch (error) {
      console.error('[LOGIN] Password verification error:', error);
      return false;
    }
  }

  async updateCompany(companyId: number, updates: any): Promise<any> {
    try {
      console.log('Updating company:', companyId, 'with data:', updates);
      
      const [company] = await db.update(companies)
        .set({
          name: updates.name,
          businessNumber: updates.businessNumber,
          website: updates.website,
          streetAddress: updates.streetAddress,
          city: updates.city,
          province: updates.province,
          country: updates.country,
          postalCode: updates.postalCode,
          phone: updates.phone,
          isContractor: updates.isContractor,
          serviceRegions: updates.serviceRegions || [],
          supportedActivities: updates.supportedActivities || [],
          capitalRetrofitTechnologies: updates.capitalRetrofitTechnologies || [],
          updatedAt: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning();
        
      console.log('Company updated successfully:', company);
      return company;
    } catch (error) {
      console.error('Error updating company:', error);
      throw new Error(error.message || 'Failed to update company');
    }
  }

  // ============================================================================
  // CRITICAL ADMIN COMPANY DELETION METHODS
  // ============================================================================
  // DO NOT REMOVE - Required for admin company management functionality

  async deleteAdminCompany(companyId: number): Promise<void> {
    try {
      console.log('Archiving admin company (soft deletion):', companyId);
      
      // Use archive approach instead of hard deletion to avoid foreign key constraint issues
      // This will also properly populate ghost application IDs
      
      // 1. First, get all application IDs for this company to add to ghost IDs
      const companyApplications = await db
        .select({ 
          id: applications.id,
          applicationId: applications.applicationId,
          title: applications.title,
          activityType: applications.activityType,
          facilityId: applications.facilityId
        })
        .from(applications)
        .where(eq(applications.companyId, companyId));
      
      console.log(`Found ${companyApplications.length} applications to add to ghost IDs`);
      
      // 2. Get facility information for ghost ID context
      const companyFacilities = await db
        .select({ 
          id: facilities.id,
          name: facilities.name,
          companyId: facilities.companyId
        })
        .from(facilities)
        .where(eq(facilities.companyId, companyId));
      
      // 3. Add all application IDs to ghost IDs table
      for (const app of companyApplications) {
        try {
          await this.addGhostApplicationId(
            app.applicationId,
            `Company deletion: ${app.title || 'Deleted Application'}`
          );
          console.log(`[COMPANY DELETE] Created ghost ID for application ${app.applicationId}`);
        } catch (error) {
          console.log(`Ghost ID ${app.applicationId} already exists, skipping`);
        }
      }
      
      // 4. Archive the company instead of deleting (soft deletion)
      await db.update(companies)
        .set({ 
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: 'system_admin',
          archiveReason: 'Company deleted by admin'
        })
        .where(eq(companies.id, companyId));
      
      // 5. Archive all facilities for this company
      await db.update(facilities)
        .set({ 
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: 'system_admin',
          archiveReason: 'Facility archived due to company deletion'
        })
        .where(eq(facilities.companyId, companyId));
      
      // 6. Archive all applications for this company
      await db.update(applications)
        .set({ 
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: 'system_admin',
          archiveReason: 'Application archived due to company deletion'
        })
        .where(eq(applications.companyId, companyId));
      
      // 7. Update users to remove company association (they can register with new companies)
      await db.update(users)
        .set({ companyId: null })
        .where(eq(users.companyId, companyId));
      
      console.log('Company archived successfully with ghost IDs populated');
    } catch (error) {
      console.error('Error archiving admin company:', error);
      throw new Error(error.message || 'Failed to archive company');
    }
  }

  async deleteFacility(facilityId: number): Promise<void> {
    try {
      console.log('Archiving facility (soft deletion):', facilityId);
      
      // Get all applications for this facility to create ghost IDs
      const facilityApplications = await db
        .select({ 
          id: applications.id,
          applicationId: applications.applicationId,
          title: applications.title,
          activityType: applications.activityType,
          companyId: applications.companyId
        })
        .from(applications)
        .where(eq(applications.facilityId, facilityId));
      
      console.log(`[FACILITY DELETE] Found ${facilityApplications.length} applications to add to ghost IDs`);
      
      // Create ghost IDs for all applications
      for (const app of facilityApplications) {
        try {
          await this.addGhostApplicationId(
            app.applicationId,
            `Facility deletion: ${app.title || 'Deleted Application'}`
          );
          console.log(`[FACILITY DELETE] Created ghost ID for application ${app.applicationId}`);
        } catch (error) {
          console.log(`Ghost ID ${app.applicationId} already exists, skipping`);
        }
      }
      
      // Archive the facility
      await db
        .update(facilities)
        .set({
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: 'system_admin',
          archiveReason: 'Facility deleted by admin'
        })
        .where(eq(facilities.id, facilityId));
      
      // Archive all applications for this facility
      await db
        .update(applications)
        .set({
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: 'system_admin',
          archiveReason: 'Application archived due to facility deletion'
        })
        .where(eq(applications.facilityId, facilityId));
      
      console.log('Facility archived successfully with ghost IDs populated');
    } catch (error) {
      console.error('Error archiving facility:', error);
      throw new Error(error.message || 'Failed to archive facility');
    }
  }

  // ============================================================================
  // CRITICAL ADMIN METHOD - COMPANY DATA ENRICHMENT FOR USER MANAGEMENT
  // ============================================================================
  // This method enriches user data with company names to prevent "Data Issue" display
  // DO NOT replace with getAllUsers() or remove company data enrichment logic
  async getAdminUsers(): Promise<any[]> {
    try {
      console.log('=== STARTING getAdminUsers QUERY ===');
      
      // First test: Simple user query without JOIN
      const simpleUsers = await db.select().from(users).limit(2);
      console.log('Simple users query result:', simpleUsers.length > 0 ? {
        email: simpleUsers[0].email,
        companyId: simpleUsers[0].companyId
      } : 'No users found');
      
      // Second test: Simple companies query
      const simpleCompanies = await db.select().from(companies).limit(2);
      console.log('Simple companies query result:', simpleCompanies.length > 0 ? {
        name: simpleCompanies[0].name,
        shortName: simpleCompanies[0].shortName
      } : 'No companies found');
      
      // DIRECT OBJECT CONSTRUCTION APPROACH
      console.log('=== DIRECT OBJECT CONSTRUCTION ===');
      
      // Get all users
      const userResults = await db.select().from(users).orderBy(users.createdAt);
      console.log('Users retrieved:', userResults.length);
      
      // Process each user and add company data individually
      const result = [];
      
      for (const user of userResults) {
        // Create base user object
        const enrichedUser: any = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          permissionLevel: user.permissionLevel,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          emailVerifiedAt: user.emailVerifiedAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          companyId: user.companyId,
          businessMobile: user.businessMobile,
          profileImageUrl: user.profileImageUrl,
          hearAboutUs: user.hearAboutUs,
          hearAboutUsOther: user.hearAboutUsOther,
          companyName: null,
          companyShortName: null,
          isContractor: null
        };
        
        if (user.companyId) {
          try {
            // Get company data directly for each user
            const companyData = await db
              .select({
                name: companies.name,
                shortName: companies.shortName,
                isContractor: companies.isContractor
              })
              .from(companies)
              .where(eq(companies.id, user.companyId))
              .limit(1);
            
            if (companyData.length > 0) {
              enrichedUser.companyName = companyData[0].name;
              enrichedUser.companyShortName = companyData[0].shortName;
              enrichedUser.isContractor = companyData[0].isContractor;
              console.log(`Enriched user ${user.email} with company ${companyData[0].name}`);
            }
          } catch (error) {
            console.error(`Error fetching company for user ${user.email}:`, error);
          }
        }
        
        result.push(enrichedUser);
      }
      
      console.log('Direct enrichment complete. Sample user with company:');
      const sampleUserWithCompany = result.find(u => u.companyId);
      if (sampleUserWithCompany) {
        console.log({
          email: sampleUserWithCompany.email,
          companyId: sampleUserWithCompany.companyId,
          companyName: sampleUserWithCompany.companyName,
          isContractor: sampleUserWithCompany.isContractor
        });
      }
      
      console.log('Merge complete, checking first user with company...');
      const userWithCompany = result.find(u => u.companyId);
      if (userWithCompany) {
        console.log('Sample user:', {
          email: userWithCompany.email,
          companyId: userWithCompany.companyId,
          companyName: userWithCompany.companyName,
          isContractor: userWithCompany.isContractor
        });
      }
      
      console.log('=== RESULT VERIFICATION ===');
      console.log('Total users returned:', result.length);
      
      // Verify company data retrieval
      const usersWithCompanies = result.filter((u: any) => u.companyId !== null);
      const usersWithCompanyNames = result.filter((u: any) => u.companyName !== null);
      const contractorUsers = result.filter((u: any) => u.isContractor === true);
      
      console.log('Users with company IDs:', usersWithCompanies.length);
      console.log('Users with company names:', usersWithCompanyNames.length);
      console.log('Contractor users:', contractorUsers.length);
      
      if (usersWithCompanyNames.length > 0) {
        const sample = usersWithCompanyNames[0];
        console.log('=== SUCCESS: COMPANY DATA ENRICHMENT WORKING ===');
        console.log('Email:', sample.email);
        console.log('Company:', sample.companyName, '(' + sample.companyShortName + ')');
        console.log('Contractor:', sample.isContractor);
      } else {
        console.log('=== ISSUE: NO COMPANY DATA ENRICHED ===');
        if (usersWithCompanies.length > 0) {
          console.log('Sample user with company ID but no name:', {
            email: usersWithCompanies[0].email,
            companyId: usersWithCompanies[0].companyId,
            companyName: usersWithCompanies[0].companyName
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error in getAdminUsers query:', error);
      throw error;
    }
  }

  // Admin user management methods - see comprehensive implementation below

  async updateAdminUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }



  async resetUserPassword(id: string, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getContractorTeamMembers(companyId: number): Promise<{ id: string; email: string; firstName: string; lastName: string; }[]> {
    const teamMembers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(and(
        eq(users.companyId, companyId),
        eq(users.role, 'contractor_team_member')
      ));

    return teamMembers.map(member => ({
      id: member.id,
      email: member.email || '',
      firstName: member.firstName || '',
      lastName: member.lastName || '',
    }));
  }

  async getTeamInvitations(companyId: number): Promise<TeamInvitation[]> {
    return await db
      .select()
      .from(teamInvitations)
      .where(and(
        eq(teamInvitations.companyId, companyId),
        eq(teamInvitations.status, 'pending')
      ));
  }

  async createContractorInvitation(data: {
    email: string;
    firstName: string;
    lastName: string;
    permissionLevel: string;
    companyId: number;
    invitedBy: string;
  }): Promise<{ invitationToken: string }> {
    const invitationToken = nanoid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await db.insert(teamInvitations).values({
      invitedByUserId: data.invitedBy,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      permissionLevel: data.permissionLevel,
      companyId: data.companyId,
      invitationToken,
      status: 'pending',
      expiresAt
    });

    return { invitationToken };
  }

  async removeApplicationContractorAssignments(applicationId: number): Promise<void> {
    try {
      console.log(`Removing existing assignments for application ${applicationId}`);
      const result = await db
        .delete(companyApplicationAssignments)
        .where(eq(companyApplicationAssignments.applicationId, applicationId));
      console.log(`Removed assignments result:`, result);
    } catch (error) {
      console.error('Error removing application assignments:', error);
      throw error;
    }
  }

  // ===============================
  // CRITICAL METHOD: Contractor Assignment to Applications
  // DO NOT REMOVE - Required for contractor assignment functionality
  // ===============================
  async assignContractorToApplication(applicationId: number, contractorCompanyId: number, assignedBy: string): Promise<void> {
    try {
      console.log(`[CONTRACTOR ASSIGNMENT] Assigning contractor company ${contractorCompanyId} to application ${applicationId}`);
      
      // Get the application to find the owning company ID
      const application = await this.getApplicationById(applicationId);
      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }
      
      // Insert into main assignment table
      await db.insert(companyApplicationAssignments).values({
        applicationId,
        companyId: application.companyId, // The company that owns the application
        contractorCompanyId,
        assignedBy,
        assignedAt: new Date(),
        isActive: true
      });
      
      // CRITICAL: Insert into historical tracking table for contractor visibility
      console.log(`[CONTRACTOR ASSIGNMENT] Recording in historical tracking table for contractor visibility`);
      await db.execute(sql`
        INSERT INTO contractor_company_assignment_history 
        (application_id, contractor_company_id, assigned_by, assigned_at)
        VALUES (${applicationId}, ${contractorCompanyId}, ${assignedBy}, NOW())
        ON CONFLICT (application_id, contractor_company_id) 
        DO UPDATE SET assigned_at = NOW(), assigned_by = ${assignedBy}
      `);
      
      console.log(`[CONTRACTOR ASSIGNMENT] Successfully assigned contractor company ${contractorCompanyId} to application ${applicationId} with historical tracking`);
    } catch (error) {
      console.error('[CONTRACTOR ASSIGNMENT] Error assigning contractor to application:', error);
      throw error;
    }
  }

  // ===============================
  // CRITICAL METHOD: Company Short Name Generation
  // DO NOT REMOVE - Required for company creation functionality
  // ===============================
  async generateShortName(companyName: string): Promise<string> {
    try {
      console.log(`Generating short name for company: ${companyName}`);
      
      // Generate base short name
      const cleaned = companyName
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .toUpperCase();
      
      const words = cleaned.split(/\s+/);
      let baseShortName: string;
      
      if (words.length === 1) {
        baseShortName = words[0].substring(0, 6);
      } else if (words.length === 2) {
        baseShortName = words[0].substring(0, 3) + words[1].substring(0, 3);
      } else {
        baseShortName = words.slice(0, 3).map(word => word.substring(0, 2)).join("");
      }
      
      // Generate unique short name with collision detection
      let shortName = baseShortName;
      let counter = 2;
      
      // Check if base short name is unique
      const existingCompany = await this.getCompanyByShortName(shortName);
      if (!existingCompany) {
        console.log(`Generated unique short name: ${shortName}`);
        return shortName; // Base name is unique
      }
      
      // Generate unique name with counter
      while (counter <= 99) {
        if (counter <= 9) {
          shortName = `${baseShortName.substring(0, 5)}${counter}`;
        } else {
          shortName = `${baseShortName.substring(0, 4)}${counter}`;
        }
        
        const conflictCompany = await this.getCompanyByShortName(shortName);
        if (!conflictCompany) {
          console.log(`Generated unique short name with counter: ${shortName}`);
          return shortName; // Found unique name
        }
        
        counter++;
      }
      
      // If we can't find a unique name, return the base with timestamp
      const timestampShortName = `${baseShortName.substring(0, 4)}${Date.now().toString().slice(-2)}`;
      console.log(`Generated timestamp-based short name: ${timestampShortName}`);
      return timestampShortName;
    } catch (error) {
      console.error('Error generating short name:', error);
      throw error;
    }
  }

  async getAssignedContractors(applicationId: number): Promise<any[]> {
    try {
      // First get the basic assignment data
      const assignments = await db
        .select()
        .from(applicationAssignments)
        .where(eq(applicationAssignments.applicationId, applicationId));

      // Then get contractor details for each assignment
      const results = [];
      for (const assignment of assignments) {
        // Get user details
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, assignment.userId))
          .limit(1);

        // Get company details if user found
        let company = null;
        if (user.length > 0 && user[0].companyId) {
          const companyResult = await db
            .select()
            .from(companies)
            .where(eq(companies.id, user[0].companyId))
            .limit(1);
          company = companyResult.length > 0 ? companyResult[0] : null;
        }

        const contractorData = {
          id: assignment.id,
          userId: assignment.userId,
          assignedBy: assignment.assignedBy,
          createdAt: assignment.createdAt,
          permissions: assignment.permissions,
          // Company fields
          companyId: company?.id || null,
          companyName: company?.name || null,
          name: company?.name || null, // Add 'name' property for frontend compatibility
          companyShortName: company?.shortName || null,
          companyAddress: company?.address || null,
          companyCity: company?.city || null,
          companyProvince: company?.province || null,
          companyPostalCode: company?.postalCode || null,
          companyPhone: company?.phone || null,
          // User fields
          userFirstName: user.length > 0 ? user[0].firstName : null,
          userLastName: user.length > 0 ? user[0].lastName : null,
          userEmail: user.length > 0 ? user[0].email : null,
          userBusinessMobile: user.length > 0 ? user[0].businessMobile : null
        };
        
        // Only add if we haven't seen this company ID before
        if (!results.some(r => r.companyId === contractorData.companyId)) {
          results.push(contractorData);
        }
      }

      return results;
    } catch (error) {
      console.error('Error in getAssignedContractors:', error);
      throw error;
    }
  }

  async checkContractorAssignment(applicationId: number, userId: string): Promise<boolean> {
    try {
      const assignment = await db
        .select()
        .from(applicationAssignments)
        .where(and(
          eq(applicationAssignments.applicationId, applicationId),
          eq(applicationAssignments.userId, userId)
        ))
        .limit(1);
      
      return assignment.length > 0;
    } catch (error) {
      console.error('Error checking contractor assignment:', error);
      return false;
    }
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: number, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));
  }

  // Message archive and delete methods
  async archiveMessage(messageId: number): Promise<void> {
    await db
      .update(messages)
      .set({ isArchived: true })
      .where(eq(messages.id, messageId));
  }

  async unarchiveMessage(messageId: number): Promise<void> {
    await db
      .update(messages)
      .set({ isArchived: false })
      .where(eq(messages.id, messageId));
  }

  async deleteMessage(messageId: number): Promise<void> {
    await db
      .update(messages)
      .set({ isDeleted: true })
      .where(eq(messages.id, messageId));
  }

  async getArchivedMessages(): Promise<any[]> {
    const archivedMessages = await db
      .select({
        id: messages.id,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        subject: messages.subject,
        message: messages.message,
        isAdminMessage: messages.isAdminMessage,
        isRead: messages.isRead,
        isResolved: messages.isResolved,
        isArchived: messages.isArchived,
        isDeleted: messages.isDeleted,
        status: messages.status,
        priority: messages.priority,
        ticketNumber: messages.ticketNumber,
        parentMessageId: messages.parentMessageId,
        applicationId: messages.applicationId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        fromUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          companyId: users.companyId,
        },
        company: {
          id: companies.id,
          name: companies.name,
          shortName: companies.shortName,
        },
        application: {
          id: applications.id,
          applicationId: applications.applicationId,
          title: applications.title,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.fromUserId, users.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .leftJoin(applications, eq(messages.applicationId, applications.id))
      .where(and(eq(messages.isArchived, true), eq(messages.isDeleted, false)))
      .orderBy(desc(messages.createdAt));
    
    return archivedMessages;
  }

  // Enhanced application operations
  async updateApplicationStatus(applicationId: number, updates: { status: string; reviewNotes?: string; reviewedBy?: string; reviewedAt?: Date }): Promise<any> {
    const [updated] = await db
      .update(applications)
      .set({ 
        status: updates.status as any,
        reviewNotes: updates.reviewNotes,
        reviewedBy: updates.reviewedBy,
        reviewedAt: updates.reviewedAt
      })
      .where(eq(applications.id, applicationId))
      .returning();
    return updated;
  }

  // Contractor-specific operations
  async getContractorCompany(companyId: number): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.isContractor, true)));
    return company;
  }

  async getContractorApplications(companyId: number): Promise<any[]> {
    try {
      console.log(`[STORAGE] getContractorApplications called for company ${companyId}`);
      // Get all applications currently assigned to this contractor company
      const assignments = await db
        .select({
          applicationId: companyApplicationAssignments.applicationId,
        })
        .from(companyApplicationAssignments)
        .where(eq(companyApplicationAssignments.contractorCompanyId, companyId));

      const appIds = assignments.map(a => a.applicationId);
      if (appIds.length === 0) {
        return [];
      }
      // Get application details for these applications
      const applicationsQuery = await db
        .select({
          appId: applications.id,
          appApplicationId: applications.applicationId,
          appTitle: applications.title,
          appDescription: applications.description,
          appStatus: applications.status,
          appActivityType: applications.activityType,
          appCreatedAt: applications.createdAt,
          appUpdatedAt: applications.updatedAt,
          // Facility details
          facilityId: facilities.id,
          facilityName: facilities.name,
          facilityCode: facilities.code,
          facilityDescription: facilities.description,
          // Company details (the client company, not contractor)
          companyId: companies.id,
          companyName: companies.name,
          companyShortName: companies.shortName,
        })
        .from(applications)
        .innerJoin(facilities, eq(applications.facilityId, facilities.id))
        .innerJoin(companies, eq(applications.companyId, companies.id))
        .where(inArray(applications.id, appIds));

      // For each application, get assigned contractor company names
      const contractorAssignments = await db
        .select({
          applicationId: companyApplicationAssignments.applicationId,
          contractorCompanyId: companyApplicationAssignments.contractorCompanyId,
          contractorName: companies.name,
        })
        .from(companyApplicationAssignments)
        .innerJoin(companies, eq(companyApplicationAssignments.contractorCompanyId, companies.id))
        .where(inArray(companyApplicationAssignments.applicationId, appIds));

      // Build a map of applicationId -> array of contractor names
      const contractorMap = new Map<number, string[]>();
      contractorAssignments.forEach(a => {
        if (!contractorMap.has(a.applicationId)) {
          contractorMap.set(a.applicationId, []);
        }
        contractorMap.get(a.applicationId)!.push(a.contractorName);
      });

      // Add assignedContractors to each application
      const formattedApplications = applicationsQuery.map(app => ({
          id: app.appId,
          applicationId: app.appApplicationId,
          title: app.appTitle,
          description: app.appDescription,
          status: app.appStatus,
          activityType: app.appActivityType,
          facilityName: app.facilityName,
          facilityCode: app.facilityCode,
          companyName: app.companyName,
          companyShortName: app.companyShortName,
          createdAt: app.appCreatedAt,
          updatedAt: app.appUpdatedAt,
        assignedContractors: contractorMap.get(app.appId) || [],
      }));
      return formattedApplications;
    } catch (error) {
      console.error('Error in getContractorApplications:', error);
      throw error;
    }
  }

  async getContractorUserAssignedApplications(userId: string): Promise<any[]> {
    try {
      console.log(`[STORAGE] getContractorUserAssignedApplications called for user ${userId}`);
      
      // Get applications specifically assigned to this individual contractor user
      const userAssignments = await db
        .select({
          assignmentId: applicationAssignments.id,
          applicationId: applicationAssignments.applicationId,
          userId: applicationAssignments.userId,
          assignedBy: applicationAssignments.assignedBy,
          assignedDate: applicationAssignments.createdAt,
          permissions: applicationAssignments.permissions,
        })
        .from(applicationAssignments)
        .where(eq(applicationAssignments.userId, userId));

      console.log(`[STORAGE] Found ${userAssignments.length} individual assignments for user ${userId}`);

      if (userAssignments.length === 0) {
        console.log('[STORAGE] No individual assignments found for user, returning empty array');
        return [];
      }

      const applicationIds = userAssignments.map(a => a.applicationId);

      // Get application details for assigned applications
      const applicationsQuery = await db
        .select({
          appId: applications.id,
          appApplicationId: applications.applicationId,
          appTitle: applications.title,
          appDescription: applications.description,
          appStatus: applications.status,
          appActivityType: applications.activityType,
          appCreatedAt: applications.createdAt,
          appUpdatedAt: applications.updatedAt,
          // Facility details
          facilityId: facilities.id,
          facilityName: facilities.name,
          facilityCode: facilities.code,
          facilityDescription: facilities.description,
          // Company details (the client company, not contractor)
          companyId: companies.id,
          companyName: companies.name,
          companyShortName: companies.shortName,
        })
        .from(applications)
        .innerJoin(facilities, eq(applications.facilityId, facilities.id))
        .innerJoin(companies, eq(applications.companyId, companies.id))
        .where(inArray(applications.id, applicationIds));

      console.log(`[STORAGE] Retrieved details for ${applicationsQuery.length} assigned applications`);

      // Build application list with assignment details
      const formattedApplications = applicationsQuery.map(app => {
        const assignment = userAssignments.find(a => a.applicationId === app.appId);
        return {
          id: app.appId,
          applicationId: app.appApplicationId,
          title: app.appTitle,
          description: app.appDescription,
          status: app.appStatus,
          activityType: app.appActivityType,
          facilityName: app.facilityName,
          facilityCode: app.facilityCode,
          companyName: app.companyName,
          companyShortName: app.companyShortName,
          assignedDate: assignment?.assignedDate || null,
          assignedBy: assignment?.assignedBy || null,
          permissions: assignment?.permissions || ['view'],
          createdAt: app.appCreatedAt,
          updatedAt: app.appUpdatedAt,
          assignedToUsers: [{
            id: userId,
            permissions: assignment?.permissions || ['view']
          }],
          assignedToUser: {
            id: userId
          }
        };
      });

      console.log(`[STORAGE] Returning ${formattedApplications.length} applications for individual contractor user`);
      return formattedApplications;
    } catch (error) {
      console.error('Error in getContractorUserAssignedApplications:', error);
      throw error;
    }
  }

  async getContractorTeamMembers(companyId: number): Promise<User[]> {
    const teamMembers = await db
      .select()
      .from(users)
      .where(and(
        eq(users.companyId, companyId),
        inArray(users.role, ['contractor_individual', 'contractor_team_member'])
      ));
    return teamMembers;
  }



  async createContractorInvitation(invitation: any): Promise<any> {
    // This would typically create a record in an invitations table
    // For now, we'll return a placeholder
    return {
      id: Date.now(),
      ...invitation,
      createdAt: new Date()
    };
  }

  async assignApplicationToContractor(assignment: any): Promise<any> {
    // First, create the individual assignment
    const [created] = await db
      .insert(applicationAssignments)
      .values({
        applicationId: assignment.applicationId,
        userId: assignment.userId,
        assignedBy: assignment.assignedBy,
        permissions: assignment.permissions || ["view"]
      })
      .returning();

    // Get the contractor's company ID
    const user = await db
      .select({ companyId: users.companyId })
      .from(users)
      .where(eq(users.id, assignment.userId))
      .limit(1);

    if (user.length > 0 && user[0].companyId) {
      // Create or update the historical tracking record for company-level assignment
      try {
        await db.execute(sql`
          INSERT INTO contractor_company_assignment_history (application_id, contractor_company_id, assigned_by, assigned_at)
          VALUES (${assignment.applicationId}, ${user[0].companyId}, ${assignment.assignedBy}, ${new Date()})
          ON CONFLICT (application_id, contractor_company_id) 
          DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = EXCLUDED.assigned_at
        `);
        
        console.log(`[ASSIGNMENT] Created historical tracking for application ${assignment.applicationId} to company ${user[0].companyId}`);
      } catch (error) {
        console.error('Error creating historical tracking:', error);
        // Don't fail the assignment if historical tracking fails
      }
    }

    return created;
  }

  async removeContractorAssignment(applicationId: number, userId: string): Promise<void> {
    try {
      console.log(`Removing assignment for application ${applicationId} and user ${userId}`);
      await db
        .delete(applicationAssignments)
        .where(and(
          eq(applicationAssignments.applicationId, applicationId),
          eq(applicationAssignments.userId, userId)
        ));
      console.log(`Successfully removed assignment for application ${applicationId} and user ${userId}`);
    } catch (error) {
      console.error('Error removing contractor assignment:', error);
      throw error;
    }
  }

  async updateContractorAssignmentPermissions(applicationId: number, userId: string, permissions: string[]): Promise<void> {
    try {
      console.log(`Updating permissions for application ${applicationId} and user ${userId} to:`, permissions);
      await db
        .update(applicationAssignments)
        .set({ permissions })
        .where(and(
          eq(applicationAssignments.applicationId, applicationId),
          eq(applicationAssignments.userId, userId)
        ));
      console.log(`Successfully updated permissions for application ${applicationId} and user ${userId}`);
    } catch (error) {
      console.error('Error updating contractor assignment permissions:', error);
      throw error;
    }
  }

  async searchContractors(filters: { activityType?: string; region?: string }): Promise<any[]> {
    const conditions = [eq(companies.isContractor, true)];

    if (filters.activityType) {
      conditions.push(sql`${companies.supportedActivities}::text ILIKE ${'%' + filters.activityType + '%'}`);
    }

    if (filters.region) {
      conditions.push(sql`${companies.serviceRegions}::text ILIKE ${'%' + filters.region + '%'}`);
    }

    const contractorCompanies = await db
      .select()
      .from(companies)
      .where(and(...conditions));

    // For each contractor company, get the associated users
    const contractorsWithUsers = await Promise.all(
      contractorCompanies.map(async (company) => {
        const companyUsers = await db
          .select()
          .from(users)
          .where(eq(users.companyId, company.id));
        
        return {
          ...company,
          users: companyUsers
        };
      })
    );

    return contractorsWithUsers;
  }

  async getAllContractors(): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(
        and(
          eq(companies.isContractor, true),
          or(
            eq(companies.isArchived, false),
            isNull(companies.isArchived)
          )
        )
      )
      .orderBy(companies.name);
  }

  async toggleContractorStatus(contractorId: number): Promise<Company> {
    const [contractor] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, contractorId));

    if (!contractor) {
      throw new Error("Contractor not found");
    }

    const newStatus = !contractor.isActive;
    
    const [updated] = await db
      .update(companies)
      .set({ 
        isActive: newStatus,
        updatedAt: new Date()
      })
      .where(eq(companies.id, contractorId))
      .returning();

    return updated;
  }

  async updateContractorServices(contractorId: number, services: {
    supportedActivities?: string[];
    serviceRegions?: string[];
    capitalRetrofitTechnologies?: string[];
  }): Promise<Company> {
    const [updated] = await db
      .update(companies)
      .set({ 
        supportedActivities: services.supportedActivities,
        serviceRegions: services.serviceRegions,
        capitalRetrofitTechnologies: services.capitalRetrofitTechnologies,
        updatedAt: new Date()
      })
      .where(eq(companies.id, contractorId))
      .returning();

    if (!updated) {
      throw new Error("Contractor not found");
    }

    return updated;
  }

  // Contractor-specific methods
  async getContractorCompany(companyId: number) {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.isContractor, true)));
    
    return company;
  }



  async getContractorTeamMembers(companyId: number) {
    const members = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        permissionLevel: users.permissionLevel,
        isActive: users.isActive
      })
      .from(users)
      .where(and(
        eq(users.companyId, companyId),
        inArray(users.role, ['contractor_individual', 'contractor_team_member'])
      ));

    return members;
  }

  async updateContractorServices(companyId: number, data: { serviceRegions: string[]; supportedActivities: string[]; capitalRetrofitTechnologies?: string[] }) {
    const updateData: any = {
      serviceRegions: data.serviceRegions,
      supportedActivities: data.supportedActivities,
      updatedAt: new Date()
    };

    if (data.capitalRetrofitTechnologies !== undefined) {
      updateData.capitalRetrofitTechnologies = data.capitalRetrofitTechnologies;
    }

    const [updated] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, companyId))
      .returning();

    return updated;
  }

  async createContractorInvitation(data: {
    email: string;
    firstName: string;
    lastName: string;
    permissionLevel: string;
    companyId: number;
    invitedBy: string;
  }): Promise<TeamInvitation> {
    const invitationToken = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitationData: InsertTeamInvitation = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      permissionLevel: data.permissionLevel,
      companyId: data.companyId,
      invitedByUserId: data.invitedBy,
      invitationToken,
      expiresAt,
    };

    const [invitation] = await db.insert(teamInvitations).values(invitationData).returning();
    return invitation;
  }

  private generateSecureToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async getTeamInvitation(token: string): Promise<TeamInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.invitationToken, token));
    return invitation;
  }

  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.invitationToken, token));
    return invitation;
  }

  async getTeamInvitationByEmail(email: string, companyId: number): Promise<TeamInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(and(
        eq(teamInvitations.email, email),
        eq(teamInvitations.companyId, companyId)
      ));
    return invitation;
  }

  async getContractorTeamMembers(companyId: number): Promise<any[]> {
    const members = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        permissionLevel: users.permissionLevel,
        isActive: users.isActive,
        company: {
          id: companies.id,
          name: companies.name,
          shortName: companies.shortName
        }
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(and(
        eq(users.companyId, companyId),
        or(
          eq(users.role, 'contractor_individual'),
          eq(users.role, 'contractor_team_member'),
          eq(users.role, 'contractor_account_owner'),
          eq(users.role, 'contractor_manager')
        )
      ));

    return members.map(member => ({
      id: member.id,
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      role: member.role,
      permissionLevel: member.permissionLevel || 'viewer',
      isActive: member.isActive || false,
      company: member.company
    }));
  }

  async getContractorTeamInvitations(companyId: number): Promise<any[]> {
    const invitations = await db
      .select({
        id: teamInvitations.id,
        email: teamInvitations.email,
        firstName: teamInvitations.firstName,
        lastName: teamInvitations.lastName,
        permissionLevel: teamInvitations.permissionLevel,
        createdAt: teamInvitations.createdAt,
        status: teamInvitations.status
      })
      .from(teamInvitations)
      .where(eq(teamInvitations.companyId, companyId));

    return invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      firstName: inv.firstName,
      lastName: inv.lastName,
      permissionLevel: inv.permissionLevel,
      createdAt: inv.createdAt?.toISOString() || '',
      status: inv.status || 'pending'
    }));
  }

  async createContractorTeamInvitation(data: {
    email: string;
    firstName: string;
    lastName: string;
    permissionLevel: string;
    companyId: number;
    invitedBy: string;
    username: string;
    password: string;
  }): Promise<TeamInvitation> {
    const invitationToken = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitationData: InsertTeamInvitation = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      permissionLevel: data.permissionLevel,
      companyId: data.companyId,
      invitedByUserId: data.invitedBy,
      invitationToken,
      expiresAt,
      username: data.username,
      password: data.password
    };

    const [invitation] = await db.insert(teamInvitations).values(invitationData).returning();
    return invitation;
  }

  async updateTeamInvitation(id: number, data: Partial<InsertTeamInvitation>): Promise<TeamInvitation> {
    const [updated] = await db
      .update(teamInvitations)
      .set(data)
      .where(eq(teamInvitations.id, id))
      .returning();
    return updated;
  }

  async acceptTeamInvitation(token: string): Promise<void> {
    await db
      .update(teamInvitations)
      .set({ 
        status: 'accepted',
        updatedAt: new Date()
      })
      .where(eq(teamInvitations.invitationToken, token));
  }

  // Application assignment methods for contractors
  async assignApplicationToContractorTeamMember(data: {
    applicationId: number;
    userId: string;
    assignedBy: string;
    permissions: string[];
  }): Promise<ApplicationAssignment> {
    const assignmentData: InsertApplicationAssignment = {
      applicationId: data.applicationId,
      userId: data.userId,
      assignedBy: data.assignedBy,
      permissions: data.permissions
    };

    const [assignment] = await db.insert(applicationAssignments).values(assignmentData).returning();
    return assignment;
  }

  async removeApplicationAssignmentFromUser(applicationId: number, userId: string): Promise<void> {
    await db
      .delete(applicationAssignments)
      .where(and(
        eq(applicationAssignments.applicationId, applicationId),
        eq(applicationAssignments.userId, userId)
      ));
  }

  async updateContractorTeamMemberPermissions(userId: string, permissionLevel: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        permissionLevel: permissionLevel as any,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async transferContractorOwnership(currentOwnerId: string, newOwnerId: string): Promise<void> {
    // Update current owner to manager
    await db
      .update(users)
      .set({ 
        role: 'contractor_manager',
        updatedAt: new Date()
      })
      .where(eq(users.id, currentOwnerId));

    // Update new owner
    await db
      .update(users)
      .set({ 
        role: 'contractor_account_owner',
        permissionLevel: 'owner',
        updatedAt: new Date()
      })
      .where(eq(users.id, newOwnerId));
  }

  async updateContractorVisibility(companyId: number, isVisible: boolean): Promise<void> {
    await db
      .update(companies)
      .set({ updatedAt: new Date() })
      .where(eq(companies.id, companyId));
  }

  async updateCompany(companyId: number, updates: any): Promise<any> {
    const [updated] = await db
      .update(companies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();
    return updated;
  }

  // Approval system methods
  async getPendingSubmissions(): Promise<any[]> {
    try {
      console.log("Getting pending submissions with minimal complexity...");
      
      // Simple query first - just get basic submission data
      const submissions = await db
        .select({
          id: applicationSubmissions.id,
          applicationId: applicationSubmissions.applicationId,
          formTemplateId: applicationSubmissions.formTemplateId,
          status: applicationSubmissions.status,
          approvalStatus: applicationSubmissions.approvalStatus,
          submittedAt: applicationSubmissions.submittedAt,
          submittedBy: applicationSubmissions.submittedBy,
          createdAt: applicationSubmissions.createdAt,
          data: applicationSubmissions.data
        })
        .from(applicationSubmissions)
        .where(eq(applicationSubmissions.status, 'submitted'))
        .orderBy(desc(applicationSubmissions.createdAt))
        .limit(20);

      console.log("Found submissions:", submissions.length);

      // Return basic data first to get system working
      const enrichedSubmissions = [];
      for (let i = 0; i < Math.min(submissions.length, 50); i++) {
        const submission = submissions[i];
        
        // Get just essential related data
        let applicationData = null;
        let company = null;
        let facility = null;
        let template = null;
        
        try {
          // Get application
          const app = await db.select().from(applications).where(eq(applications.id, submission.applicationId)).limit(1);
          applicationData = app[0] || null;
          
          if (applicationData) {
            // Get company
            const comp = await db.select().from(companies).where(eq(companies.id, applicationData.companyId)).limit(1);
            company = comp[0] || null;
            
            // Get facility
            const fac = await db.select().from(facilities).where(eq(facilities.id, applicationData.facilityId)).limit(1);
            facility = fac[0] || null;
          }
          
          // Get template
          if (submission.formTemplateId) {
            const tmpl = await db.select().from(formTemplates).where(eq(formTemplates.id, submission.formTemplateId)).limit(1);
            template = tmpl[0] || null;
          }
        } catch (err: any) {
          console.log("Error enriching submission", submission.id, ":", err?.message || err);
        }

        enrichedSubmissions.push({
          id: submission.id,
          applicationId: submission.applicationId,
          formTemplateId: submission.formTemplateId,
          status: submission.status,
          approvalStatus: submission.approvalStatus || 'pending',
          submittedAt: submission.submittedAt,
          submittedBy: submission.submittedBy,
          createdAt: submission.createdAt,
          data: submission.data,
          applicationData: applicationData,
          company: company,
          facility: facility,
          template: template,
          contractorAssignments: [] // Will add later once basic system works
        });
      }

      console.log("Returning", enrichedSubmissions.length, "enriched submissions");
      return enrichedSubmissions;
    } catch (error) {
      console.error("Error in getPendingSubmissions:", error);
      return []; // Return empty array instead of throwing to prevent complete failure
    }
  }

  // Get detailed submission information for comprehensive review
  async getSubmissionDetails(submissionId: number): Promise<any> {
    try {
      // Get the submission
      const [submission] = await db
        .select()
        .from(applicationSubmissions)
        .where(eq(applicationSubmissions.id, submissionId))
        .limit(1);

      if (!submission) return null;

      // Get application details
      const [application] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, parseInt(submission.applicationId)))
        .limit(1);

      if (!application) return null;

      // Get company details
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, application.companyId))
        .limit(1);

      // Get facility details
      const [facility] = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, application.facilityId))
        .limit(1);

      // Get template details with form fields
      let template = null;
      if (submission.formTemplateId) {
        try {
          const [formTemplate] = await db
            .select()
            .from(formTemplates)
            .where(eq(formTemplates.id, submission.formTemplateId))
            .limit(1);
          template = formTemplate;
        } catch (err) {
          const [activityTemplate] = await db
            .select()
            .from(activityTemplates)
            .where(eq(activityTemplates.id, submission.formTemplateId))
            .limit(1);
          template = activityTemplate;
        }
      }

      // Get submitter details
      let submitter = null;
      if (submission.submittedBy) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, submission.submittedBy))
          .limit(1);
        submitter = user;
      }

      // Get all uploaded documents for this application
      const applicationDocuments = await db
        .select()
        .from(documents)
        .where(eq(documents.applicationId, parseInt(submission.applicationId)))
        .orderBy(desc(documents.createdAt));

      // Get contractor assignments if any
      const contractorAssignments = await db
        .select({
          userId: applicationAssignments.userId,
          permissions: applicationAssignments.permissions,
          assignedAt: applicationAssignments.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role,
          }
        })
        .from(applicationAssignments)
        .innerJoin(users, eq(applicationAssignments.userId, users.id))
        .where(eq(applicationAssignments.applicationId, parseInt(submission.applicationId)));

      // Get all team members for the company
      const teamMembers = await db
        .select()
        .from(users)
        .where(and(
          eq(users.companyId, application.companyId),
          eq(users.isActive, true)
        ));

      return {
        ...submission,
        application,
        company,
        facility,
        template,
        submitter,
        documents: applicationDocuments,
        contractorAssignments,
        teamMembers
      };
    } catch (error) {
      console.error('Error in getSubmissionDetails:', error);
      return null;
    }
  }

  async approveSubmission(submissionId: number, reviewedBy: string, reviewNotes?: string): Promise<ApplicationSubmission> {
    const [submission] = await db
      .update(applicationSubmissions)
      .set({
        approvalStatus: 'approved',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        updatedAt: new Date()
      })
      .where(eq(applicationSubmissions.id, submissionId))
      .returning();
    return submission;
  }

  async rejectSubmission(submissionId: number, reviewedBy: string, reviewNotes: string): Promise<ApplicationSubmission> {
    const [submission] = await db
      .update(applicationSubmissions)
      .set({
        approvalStatus: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        updatedAt: new Date()
      })
      .where(eq(applicationSubmissions.id, submissionId))
      .returning();
    return submission;
  }

  async getSubmissionDetails(submissionId: number): Promise<any> {
    try {
      // Get the submission
      const [submission] = await db
        .select()
        .from(applicationSubmissions)
        .where(eq(applicationSubmissions.id, submissionId))
        .limit(1);

      if (!submission) return null;

      // Get application details
      const [application] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, parseInt(submission.applicationId)))
        .limit(1);

      if (!application) return null;

      // Get comprehensive company details
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, application.companyId))
        .limit(1);

      // Get comprehensive facility details with all fields
      const [facility] = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, application.facilityId))
        .limit(1);

      // Get template details with form fields
      let template = null;
      if (submission.formTemplateId) {
        try {
          const [formTemplate] = await db
            .select()
            .from(formTemplates)
            .where(eq(formTemplates.id, submission.formTemplateId))
            .limit(1);
          template = formTemplate;
        } catch (err) {
          const [activityTemplate] = await db
            .select()
            .from(activityTemplates)
            .where(eq(activityTemplates.id, submission.formTemplateId))
            .limit(1);
          template = activityTemplate;
        }
      }

      // Get submitter details
      let submitter = null;
      if (submission.submittedBy) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, submission.submittedBy))
          .limit(1);
        submitter = user;
      }

      // Get all uploaded documents for this application
      const applicationDocuments = await db
        .select()
        .from(documents)
        .where(eq(documents.applicationId, parseInt(submission.applicationId)))
        .orderBy(desc(documents.createdAt));

      // Get contractor assignments with user details
      const contractorAssignments = await db
        .select({
          userId: applicationAssignments.userId,
          permissions: applicationAssignments.permissions,
          assignedAt: applicationAssignments.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role,
          }
        })
        .from(applicationAssignments)
        .innerJoin(users, eq(applicationAssignments.userId, users.id))
        .where(eq(applicationAssignments.applicationId, parseInt(submission.applicationId)));

      // Get all team members for the company
      const teamMembers = await db
        .select()
        .from(users)
        .where(and(
          eq(users.companyId, application.companyId),
          eq(users.isActive, true)
        ));

      // Get application activity log (who saved what when)
      const activityLog = await db
        .select({
          userId: applications.submittedBy,
          timestamp: applications.updatedAt,
          action: sql<string>`'Application Updated'`,
          user: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role
          }
        })
        .from(applications)
        .leftJoin(users, eq(applications.submittedBy, users.id))
        .where(eq(applications.id, parseInt(submission.applicationId)))
        .orderBy(desc(applications.updatedAt));

      return {
        ...submission,
        application,
        company,
        facility,
        template,
        submitter,
        documents: applicationDocuments,
        contractorAssignments,
        teamMembers,
        activityLog
      };
    } catch (error) {
      console.error('Error in getSubmissionDetails:', error);
      return null;
    }
  }

  async getApplicationWithFullDetails(applicationId: number): Promise<any> {
    const [application] = await db
      .select({
        id: applications.id,
        applicationId: applications.applicationId,
        title: applications.title,
        description: applications.description,
        status: applications.status,
        activityType: applications.activityType,
        submittedBy: applications.submittedBy,
        submittedAt: applications.submittedAt,
        reviewedBy: applications.reviewedBy,
        reviewedAt: applications.reviewedAt,
        reviewNotes: applications.reviewNotes,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        company: {
          id: companies.id,
          name: companies.name,
          shortName: companies.shortName,
          businessNumber: companies.businessNumber,
          website: companies.website,
          streetAddress: companies.streetAddress,
          city: companies.city,
          province: companies.province,
          country: companies.country,
          postalCode: companies.postalCode
        },
        facility: {
          id: facilities.id,
          name: facilities.name,
          code: facilities.code,
          naicsCode: facilities.naicsCode,
          facilitySector: facilities.facilitySector,
          facilityCategory: facilities.facilityCategory,
          facilityType: facilities.facilityType,
          grossFloorArea: facilities.grossFloorArea,
          yearBuilt: facilities.yearBuilt,
          weeklyOperatingHours: facilities.weeklyOperatingHours,
          numberOfWorkersMainShift: facilities.numberOfWorkersMainShift,
          hasEMIS: facilities.hasEMIS,
          hasEnergyManager: facilities.hasEnergyManager,
          streetNumber: facilities.streetNumber,
          streetName: facilities.streetName,
          city: facilities.city,
          province: facilities.province,
          postalCode: facilities.postalCode
        }
      })
      .from(applications)
      .leftJoin(companies, eq(applications.companyId, companies.id))
      .leftJoin(facilities, eq(applications.facilityId, facilities.id))
      .where(eq(applications.id, applicationId));

    if (!application) return null;

    // Get submissions for this application
    const submissions = await db
      .select({
        id: activityTemplateSubmissions.id,
        activityTemplateId: activityTemplateSubmissions.activityTemplateId,
        data: activityTemplateSubmissions.data,
        status: activityTemplateSubmissions.status,
        approvalStatus: activityTemplateSubmissions.approvalStatus,
        submittedAt: activityTemplateSubmissions.submittedAt,
        submittedBy: activityTemplateSubmissions.submittedBy,
        reviewedBy: activityTemplateSubmissions.reviewedBy,
        reviewedAt: activityTemplateSubmissions.reviewedAt,
        reviewNotes: activityTemplateSubmissions.reviewNotes,
        template: {
          id: activityTemplates.id,
          templateName: activityTemplates.templateName,
          activityType: activityTemplates.activityType
        },
        submitter: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        }
      })
      .from(activityTemplateSubmissions)
      .leftJoin(activityTemplates, eq(activityTemplateSubmissions.activityTemplateId, activityTemplates.id))
      .leftJoin(users, eq(activityTemplateSubmissions.submittedBy, users.id))
      .where(eq(activityTemplateSubmissions.applicationId, applicationId))
      .orderBy(desc(activityTemplateSubmissions.createdAt));

    // Get assigned contractors
    const contractorAssignments = await db
      .select({
        id: applicationAssignments.id,
        userId: applicationAssignments.userId,
        permissions: applicationAssignments.permissions,
        assignedBy: applicationAssignments.assignedBy,
        createdAt: applicationAssignments.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        },
        company: {
          id: companies.id,
          name: companies.name,
          shortName: companies.shortName
        }
      })
      .from(applicationAssignments)
      .leftJoin(users, eq(applicationAssignments.userId, users.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(applicationAssignments.applicationId, applicationId));

    // Get documents
    const applicationDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId))
      .orderBy(desc(documents.createdAt));

    return {
      ...application,
      submissions,
      contractorAssignments,
      documents: applicationDocuments
    };
  }

  // System Announcements Management
  async createSystemAnnouncement(announcement: InsertSystemAnnouncement): Promise<SystemAnnouncement> {
    const [newAnnouncement] = await db
      .insert(systemAnnouncements)
      .values(announcement)
      .returning();
    return newAnnouncement;
  }

  async getAllSystemAnnouncements(): Promise<SystemAnnouncement[]> {
    return await db
      .select()
      .from(systemAnnouncements)
      .orderBy(desc(systemAnnouncements.createdAt));
  }

  async getActiveSystemAnnouncements(userRole?: string): Promise<SystemAnnouncement[]> {
    const now = new Date();
    let query = db
      .select()
      .from(systemAnnouncements)
      .where(
        and(
          eq(systemAnnouncements.isActive, true),
          or(
            isNull(systemAnnouncements.scheduledStart),
            lte(systemAnnouncements.scheduledStart, now)
          ),
          or(
            isNull(systemAnnouncements.scheduledEnd),
            gte(systemAnnouncements.scheduledEnd, now)
          )
        )
      );

    const announcements = await query.orderBy(desc(systemAnnouncements.createdAt));

    // Filter by role if specified
    if (userRole) {
      return announcements.filter(announcement => 
        announcement.targetRoles.includes('all') || 
        announcement.targetRoles.includes(userRole)
      );
    }

    return announcements;
  }

  async updateSystemAnnouncement(id: number, updates: Partial<InsertSystemAnnouncement>): Promise<SystemAnnouncement> {
    const [updatedAnnouncement] = await db
      .update(systemAnnouncements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(systemAnnouncements.id, id))
      .returning();
    return updatedAnnouncement;
  }

  async deleteSystemAnnouncement(id: number): Promise<void> {
    await db
      .delete(systemAnnouncements)
      .where(eq(systemAnnouncements.id, id));
  }

  async acknowledgeAnnouncement(announcementId: number, userId: string): Promise<AnnouncementAcknowledgment> {
    const [acknowledgment] = await db
      .insert(announcementAcknowledgments)
      .values({ announcementId, userId })
      .onConflictDoNothing()
      .returning();
    return acknowledgment;
  }

  async getAnnouncementAcknowledgments(announcementId: number): Promise<AnnouncementAcknowledgment[]> {
    return await db
      .select()
      .from(announcementAcknowledgments)
      .where(eq(announcementAcknowledgments.announcementId, announcementId))
      .orderBy(desc(announcementAcknowledgments.acknowledgedAt));
  }

  async getAnnouncementStats(announcementId: number): Promise<{
    totalUsers: number;
    acknowledgedCount: number;
    acknowledgmentRate: number;
    userBreakdown: {
      role: string;
      total: number;
      acknowledged: number;
    }[];
  }> {
    // Get announcement details
    const [announcement] = await db
      .select()
      .from(systemAnnouncements)
      .where(eq(systemAnnouncements.id, announcementId))
      .limit(1);

    if (!announcement) {
      throw new Error('Announcement not found');
    }

    // Get total eligible users based on target roles
    let totalUsersQuery = db.select().from(users).where(eq(users.isActive, true));
    
    if (!announcement.targetRoles.includes('all')) {
      totalUsersQuery = totalUsersQuery.where(
        inArray(users.role, announcement.targetRoles)
      );
    }

    const totalUsers = await totalUsersQuery;
    const totalUserCount = totalUsers.length;

    // Get acknowledgments
    const acknowledgments = await db
      .select()
      .from(announcementAcknowledgments)
      .where(eq(announcementAcknowledgments.announcementId, announcementId));

    const acknowledgedCount = acknowledgments.length;
    const acknowledgmentRate = totalUserCount > 0 ? (acknowledgedCount / totalUserCount) * 100 : 0;

    // Get user breakdown by role
    const roleBreakdown = await db
      .select({
        role: users.role,
        total: count(),
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          announcement.targetRoles.includes('all') 
            ? undefined 
            : inArray(users.role, announcement.targetRoles)
        )
      )
      .groupBy(users.role);

    // Get acknowledged count by role
    const acknowledgedByRole = await db
      .select({
        role: users.role,
        acknowledged: count(),
      })
      .from(announcementAcknowledgments)
      .innerJoin(users, eq(announcementAcknowledgments.userId, users.id))
      .where(eq(announcementAcknowledgments.announcementId, announcementId))
      .groupBy(users.role);

    const acknowledgedMap = new Map(acknowledgedByRole.map(item => [item.role, item.acknowledged]));

    const userBreakdown = roleBreakdown.map(item => ({
      role: item.role,
      total: item.total,
      acknowledged: acknowledgedMap.get(item.role) || 0,
    }));

    return {
      totalUsers: totalUserCount,
      acknowledgedCount,
      acknowledgmentRate: Math.round(acknowledgmentRate * 100) / 100,
      userBreakdown,
    };
  }

  // ============================================================================
  // ARCHIVE MANAGEMENT SYSTEM
  // ============================================================================
  // Provides comprehensive archive functionality to resolve foreign key constraint issues

  async getArchivedEntityDetails(entityId: number, entityType: string): Promise<any> {
    try {
      switch (entityType) {
        case 'company':
          const [company] = await db
            .select({
              id: companies.id,
              name: companies.name,
              businessNumber: companies.businessNumber,
              website: companies.website,
              phone: companies.phone,
              address: companies.address,
              city: companies.city,
              province: companies.province,
              postalCode: companies.postalCode,
              companyType: companies.companyType,
              serviceRegions: companies.serviceRegions,
              supportedActivities: companies.supportedActivities,
              capitalRetrofitTechnologies: companies.capitalRetrofitTechnologies,
              isArchived: companies.isArchived,
              archiveReason: companies.archiveReason,
              archivedAt: companies.archivedAt,
              archivedBy: companies.archivedBy,
              createdAt: companies.createdAt,
            })
            .from(companies)
            .where(eq(companies.id, entityId));

          // Get associated facilities
          const facilitiesList = await db
            .select({
              id: facilities.id,
              name: facilities.name,
              naicsCode: facilities.naicsCode,
              facilityType: facilities.facilityType,
              isArchived: facilities.isArchived,
              archiveReason: facilities.archiveReason,
            })
            .from(facilities)
            .where(eq(facilities.companyId, entityId));

          // Get applications for this company
          const applicationsList = await db
            .select({
              id: applications.id,
              applicationId: applications.applicationId,
              title: applications.title,
              activityType: applications.activityType,
              status: applications.status,
              isArchived: applications.isArchived,
              archiveReason: applications.archiveReason,
            })
            .from(applications)
            .where(eq(applications.companyId, entityId));

          return {
            ...company,
            facilities: facilitiesList,
            applications: applicationsList,
          };

        case 'facility':
          const [facility] = await db
            .select({
              id: facilities.id,
              name: facilities.name,
              address: facilities.address,
              city: facilities.city,
              province: facilities.province,
              postalCode: facilities.postalCode,
              naicsCode: facilities.naicsCode,
              naicsDescription: facilities.naicsDescription,
              facilityType: facilities.facilityType,
              floorArea: facilities.floorArea,
              yearBuilt: facilities.yearBuilt,
              operatingHours: facilities.operatingHours,
              numberOfEmployees: facilities.numberOfEmployees,
              isArchived: facilities.isArchived,
              archiveReason: facilities.archiveReason,
              archivedAt: facilities.archivedAt,
              archivedBy: facilities.archivedBy,
              companyId: facilities.companyId,
            })
            .from(facilities)
            .where(eq(facilities.id, entityId));

          // Get company info
          const [facilityCompany] = await db
            .select({
              id: companies.id,
              name: companies.name,
            })
            .from(companies)
            .where(eq(companies.id, facility.companyId));

          // Get applications for this facility
          const facilityApplications = await db
            .select({
              id: applications.id,
              applicationId: applications.applicationId,
              title: applications.title,
              activityType: applications.activityType,
              status: applications.status,
              isArchived: applications.isArchived,
            })
            .from(applications)
            .where(eq(applications.facilityId, entityId));

          return {
            ...facility,
            company: facilityCompany,
            applications: facilityApplications,
          };

        case 'application':
          const [application] = await db
            .select({
              id: applications.id,
              applicationId: applications.applicationId,
              title: applications.title,
              description: applications.description,
              activityType: applications.activityType,
              status: applications.status,
              submittedBy: applications.submittedBy,
              isArchived: applications.isArchived,
              archiveReason: applications.archiveReason,
              archivedAt: applications.archivedAt,
              archivedBy: applications.archivedBy,
              companyId: applications.companyId,
              facilityId: applications.facilityId,
              createdAt: applications.createdAt,
            })
            .from(applications)
            .where(eq(applications.id, entityId));

          // Get company and facility info
          const [appCompany] = await db
            .select({
              id: companies.id,
              name: companies.name,
            })
            .from(companies)
            .where(eq(companies.id, application.companyId));

          const [appFacility] = await db
            .select({
              id: facilities.id,
              name: facilities.name,
            })
            .from(facilities)
            .where(eq(facilities.id, application.facilityId));

          return {
            ...application,
            company: appCompany,
            facility: appFacility,
          };

        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }
    } catch (error) {
      console.error(`Error getting archived entity details:`, error);
      throw error;
    }
  }

  async getArchivedEntities(): Promise<any[]> {
    try {
      // Get archived companies with their nested facilities and applications
      const archivedCompanies = await db
        .select({
          id: companies.id,
          name: companies.name,
          shortName: companies.shortName,
          type: sql<string>`'company'`,
          archivedAt: companies.archivedAt,
          archivedBy: companies.archivedBy,
          archiveReason: companies.archiveReason,
        })
        .from(companies)
        .where(eq(companies.isArchived, true))
        .orderBy(desc(companies.archivedAt));

      // For each archived company, get its archived facilities and applications
      const enrichedCompanies = await Promise.all(
        archivedCompanies.map(async (company) => {
          // Get archived facilities for this company
          const companyFacilities = await db
            .select({
              id: facilities.id,
              name: facilities.name,
              code: facilities.code,
              type: sql<string>`'facility'`,
              archivedAt: facilities.archivedAt,
              archivedBy: facilities.archivedBy,
              archiveReason: facilities.archiveReason,
              companyId: facilities.companyId,
            })
            .from(facilities)
            .where(
              and(
                eq(facilities.companyId, company.id),
                eq(facilities.isArchived, true)
              )
            )
            .orderBy(desc(facilities.archivedAt));

          // Get archived applications for this company
          const companyApplications = await db
            .select({
              id: applications.id,
              applicationId: applications.applicationId,
              name: applications.title,
              activityType: applications.activityType,
              type: sql<string>`'application'`,
              archivedAt: applications.archivedAt,
              archivedBy: applications.archivedBy,
              archiveReason: applications.archiveReason,
              companyId: applications.companyId,
              facilityId: applications.facilityId,
            })
            .from(applications)
            .where(
              and(
                eq(applications.companyId, company.id),
                eq(applications.isArchived, true)
              )
            )
            .orderBy(desc(applications.archivedAt));

          return {
            ...company,
            facilities: companyFacilities,
            applications: companyApplications,
            totalFacilities: companyFacilities.length,
            totalApplications: companyApplications.length,
          };
        })
      );

      // Also get orphaned archived facilities and applications (not part of archived companies)
      const orphanedFacilities = await db
        .select({
          id: facilities.id,
          name: facilities.name,
          code: facilities.code,
          type: sql<string>`'facility'`,
          archivedAt: facilities.archivedAt,
          archivedBy: facilities.archivedBy,
          archiveReason: facilities.archiveReason,
          companyId: facilities.companyId,
        })
        .from(facilities)
        .leftJoin(companies, eq(facilities.companyId, companies.id))
        .where(
          and(
            eq(facilities.isArchived, true),
            or(
              isNull(companies.isArchived),
              eq(companies.isArchived, false)
            )
          )
        )
        .orderBy(desc(facilities.archivedAt));

      const orphanedApplications = await db
        .select({
          id: applications.id,
          applicationId: applications.applicationId,
          name: applications.title,
          activityType: applications.activityType,
          type: sql<string>`'application'`,
          archivedAt: applications.archivedAt,
          archivedBy: applications.archivedBy,
          archiveReason: applications.archiveReason,
          companyId: applications.companyId,
          facilityId: applications.facilityId,
        })
        .from(applications)
        .leftJoin(companies, eq(applications.companyId, companies.id))
        .where(
          and(
            eq(applications.isArchived, true),
            or(
              isNull(companies.isArchived),
              eq(companies.isArchived, false)
            )
          )
        )
        .orderBy(desc(applications.archivedAt));

      // Return hierarchical structure with companies first, then orphaned items
      return [
        ...enrichedCompanies,
        ...orphanedFacilities.map(f => ({ ...f, type: 'facility' })),
        ...orphanedApplications.map(a => ({ ...a, type: 'application' }))
      ];
    } catch (error) {
      console.error("Error fetching archived entities:", error);
      throw error;
    }
  }



  async deleteGhostApplicationId(ghostId: number): Promise<void> {
    try {
      await db.delete(ghostApplicationIds).where(eq(ghostApplicationIds.id, ghostId));
      console.log(`Deleted ghost application ID: ${ghostId}`);
    } catch (error) {
      console.error('Error deleting ghost application ID:', error);
      throw error;
    }
  }

  async clearAllGhostApplicationIds(): Promise<void> {
    try {
      await db.delete(ghostApplicationIds);
      console.log('Cleared all ghost application IDs');
    } catch (error) {
      console.error('Error clearing all ghost application IDs:', error);
      throw error;
    }
  }

  async restoreArchivedEntity(entityType: 'company' | 'facility' | 'application', entityId: number): Promise<void> {
    try {
      console.log(`Restoring ${entityType} with ID: ${entityId}`);
      
      if (entityType === 'company') {
        await db.update(companies)
          .set({ 
            isArchived: false,
            archivedAt: null,
            archivedBy: null,
            archiveReason: null
          })
          .where(eq(companies.id, entityId));
      } else if (entityType === 'facility') {
        await db.update(facilities)
          .set({ 
            isArchived: false,
            archivedAt: null,
            archivedBy: null,
            archiveReason: null
          })
          .where(eq(facilities.id, entityId));
      } else if (entityType === 'application') {
        await db.update(applications)
          .set({ 
            isArchived: false,
            archivedAt: null,
            archivedBy: null,
            archiveReason: null
          })
          .where(eq(applications.id, entityId));
      }
      
      console.log(`Successfully restored ${entityType} with ID: ${entityId}`);
    } catch (error) {
      console.error(`Error restoring ${entityType}:`, error);
      throw error;
    }
  }

  async getArchiveStatistics(): Promise<any> {
    try {
      const companyCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(companies)
        .where(eq(companies.isArchived, true));

      const facilityCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(facilities)
        .where(eq(facilities.isArchived, true));

      const applicationCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(applications)
        .where(eq(applications.isArchived, true));

      return {
        companies: companyCount[0]?.count || 0,
        facilities: facilityCount[0]?.count || 0,
        applications: applicationCount[0]?.count || 0,
      };
    } catch (error) {
      console.error("Error fetching archive statistics:", error);
      throw error;
    }
  }

  async getConstraintIssues(): Promise<any[]> {
    try {
      // This method identifies entities that have foreign key references that would prevent deletion
      // For now, return an empty array as the archive system handles this through soft deletion
      const issues: any[] = [];

      // Check for companies with facilities or applications that would prevent deletion
      const companiesWithReferences = await db
        .select({
          id: companies.id,
          name: companies.name,
          facilityCount: sql<number>`(SELECT COUNT(*) FROM facilities WHERE company_id = companies.id AND is_archived = false)`,
          applicationCount: sql<number>`(SELECT COUNT(*) FROM applications WHERE company_id = companies.id AND is_archived = false)`,
        })
        .from(companies)
        .where(eq(companies.isArchived, false));

      for (const company of companiesWithReferences) {
        if (company.facilityCount > 0 || company.applicationCount > 0) {
          issues.push({
            entityId: company.id,
            entityName: company.name,
            entityType: 'companies',
            constraintType: 'foreign_key_reference',
            referencedTable: 'facilities, applications',
            referenceCount: company.facilityCount + company.applicationCount,
          });
        }
      }

      return issues;
    } catch (error) {
      console.error("Error fetching constraint issues:", error);
      throw error;
    }
  }

  async bulkArchiveEntities(options: {
    entityType: 'companies' | 'facilities' | 'applications';
    entityIds: number[];
    reason: string;
    includeRelated: boolean;
    archivedBy: string;
  }): Promise<any> {
    try {
      const { entityType, entityIds, reason, includeRelated, archivedBy } = options;
      const archiveData = {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy,
        archiveReason: reason,
      };

      let archivedCount = 0;

      switch (entityType) {
        case 'companies':
          // If including related entities, get all applications that will be archived
          let companyApplicationsToArchive: any[] = [];
          if (includeRelated) {
            companyApplicationsToArchive = await db
              .select({
                id: applications.id,
                applicationId: applications.applicationId,
                title: applications.title,
                activityType: applications.activityType,
                companyId: applications.companyId,
                facilityId: applications.facilityId,
              })
              .from(applications)
              .where(inArray(applications.companyId, entityIds));
          }

          await db
            .update(companies)
            .set(archiveData)
            .where(inArray(companies.id, entityIds));
          archivedCount = entityIds.length;

          if (includeRelated) {
            // Archive related facilities
            await db
              .update(facilities)
              .set(archiveData)
              .where(inArray(facilities.companyId, entityIds));

            // Archive related applications
            await db
              .update(applications)
              .set(archiveData)
              .where(inArray(applications.companyId, entityIds));

            // Create ghost IDs for all archived applications
            for (const app of companyApplicationsToArchive) {
              await this.addGhostApplicationId(
                app.applicationId,
                app.companyId,
                app.facilityId,
                app.activityType,
                app.title
              );
              console.log(`[ARCHIVE-CASCADE] Created ghost ID for application ${app.applicationId} (company archived)`);
            }
          }
          break;

        case 'facilities':
          // If including related entities, get all applications that will be archived
          let facilityApplicationsToArchive: any[] = [];
          if (includeRelated) {
            facilityApplicationsToArchive = await db
              .select({
                id: applications.id,
                applicationId: applications.applicationId,
                title: applications.title,
                activityType: applications.activityType,
                companyId: applications.companyId,
                facilityId: applications.facilityId,
              })
              .from(applications)
              .where(inArray(applications.facilityId, entityIds));
          }

          await db
            .update(facilities)
            .set(archiveData)
            .where(inArray(facilities.id, entityIds));
          archivedCount = entityIds.length;

          if (includeRelated) {
            // Archive related applications
            await db
              .update(applications)
              .set(archiveData)
              .where(inArray(applications.facilityId, entityIds));

            // Create ghost IDs for all archived applications
            for (const app of facilityApplicationsToArchive) {
              await this.addGhostApplicationId(
                app.applicationId,
                app.companyId,
                app.facilityId,
                app.activityType,
                app.title
              );
              console.log(`[ARCHIVE-CASCADE] Created ghost ID for application ${app.applicationId} (facility archived)`);
            }
          }
          break;

        case 'applications':
          // Get application details before archiving to create ghost IDs
          const applicationsToArchive = await db
            .select({
              id: applications.id,
              applicationId: applications.applicationId,
              title: applications.title,
              activityType: applications.activityType,
              companyId: applications.companyId,
              facilityId: applications.facilityId,
            })
            .from(applications)
            .where(inArray(applications.id, entityIds));

          // Archive the applications
          await db
            .update(applications)
            .set(archiveData)
            .where(inArray(applications.id, entityIds));

          // Create ghost IDs for each archived application
          for (const app of applicationsToArchive) {
            await this.addGhostApplicationId(
              app.applicationId,
              app.companyId,
              app.facilityId,
              app.activityType,
              app.title
            );
            console.log(`[ARCHIVE] Created ghost ID for application ${app.applicationId}`);
          }

          archivedCount = entityIds.length;
          break;

        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      return {
        success: true,
        archivedCount,
        message: `Successfully archived ${archivedCount} ${entityType}`,
      };
    } catch (error) {
      console.error("Error archiving entities:", error);
      throw error;
    }
  }

  async restoreEntities(entityIds: number[], restoredBy: string): Promise<any> {
    try {
      const restoreData = {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
      };

      // Restore entities across all tables
      await db
        .update(companies)
        .set(restoreData)
        .where(inArray(companies.id, entityIds));

      await db
        .update(facilities)
        .set(restoreData)
        .where(inArray(facilities.id, entityIds));

      await db
        .update(applications)
        .set(restoreData)
        .where(inArray(applications.id, entityIds));

      return {
        success: true,
        restoredCount: entityIds.length,
        message: `Successfully restored ${entityIds.length} entities`,
      };
    } catch (error) {
      console.error("Error restoring entities:", error);
      throw error;
    }
  }

  async permanentDeleteEntities(entityIds: number[]): Promise<any> {
    try {
      console.log(`[BULK DELETE] Starting permanent deletion of entities:`, entityIds);
      
      if (!entityIds || entityIds.length === 0) {
        throw new Error("No entities provided for deletion");
      }
      
      // Get all application IDs that need to be cleaned up
      const archivedApplications = await db
        .select({ id: applications.id, applicationId: applications.applicationId })
        .from(applications)
        .where(and(
          inArray(applications.id, entityIds),
          eq(applications.isArchived, true)
        ));

      const applicationIds = archivedApplications.map(app => app.id);
      console.log(`[BULK DELETE] Found ${applicationIds.length} archived applications to delete:`, applicationIds);

      // Step 1: Clean up all dependent records for applications using raw SQL for reliability
      if (applicationIds.length > 0) {
        const applicationIdList = applicationIds.join(',');
        
        // Delete activity template submissions
        try {
          await db.execute(sql`DELETE FROM activity_template_submissions WHERE application_id IN (${sql.raw(applicationIdList)})`);
          console.log(`[BULK DELETE] Cleaned up activity_template_submissions`);
        } catch (err) {
          console.log(`[BULK DELETE] Warning: activity_template_submissions cleanup failed:`, err.message);
        }
        
        // Delete application submissions  
        try {
          await db.execute(sql`DELETE FROM application_submissions WHERE application_id IN (${sql.raw(applicationIdList)})`);
          console.log(`[BULK DELETE] Cleaned up application_submissions`);
        } catch (err) {
          console.log(`[BULK DELETE] Warning: application_submissions cleanup failed:`, err.message);
        }
        
        // Delete documents
        try {
          await db.execute(sql`DELETE FROM documents WHERE application_id IN (${sql.raw(applicationIdList)})`);
          console.log(`[BULK DELETE] Cleaned up documents`);
        } catch (err) {
          console.log(`[BULK DELETE] Warning: documents cleanup failed:`, err.message);
        }
        
        // Delete notifications
        try {
          await db.execute(sql`DELETE FROM notifications WHERE application_id IN (${sql.raw(applicationIdList)})`);
          console.log(`[BULK DELETE] Cleaned up notifications`);
        } catch (err) {
          console.log(`[BULK DELETE] Warning: notifications cleanup failed:`, err.message);
        }
        
        // Delete messages
        try {
          await db.execute(sql`DELETE FROM messages WHERE application_id IN (${sql.raw(applicationIdList)})`);
          console.log(`[BULK DELETE] Cleaned up messages`);
        } catch (err) {
          console.log(`[BULK DELETE] Warning: messages cleanup failed:`, err.message);
        }
        
        // Delete contractor assignments
        try {
          await db.execute(sql`DELETE FROM application_assignments WHERE application_id IN (${sql.raw(applicationIdList)})`);
          console.log(`[BULK DELETE] Cleaned up application_assignments`);
        } catch (err) {
          console.log(`[BULK DELETE] Warning: application_assignments cleanup failed:`, err.message);
        }
      }

      // Step 2: Clean up ghost application IDs
      await db
        .delete(ghostApplicationIds)
        .where(or(
          inArray(ghostApplicationIds.companyId, entityIds),
          inArray(ghostApplicationIds.facilityId, entityIds)
        ));
      console.log(`[BULK DELETE] Cleaned up ghost application IDs`);

      // Step 3: Delete entities in proper order with careful dependency handling
      let deletedCount = 0;
      
      // CRITICAL: First handle facilities that have applications
      // Get all facilities that should be deleted and their child applications
      const facilitiesToDelete = await db
        .select({ id: facilities.id, companyId: facilities.companyId })
        .from(facilities)
        .where(and(
          inArray(facilities.id, entityIds),
          eq(facilities.isArchived, true)
        ));
      
      const facilityIds = facilitiesToDelete.map(f => f.id);
      console.log(`[BULK DELETE] Found ${facilityIds.length} facilities to delete:`, facilityIds);
      
      // Delete applications first (child entities)
      if (applicationIds.length > 0) {
        // Get application details before permanent deletion to create ghost IDs
        const applicationsToDelete = await db
          .select({
            id: applications.id,
            applicationId: applications.applicationId,
            title: applications.title,
            activityType: applications.activityType,
            companyId: applications.companyId,
            facilityId: applications.facilityId,
          })
          .from(applications)
          .where(and(
            inArray(applications.id, entityIds),
            eq(applications.isArchived, true)
          ));

        // Create ghost IDs for each application being permanently deleted
        for (const app of applicationsToDelete) {
          await this.addGhostApplicationId(
            app.applicationId,
            app.companyId,
            app.facilityId,
            app.activityType,
            app.title
          );
          console.log(`[PERMANENT DELETE] Created ghost ID for application ${app.applicationId}`);
        }

        const deletedApps = await db
          .delete(applications)
          .where(and(
            inArray(applications.id, entityIds),
            eq(applications.isArchived, true)
          ));
        console.log(`[BULK DELETE] Deleted ${applicationIds.length} applications`);
        deletedCount += applicationIds.length;
      }
      
      // Clean up any remaining applications that reference facilities we're about to delete
      if (facilityIds.length > 0) {
        // Get remaining applications to create ghost IDs
        const remainingApplications = await db.execute(sql`
          SELECT id, application_id, title, activity_type, company_id, facility_id 
          FROM applications 
          WHERE facility_id IN (${sql.raw(facilityIds.join(','))}) AND is_archived = true
        `);
        
        // Create ghost IDs for remaining applications
        for (const app of remainingApplications.rows) {
          await this.addGhostApplicationId(
            app.application_id as string,
            app.company_id as number,
            app.facility_id as number,
            app.activity_type as string,
            app.title as string
          );
          console.log(`[PERMANENT DELETE CASCADE] Created ghost ID for application ${app.application_id} (facility cascade)`);
        }
        
        await db.execute(sql`DELETE FROM applications WHERE facility_id IN (${sql.raw(facilityIds.join(','))}) AND is_archived = true`);
        console.log(`[BULK DELETE] Cleaned up remaining applications for facilities`);
      }

      // Delete facilities (middle-level entities)
      if (facilityIds.length > 0) {
        const deletedFacilities = await db
          .delete(facilities)
          .where(and(
            inArray(facilities.id, entityIds),
            eq(facilities.isArchived, true)
          ));
        console.log(`[BULK DELETE] Deleted ${facilityIds.length} facilities`);
        deletedCount += facilityIds.length;
      }

      // Finally delete companies (parent entities) - only after ALL child entities are gone
      const companiesToDelete = await db
        .select({ id: companies.id })
        .from(companies)
        .where(and(
          inArray(companies.id, entityIds),
          eq(companies.isArchived, true)
        ));
      
      if (companiesToDelete.length > 0) {
        const companyIds = companiesToDelete.map(c => c.id);
        console.log(`[BULK DELETE] About to delete ${companyIds.length} companies:`, companyIds);
        
        // Double-check no facilities are left
        const remainingFacilities = await db
          .select({ id: facilities.id })
          .from(facilities)
          .where(inArray(facilities.companyId, companyIds));
        
        if (remainingFacilities.length > 0) {
          console.log(`[BULK DELETE] Warning: ${remainingFacilities.length} facilities still exist for companies`);
          // Clean up any remaining facilities
          await db.execute(sql`DELETE FROM facilities WHERE company_id IN (${sql.raw(companyIds.join(','))})`);
          console.log(`[BULK DELETE] Force deleted remaining facilities`);
        }
        
        const deletedCompanies = await db
          .delete(companies)
          .where(and(
            inArray(companies.id, entityIds),
            eq(companies.isArchived, true)
          ));
        console.log(`[BULK DELETE] Deleted ${companyIds.length} companies`);
        deletedCount += companyIds.length;
      }

      console.log(`[BULK DELETE] Successfully completed permanent deletion of ${entityIds.length} entities`);
      
      return {
        success: true,
        deletedCount: entityIds.length,
        message: `Permanently deleted ${entityIds.length} archived entities`,
      };
    } catch (error) {
      console.error("[BULK DELETE] Error permanently deleting entities:", error);
      throw new Error(`Failed to permanently delete entities: ${error.message}`);
    }
  }

  // ============================================================================
  // RECOGNITION SYSTEM METHODS
  // ============================================================================

  // Badge Management
  async createBadge(badgeData: {
    name: string;
    description?: string;
    imageUrl?: string;
    imageFile?: string;
    createdBy: string;
  }): Promise<Badge> {
    try {
      const [badge] = await db
        .insert(badges)
        .values(badgeData)
        .returning();
      return badge;
    } catch (error) {
      console.error('Error creating badge:', error);
      throw error;
    }
  }

  async getAllBadges(): Promise<Badge[]> {
    try {
      return await db
        .select()
        .from(badges)
        .where(eq(badges.isActive, true))
        .orderBy(badges.name);
    } catch (error) {
      console.error('Error fetching badges:', error);
      throw error;
    }
  }

  async updateBadge(badgeId: number, updates: Partial<Badge>): Promise<Badge> {
    try {
      const [updatedBadge] = await db
        .update(badges)
        .set(updates)
        .where(eq(badges.id, badgeId))
        .returning();
      return updatedBadge;
    } catch (error) {
      console.error('Error updating badge:', error);
      throw error;
    }
  }

  async deleteBadge(badgeId: number): Promise<void> {
    try {
      await db
        .update(badges)
        .set({ isActive: false })
        .where(eq(badges.id, badgeId));
    } catch (error) {
      console.error('Error deleting badge:', error);
      throw error;
    }
  }

  // Company Badge Assignments
  async assignBadgeToCompany(assignmentData: {
    companyId: number;
    badgeId: number;
    awardedBy: string;
    awardNote?: string;
    displayOrder?: number;
  }): Promise<CompanyBadge> {
    try {
      const [assignment] = await db
        .insert(companyBadges)
        .values(assignmentData)
        .returning();
      return assignment;
    } catch (error) {
      console.error('Error assigning badge to company:', error);
      throw error;
    }
  }

  async getCompanyBadges(companyId: number): Promise<(CompanyBadge & { badge: Badge })[]> {
    try {
      return await db
        .select({
          id: companyBadges.id,
          companyId: companyBadges.companyId,
          badgeId: companyBadges.badgeId,
          awardedDate: companyBadges.awardedDate,
          awardedBy: companyBadges.awardedBy,
          displayOrder: companyBadges.displayOrder,
          isVisible: companyBadges.isVisible,
          awardNote: companyBadges.awardNote,
          badge: {
            id: badges.id,
            name: badges.name,
            description: badges.description,
            imageUrl: badges.imageUrl,
            imageFile: badges.imageFile,
            createdAt: badges.createdAt,
            createdBy: badges.createdBy,
            isActive: badges.isActive,
          },
        })
        .from(companyBadges)
        .leftJoin(badges, eq(companyBadges.badgeId, badges.id))
        .where(and(
          eq(companyBadges.companyId, companyId),
          eq(companyBadges.isVisible, true)
        ))
        .orderBy(companyBadges.displayOrder, companyBadges.awardedDate);
    } catch (error) {
      console.error('Error fetching company badges:', error);
      throw error;
    }
  }

  async removeBadgeFromCompany(companyId: number, badgeId: number): Promise<void> {
    try {
      await db
        .delete(companyBadges)
        .where(and(
          eq(companyBadges.companyId, companyId),
          eq(companyBadges.badgeId, badgeId)
        ));
    } catch (error) {
      console.error('Error removing badge from company:', error);
      throw error;
    }
  }

  // Recognition Content Management
  async createRecognitionContent(contentData: {
    companyId: number;
    contentType: string;
    title?: string;
    content?: string;
    imageUrl?: string;
    imageFile?: string;
    imageSize?: string;
    displayOrder?: number;
    createdBy: string;
  }): Promise<RecognitionContent> {
    // Always save title, even for image/photo content
    const dataToInsert = {
      ...contentData,
      title: typeof contentData.title === 'string' ? contentData.title : '',
      content: typeof contentData.content === 'string' ? contentData.content : '',
      imageUrl: typeof contentData.imageUrl === 'string' ? contentData.imageUrl : '',
      imageFile: typeof contentData.imageFile === 'string' ? contentData.imageFile : '',
      imageSize: typeof contentData.imageSize === 'string' ? contentData.imageSize : 'medium',
      displayOrder: typeof contentData.displayOrder === 'number' ? contentData.displayOrder : 0,
    };
    try {
      const [content] = await db
        .insert(recognitionContent)
        .values(dataToInsert)
        .returning();
      return content;
    } catch (error) {
      console.error('Error creating recognition content:', error);
      throw error;
    }
  }

  async getRecognitionContent(companyId: number): Promise<RecognitionContent[]> {
    try {
      const rawContent = await db
        .select()
        .from(recognitionContent)
        .where(and(
          eq(recognitionContent.companyId, companyId),
          eq(recognitionContent.isVisible, true)
        ))
        .orderBy(recognitionContent.displayOrder, recognitionContent.createdAt);
      // Normalize contentType for frontend
      return rawContent.map((item: any) => ({
        ...item,
        contentType: item.contentType === 'header' ? 'header'
          : item.contentType === 'content' || item.contentType === 'text_section' ? 'description'
          : item.contentType === 'image' ? 'photo'
          : item.contentType // fallback to original if unknown
      }));
    } catch (error) {
      console.error('Error fetching recognition content:', error);
      throw error;
    }
  }

  async updateRecognitionContent(contentId: number, updates: Partial<RecognitionContent>): Promise<RecognitionContent> {
    // Always update title if provided, even for image/photo content
    const updatesToApply: any = {
      ...updates,
      updatedAt: new Date(),
    };
    // Only set title if provided (do not override with undefined)
    if (updates.title !== undefined) {
      updatesToApply.title = updates.title;
    } else {
      delete updatesToApply.title;
    }
    try {
      const [updatedContent] = await db
        .update(recognitionContent)
        .set(updatesToApply)
        .where(eq(recognitionContent.id, contentId))
        .returning();
      return updatedContent;
    } catch (error) {
      console.error('Error updating recognition content:', error);
      throw error;
    }
  }

  async deleteRecognitionContent(contentId: number): Promise<void> {
    try {
      await db
        .delete(recognitionContent)
        .where(eq(recognitionContent.id, contentId));
    } catch (error) {
      console.error('Error deleting recognition content:', error);
      throw error;
    }
  }

  // Recognition Page Settings
  async getRecognitionPageSettings(companyId: number): Promise<RecognitionPageSettings | null> {
    try {
      const [settings] = await db
        .select()
        .from(recognitionPageSettings)
        .where(eq(recognitionPageSettings.companyId, companyId));
      return settings || null;
    } catch (error) {
      console.error('Error fetching recognition page settings:', error);
      throw error;
    }
  }

  async createOrUpdateRecognitionPageSettings(settingsData: {
    companyId: number;
    isEnabled?: boolean;
    pageTitle?: string;
    welcomeMessage?: string;
    badgesSectionTitle?: string;
    contentSectionTitle?: string;
    createdBy?: string;
    updatedBy?: string;
  }): Promise<RecognitionPageSettings> {
    try {
      // Try to update first
      const existingSettings = await this.getRecognitionPageSettings(settingsData.companyId);
      
      if (existingSettings) {
        const [updated] = await db
          .update(recognitionPageSettings)
          .set({
            ...settingsData,
            updatedAt: new Date(),
          })
          .where(eq(recognitionPageSettings.companyId, settingsData.companyId))
          .returning();
        return updated;
      } else {
        // Create new settings
        const [created] = await db
          .insert(recognitionPageSettings)
          .values({
            ...settingsData,
            createdBy: settingsData.createdBy || settingsData.updatedBy || '',
          })
          .returning();
        return created;
      }
    } catch (error) {
      console.error('Error creating/updating recognition page settings:', error);
      throw error;
    }
  }

  async getCompanyRecognitionPage(companyId: number): Promise<{
    settings: RecognitionPageSettings | null;
    badges: (CompanyBadge & { badge: Badge })[];
    content: RecognitionContent[];
  }> {
    try {
      const [settings, badges, content] = await Promise.all([
        this.getRecognitionPageSettings(companyId),
        this.getCompanyBadges(companyId),
        this.getRecognitionContent(companyId),
      ]);
      // content is already normalized by getRecognitionContent
      return {
        settings,
        badges,
        content: content.map((item: any) => ({
          ...item,
          title: typeof item.title === 'string' ? item.title : '',
        })),
      };
    } catch (error) {
      console.error('Error fetching company recognition page:', error);
      throw error;
    }
  }

  // ============================================================================
  // PASSWORD RESET SYSTEM
  // ============================================================================
  // Provides comprehensive forgot password and temporary password functionality

  async createPasswordResetToken(email: string): Promise<{ token: string; expiry: Date } | null> {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        return null; // Don't reveal if user exists
      }

      // Generate random token and expiry (1 hour from now)
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db
        .update(users)
        .set({
          resetToken: token,
          resetExpiry: expiry,
        })
        .where(eq(users.email, email));

      return { token, expiry };
    } catch (error) {
      console.error('Error creating password reset token:', error);
      throw error;
    }
  }

  async setTemporaryPassword(email: string, tempPassword: string): Promise<void> {
    try {
      const hashedPassword = await hashPassword(tempPassword);
      
      await db
        .update(users)
        .set({
          password: hashedPassword,
          isTemporaryPassword: true,
          resetToken: null, // Clear reset token after setting temp password
          resetExpiry: null,
        })
        .where(eq(users.email, email));
    } catch (error) {
      console.error('Error setting temporary password:', error);
      throw error;
    }
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    try {
      const hashedPassword = await hashPassword(newPassword);
      
      await db
        .update(users)
        .set({
          password: hashedPassword,
          isTemporaryPassword: false, // Clear temporary password flag
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  async updateCompanyServices(companyId: number, updates: { 
    serviceRegions: string[]; 
    supportedActivities: string[]; 
    capitalRetrofitTechnologies?: string[] 
  }): Promise<void> {
    try {
      const updateData: any = {
        serviceRegions: updates.serviceRegions,
        supportedActivities: updates.supportedActivities,
        updatedAt: new Date()
      };

      if (updates.capitalRetrofitTechnologies !== undefined) {
        updateData.capitalRetrofitTechnologies = updates.capitalRetrofitTechnologies;
      }

      await db
        .update(companies)
        .set(updateData)
        .where(eq(companies.id, companyId));
    } catch (error) {
      console.error('Error updating company services:', error);
      throw error;
    }
  }

  async getTeamMembersByCompany(companyId: number): Promise<User[]> {
    try {
      const teamMembers = await db
        .select()
        .from(users)
        .where(eq(users.companyId, companyId));

      return teamMembers;
    } catch (error) {
      console.error('Error fetching team members by company:', error);
      throw error;
    }
  }

  async getPendingTeamInvitations(companyId: number) {
    try {
      const invitations = await db.execute(sql`
        SELECT ti.*, u.first_name as inviter_first_name, u.last_name as inviter_last_name
        FROM team_invitations ti
        LEFT JOIN users u ON ti.invited_by_user_id = u.id
        WHERE ti.company_id = ${companyId} AND ti.status = 'pending'
        ORDER BY ti.created_at DESC
      `);

      return invitations.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        permissionLevel: row.permission_level,
        role: row.role,
        status: row.status,
        token: row.token,
        inviterName: `${row.inviter_first_name} ${row.inviter_last_name}`,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error fetching pending team invitations:', error);
      throw error;
    }
  }

  async createContractorTeamMember(memberData: {
    email: string;
    firstName: string;
    lastName: string;
    permissionLevel: string;
    role: string;
    companyId: number;
    tempPassword: string;
  }) {
    try {
      console.log('[STORAGE] Creating contractor team member with data:', memberData);
      
      // Hash the temporary password
      const hashedPassword = await hashPassword(memberData.tempPassword);
      console.log('[STORAGE] Hashed temporary password for new member');
      
      // Create user account directly
      const userId = nanoid();
      const result = await db.insert(users).values({
        id: userId,
        email: memberData.email,
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        password: hashedPassword,
        role: memberData.role,
        permissionLevel: memberData.permissionLevel,
        companyId: memberData.companyId,
        isActive: true,
        isEmailVerified: true, // Auto-verify contractor team members
        emailVerifiedAt: new Date(),
        isTemporaryPassword: true, // Mark as temporary so they must change it
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      console.log('[STORAGE] Successfully created contractor team member:', result[0].id);
      return result[0];
    } catch (error) {
      console.error('Error creating contractor team member:', error);
      throw error;
    }
  }

  async createTeamInvitation(invitationData: {
    email: string;
    firstName: string;
    lastName: string;
    permissionLevel: string;
    role: string;
    companyId: number;
    invitedByUserId: string;
  }) {
    try {
      console.log('[STORAGE] Creating team invitation with data:', invitationData);
      console.log('[STORAGE] Database instance available:', !!db);
      console.log('[STORAGE] teamInvitations table available:', !!teamInvitations);
      
      const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
      
      console.log('[STORAGE] About to insert with token:', invitationToken);
      const result = await db.insert(teamInvitations).values({
        email: invitationData.email,
        firstName: invitationData.firstName,
        lastName: invitationData.lastName,
        permissionLevel: invitationData.permissionLevel,
        companyId: invitationData.companyId,
        invitedByUserId: invitationData.invitedByUserId,
        invitationToken: invitationToken,
        status: 'pending',
        expiresAt: expiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return result[0];
    } catch (error) {
      console.error('Error creating team invitation:', error);
      throw error;
    }
  }

  async updateUserPermissions(userId: string, permissionLevel: string) {
    try {
      await db.execute(sql`
        UPDATE users 
        SET permission_level = ${permissionLevel}, updated_at = NOW()
        WHERE id = ${userId}
      `);

      console.log(`Updated permissions for user ${userId} to ${permissionLevel}`);
    } catch (error) {
      console.error('Error updating user permissions:', error);
      throw error;
    }
  }

  async deleteTeamMember(userId: string) {
    try {
      console.log(`Removing team member ${userId} from company (preserving user account)`);
      
      // ONLY remove company association - DO NOT delete the user account
      // Set company_id to NULL to remove them from the company while preserving the user
      await db.execute(sql`
        UPDATE users SET company_id = NULL WHERE id = ${userId}
      `);
      
      // Remove any team-specific assignments but preserve the user's historical data
      await db.execute(sql`
        DELETE FROM application_assignments WHERE user_id = ${userId}
      `);
      
      // Remove any pending team invitations sent by this user (cleanup)
      await db.execute(sql`
        DELETE FROM team_invitations WHERE invited_by_user_id = ${userId}
      `);
      
      // Remove user-specific notifications (cleanup)
      await db.execute(sql`
        DELETE FROM notifications WHERE user_id = ${userId}
      `);

      // Remove contractor details if they exist (company-specific role)
      await db.execute(sql`
        DELETE FROM contractor_details WHERE user_id = ${userId}
      `);

      // NOTE: We preserve applications, documents, messages, and submissions 
      // as these are historical records that should remain in the system
      // The user account remains active and can join other companies

      console.log(`Successfully removed team member ${userId} from company (user account preserved)`);
    } catch (error) {
      console.error('Error removing team member from company:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
