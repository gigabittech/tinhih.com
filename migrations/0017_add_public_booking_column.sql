-- Add is_public_booking column to appointments table
ALTER TABLE appointments 
ADD COLUMN is_public_booking BOOLEAN NOT NULL DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN appointments.is_public_booking IS 'Track if appointment was created via public booking link';
