-- Comprehensive migration to fix ALL timestamp timezone issues
-- Update all database tables to use UTC timestamps

-- Set timezone to UTC for this session
SET timezone = 'UTC';

-- 1. Users table
UPDATE users 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE users 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- 2. Patients table
UPDATE patients 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE patients 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- 3. Practitioners table
UPDATE practitioners 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE practitioners 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- 4. Appointments table
UPDATE appointments 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE appointments 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

UPDATE appointments 
SET appointment_date = appointment_date AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE appointment_date IS NOT NULL;

-- 5. Recovery Notes table
UPDATE clinical_notes 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE clinical_notes 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- 6. Invoices table
UPDATE invoices 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE invoices 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- 7. Messages table (already done, but included for completeness)
UPDATE messages 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE messages 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

UPDATE messages 
SET read_at = read_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE read_at IS NOT NULL;

-- 8. Telehealth Sessions table
UPDATE telehealth_sessions 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE telehealth_sessions 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

UPDATE telehealth_sessions 
SET patient_joined_at = patient_joined_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE patient_joined_at IS NOT NULL;

UPDATE telehealth_sessions 
SET practitioner_joined_at = practitioner_joined_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE practitioner_joined_at IS NOT NULL;

UPDATE telehealth_sessions 
SET session_started_at = session_started_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE session_started_at IS NOT NULL;

UPDATE telehealth_sessions 
SET session_ended_at = session_ended_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE session_ended_at IS NOT NULL;

UPDATE telehealth_sessions 
SET consent_granted_at = consent_granted_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE consent_granted_at IS NOT NULL;

UPDATE telehealth_sessions 
SET recording_consent_at = recording_consent_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE recording_consent_at IS NOT NULL;

UPDATE telehealth_sessions 
SET patient_ready_at = patient_ready_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE patient_ready_at IS NOT NULL;

UPDATE telehealth_sessions 
SET practitioner_ready_at = practitioner_ready_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE practitioner_ready_at IS NOT NULL;

-- 9. System Settings table
UPDATE system_settings 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE system_settings 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- 10. User Preferences table
UPDATE user_preferences 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE user_preferences 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- 11. Calendar Settings table
UPDATE calendar_settings 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE calendar_settings 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- 12. Booking Settings table
UPDATE booking_settings 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE booking_settings 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- 13. OAuth Integrations table
UPDATE oauth_integrations 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE oauth_integrations 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- 14. Documents table
UPDATE documents 
SET created_at = created_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE created_at IS NOT NULL;

UPDATE documents 
SET updated_at = updated_at AT TIME ZONE 'Asia/Dhaka' AT TIME ZONE 'UTC'
WHERE updated_at IS NOT NULL;

-- Now alter ALL timestamp columns to use timestamptz (timestamp with timezone)

-- 1. Users table
ALTER TABLE users 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- 2. Patients table
ALTER TABLE patients 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- 3. Practitioners table
ALTER TABLE practitioners 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- 4. Appointments table
ALTER TABLE appointments 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC',
ALTER COLUMN appointment_date TYPE timestamptz USING appointment_date AT TIME ZONE 'UTC';

-- 5. Recovery Notes table
ALTER TABLE clinical_notes 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- 6. Invoices table
ALTER TABLE invoices 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- 7. Messages table (already done, but included for completeness)
ALTER TABLE messages 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC',
ALTER COLUMN read_at TYPE timestamptz USING read_at AT TIME ZONE 'UTC';

-- 8. Telehealth Sessions table
ALTER TABLE telehealth_sessions 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC',
ALTER COLUMN patient_joined_at TYPE timestamptz USING patient_joined_at AT TIME ZONE 'UTC',
ALTER COLUMN practitioner_joined_at TYPE timestamptz USING practitioner_joined_at AT TIME ZONE 'UTC',
ALTER COLUMN session_started_at TYPE timestamptz USING session_started_at AT TIME ZONE 'UTC',
ALTER COLUMN session_ended_at TYPE timestamptz USING session_ended_at AT TIME ZONE 'UTC',
ALTER COLUMN consent_granted_at TYPE timestamptz USING consent_granted_at AT TIME ZONE 'UTC',
ALTER COLUMN recording_consent_at TYPE timestamptz USING recording_consent_at AT TIME ZONE 'UTC',
ALTER COLUMN patient_ready_at TYPE timestamptz USING patient_ready_at AT TIME ZONE 'UTC',
ALTER COLUMN practitioner_ready_at TYPE timestamptz USING practitioner_ready_at AT TIME ZONE 'UTC';

-- 9. System Settings table
ALTER TABLE system_settings 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- 10. User Preferences table
ALTER TABLE user_preferences 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- 11. Calendar Settings table
ALTER TABLE calendar_settings 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- 12. Booking Settings table
ALTER TABLE booking_settings 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- 13. OAuth Integrations table
ALTER TABLE oauth_integrations 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- 14. Documents table
ALTER TABLE documents 
ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

-- Verify the changes
SELECT 'Database timezone' as info, current_setting('timezone') as value
UNION ALL
SELECT 'Current UTC time', NOW() AT TIME ZONE 'UTC'::text
UNION ALL
SELECT 'Current local time', NOW()::text;

-- Show sample data from key tables
SELECT 'appointments' as table_name, created_at, appointment_date FROM appointments ORDER BY created_at DESC LIMIT 2
UNION ALL
SELECT 'messages' as table_name, created_at, read_at FROM messages ORDER BY created_at DESC LIMIT 2
UNION ALL
SELECT 'notifications' as table_name, created_at, read_at FROM notifications ORDER BY created_at DESC LIMIT 2;
