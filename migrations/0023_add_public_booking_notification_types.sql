-- Migration to add public booking notification types
-- This migration adds new notification types for public booking events

-- Add new notification types to the enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'public_booking_created';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'public_booking_updated';
