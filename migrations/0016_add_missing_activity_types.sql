-- Add missing activity types to activity_type enum
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'user_logout';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'payment_processed';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'donation_received';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'patient_onboarding_completed';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'member_onboarding_completed';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'profile_updated';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'password_changed';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'admin_action';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'system_event';
ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'message_read';
