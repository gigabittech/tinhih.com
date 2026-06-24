-- Add member_onboarding table
CREATE TABLE IF NOT EXISTS member_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Patient History
  was_patient BOOLEAN NOT NULL DEFAULT false,
  patient_id TEXT,
  treatment_start_date DATE,
  treatment_end_date DATE,
  primary_condition TEXT,
  
  -- Recovery Journey
  recovery_rating INTEGER,
  recovery_challenges TEXT[],
  recovery_successes TEXT[],
  recovery_journey TEXT,
  
  -- Service Feedback
  service_rating INTEGER,
  staff_rating INTEGER,
  facility_rating INTEGER,
  communication_rating INTEGER,
  
  -- Detailed Feedback
  what_worked_well TEXT,
  what_could_be_improved TEXT,
  recommendations TEXT,
  
  -- Community Engagement
  interested_in_events BOOLEAN DEFAULT true,
  interested_in_supporting BOOLEAN DEFAULT true,
  preferred_contact_method TEXT DEFAULT 'email',
  additional_comments TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_member_onboarding_user_id ON member_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_member_onboarding_was_patient ON member_onboarding(was_patient);
CREATE INDEX IF NOT EXISTS idx_member_onboarding_created_at ON member_onboarding(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_member_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_member_onboarding_updated_at
  BEFORE UPDATE ON member_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_member_onboarding_updated_at();
