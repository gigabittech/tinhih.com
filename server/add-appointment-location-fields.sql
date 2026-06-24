-- Add location and telehealth fields to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS telehealth_platform TEXT,
ADD COLUMN IF NOT EXISTS send_email_confirmation BOOLEAN NOT NULL DEFAULT true;

-- Add comment to explain the telehealth_platform field
COMMENT ON COLUMN appointments.telehealth_platform IS 'Platform for telehealth appointments: inapp, zoom, teams, google_meet';

-- Update existing appointments to have default location type
UPDATE appointments 
SET location = 'physical' 
WHERE location IS NULL;

-- Create oauth_integrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS oauth_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  scope TEXT,
  provider_user_id TEXT,
  provider_email TEXT,
  provider_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  calendar_sync BOOLEAN DEFAULT false,
  drive_sync BOOLEAN DEFAULT false,
  sync_direction TEXT DEFAULT 'bidirectional',
  sync_frequency TEXT DEFAULT 'realtime',
  sync_event_types TEXT DEFAULT 'appointments,meetings',
  auto_create_meetings BOOLEAN DEFAULT false,
  teams_auto_create_meetings BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for oauth_integrations table
CREATE INDEX IF NOT EXISTS idx_oauth_integrations_user_provider ON oauth_integrations(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_oauth_integrations_provider_user_id ON oauth_integrations(provider_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_integrations_is_active ON oauth_integrations(is_active);
