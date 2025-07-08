CREATE TYPE "public"."activity_type" AS ENUM('FRA', 'SEM', 'EAA', 'EMIS', 'CR');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'needs_revision');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'needs_revision');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('pre_activity', 'post_activity', 'supporting', 'template', 'other');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('facility_added', 'application_submitted', 'application_status_changed', 'team_member_added', 'document_uploaded', 'ticket_resolved', 'message_received', 'ticket_updated', 'new_message', 'admin_reply');--> statement-breakpoint
CREATE TYPE "public"."permission_level" AS ENUM('viewer', 'editor', 'manager', 'owner');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('team_member', 'company_admin', 'contractor_individual', 'contractor_team_member', 'contractor_account_owner', 'contractor_manager', 'system_admin');--> statement-breakpoint
CREATE TYPE "public"."type_of_operation" AS ENUM('continuous', 'semi_continuous', 'batch');--> statement-breakpoint
CREATE TABLE "activity_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"requires_fra" boolean DEFAULT false,
	"max_applications" integer,
	"description" text,
	"allow_contractor_assignment" boolean DEFAULT false,
	"contractor_filter_type" varchar(20) DEFAULT 'all',
	"required_contractor_activities" text[],
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "activity_settings_activity_type_unique" UNIQUE("activity_type")
);
--> statement-breakpoint
CREATE TABLE "activity_template_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"activity_template_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"approval_status" "approval_status" DEFAULT 'pending',
	"submitted_at" timestamp,
	"submitted_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"template_snapshot" jsonb,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text
);
--> statement-breakpoint
CREATE TABLE "activity_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"display_order" integer NOT NULL,
	"description" text,
	"form_fields" text,
	"is_required" boolean DEFAULT true,
	"prerequisite_template_id" integer,
	"is_active" boolean DEFAULT true,
	"allow_contractor_assignment" boolean DEFAULT false,
	"contractor_filter_type" varchar(20) DEFAULT 'all',
	"required_contractor_activities" varchar[],
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "announcement_acknowledgments" (
	"id" serial PRIMARY KEY NOT NULL,
	"announcement_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"acknowledged_at" timestamp DEFAULT now(),
	CONSTRAINT "announcement_acknowledgments_announcement_id_user_id_unique" UNIQUE("announcement_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "application_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"assigned_by" varchar NOT NULL,
	"permissions" varchar[] DEFAULT '{"view"}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"form_template_id" integer NOT NULL,
	"phase" varchar(20) NOT NULL,
	"data" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"approval_status" "approval_status" DEFAULT 'pending',
	"submitted_at" timestamp,
	"submitted_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" varchar(50) NOT NULL,
	"company_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"submitted_by" varchar,
	"submitted_at" timestamp,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"is_archived" boolean DEFAULT false,
	"archived_at" timestamp,
	"archived_by" varchar,
	"archive_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "applications_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"image_url" varchar(500),
	"image_file" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar NOT NULL,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_name" varchar(6) NOT NULL,
	"business_number" varchar,
	"website" varchar,
	"street_address" text,
	"city" varchar,
	"province" varchar,
	"country" varchar,
	"postal_code" varchar,
	"address" text,
	"phone" varchar(20),
	"how_heard_about" varchar,
	"how_heard_about_other" text,
	"is_contractor" boolean DEFAULT false,
	"service_regions" text[],
	"supported_activities" text[],
	"capital_retrofit_technologies" text[],
	"is_active" boolean DEFAULT true,
	"is_archived" boolean DEFAULT false,
	"archived_at" timestamp,
	"archived_by" varchar,
	"archive_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "companies_short_name_unique" UNIQUE("short_name")
);
--> statement-breakpoint
CREATE TABLE "company_application_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"application_id" integer NOT NULL,
	"contractor_company_id" integer,
	"assigned_by" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"badge_id" integer NOT NULL,
	"awarded_date" timestamp DEFAULT now(),
	"awarded_by" varchar NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"award_note" text,
	CONSTRAINT "company_badges_company_id_badge_id_unique" UNIQUE("company_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "contractor_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"supported_activities" varchar[],
	"technology_capabilities" varchar[],
	"service_regions" varchar[],
	"has_gst" boolean DEFAULT false,
	"has_wcb" boolean DEFAULT false,
	"has_insurance" boolean DEFAULT false,
	"code_of_conduct_signed" boolean DEFAULT false,
	"code_of_conduct_signed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer,
	"company_id" integer,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"document_type" "document_type" NOT NULL,
	"is_template" boolean DEFAULT false,
	"is_global" boolean DEFAULT false,
	"uploaded_by" varchar NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(3) NOT NULL,
	"naics_code" varchar,
	"facility_sector" varchar,
	"facility_category" varchar,
	"facility_type" varchar,
	"facility_photo_url" varchar,
	"unit_number" varchar,
	"street_number" varchar,
	"street_name" varchar,
	"city" varchar,
	"province" varchar,
	"country" varchar DEFAULT 'Canada',
	"postal_code" varchar,
	"gross_floor_area" integer,
	"gross_floor_area_unit" varchar(10) DEFAULT 'sq_ft',
	"gross_floor_area_is_temporary" boolean DEFAULT false,
	"year_built" integer,
	"weekly_operating_hours" integer,
	"weekly_operating_hours_is_temporary" boolean DEFAULT false,
	"number_of_workers_main_shift" integer,
	"number_of_workers_main_shift_is_temporary" boolean DEFAULT false,
	"type_of_operation" "type_of_operation",
	"has_emis" boolean,
	"emis_realtime_monitoring" boolean DEFAULT false,
	"emis_description" text,
	"has_energy_manager" boolean,
	"energy_manager_full_time" boolean DEFAULT false,
	"process_compressed_air" boolean DEFAULT false,
	"process_control_system" boolean DEFAULT false,
	"process_electrochemical" boolean DEFAULT false,
	"process_facility_non_process" boolean DEFAULT false,
	"process_facility_submetering" boolean DEFAULT false,
	"process_hvac" boolean DEFAULT false,
	"process_industrial_gases" boolean DEFAULT false,
	"process_lighting" boolean DEFAULT false,
	"process_motors" boolean DEFAULT false,
	"process_other" boolean DEFAULT false,
	"process_pumping_fans" boolean DEFAULT false,
	"process_refrigeration" boolean DEFAULT false,
	"process_waste_heat_recovery" boolean DEFAULT false,
	"process_material_processing" boolean DEFAULT false,
	"process_process_cooling" boolean DEFAULT false,
	"process_process_heating" boolean DEFAULT false,
	"process_pumps" boolean DEFAULT false,
	"process_steam_system" boolean DEFAULT false,
	"process_other_systems" boolean DEFAULT false,
	"process_combined_heat_power" boolean DEFAULT false,
	"process_fans_blowers" boolean DEFAULT false,
	"process_material_handling" boolean DEFAULT false,
	"process_and_systems" text[],
	"address" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"is_archived" boolean DEFAULT false,
	"archived_at" timestamp,
	"archived_by" varchar,
	"archive_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facility_activity_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"enabled_by" varchar,
	"enabled_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_template_id" integer NOT NULL,
	"field_name" varchar(255) NOT NULL,
	"field_label" varchar(255) NOT NULL,
	"field_type" varchar(50) NOT NULL,
	"is_required" boolean DEFAULT false,
	"options" text,
	"validation" text,
	"placeholder" varchar(255),
	"help_text" text,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "form_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"form_field_id" integer NOT NULL,
	"value" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "form_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"phase" varchar(20),
	"name" varchar(255) NOT NULL,
	"description" text,
	"form_fields" text,
	"order" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ghost_application_ids" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" varchar(50) NOT NULL,
	"company_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"original_title" varchar(255),
	"deleted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ghost_application_ids_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_user_id" varchar NOT NULL,
	"to_user_id" varchar,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"is_admin_message" boolean DEFAULT false,
	"is_resolved" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'open',
	"priority" varchar(20) DEFAULT 'normal',
	"ticket_number" varchar(50),
	"parent_message_id" integer,
	"application_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"is_read" boolean DEFAULT false,
	"application_id" integer,
	"message_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recognition_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"title" varchar(255),
	"content" text,
	"image_url" varchar(500),
	"image_file" varchar(255),
	"image_size" varchar(20) DEFAULT 'medium',
	"display_order" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar
);
--> statement-breakpoint
CREATE TABLE "recognition_page_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"page_title" varchar(255) DEFAULT 'Recognition',
	"welcome_message" text,
	"badges_section_title" varchar(255) DEFAULT 'Badges & Achievements',
	"content_section_title" varchar(255) DEFAULT 'Recognition',
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar,
	CONSTRAINT "recognition_page_settings_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'info' NOT NULL,
	"target_roles" varchar[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"requires_acknowledgment" boolean DEFAULT false NOT NULL,
	"scheduled_start" timestamp,
	"scheduled_end" timestamp,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"invited_by_user_id" varchar NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"permission_level" varchar DEFAULT 'viewer' NOT NULL,
	"company_id" integer NOT NULL,
	"invitation_token" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"username" varchar,
	"password" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "team_invitations_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"password" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"business_mobile" varchar,
	"profile_image_url" varchar,
	"role" "role" DEFAULT 'team_member' NOT NULL,
	"permission_level" "permission_level" DEFAULT 'viewer',
	"company_id" integer,
	"is_active" boolean DEFAULT true,
	"hear_about_us" varchar,
	"hear_about_us_other" varchar,
	"email_verification_token" varchar,
	"verification_token_expiry" timestamp,
	"email_verified_at" timestamp,
	"is_email_verified" boolean DEFAULT false,
	"reset_token" varchar,
	"reset_expiry" timestamp,
	"is_temporary_password" boolean DEFAULT false,
	"two_factor_secret" varchar,
	"two_factor_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ghost_application_ids" ADD CONSTRAINT "ghost_application_ids_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ghost_application_ids" ADD CONSTRAINT "ghost_application_ids_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");