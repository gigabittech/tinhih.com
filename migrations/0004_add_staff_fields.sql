-- Add staff-specific fields to users table
ALTER TABLE users 
ADD COLUMN department TEXT,
ADD COLUMN position TEXT,
ADD COLUMN hire_date TIMESTAMP,
ADD COLUMN permissions JSONB DEFAULT '[]'::jsonb;

-- Add indexes for better performance
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_position ON users(position);
CREATE INDEX idx_users_role ON users(role);
