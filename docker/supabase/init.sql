-- Complete Kidoers Database Schema for Docker Supabase Testing
-- This creates all tables, functions, policies, and triggers from your production database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create auth schema (required by Supabase Auth service)
CREATE SCHEMA IF NOT EXISTS "auth";

-- Create custom types
CREATE TYPE "public"."family_setup_state" AS ENUM (
    'not_started',
    'in_progress',
    'complete'
);

CREATE TYPE "public"."family_user_role" AS ENUM (
    'owner',
    'parent',
    'teen',
    'viewer'
);

CREATE TYPE "public"."membership_status" AS ENUM (
    'active',
    'invited',
    'revoked'
);

CREATE TYPE "public"."onboarding_status" AS ENUM (
    'not_started',
    'in_progress',
    'completed'
);

CREATE TYPE "public"."routine_status" AS ENUM (
    'draft',
    'active',
    'archived'
);

CREATE TYPE "public"."schedule_scope" AS ENUM (
    'everyday',
    'weekdays',
    'weekends',
    'specific_days'
);

CREATE TYPE "public"."task_bucket_type" AS ENUM (
    'shared',
    'member'
);

CREATE TYPE "public"."task_frequency" AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'weekends',
    'one_off',
    'specific_days'
);

CREATE TYPE "public"."task_instance_status" AS ENUM (
    'pending',
    'completed',
    'skipped',
    'missed',
    'archived'
);

CREATE TYPE "public"."time_of_day" AS ENUM (
    'morning',
    'afternoon',
    'evening',
    'night',
    'any',
    'before_school',
    'after_school',
    'bedtime'
);

