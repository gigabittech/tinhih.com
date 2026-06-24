-- Create test telehealth session with the exact ID being accessed
INSERT INTO telehealth_sessions (
  id,
  appointment_id,
  patient_id,
  practitioner_id,
  platform,
  status,
  meeting_url,
  meeting_id,
  passcode,
  host_key,
  session_notes,
  metadata,
  created_at,
  updated_at
) VALUES 
(
  '58fd70d7-4477-4e2b-90f4-b53ec972d0be',
  '58fd70d7-4477-4e2b-90f4-b53ec972d0be',
  '0da3b92a-7be9-4f18-b132-ad888ad05ada',
  'c32a48fd-7f43-40f7-8b3a-68e90132f961',
  'webrtc',
  'scheduled',
  'http://localhost:3000/telehealth-session/58fd70d7-4477-4e2b-90f4-b53ec972d0be',
  'test-session-123',
  '123456',
  'host123',
  'Test telehealth session for simple video room',
  '{"webrtc": {"sessionType": "simple", "encryption": "SRTP", "auditEnabled": true}}',
  NOW(),
  NOW()
);
