-- Add calendar start and end hours to user preferences
ALTER TABLE user_preferences 
ADD COLUMN calendar_start_hour INTEGER NOT NULL DEFAULT 8,
ADD COLUMN calendar_end_hour INTEGER NOT NULL DEFAULT 18;

-- Update existing records to have default values
UPDATE user_preferences 
SET calendar_start_hour = 8, calendar_end_hour = 18 
WHERE calendar_start_hour IS NULL OR calendar_end_hour IS NULL;
