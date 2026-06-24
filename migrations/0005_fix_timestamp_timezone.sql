-- Migration to fix timestamp timezone issues
-- Convert existing timestamps to UTC and update column types

-- First, let's check what timezone the database is currently using
SELECT current_setting('timezone');

-- Set timezone to UTC for this session
SET timezone = 'UTC';

-- Update notifications table
-- Convert existing timestamps to UTC (assuming they're in Bangladesh time +6)
UPDATE notifications 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE notifications 
SET read_at = read_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE read_at IS NOT NULL;

-- Update notification_preferences table
UPDATE notification_preferences 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE notification_preferences 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- Update messages table
UPDATE messages 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE messages 
SET read_at = read_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE read_at IS NOT NULL;

-- Now alter the columns to use timestamptz (timestamp with timezone)
ALTER TABLE notifications 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN read_at TYPE timestamptz USING read_at AT TIME ZONE 'UTC';

ALTER TABLE notification_preferences 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE messages 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN read_at TYPE timestamptz USING read_at AT TIME ZONE 'UTC';

-- Set default timezone for the database
ALTER DATABASE tinhih_portal_dev SET timezone TO 'UTC';

-- Verify the changes
SELECT 
  'notifications' as table_name,
  created_at,
  read_at
FROM notifications 
ORDER BY created_at DESC 
LIMIT 3;

SELECT 
  'messages' as table_name,
  created_at,
  read_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 3;
