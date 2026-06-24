-- Migration: Add phone column to donations table
-- Date: 2025-09-02
-- Description: Adds phone field to collect donor phone numbers

-- Add phone column to donations table
ALTER TABLE donations ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add comment to document the column
COMMENT ON COLUMN donations.phone IS 'Donor phone number for contact purposes';

-- Verify the column was added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'donations' 
        AND column_name = 'phone'
    ) THEN
        RAISE EXCEPTION 'Phone column was not added to donations table';
    END IF;
END $$;