-- Create all tables
CREATE TABLE IF NOT EXISTS "public"."families" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "setup_state" "public"."family_setup_state" DEFAULT 'not_started'::"public"."family_setup_state" NOT NULL,
    "setup_step" "text",
    "setup_started_at" timestamp with time zone,
    "setup_completed_at" timestamp with time zone,
    "onboarding_version" integer DEFAULT 1,
    "subscription_plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "trial_start" timestamp with time zone DEFAULT "now"(),
    "trial_end" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "timezone" "text" DEFAULT 'Europe/Madrid'::"text" NOT NULL,
    CONSTRAINT "families_name_check" CHECK ((("length"("name") >= 1) AND ("length"("name") <= 255))),
    CONSTRAINT "families_subscription_plan_chk" CHECK (("subscription_plan" = ANY (ARRAY['free'::"text", 'premium'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."family_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "age" integer,
    "color" "text" DEFAULT 'blue'::"text",
    "avatar_url" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_style" "text" DEFAULT 'adventurer'::"text",
    "avatar_seed" "text" DEFAULT ''::"text",
    "avatar_options" "jsonb" DEFAULT '{}'::"jsonb",
    "display_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "family_members_age_check" CHECK ((("age" >= 0) AND ("age" <= 120))),
    CONSTRAINT "family_members_color_check" CHECK (("color" = ANY (ARRAY['blue'::"text", 'green'::"text", 'yellow'::"text", 'orange'::"text", 'purple'::"text", 'pink'::"text", 'teal'::"text", 'indigo'::"text"]))),
    CONSTRAINT "family_members_name_check" CHECK ((("length"("name") >= 1) AND ("length"("name") <= 255))),
    CONSTRAINT "family_members_role_check" CHECK (("role" = ANY (ARRAY['parent'::"text", 'child'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."family_users" (
    "family_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."family_user_role" DEFAULT 'parent'::"public"."family_user_role" NOT NULL,
    "status" "public"."membership_status" DEFAULT 'active'::"public"."membership_status" NOT NULL,
    "invited_by" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_status" "public"."onboarding_status" DEFAULT 'not_started'::"public"."onboarding_status" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."recurring_task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "points" integer DEFAULT 1 NOT NULL,
    "duration_mins" integer,
    "time_of_day" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "frequency_type" character varying(20) DEFAULT 'specific_days'::character varying NOT NULL,
    "days_of_week" "text"[],
    "frequency" character varying(20) DEFAULT 'daily'::character varying
);

CREATE TABLE IF NOT EXISTS "public"."routine_schedule_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_schedule_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "is_skipped" boolean DEFAULT true NOT NULL,
    "note" "text"
);

CREATE TABLE IF NOT EXISTS "public"."routine_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "scope" "public"."schedule_scope" DEFAULT 'everyday'::"public"."schedule_scope" NOT NULL,
    "days_of_week" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "timezone" "text" DEFAULT 'Europe/Madrid'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."routine_task_day_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "member_id" "uuid",
    "day_of_week" "text" NOT NULL,
    "routine_task_id" "uuid" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bucket_type" "public"."task_bucket_type" DEFAULT 'member'::"public"."task_bucket_type" NOT NULL,
    "bucket_member_id" "uuid",
    CONSTRAINT "routine_task_day_orders_bucket_member_ck" CHECK (((("bucket_type" = 'shared'::"public"."task_bucket_type") AND ("bucket_member_id" IS NULL)) OR (("bucket_type" = 'member'::"public"."task_bucket_type") AND ("bucket_member_id" IS NOT NULL)))),
    CONSTRAINT "routine_task_day_orders_day_of_week_check" CHECK (("day_of_week" = ANY (ARRAY['sunday'::"text", 'monday'::"text", 'tuesday'::"text", 'wednesday'::"text", 'thursday'::"text", 'friday'::"text", 'saturday'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."routine_task_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "time_of_day" "public"."time_of_day",
    "source_group_template_id" "uuid",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "routine_task_groups_name_check" CHECK ((("length"("name") >= 1) AND ("length"("name") <= 255)))
);

CREATE TABLE IF NOT EXISTS "public"."routine_task_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "routine_task_id" "uuid" NOT NULL,
    "task_assignment_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "due_date" "date" NOT NULL,
    "time_of_day" "public"."time_of_day" DEFAULT 'any'::"public"."time_of_day" NOT NULL,
    "due_at" timestamp with time zone,
    "status" "public"."task_instance_status" DEFAULT 'pending'::"public"."task_instance_status" NOT NULL,
    "completed_at" timestamp with time zone,
    "verified_by" "uuid",
    "points_awarded" integer DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "routine_task_instances_points_awarded_check" CHECK (("points_awarded" >= 0))
);

CREATE TABLE IF NOT EXISTS "public"."routine_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "group_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "points" integer DEFAULT 1 NOT NULL,
    "duration_mins" integer,
    "time_of_day" "public"."time_of_day" DEFAULT 'any'::"public"."time_of_day",
    "frequency" "public"."task_frequency" DEFAULT 'daily'::"public"."task_frequency" NOT NULL,
    "days_of_week" "text"[] DEFAULT '{}'::"text"[],
    "source_task_template_id" "uuid",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recurring_template_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "routine_tasks_name_check" CHECK ((("length"("name") >= 1) AND ("length"("name") <= 255))),
    CONSTRAINT "routine_tasks_points_check" CHECK (("points" >= 0))
);

CREATE TABLE IF NOT EXISTS "public"."routines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "family_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status" "public"."routine_status" DEFAULT 'draft'::"public"."routine_status" NOT NULL,
    "source" "text" DEFAULT 'scratch'::"text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_onboarding_routine" boolean DEFAULT false NOT NULL,
    CONSTRAINT "routines_name_check" CHECK ((("length"("name") >= 1) AND ("length"("name") <= 255))),
    CONSTRAINT "routines_source_check" CHECK (("source" = ANY (ARRAY['scratch'::"text", 'ai'::"text", 'community'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."task_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_task_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."task_group_template_items" (
    "group_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."task_group_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "default_time_of_day" "public"."time_of_day",
    "icon" "text",
    "color" "text",
    "is_public" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "task_group_templates_name_check" CHECK ((("length"("name") >= 1) AND ("length"("name") <= 255)))
);

CREATE TABLE IF NOT EXISTS "public"."task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "default_points" integer DEFAULT 1 NOT NULL,
    "default_duration_mins" integer,
    "default_time_of_day" "public"."time_of_day",
    "category" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "icon" "text",
    "color" "text",
    "is_public" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "task_templates_default_points_check" CHECK (("default_points" >= 0)),
    CONSTRAINT "task_templates_name_check" CHECK ((("length"("name") >= 1) AND ("length"("name") <= 255)))
);

CREATE TABLE IF NOT EXISTS "public"."waitlist_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "language" "text" DEFAULT 'en'::"text",
    "source" "text" DEFAULT 'website'::"text",
    "unsubscribed" boolean DEFAULT false,
    "unsubscribe_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);

-- Add primary keys and constraints
ALTER TABLE ONLY "public"."families" ADD CONSTRAINT "families_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."family_members" ADD CONSTRAINT "family_members_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."family_users" ADD CONSTRAINT "family_users_pkey" PRIMARY KEY ("family_id", "user_id");
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."recurring_task_templates" ADD CONSTRAINT "recurring_task_templates_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."routine_schedule_exceptions" ADD CONSTRAINT "routine_schedule_exceptions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."routine_schedules" ADD CONSTRAINT "routine_schedules_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."routine_task_day_orders" ADD CONSTRAINT "routine_task_day_orders_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."routine_task_day_orders" ADD CONSTRAINT "routine_task_day_orders_unique_member_day_task" UNIQUE ("routine_id", "member_id", "day_of_week", "routine_task_id");
ALTER TABLE ONLY "public"."routine_task_groups" ADD CONSTRAINT "routine_task_groups_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."routine_task_instances" ADD CONSTRAINT "routine_task_instances_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."routine_task_instances" ADD CONSTRAINT "routine_task_instances_task_assignment_id_due_date_key" UNIQUE ("task_assignment_id", "due_date");
ALTER TABLE ONLY "public"."routine_tasks" ADD CONSTRAINT "routine_tasks_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."routines" ADD CONSTRAINT "routines_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."task_assignments" ADD CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."task_assignments" ADD CONSTRAINT "task_assignments_routine_task_id_member_id_key" UNIQUE ("routine_task_id", "member_id");
ALTER TABLE ONLY "public"."task_assignments" ADD CONSTRAINT "task_assignments_unique_member" UNIQUE ("routine_task_id", "member_id");
ALTER TABLE ONLY "public"."task_group_template_items" ADD CONSTRAINT "task_group_template_items_pkey" PRIMARY KEY ("group_id", "task_id");
ALTER TABLE ONLY "public"."task_group_templates" ADD CONSTRAINT "task_group_templates_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."task_templates" ADD CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id");

-- Add foreign key constraints (excluding auth schema references for test setup)
ALTER TABLE ONLY "public"."families" ADD CONSTRAINT "families_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."family_members" ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."family_members" ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."family_users" ADD CONSTRAINT "family_users_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."family_users" ADD CONSTRAINT "family_users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."family_users" ADD CONSTRAINT "family_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
-- Note: profiles table doesn't need foreign key to auth.users in test setup
ALTER TABLE ONLY "public"."recurring_task_templates" ADD CONSTRAINT "recurring_task_templates_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_schedule_exceptions" ADD CONSTRAINT "routine_schedule_exceptions_routine_schedule_id_fkey" FOREIGN KEY ("routine_schedule_id") REFERENCES "public"."routine_schedules"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_schedules" ADD CONSTRAINT "routine_schedules_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_task_day_orders" ADD CONSTRAINT "routine_task_day_orders_bucket_member_id_fkey" FOREIGN KEY ("bucket_member_id") REFERENCES "public"."family_members"("id");
ALTER TABLE ONLY "public"."routine_task_day_orders" ADD CONSTRAINT "routine_task_day_orders_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_task_day_orders" ADD CONSTRAINT "routine_task_day_orders_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_task_day_orders" ADD CONSTRAINT "routine_task_day_orders_routine_task_id_fkey" FOREIGN KEY ("routine_task_id") REFERENCES "public"."routine_tasks"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_task_groups" ADD CONSTRAINT "routine_task_groups_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_task_groups" ADD CONSTRAINT "routine_task_groups_source_group_template_id_fkey" FOREIGN KEY ("source_group_template_id") REFERENCES "public"."task_group_templates"("id");
ALTER TABLE ONLY "public"."routine_task_instances" ADD CONSTRAINT "routine_task_instances_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_task_instances" ADD CONSTRAINT "routine_task_instances_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_task_instances" ADD CONSTRAINT "routine_task_instances_routine_task_id_fkey" FOREIGN KEY ("routine_task_id") REFERENCES "public"."routine_tasks"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_task_instances" ADD CONSTRAINT "routine_task_instances_task_assignment_id_fkey" FOREIGN KEY ("task_assignment_id") REFERENCES "public"."task_assignments"("id") ON DELETE CASCADE;
-- Note: Foreign key to auth.users will be created by auth service
ALTER TABLE ONLY "public"."routine_tasks" ADD CONSTRAINT "routine_tasks_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."routine_task_groups"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."routine_tasks" ADD CONSTRAINT "routine_tasks_recurring_template_id_fkey" FOREIGN KEY ("recurring_template_id") REFERENCES "public"."recurring_task_templates"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_tasks" ADD CONSTRAINT "routine_tasks_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."routine_tasks" ADD CONSTRAINT "routine_tasks_source_task_template_id_fkey" FOREIGN KEY ("source_task_template_id") REFERENCES "public"."task_templates"("id");
-- Note: Foreign key to auth.users will be created by auth service
ALTER TABLE ONLY "public"."routines" ADD CONSTRAINT "routines_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_assignments" ADD CONSTRAINT "task_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."family_members"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_assignments" ADD CONSTRAINT "task_assignments_routine_task_id_fkey" FOREIGN KEY ("routine_task_id") REFERENCES "public"."routine_tasks"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_group_template_items" ADD CONSTRAINT "task_group_template_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."task_group_templates"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_group_template_items" ADD CONSTRAINT "task_group_template_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."task_templates"("id") ON DELETE CASCADE;
-- Note: Foreign keys to auth.users will be created by auth service

-- Create functions
CREATE OR REPLACE FUNCTION "public"."_id_of_group"("name" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $_$
  select id from public.task_group_templates where is_system = true and task_group_templates.name = $1 limit 1
$_$;

CREATE OR REPLACE FUNCTION "public"."_id_of_task"("name" "text") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $_$
  select id from public.task_templates where is_system = true and task_templates.name = $1 limit 1
$_$;

CREATE OR REPLACE FUNCTION "public"."generate_task_instances_for_date"("p_family_id" "uuid", "p_date" "date") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN public.generate_task_instances_for_range(p_family_id, p_date, p_date);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."generate_task_instances_for_range"("p_family_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    wday text;
    instances_created INTEGER := 0;
    loop_date DATE;
BEGIN
    -- Loop through each date in the range
    loop_date := p_start_date;
    WHILE loop_date <= p_end_date LOOP
        wday := weekday_token(loop_date);
        
        WITH inserted AS (
            INSERT INTO public.routine_task_instances (
                routine_id, routine_task_id, task_assignment_id, member_id, due_date, time_of_day
            )
            SELECT
                rt.routine_id,
                rt.id,
                ta.id,
                ta.member_id,
                loop_date,
                rt.time_of_day
            FROM public.routine_tasks rt
            JOIN public.task_assignments ta ON ta.routine_task_id = rt.id
            JOIN public.routines r ON r.id = rt.routine_id

            -- routine default schedule
            LEFT JOIN public.routine_schedules rs
                ON rs.routine_id = r.id
               AND rs.is_active
               AND (rs.start_date IS NULL OR loop_date >= rs.start_date)
               AND (rs.end_date   IS NULL OR loop_date <= rs.end_date)

            -- one-off exceptions
            LEFT JOIN public.routine_schedule_exceptions ex
                ON ex.routine_schedule_id = rs.id
               AND ex.date = loop_date

            WHERE r.family_id = p_family_id
                -- optional: only generate for non-draft routines (uncomment if you use 'active')
                -- and r.status = 'active'
                AND COALESCE(ex.is_skipped, false) = false
                AND (
                    -- task override, if days_of_week set on the task
                    (array_length(rt.days_of_week,1) IS NOT NULL AND wday = ANY(rt.days_of_week))
                    OR
                    -- else inherit routine schedule
                    (
                        array_length(rt.days_of_week,1) IS NULL AND rs.id IS NOT NULL AND (
                            rs.scope = 'everyday'
                            OR (rs.scope = 'weekdays' AND wday = ANY(ARRAY['monday','tuesday','wednesday','thursday','friday']))
                            OR (rs.scope = 'weekends' AND wday = ANY(ARRAY['saturday','sunday']))
                            OR (rs.scope = 'specific_days' AND wday = ANY(rs.days_of_week))
                        )
                    )
                    OR
                    -- explicit extra date
                    (ex.is_skipped IS false)
                )
            ON CONFLICT (task_assignment_id, due_date) DO NOTHING
            RETURNING 1
        )
        SELECT COUNT(*) INTO instances_created FROM inserted;
        
        -- Move to next date
        loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN instances_created;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

-- Note: Functions that depend on auth.uid() will be created by auth service

CREATE OR REPLACE FUNCTION "public"."trg_families_auto_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.created_by is not null then
    insert into public.family_users (family_id, user_id, role, status)
    values (new.id, new.created_by, 'owner', 'active')
    on conflict do nothing;
  end if;
  return new;
end $$;

CREATE OR REPLACE FUNCTION "public"."weekday_token"("p_date" "date") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    RETURN CASE EXTRACT(DOW FROM p_date)
        WHEN 0 THEN 'sunday'
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
    END;
END;
$$;

-- Create triggers
CREATE OR REPLACE TRIGGER "families_auto_membership" AFTER INSERT ON "public"."families" FOR EACH ROW EXECUTE FUNCTION "public"."trg_families_auto_membership"();
-- Note: Trigger on auth.users will be created by auth service

-- Enable Row Level Security
ALTER TABLE "public"."families" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."family_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."family_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recurring_task_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routine_schedule_exceptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routine_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routine_task_day_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routine_task_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routine_task_instances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routine_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_group_template_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_group_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."waitlist_emails" ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be created by auth service

CREATE POLICY "Allow anonymous inserts" ON "public"."waitlist_emails" FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous reads" ON "public"."waitlist_emails" FOR SELECT USING (true);
CREATE POLICY "Allow unsubscribe updates" ON "public"."waitlist_emails" FOR UPDATE USING (true) WITH CHECK (true);

-- Grant permissions
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

-- Grant permissions on all functions
GRANT ALL ON FUNCTION "public"."_id_of_group"("name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_id_of_group"("name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_id_of_group"("name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."_id_of_task"("name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_id_of_task"("name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_id_of_task"("name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_task_instances_for_date"("p_family_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_task_instances_for_date"("p_family_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_task_instances_for_date"("p_family_id" "uuid", "p_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."generate_task_instances_for_range"("p_family_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_task_instances_for_range"("p_family_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_task_instances_for_range"("p_family_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_parent_for_member"("member" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_parent_for_member"("member" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_parent_for_member"("member" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_self_member"("member" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_self_member"("member" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_self_member"("member" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_user_in_member_family"("member" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_in_member_family"("member" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_in_member_family"("member" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."trg_families_auto_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_families_auto_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_families_auto_membership"() TO "service_role";
GRANT ALL ON FUNCTION "public"."weekday_token"("p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."weekday_token"("p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."weekday_token"("p_date" "date") TO "service_role";

-- Grant permissions on all tables
GRANT ALL ON TABLE "public"."families" TO "anon";
GRANT ALL ON TABLE "public"."families" TO "authenticated";
GRANT ALL ON TABLE "public"."families" TO "service_role";
GRANT ALL ON TABLE "public"."family_members" TO "anon";
GRANT ALL ON TABLE "public"."family_members" TO "authenticated";
GRANT ALL ON TABLE "public"."family_members" TO "service_role";
GRANT ALL ON TABLE "public"."family_users" TO "anon";
GRANT ALL ON TABLE "public"."family_users" TO "authenticated";
GRANT ALL ON TABLE "public"."family_users" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."recurring_task_templates" TO "anon";
GRANT ALL ON TABLE "public"."recurring_task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_task_templates" TO "service_role";
GRANT ALL ON TABLE "public"."routine_schedule_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."routine_schedule_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."routine_schedule_exceptions" TO "service_role";
GRANT ALL ON TABLE "public"."routine_schedules" TO "anon";
GRANT ALL ON TABLE "public"."routine_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."routine_schedules" TO "service_role";
GRANT ALL ON TABLE "public"."routine_task_day_orders" TO "anon";
GRANT ALL ON TABLE "public"."routine_task_day_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."routine_task_day_orders" TO "service_role";
GRANT ALL ON TABLE "public"."routine_task_groups" TO "anon";
GRANT ALL ON TABLE "public"."routine_task_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."routine_task_groups" TO "service_role";
GRANT ALL ON TABLE "public"."routine_task_instances" TO "anon";
GRANT ALL ON TABLE "public"."routine_task_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."routine_task_instances" TO "service_role";
GRANT ALL ON TABLE "public"."routine_tasks" TO "anon";
GRANT ALL ON TABLE "public"."routine_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."routine_tasks" TO "service_role";
GRANT ALL ON TABLE "public"."routines" TO "anon";
GRANT ALL ON TABLE "public"."routines" TO "authenticated";
GRANT ALL ON TABLE "public"."routines" TO "service_role";
GRANT ALL ON TABLE "public"."task_assignments" TO "anon";
GRANT ALL ON TABLE "public"."task_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_assignments" TO "service_role";
GRANT ALL ON TABLE "public"."task_group_template_items" TO "anon";
GRANT ALL ON TABLE "public"."task_group_template_items" TO "authenticated";
GRANT ALL ON TABLE "public"."task_group_template_items" TO "service_role";
GRANT ALL ON TABLE "public"."task_group_templates" TO "anon";
GRANT ALL ON TABLE "public"."task_group_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."task_group_templates" TO "service_role";
GRANT ALL ON TABLE "public"."task_templates" TO "anon";
GRANT ALL ON TABLE "public"."task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."task_templates" TO "service_role";
GRANT ALL ON TABLE "public"."waitlist_emails" TO "anon";
GRANT ALL ON TABLE "public"."waitlist_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist_emails" TO "service_role";

-- Set default privileges
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

-- Create test user for E2E testing (no email sending required)
-- This user is pre-created to avoid email sending during tests
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'testuser@example.com',
  crypt('testpassword123', gen_salt('bf')),
  NOW(),
  NULL,
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Test User"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Create test user profile
INSERT INTO public.profiles (
  id,
  email,
  name,
  avatar_url,
  created_at,
  updated_at,
  onboarding_status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'testuser@example.com',
  'Test User',
  NULL,
  NOW(),
  NOW(),
  'completed'
) ON CONFLICT (id) DO NOTHING;
