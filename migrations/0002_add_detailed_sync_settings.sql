-- Add detailed sync settings columns to oauth_integrations table
ALTER TABLE oauth_integrations 
ADD COLUMN sync_direction TEXT DEFAULT 'bidirectional',
ADD COLUMN sync_frequency TEXT DEFAULT 'realtime',
ADD COLUMN sync_event_types TEXT DEFAULT 'appointments,meetings';
