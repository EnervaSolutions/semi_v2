ALTER TYPE "public"."application_status" ADD VALUE 'completed';--> statement-breakpoint
ALTER TYPE "public"."application_status" ADD VALUE 'revision_required';--> statement-breakpoint
CREATE TABLE "announcement_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"announcement_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"read_at" timestamp DEFAULT now(),
	CONSTRAINT "announcement_reads_announcement_id_user_id_unique" UNIQUE("announcement_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "contractor_company_assignment_history" (
	"application_id" integer NOT NULL,
	"contractor_company_id" integer NOT NULL,
	"assigned_by" varchar(255) NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contractor_company_assignment_history_application_id_contractor_company_id_pk" PRIMARY KEY("application_id","contractor_company_id")
);
--> statement-breakpoint
CREATE TABLE "contractor_join_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"requested_company_id" integer NOT NULL,
	"requested_permission_level" varchar DEFAULT 'editor' NOT NULL,
	"message" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "contractor_join_requests_user_id_requested_company_id_unique" UNIQUE("user_id","requested_company_id")
);
--> statement-breakpoint
CREATE TABLE "contractor_team_application_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"contractor_company_id" integer NOT NULL,
	"assigned_user_id" varchar NOT NULL,
	"assigned_by" varchar NOT NULL,
	"permissions" varchar[] DEFAULT '{"view"}' NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "contractor_team_application_assignments_application_id_assigned_user_id_unique" UNIQUE("application_id","assigned_user_id")
);
