DO $$ BEGIN
 CREATE TYPE "public"."application_status_enum" AS ENUM('not_started', 'in_progress', 'ready_to_submit', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted', 'deferred', 'withdrawn');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."application_type_enum" AS ENUM('early_decision', 'early_action', 'regular_decision', 'rolling_admission', 'transfer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."document_type_enum" AS ENUM('transcript', 'test_score', 'essay', 'recommendation_letter', 'resume', 'portfolio', 'financial_aid', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."education_level_enum" AS ENUM('high_school', 'associate', 'bachelor', 'master', 'doctorate', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."requirement_status_enum" AS ENUM('not_started', 'in_progress', 'completed', 'waived', 'optional');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."test_type_enum" AS ENUM('SAT', 'ACT', 'TOEFL', 'IELTS', 'GRE', 'GMAT', 'AP', 'IB', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."university_list_category_enum" AS ENUM('reach', 'target', 'safety', 'considering', 'applied');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role_enum" AS ENUM('student', 'parent', 'counselor', 'admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_applications" integer DEFAULT 0,
	"applications_submitted" integer DEFAULT 0,
	"acceptances" integer DEFAULT 0,
	"rejections" integer DEFAULT 0,
	"waitlists" integer DEFAULT 0,
	"average_progress_percent" integer DEFAULT 0,
	"documents_uploaded" integer DEFAULT 0,
	"essays_written" integer DEFAULT 0,
	"total_scholarships_offered" numeric(10, 2) DEFAULT '0',
	"total_financial_aid_offered" numeric(10, 2) DEFAULT '0',
	"time_saved_hours" integer DEFAULT 0,
	"last_calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"requirement_id" uuid,
	"status" "requirement_status_enum" DEFAULT 'not_started' NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "application_documents_application_id_document_id_unique" UNIQUE("application_id","document_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"requirement_type" varchar(100) NOT NULL,
	"description" text,
	"is_required" boolean DEFAULT true,
	"status" "requirement_status_enum" DEFAULT 'not_started' NOT NULL,
	"deadline" date,
	"completed_at" timestamp,
	"document_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"application_year" integer NOT NULL,
	"application_type" "application_type_enum" NOT NULL,
	"status" "application_status_enum" DEFAULT 'not_started' NOT NULL,
	"progress_percent" integer DEFAULT 0,
	"last_activity" timestamp,
	"submitted_at" timestamp,
	"application_id" varchar(100),
	"confirmation_number" varchar(100),
	"decision_date" date,
	"decision_received_at" timestamp,
	"scholarship_offered" numeric(10, 2),
	"financial_aid_offered" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "applications_user_id_university_id_application_year_unique" UNIQUE("user_id","university_id","application_year")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "common_app_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"personal_info" json,
	"contact_info" json,
	"demographics" json,
	"geography" json,
	"language" json,
	"citizenship" json,
	"education_info" json,
	"grades" json,
	"current_courses" json,
	"honors" json,
	"future_plans" json,
	"activities" json,
	"writing" json,
	"disciplinary_history" json,
	"additional_info" json,
	"last_synced_at" timestamp,
	"is_complete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "common_app_data_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"application_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"deadline_date" timestamp NOT NULL,
	"deadline_type" varchar(100),
	"reminder_days" integer DEFAULT 7,
	"reminder_sent" boolean DEFAULT false,
	"reminder_sent_at" timestamp,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_type" "document_type_enum" NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"version" integer DEFAULT 1,
	"parent_document_id" uuid,
	"title" text,
	"description" text,
	"tags" json,
	"word_count" integer,
	"essay_prompt" text,
	"recommender_name" varchar(200),
	"recommender_email" varchar(200),
	"recommender_title" varchar(200),
	"is_verified" boolean DEFAULT false,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "education_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"school_name" text NOT NULL,
	"level" "education_level_enum" NOT NULL,
	"start_date" date,
	"end_date" date,
	"graduation_date" date,
	"gpa" numeric(4, 2),
	"gpa_scale" numeric(3, 1) DEFAULT '4.0',
	"degree" text,
	"major" text,
	"is_current" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extracurriculars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_name" text NOT NULL,
	"category" varchar(100),
	"position" text,
	"organization" text,
	"description" text,
	"start_date" date,
	"end_date" date,
	"hours_per_week" integer,
	"weeks_per_year" integer,
	"grades" json,
	"is_continuing" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"test_type" "test_type_enum" NOT NULL,
	"test_date" date,
	"sat_total" integer,
	"sat_math" integer,
	"sat_reading" integer,
	"act_composite" integer,
	"act_math" integer,
	"act_english" integer,
	"act_reading" integer,
	"act_science" integer,
	"act_writing" integer,
	"toefl_total" integer,
	"toefl_reading" integer,
	"toefl_listening" integer,
	"toefl_speaking" integer,
	"toefl_writing" integer,
	"ielts_overall" numeric(2, 1),
	"ielts_listening" numeric(2, 1),
	"ielts_reading" numeric(2, 1),
	"ielts_speaking" numeric(2, 1),
	"ielts_writing" numeric(2, 1),
	"other_score" json,
	"is_official" boolean DEFAULT false,
	"document_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "universities_extended" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" varchar(100) NOT NULL,
	"rank" integer,
	"employer_reputation_rank" integer,
	"academic_reputation_rank" integer,
	"common_app_enabled" boolean DEFAULT false,
	"coalition_app_enabled" boolean DEFAULT false,
	"ucas_enabled" boolean DEFAULT false,
	"direct_application_url" text,
	"early_decision_deadline" date,
	"early_action_deadline" date,
	"regular_decision_deadline" date,
	"requires_sat" boolean DEFAULT false,
	"requires_act" boolean DEFAULT false,
	"requires_toefl" boolean DEFAULT false,
	"requires_ielts" boolean DEFAULT false,
	"essay_prompts" json,
	"supplemental_essays" integer DEFAULT 0,
	"recommendation_letters" integer DEFAULT 2,
	"acceptance_rate" numeric(5, 2),
	"application_fee" integer,
	"tuition_in_state" integer,
	"tuition_out_of_state" integer,
	"tuition_international" integer,
	"logo_url" text,
	"website_url" text,
	"admissions_url" text,
	"supported_degrees" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "universities_extended_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"middle_name" varchar(100),
	"preferred_name" varchar(100),
	"date_of_birth" date,
	"phone" varchar(20),
	"citizenship" varchar(100),
	"ethnicity" json,
	"gender" varchar(50),
	"first_gen_student" boolean,
	"street_address" text,
	"city" varchar(100),
	"state" varchar(100),
	"zip_code" varchar(20),
	"country" varchar(100),
	"current_school" text,
	"graduation_year" integer,
	"gpa" numeric(4, 2),
	"gpa_scale" numeric(3, 1) DEFAULT '4.0',
	"class_rank" integer,
	"class_size" integer,
	"common_app_id" varchar(100),
	"coalition_app_id" varchar(100),
	"ucas_id" varchar(100),
	"profile_complete_percent" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"related_user_id" uuid NOT NULL,
	"relationship_type" "user_role_enum" NOT NULL,
	"permissions" json,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_relationships_student_id_related_user_id_unique" UNIQUE("student_id","related_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_university_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"category" "university_list_category_enum" DEFAULT 'considering' NOT NULL,
	"notes" text,
	"rank" integer,
	"fit_score" integer,
	"admission_probability" numeric(5, 2),
	"added_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_university_lists_user_id_university_id_unique" UNIQUE("user_id","university_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_analytics" ADD CONSTRAINT "application_analytics_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_requirement_id_application_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."application_requirements"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_requirements" ADD CONSTRAINT "application_requirements_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_university_id_universities_extended_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities_extended"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "common_app_data" ADD CONSTRAINT "common_app_data_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "education_history" ADD CONSTRAINT "education_history_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracurriculars" ADD CONSTRAINT "extracurriculars_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_scores" ADD CONSTRAINT "test_scores_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_relationships" ADD CONSTRAINT "user_relationships_student_id_User_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_relationships" ADD CONSTRAINT "user_relationships_related_user_id_User_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_university_lists" ADD CONSTRAINT "user_university_lists_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_university_lists" ADD CONSTRAINT "user_university_lists_university_id_universities_extended_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities_extended"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_analytics_user_id_idx" ON "application_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_documents_application_id_idx" ON "application_documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_requirements_application_id_idx" ON "application_requirements" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_requirements_status_idx" ON "application_requirements" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_user_id_idx" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_university_id_idx" ON "applications" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "common_app_data_user_id_idx" ON "common_app_data" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deadlines_user_id_idx" ON "deadlines" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deadlines_application_id_idx" ON "deadlines" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deadlines_deadline_date_idx" ON "deadlines" USING btree ("deadline_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_document_type_idx" ON "documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "education_history_user_id_idx" ON "education_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extracurriculars_user_id_idx" ON "extracurriculars" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_scores_user_id_idx" ON "test_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_scores_test_type_idx" ON "test_scores" USING btree ("test_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "universities_extended_name_idx" ON "universities_extended" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "universities_extended_rank_idx" ON "universities_extended" USING btree ("rank");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_relationships_student_id_idx" ON "user_relationships" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_relationships_related_user_id_idx" ON "user_relationships" USING btree ("related_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_university_lists_user_id_idx" ON "user_university_lists" USING btree ("user_id");