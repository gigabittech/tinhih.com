-- Add firstLogin field to users table
ALTER TABLE users 
ADD COLUMN first_login BOOLEAN DEFAULT TRUE;

-- Update existing users to have first_login = false
UPDATE users SET first_login = FALSE WHERE first_login IS NULL;
