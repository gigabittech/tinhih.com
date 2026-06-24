-- Sample telehealth sessions for testing
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
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440001', -- Reference to existing appointment
  '550e8400-e29b-41d4-a716-446655440001', -- Reference to existing patient
  '550e8400-e29b-41d4-a716-446655440001', -- Reference to existing practitioner
  'zoom',
  'scheduled',
  'https://zoom.us/j/123456789',
  '123456789',
  '123456',
  'host123',
  'Initial consultation session',
  '{"zoom": {"meetingUuid": "abc123", "participantCount": 2, "duration": 30}}',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440002', -- Reference to existing appointment
  '550e8400-e29b-41d4-a716-446655440002', -- Reference to existing patient
  '550e8400-e29b-41d4-a716-446655440002', -- Reference to existing practitioner
  'teams',
  'in_session',
  'https://teams.microsoft.com/l/meetup-join/19:meeting_abc123',
  'meeting_abc123',
  NULL,
  NULL,
  'Follow-up consultation',
  '{"teams": {"threadId": "thread123", "organizerMeetingId": "meeting_abc123"}}',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440003', -- Reference to existing appointment
  '550e8400-e29b-41d4-a716-446655440003', -- Reference to existing patient
  '550e8400-e29b-41d4-a716-446655440003', -- Reference to existing practitioner
  'google_meet',
  'completed',
  'https://meet.google.com/abc-defg-hij',
  'abc-defg-hij',
  NULL,
  NULL,
  'Completed consultation with good patient response',
  '{"googleMeet": {"conferenceId": "abc-defg-hij", "hangoutLink": "https://meet.google.com/abc-defg-hij"}}',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '30 minutes'
),
(
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440004', -- Reference to existing appointment
  '550e8400-e29b-41d4-a716-446655440004', -- Reference to existing patient
  '550e8400-e29b-41d4-a716-446655440004', -- Reference to existing practitioner
  'zoom',
  'waiting_room',
  'https://zoom.us/j/987654321',
  '987654321',
  '654321',
  'host456',
  'Emergency consultation',
  '{"zoom": {"meetingUuid": "def456", "participantCount": 1, "duration": 15}}',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440005', -- Reference to existing appointment
  '550e8400-e29b-41d4-a716-446655440005', -- Reference to existing patient
  '550e8400-e29b-41d4-a716-446655440005', -- Reference to existing practitioner
  'teams',
  'cancelled',
  'https://teams.microsoft.com/l/meetup-join/19:meeting_def456',
  'meeting_def456',
  NULL,
  NULL,
  'Session cancelled due to technical issues',
  '{"teams": {"threadId": "thread456", "organizerMeetingId": "meeting_def456"}}',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour'
);