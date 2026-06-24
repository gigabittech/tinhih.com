-- Insert sample activities for testing
INSERT INTO activities (user_id, type, title, description, metadata, ip_address, user_agent, created_at) VALUES
-- User registrations
('8ff4575e-5bf8-4664-a135-32f860117306', 'user_registered', 'New User Registration', 'User practitioner@tinhih.org registered', '{"email": "practitioner@tinhih.org"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '5 days'),
('33ee44ba-9d47-4332-bf98-25ab6ffa14a6', 'user_registered', 'New User Registration', 'User sarah.anderson@gmail.com registered', '{"email": "sarah.anderson@gmail.com"}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '4 days'),

-- User logins
('8ff4575e-5bf8-4664-a135-32f860117306', 'user_login', 'User Login', 'User practitioner@tinhih.org logged in', '{"email": "practitioner@tinhih.org"}', '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '2 hours'),
('33ee44ba-9d47-4332-bf98-25ab6ffa14a6', 'user_login', 'User Login', 'User sarah.anderson@gmail.com logged in', '{"email": "sarah.anderson@gmail.com"}', '192.168.1.103', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '1 hour'),

-- Appointments
('8ff4575e-5bf8-4664-a135-32f860117306', 'appointment_created', 'Appointment Created', 'Appointment "Initial Consultation" was created', '{"appointmentId": "apt-001", "patientId": "patient-001", "practitionerId": "practitioner-001", "title": "Initial Consultation"}', '192.168.1.104', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '3 days'),
('33ee44ba-9d47-4332-bf98-25ab6ffa14a6', 'appointment_updated', 'Appointment Updated', 'Appointment "Follow-up Session" was updated', '{"appointmentId": "apt-002", "title": "Follow-up Session"}', '192.168.1.105', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '2 days'),
('e646dd1b-bd68-4437-b279-2f49205cca5a', 'appointment_completed', 'Appointment Completed', 'Appointment "Therapy Session" was completed', '{"appointmentId": "apt-003", "title": "Therapy Session"}', '192.168.1.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '1 day'),

-- Donations
('8ff4575e-5bf8-4664-a135-32f860117306', 'donation_made', 'Donation Received', 'Donation of $50 received from practitioner@tinhih.org', '{"donationId": "don-001", "amount": 50, "email": "practitioner@tinhih.org"}', '192.168.1.107', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '6 hours'),
('33ee44ba-9d47-4332-bf98-25ab6ffa14a6', 'donation_made', 'Donation Received', 'Donation of $100 received from sarah.anderson@gmail.com', '{"donationId": "don-002", "amount": 100, "email": "sarah.anderson@gmail.com"}', '192.168.1.108', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '4 hours'),
('e646dd1b-bd68-4437-b279-2f49205cca5a', 'donation_made', 'Donation Received', 'Donation of $75 received from james.martinez@outlook.com', '{"donationId": "don-003", "amount": 75, "email": "james.martinez@outlook.com"}', '192.168.1.109', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '2 hours'),

-- Messages
('8ff4575e-5bf8-4664-a135-32f860117306', 'message_sent', 'Message Sent', 'A new message was sent', '{"messageId": "msg-001", "senderId": "user-001", "recipientId": "user-002"}', '192.168.1.110', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '5 hours'),
('33ee44ba-9d47-4332-bf98-25ab6ffa14a6', 'message_sent', 'Message Sent', 'A new message was sent', '{"messageId": "msg-002", "senderId": "user-003", "recipientId": "user-001"}', '192.168.1.111', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '3 hours'),

-- Recovery Notes
('8ff4575e-5bf8-4664-a135-32f860117306', 'clinical_note_created', 'Clinical Note Created', 'A new clinical note was created', '{"noteId": "note-001", "patientId": "patient-001"}', '192.168.1.112', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '1 day'),

-- Store orders
('33ee44ba-9d47-4332-bf98-25ab6ffa14a6', 'store_order_placed', 'Store Order Placed', 'Order ORD-12345678 placed for $45.99', '{"orderId": "order-001", "orderNumber": "ORD-12345678", "amount": 45.99}', '192.168.1.113', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '8 hours'),
('e646dd1b-bd68-4437-b279-2f49205cca5a', 'store_order_placed', 'Store Order Placed', 'Order ORD-87654321 placed for $29.99', '{"orderId": "order-002", "orderNumber": "ORD-87654321", "amount": 29.99}', '192.168.1.114', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '6 hours'),

-- Member onboarding
('984360e1-6f50-4a38-90ed-9a0525d3d0ad', 'member_onboarding_completed', 'Member Onboarding Completed', 'Member onboarding completed for emily.jackson@yahoo.com', '{"onboardingId": "onboard-001", "email": "emily.jackson@yahoo.com"}', '192.168.1.115', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '1 day'),

-- System notifications
(NULL, 'system_notification', 'System Maintenance', 'Scheduled maintenance completed successfully', '{"maintenanceType": "database", "duration": "30 minutes"}', '192.168.1.116', 'System', NOW() - INTERVAL '12 hours'),
(NULL, 'system_notification', 'Backup Completed', 'Daily backup completed successfully', '{"backupType": "full", "size": "2.5GB"}', '192.168.1.117', 'System', NOW() - INTERVAL '6 hours');
