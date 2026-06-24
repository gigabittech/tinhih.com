-- Migration: Add 'telehealth_session_scheduled' notification type
-- This migration adds the 'telehealth_session_scheduled' notification type for telehealth session creation notifications

-- Add 'telehealth_session_scheduled' to the notification_type enum
ALTER TYPE notification_type ADD VALUE 'telehealth_session_scheduled';

-- Add a comment to document the change
COMMENT ON TYPE notification_type IS 'Notification types including telehealth_session_scheduled for session creation notifications';
