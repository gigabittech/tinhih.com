-- Migration: Add 'webrtc' option to telehealth_platform enum
-- This migration adds the 'webrtc' platform option for in-app video calling

-- Add 'webrtc' to the telehealth_platform enum
ALTER TYPE telehealth_platform ADD VALUE 'webrtc';

-- Update existing sessions to use 'webrtc' if they don't have a platform set
-- (This is optional and depends on your existing data)
-- UPDATE telehealth_sessions SET platform = 'webrtc' WHERE platform IS NULL;

-- Add a comment to document the change
COMMENT ON TYPE telehealth_platform IS 'Platform options for telehealth sessions: zoom, teams, google_meet, webrtc (in-app)';
