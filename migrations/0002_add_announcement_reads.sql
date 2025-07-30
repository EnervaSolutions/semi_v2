-- Migration to add announcement_reads table only
CREATE TABLE IF NOT EXISTS "announcement_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"announcement_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"read_at" timestamp DEFAULT now(),
	CONSTRAINT "announcement_reads_announcement_id_user_id_unique" UNIQUE("announcement_id","user_id")
);