-- Add practitioner-specific fields to users table
ALTER TABLE users
ADD COLUMN license_number TEXT,
ADD COLUMN specialty TEXT,
ADD COLUMN qualifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN bio TEXT,
ADD COLUMN consultation_fee DECIMAL(10,2),
ADD COLUMN booking_link TEXT UNIQUE;

-- Add indexes for better performance
CREATE INDEX idx_users_license_number ON users(license_number);
CREATE INDEX idx_users_specialty ON users(specialty);
CREATE INDEX idx_users_consultation_fee ON users(consultation_fee);
