-- Migration: Add enhanced messaging fields to messages table
-- Date: 2025-01-27

-- Add new columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create enum for message types if it doesn't exist
DO $$ BEGIN
    CREATE TYPE message_type AS ENUM (
        'general',
        'appointment_confirmation',
        'appointment_reminder',
        'appointment_cancellation',
        'appointment_reschedule',
        'pre_appointment_instructions',
        'follow_up_reminder',
        'emergency_notification',
        'system_notification'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the message_type column to use the enum (handle existing data)
ALTER TABLE messages 
ALTER COLUMN message_type TYPE message_type USING 
    CASE 
        WHEN message_type = 'general' THEN 'general'::message_type
        WHEN message_type = 'appointment_confirmation' THEN 'appointment_confirmation'::message_type
        WHEN message_type = 'appointment_reminder' THEN 'appointment_reminder'::message_type
        WHEN message_type = 'appointment_cancellation' THEN 'appointment_cancellation'::message_type
        WHEN message_type = 'appointment_reschedule' THEN 'appointment_reschedule'::message_type
        WHEN message_type = 'pre_appointment_instructions' THEN 'pre_appointment_instructions'::message_type
        WHEN message_type = 'follow_up_reminder' THEN 'follow_up_reminder'::message_type
        WHEN message_type = 'emergency_notification' THEN 'emergency_notification'::message_type
        WHEN message_type = 'system_notification' THEN 'system_notification'::message_type
        ELSE 'general'::message_type
    END;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_appointment_id ON messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
