-- Migration: Add HIPAA Compliance Fields to Telehealth Sessions
-- This migration adds fields required for HIPAA compliance and readiness-based meeting flow

-- Add new status to telehealth_status enum
ALTER TYPE telehealth_status ADD VALUE IF NOT EXISTS 'consent_required';

-- Add HIPAA compliance fields to telehealth_sessions table
ALTER TABLE telehealth_sessions 
ADD COLUMN IF NOT EXISTS consent_granted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS consent_granted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS consent_granted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS recording_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recording_consent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS recording_consent_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS audit_log JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS patient_ready BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS patient_ready_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS practitioner_ready BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS practitioner_ready_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS encryption_level TEXT DEFAULT 'SRTP',
ADD COLUMN IF NOT EXISTS session_key TEXT;

-- Add comments for documentation
COMMENT ON COLUMN telehealth_sessions.consent_granted IS 'Whether HIPAA consent has been granted for this session';
COMMENT ON COLUMN telehealth_sessions.consent_granted_at IS 'Timestamp when consent was granted';
COMMENT ON COLUMN telehealth_sessions.consent_granted_by IS 'User ID who granted consent';
COMMENT ON COLUMN telehealth_sessions.recording_consent IS 'Whether recording consent has been granted';
COMMENT ON COLUMN telehealth_sessions.recording_consent_at IS 'Timestamp when recording consent was granted';
COMMENT ON COLUMN telehealth_sessions.recording_consent_by IS 'User ID who granted recording consent';
COMMENT ON COLUMN telehealth_sessions.audit_log IS 'JSON array of audit events for HIPAA compliance';
COMMENT ON COLUMN telehealth_sessions.patient_ready IS 'Whether the patient has marked themselves as ready';
COMMENT ON COLUMN telehealth_sessions.patient_ready_at IS 'Timestamp when patient marked ready';
COMMENT ON COLUMN telehealth_sessions.practitioner_ready IS 'Whether the practitioner has marked themselves as ready';
COMMENT ON COLUMN telehealth_sessions.practitioner_ready_at IS 'Timestamp when practitioner marked ready';
COMMENT ON COLUMN telehealth_sessions.encryption_level IS 'Encryption level used for the session (e.g., SRTP)';
COMMENT ON COLUMN telehealth_sessions.session_key IS 'Encrypted session key for secure communication';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_consent_granted ON telehealth_sessions(consent_granted);
CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_patient_ready ON telehealth_sessions(patient_ready);
CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_practitioner_ready ON telehealth_sessions(practitioner_ready);
CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_audit_log ON telehealth_sessions USING GIN(audit_log);

-- Create audit log table for permanent storage
CREATE TABLE IF NOT EXISTS telehealth_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    user_role TEXT NOT NULL CHECK (user_role IN ('patient', 'practitioner', 'admin', 'staff')),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_telehealth_audit_logs_session_id ON telehealth_audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_telehealth_audit_logs_user_id ON telehealth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_telehealth_audit_logs_event_type ON telehealth_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_telehealth_audit_logs_timestamp ON telehealth_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_telehealth_audit_logs_event_data ON telehealth_audit_logs USING GIN(event_data);

-- Add comments for audit log table
COMMENT ON TABLE telehealth_audit_logs IS 'Permanent storage for telehealth session audit logs for HIPAA compliance';
COMMENT ON COLUMN telehealth_audit_logs.session_id IS 'Reference to the telehealth session';
COMMENT ON COLUMN telehealth_audit_logs.user_id IS 'User who performed the action';
COMMENT ON COLUMN telehealth_audit_logs.user_role IS 'Role of the user at the time of the action';
COMMENT ON COLUMN telehealth_audit_logs.event_type IS 'Type of audit event (e.g., session_joined, consent_granted)';
COMMENT ON COLUMN telehealth_audit_logs.event_data IS 'Additional data about the event';
COMMENT ON COLUMN telehealth_audit_logs.timestamp IS 'When the event occurred';
COMMENT ON COLUMN telehealth_audit_logs.ip_address IS 'IP address of the user (for security)';
COMMENT ON COLUMN telehealth_audit_logs.user_agent IS 'User agent string (for security)';

-- Create function to automatically update audit log in telehealth_sessions
CREATE OR REPLACE FUNCTION update_telehealth_session_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the audit_log column in telehealth_sessions
    UPDATE telehealth_sessions 
    SET audit_log = COALESCE(audit_log, '[]'::jsonb) || 
                   jsonb_build_object(
                       'timestamp', NEW.timestamp,
                       'userId', NEW.user_id,
                       'userRole', NEW.user_role,
                       'eventType', NEW.event_type,
                       'eventData', NEW.event_data
                   )
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update audit log in telehealth_sessions
DROP TRIGGER IF EXISTS trigger_update_telehealth_session_audit_log ON telehealth_audit_logs;
CREATE TRIGGER trigger_update_telehealth_session_audit_log
    AFTER INSERT ON telehealth_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_telehealth_session_audit_log();

-- Create function to get session readiness status
CREATE OR REPLACE FUNCTION get_telehealth_session_readiness(session_uuid UUID)
RETURNS TABLE(
    session_id UUID,
    patient_ready BOOLEAN,
    practitioner_ready BOOLEAN,
    all_ready BOOLEAN,
    consent_granted BOOLEAN,
    recording_consent BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id as session_id,
        ts.patient_ready,
        ts.practitioner_ready,
        (ts.patient_ready AND ts.practitioner_ready) as all_ready,
        ts.consent_granted,
        ts.recording_consent
    FROM telehealth_sessions ts
    WHERE ts.id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark participant as ready
CREATE OR REPLACE FUNCTION mark_telehealth_participant_ready(
    session_uuid UUID,
    participant_role TEXT,
    user_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    IF participant_role = 'patient' THEN
        UPDATE telehealth_sessions 
        SET 
            patient_ready = TRUE,
            patient_ready_at = NOW()
        WHERE id = session_uuid;
    ELSIF participant_role = 'practitioner' THEN
        UPDATE telehealth_sessions 
        SET 
            practitioner_ready = TRUE,
            practitioner_ready_at = NOW()
        WHERE id = session_uuid;
    ELSE
        RETURN FALSE;
    END IF;
    
    -- Log the event
    INSERT INTO telehealth_audit_logs (
        session_id, user_id, user_role, event_type, event_data
    ) VALUES (
        session_uuid, user_uuid, participant_role, 'participant_ready', 
        jsonb_build_object('role', participant_role, 'timestamp', NOW())
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to grant consent
CREATE OR REPLACE FUNCTION grant_telehealth_consent(
    session_uuid UUID,
    user_uuid UUID,
    consent_type TEXT DEFAULT 'general'
)
RETURNS BOOLEAN AS $$
BEGIN
    IF consent_type = 'general' THEN
        UPDATE telehealth_sessions 
        SET 
            consent_granted = TRUE,
            consent_granted_at = NOW(),
            consent_granted_by = user_uuid
        WHERE id = session_uuid;
    ELSIF consent_type = 'recording' THEN
        UPDATE telehealth_sessions 
        SET 
            recording_consent = TRUE,
            recording_consent_at = NOW(),
            recording_consent_by = user_uuid
        WHERE id = session_uuid;
    ELSE
        RETURN FALSE;
    END IF;
    
    -- Log the event
    INSERT INTO telehealth_audit_logs (
        session_id, user_id, user_role, event_type, event_data
    ) VALUES (
        session_uuid, user_uuid, 'patient', 'consent_granted', 
        jsonb_build_object('consentType', consent_type, 'timestamp', NOW())
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
