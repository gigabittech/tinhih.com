-- Add sync settings columns to oauth_integrations table
ALTER TABLE oauth_integrations 
ADD COLUMN calendar_sync BOOLEAN DEFAULT FALSE,
ADD COLUMN drive_sync BOOLEAN DEFAULT FALSE,
ADD COLUMN auto_create_meetings BOOLEAN DEFAULT FALSE,
ADD COLUMN teams_auto_create_meetings BOOLEAN DEFAULT FALSE;

