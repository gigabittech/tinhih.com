-- Remove is_public_booking column from appointments table
-- Since public bookings are now kept in a separate public_bookings table

ALTER TABLE appointments DROP COLUMN IF EXISTS is_public_booking;
