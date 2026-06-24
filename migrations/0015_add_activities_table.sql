-- Create activity_type enum
CREATE TYPE "activity_type" AS ENUM (
  'user_registered',
  'user_login',
  'appointment_created',
  'appointment_updated',
  'appointment_cancelled',
  'appointment_completed',
  'donation_made',
  'invoice_created',
  'invoice_paid',
  'message_sent',
  'clinical_note_created',
  'document_uploaded',
  'telehealth_session_started',
  'telehealth_session_ended',
  'quote_created',
  'quote_updated',
  'store_order_placed',
  'store_order_updated',
  'member_onboarding_completed',
  'system_notification'
);

-- Create activities table
CREATE TABLE "activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "type" "activity_type" NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "metadata" jsonb DEFAULT '{}',
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create index for better performance on queries
CREATE INDEX "activities_user_id_idx" ON "activities"("user_id");
CREATE INDEX "activities_type_idx" ON "activities"("type");
CREATE INDEX "activities_created_at_idx" ON "activities"("created_at");
CREATE INDEX "activities_user_type_idx" ON "activities"("user_id", "type");
