import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  pgEnum,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const roleEnum = pgEnum("role", ["team_member", "company_admin", "contractor_individual", "contractor_team_member", "contractor_account_owner", "contractor_manager", "system_admin"]);
export const permissionLevelEnum = pgEnum("permission_level", ["viewer", "editor", "manager", "owner"]);
export const activityTypeEnum = pgEnum("activity_type", ["FRA", "SEM", "EAA", "EMIS", "CR"]);
export const applicationStatusEnum = pgEnum("application_status", ["draft", "in_progress", "submitted", "under_review", "approved", "rejected", "needs_revision", "completed", "revision_required"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected", "needs_revision"]);
export const documentTypeEnum = pgEnum("document_type", ["pre_activity", "post_activity", "supporting", "template", "other"]);
export const typeOfOperationEnum = pgEnum("type_of_operation", ["continuous", "semi_continuous", "batch"]);
export const notificationTypeEnum = pgEnum("notification_type", ["facility_added", "application_submitted", "application_status_changed", "team_member_added", "document_uploaded", "ticket_resolved", "message_received", "ticket_updated", "new_message", "admin_reply"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "declined", "expired"]);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  businessMobile: varchar("business_mobile"),
  profileImageUrl: varchar("profile_image_url"),
  role: roleEnum("role").default("team_member").notNull(),
  permissionLevel: permissionLevelEnum("permission_level").default("viewer"),
  companyId: integer("company_id"),
  isActive: boolean("is_active").default(true),
  hearAboutUs: varchar("hear_about_us"),
  hearAboutUsOther: varchar("hear_about_us_other"),
  emailVerificationToken: varchar("email_verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  emailVerifiedAt: timestamp("email_verified_at"),
  isEmailVerified: boolean("is_email_verified").default(false),
  resetToken: varchar("reset_token"),
  resetExpiry: timestamp("reset_expiry"),
  isTemporaryPassword: boolean("is_temporary_password").default(false),
  twoFactorSecret: varchar("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 6 }).notNull().unique(),
  businessNumber: varchar("business_number"),
  website: varchar("website"),
  
  // Address Information
  streetAddress: text("street_address"),
  city: varchar("city"),
  province: varchar("province"),
  country: varchar("country"),
  postalCode: varchar("postal_code"),
  
  // Legacy fields
  address: text("address"), // Keep for backward compatibility
  phone: varchar("phone", { length: 20 }),
  
  // Program Discovery
  howHeardAbout: varchar("how_heard_about"),
  howHeardAboutOther: text("how_heard_about_other"),
  
  // Contractor Information
  isContractor: boolean("is_contractor").default(false),
  serviceRegions: text("service_regions").array(),
  supportedActivities: text("supported_activities").array(),
  capitalRetrofitTechnologies: text("capital_retrofit_technologies").array(),
  
  isActive: boolean("is_active").default(true),
  
  // Archive fields for soft deletion
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"),
  archiveReason: text("archive_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facilities
export const facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 3 }).notNull(),
  
  // NAICS Information
  naicsCode: varchar("naics_code"),
  facilitySector: varchar("facility_sector"),
  facilityCategory: varchar("facility_category"),
  facilityType: varchar("facility_type"),
  facilityPhotoUrl: varchar("facility_photo_url"),
  
  // Address Information
  unitNumber: varchar("unit_number"),
  streetNumber: varchar("street_number"),
  streetName: varchar("street_name"),
  city: varchar("city"),
  province: varchar("province"),
  country: varchar("country").default("Canada"),
  postalCode: varchar("postal_code"),
  
  // Facility Details
  grossFloorArea: integer("gross_floor_area"),
  grossFloorAreaUnit: varchar("gross_floor_area_unit", { length: 10 }).default("sq_ft"),
  grossFloorAreaIsTemporary: boolean("gross_floor_area_is_temporary").default(false),
  yearBuilt: integer("year_built"),
  weeklyOperatingHours: integer("weekly_operating_hours"),
  weeklyOperatingHoursIsTemporary: boolean("weekly_operating_hours_is_temporary").default(false),
  numberOfWorkersMainShift: integer("number_of_workers_main_shift"),
  numberOfWorkersMainShiftIsTemporary: boolean("number_of_workers_main_shift_is_temporary").default(false),
  typeOfOperation: typeOfOperationEnum("type_of_operation"),
  
  // Energy Management Information System
  hasEMIS: boolean("has_emis"),
  emisRealtimeMonitoring: boolean("emis_realtime_monitoring").default(false),
  emisDescription: text("emis_description"),
  hasEnergyManager: boolean("has_energy_manager"),
  energyManagerFullTime: boolean("energy_manager_full_time").default(false),
  
  // Individual Process and Systems checkboxes
  processCompressedAir: boolean("process_compressed_air").default(false),
  processControlSystem: boolean("process_control_system").default(false),
  processElectrochemical: boolean("process_electrochemical").default(false),
  processFacilityNonProcess: boolean("process_facility_non_process").default(false),
  processFacilitySubmetering: boolean("process_facility_submetering").default(false),
  processHVAC: boolean("process_hvac").default(false),
  processIndustrialGases: boolean("process_industrial_gases").default(false),
  processLighting: boolean("process_lighting").default(false),
  processMotors: boolean("process_motors").default(false),
  processOther: boolean("process_other").default(false),
  processPumpingFans: boolean("process_pumping_fans").default(false),
  processRefrigeration: boolean("process_refrigeration").default(false),
  processWasteHeatRecovery: boolean("process_waste_heat_recovery").default(false),
  processMaterialProcessing: boolean("process_material_processing").default(false),
  processProcessCooling: boolean("process_process_cooling").default(false),
  processProcessHeating: boolean("process_process_heating").default(false),
  processPumps: boolean("process_pumps").default(false),
  processSteamSystem: boolean("process_steam_system").default(false),
  processOtherSystems: boolean("process_other_systems").default(false),
  processCombinedHeatPower: boolean("process_combined_heat_power").default(false),
  processFansBlowers: boolean("process_fans_blowers").default(false),
  processMaterialHandling: boolean("process_material_handling").default(false),
  
  // Facility Process and Systems (stored as JSON array for backward compatibility)
  processAndSystems: text("process_and_systems").array(),
  
  // Legacy fields
  address: text("address"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  
  // Archive fields for soft deletion
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"),
  archiveReason: text("archive_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applications
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  applicationId: varchar("application_id", { length: 50 }).notNull().unique(),
  companyId: integer("company_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  activityType: activityTypeEnum("activity_type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: applicationStatusEnum("status").default("draft").notNull(),
  submittedBy: varchar("submitted_by"),
  submittedAt: timestamp("submitted_at"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  // Archive fields for soft deletion
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"),
  archiveReason: text("archive_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id"),
  companyId: integer("company_id"),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  isTemplate: boolean("is_template").default(false),
  isGlobal: boolean("is_global").default(false),
  uploadedBy: varchar("uploaded_by").notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contractor details
export const contractorDetails = pgTable("contractor_details", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  supportedActivities: varchar("supported_activities").array(),
  technologyCapabilities: varchar("technology_capabilities").array(),
  serviceRegions: varchar("service_regions").array(),
  hasGST: boolean("has_gst").default(false),
  hasWCB: boolean("has_wcb").default(false),
  hasInsurance: boolean("has_insurance").default(false),
  codeOfConductSigned: boolean("code_of_conduct_signed").default(false),
  codeOfConductSignedAt: timestamp("code_of_conduct_signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Application assignments (for contractor access)
export const applicationAssignments = pgTable("application_assignments", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  userId: varchar("user_id").notNull(),
  assignedBy: varchar("assigned_by").notNull(),
  permissions: varchar("permissions").array().default(["view"]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Company-level application assignments (for tracking contractor company access)
export const companyApplicationAssignments = pgTable("company_application_assignments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(), // The company that owns the application
  applicationId: integer("application_id").notNull(),
  contractorCompanyId: integer("contractor_company_id"), // The contractor company being assigned
  assignedBy: varchar("assigned_by").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity settings (admin configurable)
export const activitySettings = pgTable("activity_settings", {
  id: serial("id").primaryKey(),
  activityType: activityTypeEnum("activity_type").notNull().unique(),
  isEnabled: boolean("is_enabled").default(true),
  requiresFRA: boolean("requires_fra").default(false),
  maxApplications: integer("max_applications"),
  description: text("description"),
  // Contractor assignment fields
  allowContractorAssignment: boolean("allow_contractor_assignment").default(false),
  contractorFilterType: varchar("contractor_filter_type", { length: 20 }).default("all"),
  requiredContractorActivities: text("required_contractor_activities").array(),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Facility Activity Settings - Enerva admin can enable/disable activities per facility
export const facilityActivitySettings = pgTable("facility_activity_settings", {
  id: serial("id").primaryKey(),
  facilityId: integer("facility_id").notNull(),
  activityType: activityTypeEnum("activity_type").notNull(),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  enabledBy: varchar("enabled_by"), // system admin who enabled it
  enabledAt: timestamp("enabled_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity Templates - Redesigned for flexible activity management
export const activityTemplates = pgTable("activity_templates", {
  id: serial("id").primaryKey(),
  activityType: activityTypeEnum("activity_type").notNull(), // FRA, SEM, EAA, EMIS, CR
  templateName: varchar("template_name", { length: 255 }).notNull(), // e.g., "Pre-Assessment", "Post-Assessment", "Site Visit"
  displayOrder: integer("display_order").notNull(), // Order within the activity type (1, 2, 3...)
  description: text("description"),
  formFields: text("form_fields"), // JSON string containing form field definitions
  isRequired: boolean("is_required").default(true), // Whether this template must be completed
  prerequisiteTemplateId: integer("prerequisite_template_id"), // Reference to template that must be completed first
  isActive: boolean("is_active").default(true),
  // Contractor assignment fields
  allowContractorAssignment: boolean("allow_contractor_assignment").default(false), // Whether participating companies can assign contractors
  contractorFilterType: varchar("contractor_filter_type", { length: 20 }).default("all"), // "all", "specific_activities"
  requiredContractorActivities: varchar("required_contractor_activities").array(), // Activities contractors must support
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form Templates - Legacy table, keeping for backward compatibility
export const formTemplates = pgTable("form_templates", {
  id: serial("id").primaryKey(),
  activityType: activityTypeEnum("activity_type").notNull(),
  phase: varchar("phase", { length: 20 }), // Optional for new activity-based templates
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  formFields: text("form_fields"), // JSON string containing form field definitions
  order: integer("order").default(1), // Display order for templates
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form Fields - Dynamic fields for each form template
export const formFields = pgTable("form_fields", {
  id: serial("id").primaryKey(),
  formTemplateId: integer("form_template_id").notNull(),
  fieldName: varchar("field_name", { length: 255 }).notNull(),
  fieldLabel: varchar("field_label", { length: 255 }).notNull(),
  fieldType: varchar("field_type", { length: 50 }).notNull(), // 'text', 'textarea', 'select', 'file', 'checkbox', 'number', 'date'
  isRequired: boolean("is_required").default(false),
  options: text("options"), // JSON string for select options
  validation: text("validation"), // JSON string for validation rules
  placeholder: varchar("placeholder", { length: 255 }),
  helpText: text("help_text"),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity Template Submissions - Tracks submissions for each activity template
export const activityTemplateSubmissions = pgTable("activity_template_submissions", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  activityTemplateId: integer("activity_template_id").notNull(),
  data: jsonb("data").notNull(), // JSON of the actual form data submitted
  status: varchar("status", { length: 20 }).default("draft").notNull(), // 'draft', 'submitted', 'reviewed', 'approved', 'rejected'
  approvalStatus: approvalStatusEnum("approval_status").default("pending"),
  submittedAt: timestamp("submitted_at"),
  submittedBy: varchar("submitted_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  templateSnapshot: jsonb("template_snapshot"), // JSON snapshot of the template at submission time
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
});

// Application Submissions - Legacy table for backward compatibility
export const applicationSubmissions = pgTable("application_submissions", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  formTemplateId: integer("form_template_id").notNull(),
  phase: varchar("phase", { length: 20 }).notNull(), // 'pre_activity' or 'post_activity'
  data: jsonb("data").notNull(), // Form submission data
  status: varchar("status", { length: 20 }).default("draft").notNull(), // 'draft', 'submitted', 'reviewed', 'approved', 'rejected'
  approvalStatus: approvalStatusEnum("approval_status").default("pending"),
  submittedAt: timestamp("submitted_at"),
  submittedBy: varchar("submitted_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
});

// Form Responses - User responses to form fields
export const formResponses = pgTable("form_responses", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  formFieldId: integer("form_field_id").notNull(),
  value: text("value"), // Stores the user's response
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages - Communication between users and admin
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: varchar("from_user_id").notNull(),
  toUserId: varchar("to_user_id"), // null for messages to admin
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  isAdminMessage: boolean("is_admin_message").default(false),
  isResolved: boolean("is_resolved").default(false),
  isArchived: boolean("is_archived").default(false),
  isDeleted: boolean("is_deleted").default(false),
  status: varchar("status", { length: 20 }).default("open"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  ticketNumber: varchar("ticket_number", { length: 50 }),
  parentMessageId: integer("parent_message_id"),
  applicationId: integer("application_id"), // optional link to specific application
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications - System notifications for status changes
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'application_approved', 'application_rejected', 'needs_revision', 'new_message'
  isRead: boolean("is_read").default(false),
  applicationId: integer("application_id"), // optional link to specific application
  messageId: integer("message_id"), // optional link to specific message
  createdAt: timestamp("created_at").defaultNow(),
});

// System Announcements - Platform-wide announcements created by system admin
export const systemAnnouncements = pgTable("system_announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'maintenance', 'upgrade', 'issue', 'info', 'urgent'
  severity: varchar("severity", { length: 20 }).default("info").notNull(), // 'low', 'medium', 'high', 'critical'
  targetRoles: varchar("target_roles").array().default([]).notNull(), // ['all'] or specific roles
  isActive: boolean("is_active").default(true).notNull(),
  requiresAcknowledgment: boolean("requires_acknowledgment").default(false).notNull(),
  scheduledStart: timestamp("scheduled_start"),
  scheduledEnd: timestamp("scheduled_end"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Announcement Acknowledgments - Track which users have acknowledged announcements
export const announcementAcknowledgments = pgTable("announcement_acknowledgments", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").notNull(),
  userId: varchar("user_id").notNull(),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
}, (table) => [
  unique().on(table.announcementId, table.userId)
]);

// Team Invitations - For contractor team management
export const teamInvitations = pgTable("team_invitations", {
  id: serial("id").primaryKey(),
  invitedByUserId: varchar("invited_by_user_id").notNull(),
  email: varchar("email").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  permissionLevel: varchar("permission_level").default("viewer").notNull(),
  companyId: integer("company_id").notNull(),
  invitationToken: varchar("invitation_token").notNull().unique(),
  status: varchar("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  username: varchar("username"),
  password: varchar("password"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ghost Application IDs table - tracks deleted application IDs to prevent immediate reuse
export const ghostApplicationIds = pgTable("ghost_application_ids", {
  id: serial("id").primaryKey(),
  applicationId: varchar("application_id", { length: 50 }).notNull().unique(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  activityType: activityTypeEnum("activity_type").notNull(),
  originalTitle: varchar("original_title", { length: 255 }),
  deletedAt: timestamp("deleted_at").defaultNow().notNull(),
});

// Contractor company assignment history (for tracking contractor assignments to applications)
export const contractorCompanyAssignmentHistory = pgTable("contractor_company_assignment_history", {
  applicationId: integer("application_id").notNull(),
  contractorCompanyId: integer("contractor_company_id").notNull(),
  assignedBy: varchar("assigned_by", { length: 255 }).notNull(),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  // Composite primary key
}, (table) => ({
  pk: primaryKey({ columns: [table.applicationId, table.contractorCompanyId] })
}));

// Individual contractor team member application assignments with specific permissions
export const contractorTeamApplicationAssignments = pgTable("contractor_team_application_assignments", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  contractorCompanyId: integer("contractor_company_id").notNull(),
  assignedUserId: varchar("assigned_user_id").notNull(), // The contractor team member assigned
  assignedBy: varchar("assigned_by").notNull(), // Who assigned them (contractor manager/account owner)
  permissions: varchar("permissions").array().default(["view"]).notNull(), // ["view"] or ["view", "edit"]
  assignedAt: timestamp("assigned_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.applicationId, table.assignedUserId) // Each user can only be assigned once per application
]);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  contractorDetails: one(contractorDetails, {
    fields: [users.id],
    references: [contractorDetails.userId],
  }),
  submittedApplications: many(applications, {
    relationName: "submitted_by",
  }),
  reviewedApplications: many(applications, {
    relationName: "reviewed_by",
  }),
  uploadedDocuments: many(documents),
  applicationAssignments: many(applicationAssignments),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  facilities: many(facilities),
  applications: many(applications),
  documents: many(documents),
}));

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  company: one(companies, {
    fields: [facilities.companyId],
    references: [companies.id],
  }),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  company: one(companies, {
    fields: [applications.companyId],
    references: [companies.id],
  }),
  facility: one(facilities, {
    fields: [applications.facilityId],
    references: [facilities.id],
  }),
  submitter: one(users, {
    fields: [applications.submittedBy],
    references: [users.id],
    relationName: "submitted_by",
  }),
  reviewer: one(users, {
    fields: [applications.reviewedBy],
    references: [users.id],
    relationName: "reviewed_by",
  }),
  documents: many(documents),
  assignments: many(applicationAssignments),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  application: one(applications, {
    fields: [documents.applicationId],
    references: [applications.id],
  }),
  company: one(companies, {
    fields: [documents.companyId],
    references: [companies.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const contractorDetailsRelations = relations(contractorDetails, ({ one }) => ({
  user: one(users, {
    fields: [contractorDetails.userId],
    references: [users.id],
  }),
}));

export const applicationAssignmentsRelations = relations(applicationAssignments, ({ one }) => ({
  application: one(applications, {
    fields: [applicationAssignments.applicationId],
    references: [applications.id],
  }),
  user: one(users, {
    fields: [applicationAssignments.userId],
    references: [users.id],
  }),
  assigner: one(users, {
    fields: [applicationAssignments.assignedBy],
    references: [users.id],
  }),
}));

export const companyApplicationAssignmentsRelations = relations(companyApplicationAssignments, ({ one }) => ({
  application: one(applications, {
    fields: [companyApplicationAssignments.applicationId],
    references: [applications.id],
  }),
  contractorCompany: one(companies, {
    fields: [companyApplicationAssignments.contractorCompanyId],
    references: [companies.id],
  }),
  assigner: one(users, {
    fields: [companyApplicationAssignments.assignedBy],
    references: [users.id],
  }),
}));

// Activity Template Relations
export const activityTemplatesRelations = relations(activityTemplates, ({ one, many }) => ({
  prerequisiteTemplate: one(activityTemplates, {
    fields: [activityTemplates.prerequisiteTemplateId],
    references: [activityTemplates.id],
    relationName: "prerequisite",
  }),
  dependentTemplates: many(activityTemplates, {
    relationName: "prerequisite",
  }),
  submissions: many(activityTemplateSubmissions),
}));

export const activityTemplateSubmissionsRelations = relations(activityTemplateSubmissions, ({ one, many }) => ({
  application: one(applications, {
    fields: [activityTemplateSubmissions.applicationId],
    references: [applications.id],
  }),
  activityTemplate: one(activityTemplates, {
    fields: [activityTemplateSubmissions.activityTemplateId],
    references: [activityTemplates.id],
  }),
  submitter: one(users, {
    fields: [activityTemplateSubmissions.submittedBy],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [activityTemplateSubmissions.reviewedBy],
    references: [users.id],
  }),
  formResponses: many(formResponses),
}));

export const formTemplatesRelations = relations(formTemplates, ({ many }) => ({
  formFields: many(formFields),
  applicationSubmissions: many(applicationSubmissions),
}));

export const formFieldsRelations = relations(formFields, ({ one, many }) => ({
  formTemplate: one(formTemplates, {
    fields: [formFields.formTemplateId],
    references: [formTemplates.id],
  }),
  formResponses: many(formResponses),
}));

export const applicationSubmissionsRelations = relations(applicationSubmissions, ({ one, many }) => ({
  application: one(applications, {
    fields: [applicationSubmissions.applicationId],
    references: [applications.id],
  }),
  formTemplate: one(formTemplates, {
    fields: [applicationSubmissions.formTemplateId],
    references: [formTemplates.id],
  }),
  submitter: one(users, {
    fields: [applicationSubmissions.submittedBy],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [applicationSubmissions.reviewedBy],
    references: [users.id],
  }),
  formResponses: many(formResponses),
}));

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  submission: one(applicationSubmissions, {
    fields: [formResponses.submissionId],
    references: [applicationSubmissions.id],
  }),
  formField: one(formFields, {
    fields: [formResponses.formFieldId],
    references: [formFields.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  companyId: true,
  hearAboutUs: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFacilitySchema = createInsertSchema(facilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  submittedAt: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertContractorDetailsSchema = createInsertSchema(contractorDetails).omit({
  id: true,
  codeOfConductSignedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationAssignmentSchema = createInsertSchema(applicationAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertCompanyApplicationAssignmentSchema = createInsertSchema(companyApplicationAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertActivitySettingsSchema = createInsertSchema(activitySettings).omit({
  id: true,
  updatedAt: true,
});

export const insertFacilityActivitySettingsSchema = createInsertSchema(facilityActivitySettings).omit({
  id: true,
  enabledAt: true,
  updatedAt: true,
});

export const insertActivityTemplateSchema = createInsertSchema(activityTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityTemplateSubmissionSchema = createInsertSchema(activityTemplateSubmissions).omit({
  id: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormFieldSchema = createInsertSchema(formFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationSubmissionSchema = createInsertSchema(applicationSubmissions).omit({
  id: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormResponseSchema = createInsertSchema(formResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSystemAnnouncementSchema = createInsertSchema(systemAnnouncements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnouncementAcknowledgmentSchema = createInsertSchema(announcementAcknowledgments).omit({
  id: true,
  acknowledgedAt: true,
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type ContractorDetails = typeof contractorDetails.$inferSelect;
export type InsertContractorDetails = z.infer<typeof insertContractorDetailsSchema>;
export type ApplicationAssignment = typeof applicationAssignments.$inferSelect;
export type CompanyApplicationAssignment = typeof companyApplicationAssignments.$inferSelect;
export type InsertApplicationAssignment = z.infer<typeof insertApplicationAssignmentSchema>;
export type ActivitySettings = typeof activitySettings.$inferSelect;
export type InsertActivitySettings = z.infer<typeof insertActivitySettingsSchema>;
export type FacilityActivitySettings = typeof facilityActivitySettings.$inferSelect;
export type InsertFacilityActivitySettings = z.infer<typeof insertFacilityActivitySettingsSchema>;
export type ActivityTemplate = typeof activityTemplates.$inferSelect;
export type InsertActivityTemplate = z.infer<typeof insertActivityTemplateSchema>;
export type ActivityTemplateSubmission = typeof activityTemplateSubmissions.$inferSelect;
export type InsertActivityTemplateSubmission = z.infer<typeof insertActivityTemplateSubmissionSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormField = typeof formFields.$inferSelect;
export type InsertFormField = z.infer<typeof insertFormFieldSchema>;
export type ApplicationSubmission = typeof applicationSubmissions.$inferSelect;
export type InsertApplicationSubmission = z.infer<typeof insertApplicationSubmissionSchema>;
export type FormResponse = typeof formResponses.$inferSelect;
export type InsertFormResponse = z.infer<typeof insertFormResponseSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type SystemAnnouncement = typeof systemAnnouncements.$inferSelect;
export type InsertSystemAnnouncement = z.infer<typeof insertSystemAnnouncementSchema>;
export type AnnouncementAcknowledgment = typeof announcementAcknowledgments.$inferSelect;
export type InsertAnnouncementAcknowledgment = z.infer<typeof insertAnnouncementAcknowledgmentSchema>;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;

// Recognition System Tables

// Badge Library - stores reusable badges
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  imageFile: varchar("image_file", { length: 255 }), // Local file path
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull(),
  isActive: boolean("is_active").default(true),
});

// Company Badge Assignments - tracks which badges companies have
export const companyBadges = pgTable("company_badges", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  badgeId: integer("badge_id").notNull(),
  awardedDate: timestamp("awarded_date").defaultNow(),
  awardedBy: varchar("awarded_by").notNull(),
  displayOrder: integer("display_order").default(0),
  isVisible: boolean("is_visible").default(true),
  awardNote: text("award_note"), // Optional note about why badge was awarded
}, (table) => [
  unique().on(table.companyId, table.badgeId), // Prevent duplicate badges per company
]);

// Recognition Content - text sections, images, and other content
export const recognitionContent = pgTable("recognition_content", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // 'text_section', 'image', 'header'
  title: varchar("title", { length: 255 }),
  content: text("content"), // Main text content
  imageUrl: varchar("image_url", { length: 500 }),
  imageFile: varchar("image_file", { length: 255 }), // Local file path
  imageSize: varchar("image_size", { length: 20 }).default("medium"), // 'small', 'medium', 'large'
  displayOrder: integer("display_order").default(0),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

// Recognition Page Settings - overall page configuration per company
export const recognitionPageSettings = pgTable("recognition_page_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").unique().notNull(),
  isEnabled: boolean("is_enabled").default(true),
  pageTitle: varchar("page_title", { length: 255 }).default("Recognition"),
  welcomeMessage: text("welcome_message"),
  badgesSectionTitle: varchar("badges_section_title", { length: 255 }).default("Badges & Achievements"),
  contentSectionTitle: varchar("content_section_title", { length: 255 }).default("Recognition"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

// Insert schemas for recognition tables
export const insertBadgeSchema = createInsertSchema(badges);
export const insertCompanyBadgeSchema = createInsertSchema(companyBadges);
export const insertRecognitionContentSchema = createInsertSchema(recognitionContent);
export const insertRecognitionPageSettingsSchema = createInsertSchema(recognitionPageSettings);

// Export types for recognition
export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type CompanyBadge = typeof companyBadges.$inferSelect;
export type InsertCompanyBadge = z.infer<typeof insertCompanyBadgeSchema>;
export type RecognitionContent = typeof recognitionContent.$inferSelect;
export type InsertRecognitionContent = z.infer<typeof insertRecognitionContentSchema>;
export type RecognitionPageSettings = typeof recognitionPageSettings.$inferSelect;
export type InsertRecognitionPageSettings = z.infer<typeof insertRecognitionPageSettingsSchema>;

// Recognition System Relations
export const badgesRelations = relations(badges, ({ many }) => ({
  companyBadges: many(companyBadges),
}));

export const companyBadgesRelations = relations(companyBadges, ({ one }) => ({
  company: one(companies, {
    fields: [companyBadges.companyId],
    references: [companies.id],
  }),
  badge: one(badges, {
    fields: [companyBadges.badgeId],
    references: [badges.id],
  }),
}));

export const recognitionContentRelations = relations(recognitionContent, ({ one }) => ({
  company: one(companies, {
    fields: [recognitionContent.companyId],
    references: [companies.id],
  }),
}));

export const recognitionPageSettingsRelations = relations(recognitionPageSettings, ({ one }) => ({
  company: one(companies, {
    fields: [recognitionPageSettings.companyId],
    references: [companies.id],
  }),
}));
