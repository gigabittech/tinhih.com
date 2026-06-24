-- Migration to separate appointment date and time in public_bookings table
-- This migration adds separate date and time columns and migrates existing data
-- Date format: YYYY-mm-dd, Time format: HH:mm (no seconds)

-- Add new columns
ALTER TABLE public_bookings 
ADD COLUMN appointment_date DATE,
ADD COLUMN appointment_time TIME;

-- Migrate existing data from appointment_date_time to separate columns
UPDATE public_bookings 
SET 
  appointment_date = DATE(appointment_date_time AT TIME ZONE 'UTC'),
  appointment_time = TIME(appointment_date_time AT TIME ZONE 'UTC', 0)
WHERE appointment_date_time IS NOT NULL;

-- Make new columns NOT NULL after data migration
ALTER TABLE public_bookings 
ALTER COLUMN appointment_date SET NOT NULL,
ALTER COLUMN appointment_time SET NOT NULL;

-- Drop the old combined column
ALTER TABLE public_bookings 
DROP COLUMN appointment_date_time;
