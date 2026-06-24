-- Migration to fix messages table timestamp timezone issues

-- Set timezone to UTC for this session
SET timezone = 'UTC';

-- Update messages table timestamps to UTC
UPDATE messages 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE messages 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

UPDATE messages 
SET read_at = read_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE read_at IS NOT NULL;

-- Alter the columns to use timestamptz (timestamp with timezone)
ALTER TABLE messages 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC',
ALTER COLUMN read_at TYPE timestamptz USING read_at AT TIME ZONE 'UTC';

-- Verify the changes
SELECT 
  'messages' as table_name,
  created_at,
  updated_at,
  read_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 3;
