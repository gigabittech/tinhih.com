-- Migration: Update public_bookings table to use proper UTC timestamp storage
-- This migration combines appointment_date and appointment_time into a single UTC timestamp

-- Step 1: Add new column
ALTER TABLE public_bookings ADD COLUMN appointment_date_time TIMESTAMPTZ;

-- Step 2: Convert existing data (if any) from separate date/time to UTC timestamp
-- This assumes existing appointment_date is in UTC and appointment_time is in HH:MM format
UPDATE public_bookings 
SET appointment_date_time = (appointment_date::date + appointment_time::time) AT TIME ZONE 'UTC'
WHERE appointment_date_time IS NULL;

-- Step 3: Make the new column NOT NULL after data migration
ALTER TABLE public_bookings ALTER COLUMN appointment_date_time SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE public_bookings DROP COLUMN appointment_date;
ALTER TABLE public_bookings DROP COLUMN appointment_time;

-- Step 5: Add index for better query performance
CREATE INDEX idx_public_bookings_appointment_datetime ON public_bookings(appointment_date_time);
CREATE INDEX idx_public_bookings_practitioner_datetime ON public_bookings(practitioner_id, appointment_date_time);
