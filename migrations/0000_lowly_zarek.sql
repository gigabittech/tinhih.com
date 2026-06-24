CREATE TYPE "public"."activity_type" AS ENUM('user_registered', 'user_login', 'appointment_created', 'appointment_updated', 'appointment_cancelled', 'appointment_completed', 'donation_made', 'invoice_created', 'invoice_paid', 'message_sent', 'clinical_note_created', 'document_uploaded', 'telehealth_session_started', 'telehealth_session_ended', 'quote_created', 'quote_updated', 'store_order_placed', 'store_order_updated', 'member_onboarding_completed', 'system_notification');--> statement-breakpoint
CREATE TYPE "public"."appointment_location" AS ENUM('telehealth', 'physical');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('consultation', 'follow_up', 'therapy', 'procedure', 'emergency', 'telehealth');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('medical_record', 'lab_result', 'imaging', 'prescription', 'insurance', 'consent_form', 'other');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('unread', 'read', 'archived');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('general', 'appointment_confirmation', 'appointment_reminder', 'appointment_cancellation', 'appointment_reschedule', 'pre_appointment_instructions', 'follow_up_reminder', 'emergency_notification', 'system_notification');--> statement-breakpoint
CREATE TYPE "public"."telehealth_platform" AS ENUM('zoom', 'teams', 'google_meet', 'webrtc');--> statement-breakpoint
CREATE TYPE "public"."telehealth_status" AS ENUM('scheduled', 'waiting_room', 'in_session', 'completed', 'cancelled', 'technical_issues', 'consent_required');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'practitioner', 'staff', 'patient', 'member');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('appointment_created', 'appointment_updated', 'appointment_cancelled', 'appointment_reminder', 'public_booking_created', 'public_booking_updated', 'patient_registered', 'patient_updated', 'clinical_note_created', 'clinical_note_updated', 'invoice_created', 'invoice_paid', 'invoice_overdue', 'message_received', 'telehealth_session_scheduled', 'telehealth_session_started', 'telehealth_session_ended', 'system_update', 'security_alert', 'calendar_settings_updated', 'user_profile_updated', 'password_changed');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" "activity_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"readable_id" text DEFAULT substring(md5(random()::text), 1, 8) NOT NULL,
	"patient_id" uuid,
	"practitioner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"appointment_date" timestamp with time zone NOT NULL,
	"duration" integer DEFAULT 30 NOT NULL,
	"type" "appointment_type" DEFAULT 'consultation' NOT NULL,
	"location" "appointment_location" DEFAULT 'physical' NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"telehealth_type" text,
	"telehealth_platform" text,
	"send_email_confirmation" boolean DEFAULT true NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_readable_id_unique" UNIQUE("readable_id")
);
--> statement-breakpoint
CREATE TABLE "booking_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"is_public_booking_enabled" boolean DEFAULT true NOT NULL,
	"require_approval" boolean DEFAULT true NOT NULL,
	"allow_direct_booking" boolean DEFAULT false NOT NULL,
	"show_profile" boolean DEFAULT true NOT NULL,
	"show_specialty" boolean DEFAULT true NOT NULL,
	"show_consultation_fee" boolean DEFAULT true NOT NULL,
	"advance_booking_days" integer DEFAULT 30 NOT NULL,
	"max_bookings_per_day" integer DEFAULT 10 NOT NULL,
	"buffer_time" integer DEFAULT 15 NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"sms_notifications" boolean DEFAULT false NOT NULL,
	"reminder_hours" integer DEFAULT 24 NOT NULL,
	"require_phone_verification" boolean DEFAULT false NOT NULL,
	"require_email_verification" boolean DEFAULT true NOT NULL,
	"custom_message" text DEFAULT 'Welcome to my booking page. I''m looking forward to helping you with your healthcare needs.',
	"cancellation_policy" text DEFAULT '24 hours notice required for cancellation',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practitioner_id" uuid,
	"is_global" boolean DEFAULT false,
	"time_interval" integer DEFAULT 60 NOT NULL,
	"buffer_time" integer DEFAULT 0 NOT NULL,
	"default_start_time" text DEFAULT '09:00' NOT NULL,
	"default_end_time" text DEFAULT '17:00' NOT NULL,
	"working_days" text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] NOT NULL,
	"allow_weekend_bookings" boolean DEFAULT false,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"appointment_id" uuid,
	"title" text NOT NULL,
	"subjective" text,
	"objective" text,
	"assessment" text,
	"plan" text,
	"additional_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"uploaded_by_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"type" "document_type" DEFAULT 'other' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"message" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"stripe_payment_intent_id" text NOT NULL,
	"stripe_customer_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"receipt_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"donor_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "donations_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"link" text,
	"start_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_date" date NOT NULL,
	"end_time" time NOT NULL,
	"thumbnail" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"appointment_id" uuid,
	"invoice_number" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0.00',
	"total" numeric(10, 2) NOT NULL,
	"description" text,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"due_date" timestamp,
	"paid_at" timestamp,
	"stripe_payment_intent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "member_onboarding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"was_patient" boolean DEFAULT false NOT NULL,
	"patient_id" text,
	"treatment_start_date" date,
	"treatment_end_date" date,
	"primary_condition" text,
	"recovery_rating" integer,
	"recovery_challenges" text[],
	"recovery_successes" text[],
	"recovery_journey" text,
	"service_rating" integer,
	"staff_rating" integer,
	"facility_rating" integer,
	"communication_rating" integer,
	"what_worked_well" text,
	"what_could_be_improved" text,
	"recommendations" text,
	"interested_in_events" boolean DEFAULT true,
	"interested_in_supporting" boolean DEFAULT true,
	"preferred_contact_method" text DEFAULT 'email',
	"additional_comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"message_type" "message_type" DEFAULT 'general' NOT NULL,
	"status" "message_status" DEFAULT 'unread' NOT NULL,
	"read_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"delivery_status" text DEFAULT 'sent' NOT NULL,
	"is_system_message" boolean DEFAULT false NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expiry" timestamp,
	"scope" text,
	"provider_user_id" text,
	"provider_email" text,
	"provider_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"calendar_sync" boolean DEFAULT false,
	"drive_sync" boolean DEFAULT false,
	"sync_direction" text DEFAULT 'bidirectional',
	"sync_frequency" text DEFAULT 'realtime',
	"sync_event_types" text DEFAULT 'appointments,meetings',
	"auto_create_meetings" boolean DEFAULT false,
	"teams_auto_create_meetings" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date_of_birth" timestamp,
	"gender" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"emergency_contact" text,
	"emergency_phone" text,
	"insurance_provider" text,
	"insurance_number" text,
	"medical_history" jsonb DEFAULT '[]'::jsonb,
	"allergies" jsonb DEFAULT '[]'::jsonb,
	"medications" jsonb DEFAULT '[]'::jsonb,
	"onboarding_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practitioners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"license_number" text,
	"specialty" text,
	"qualifications" jsonb DEFAULT '[]'::jsonb,
	"bio" text,
	"consultation_fee" numeric(10, 2),
	"booking_link" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "practitioners_booking_link_unique" UNIQUE("booking_link")
);
--> statement-breakpoint
CREATE TABLE "public_booking_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"message" text,
	"is_guest" boolean DEFAULT true NOT NULL,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "public_booking_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "public_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_link" text NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"public_booking_user_id" uuid,
	"service" text DEFAULT 'consultation' NOT NULL,
	"appointment_date" date NOT NULL,
	"appointment_time" time(0) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"author" text NOT NULL,
	"category" text DEFAULT 'general',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"customer_id" uuid,
	"customer_email" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"shipping_address" jsonb NOT NULL,
	"items" jsonb NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"shipping" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"fulfillment_status" text DEFAULT 'pending' NOT NULL,
	"stripe_payment_intent_id" text,
	"printful_order_id" text,
	"tracking_number" text,
	"tracking_url" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "store_orders_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "store_orders_printful_order_id_unique" UNIQUE("printful_order_id")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_name" text DEFAULT 'TiNHiH Portal' NOT NULL,
	"organization_logo" text,
	"primary_color" text DEFAULT '#ffdd00' NOT NULL,
	"secondary_color" text DEFAULT '#1f2937' NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"date_format" text DEFAULT 'MM/dd/yyyy' NOT NULL,
	"time_format" text DEFAULT '12h' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"business_hours_start" text DEFAULT '09:00' NOT NULL,
	"business_hours_end" text DEFAULT '17:00' NOT NULL,
	"working_days" text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] NOT NULL,
	"allow_weekend_bookings" boolean DEFAULT false,
	"default_appointment_duration" integer DEFAULT 60 NOT NULL,
	"max_advance_booking_days" integer DEFAULT 90 NOT NULL,
	"min_advance_booking_hours" integer DEFAULT 24 NOT NULL,
	"email_notifications_enabled" boolean DEFAULT true,
	"sms_notifications_enabled" boolean DEFAULT false,
	"appointment_reminder_hours" integer DEFAULT 24 NOT NULL,
	"session_timeout_minutes" integer DEFAULT 480 NOT NULL,
	"password_min_length" integer DEFAULT 8 NOT NULL,
	"require_two_factor" boolean DEFAULT false,
	"default_telehealth_platform" text DEFAULT 'zoom' NOT NULL,
	"telehealth_buffer_minutes" integer DEFAULT 5 NOT NULL,
	"allow_recording" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telehealth_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_role" text NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb DEFAULT '{}'::jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telehealth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"platform" "telehealth_platform" NOT NULL,
	"status" "telehealth_status" DEFAULT 'scheduled' NOT NULL,
	"meeting_url" text,
	"meeting_id" text,
	"passcode" text,
	"host_key" text,
	"patient_joined_at" timestamp,
	"practitioner_joined_at" timestamp,
	"session_started_at" timestamp,
	"session_ended_at" timestamp,
	"recording_url" text,
	"session_notes" text,
	"technical_issues" text,
	"consent_granted" boolean DEFAULT false,
	"consent_granted_at" timestamp,
	"consent_granted_by" uuid,
	"recording_consent" boolean DEFAULT false,
	"recording_consent_at" timestamp,
	"recording_consent_by" uuid,
	"audit_log" jsonb DEFAULT '[]'::jsonb,
	"patient_ready" boolean DEFAULT false,
	"patient_ready_at" timestamp,
	"practitioner_ready" boolean DEFAULT false,
	"practitioner_ready_at" timestamp,
	"encryption_level" text DEFAULT 'SRTP',
	"session_key" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"date_format" text DEFAULT 'MM/dd/yyyy' NOT NULL,
	"time_format" text DEFAULT '12h' NOT NULL,
	"default_dashboard_view" text DEFAULT 'overview' NOT NULL,
	"show_patient_photos" boolean DEFAULT true,
	"compact_mode" boolean DEFAULT false,
	"email_notifications" boolean DEFAULT true,
	"browser_notifications" boolean DEFAULT true,
	"sms_notifications" boolean DEFAULT false,
	"appointment_reminders" boolean DEFAULT true,
	"message_notifications" boolean DEFAULT true,
	"calendar_view" text DEFAULT 'week' NOT NULL,
	"start_day_of_week" integer DEFAULT 0 NOT NULL,
	"show_weekends" boolean DEFAULT false,
	"time_slot_duration" integer DEFAULT 60 NOT NULL,
	"calendar_start_hour" integer DEFAULT 8 NOT NULL,
	"calendar_end_hour" integer DEFAULT 18 NOT NULL,
	"font_size_scale" text DEFAULT 'medium' NOT NULL,
	"high_contrast" boolean DEFAULT false,
	"reduce_motion" boolean DEFAULT false,
	"screen_reader_optimized" boolean DEFAULT false,
	"share_data_for_analytics" boolean DEFAULT true,
	"allow_telemetry" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"role" "user_role" DEFAULT 'patient' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"reset_token" text,
	"reset_token_expiry" timestamp,
	"department" text,
	"position" text,
	"hire_date" timestamp,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"first_login" boolean DEFAULT true NOT NULL,
	"license_number" text,
	"specialty" text,
	"qualifications" jsonb DEFAULT '[]'::jsonb,
	"bio" text,
	"consultation_fee" numeric(10, 2),
	"booking_link" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_booking_link_unique" UNIQUE("booking_link")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_appointments" boolean DEFAULT true NOT NULL,
	"email_patient_updates" boolean DEFAULT true NOT NULL,
	"email_clinical_notes" boolean DEFAULT false NOT NULL,
	"email_billing" boolean DEFAULT true NOT NULL,
	"email_messages" boolean DEFAULT true NOT NULL,
	"email_telehealth" boolean DEFAULT true NOT NULL,
	"email_system" boolean DEFAULT true NOT NULL,
	"email_security" boolean DEFAULT true NOT NULL,
	"browser_appointments" boolean DEFAULT true NOT NULL,
	"browser_patient_updates" boolean DEFAULT false NOT NULL,
	"browser_clinical_notes" boolean DEFAULT false NOT NULL,
	"browser_billing" boolean DEFAULT true NOT NULL,
	"browser_messages" boolean DEFAULT true NOT NULL,
	"browser_telehealth" boolean DEFAULT true NOT NULL,
	"browser_system" boolean DEFAULT false NOT NULL,
	"browser_security" boolean DEFAULT true NOT NULL,
	"sms_appointments" boolean DEFAULT false NOT NULL,
	"sms_urgent_only" boolean DEFAULT true NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" text DEFAULT '22:00',
	"quiet_hours_end" text DEFAULT '08:00',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"priority" "notification_priority" DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"action_url" text,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_settings" ADD CONSTRAINT "calendar_settings_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_id_users_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_onboarding" ADD CONSTRAINT "member_onboarding_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_integrations" ADD CONSTRAINT "oauth_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_booking_users" ADD CONSTRAINT "public_booking_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_bookings" ADD CONSTRAINT "public_bookings_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_bookings" ADD CONSTRAINT "public_bookings_public_booking_user_id_public_booking_users_id_fk" FOREIGN KEY ("public_booking_user_id") REFERENCES "public"."public_booking_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telehealth_audit_logs" ADD CONSTRAINT "telehealth_audit_logs_session_id_telehealth_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."telehealth_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telehealth_audit_logs" ADD CONSTRAINT "telehealth_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_consent_granted_by_users_id_fk" FOREIGN KEY ("consent_granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_recording_consent_by_users_id_fk" FOREIGN KEY ("recording_consent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;