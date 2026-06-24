-- Enhanced Sample Activities for TiNHiH Portal
-- This script creates realistic sample activities for testing the activity logs system

-- First, let's get some real user IDs from the database
-- We'll use these to create realistic activity logs

-- Insert sample activities for telehealth sessions
INSERT INTO activities (user_id, type, title, description, metadata, ip_address, user_agent, created_at) VALUES
-- Telehealth Sessions
((SELECT id FROM users WHERE role = 'patient' LIMIT 1), 'telehealth_session_started', 'Telehealth Session Started', 'Telehealth session started between John Smith and Dr. Sarah Johnson', '{"sessionId": "tel-001", "patientName": "John Smith", "practitionerName": "Dr. Sarah Johnson"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '2 hours'),
((SELECT id FROM users WHERE role = 'practitioner' LIMIT 1), 'telehealth_session_ended', 'Telehealth Session Ended', 'Telehealth session ended between John Smith and Dr. Sarah Johnson (Duration: 45 minutes)', '{"sessionId": "tel-001", "patientName": "John Smith", "practitionerName": "Dr. Sarah Johnson", "duration": 45}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '1 hour 45 minutes'),
((SELECT id FROM users WHERE role = 'patient' LIMIT 1 OFFSET 1), 'telehealth_session_started', 'Telehealth Session Started', 'Telehealth session started between Emily Davis and Dr. Michael Chen', '{"sessionId": "tel-002", "patientName": "Emily Davis", "practitionerName": "Dr. Michael Chen"}', '192.168.1.102', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15', NOW() - INTERVAL '4 hours'),
((SELECT id FROM users WHERE role = 'practitioner' LIMIT 1 OFFSET 1), 'telehealth_session_ended', 'Telehealth Session Ended', 'Telehealth session ended between Emily Davis and Dr. Michael Chen (Duration: 60 minutes)', '{"sessionId": "tel-002", "patientName": "Emily Davis", "practitionerName": "Dr. Michael Chen", "duration": 60}', '192.168.1.103', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '3 hours'),

-- Invoice Activities
((SELECT id FROM users WHERE role = 'admin' LIMIT 1), 'invoice_created', 'Invoice Created', 'Invoice created for John Smith - $150.00', '{"invoiceId": "inv-001", "patientName": "John Smith", "amount": 150.00}', '192.168.1.104', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '6 hours'),
((SELECT id FROM users WHERE role = 'patient' LIMIT 1), 'invoice_paid', 'Invoice Paid', 'Invoice paid for John Smith - $150.00 via Credit Card', '{"invoiceId": "inv-001", "patientName": "John Smith", "amount": 150.00, "paymentMethod": "Credit Card"}', '192.168.1.105', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '5 hours'),
((SELECT id FROM users WHERE role = 'admin' LIMIT 1), 'invoice_created', 'Invoice Created', 'Invoice created for Emily Davis - $200.00', '{"invoiceId": "inv-002", "patientName": "Emily Davis", "amount": 200.00}', '192.168.1.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '8 hours'),
((SELECT id FROM users WHERE role = 'patient' LIMIT 1 OFFSET 1), 'invoice_paid', 'Invoice Paid', 'Invoice paid for Emily Davis - $200.00 via PayPal', '{"invoiceId": "inv-002", "patientName": "Emily Davis", "amount": 200.00, "paymentMethod": "PayPal"}', '192.168.1.107', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15', NOW() - INTERVAL '7 hours'),

-- Payment Activities
((SELECT id FROM users WHERE role = 'admin' LIMIT 1), 'payment_processed', 'Payment Processed', 'Payment of $150.00 processed via Stripe', '{"paymentId": "pay-001", "amount": 150.00, "paymentMethod": "Stripe"}', '192.168.1.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '5 hours'),
((SELECT id FROM users WHERE role = 'admin' LIMIT 1), 'payment_processed', 'Payment Processed', 'Payment of $200.00 processed via PayPal', '{"paymentId": "pay-002", "amount": 200.00, "paymentMethod": "PayPal"}', '192.168.1.109', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '7 hours'),

-- Donation Activities
((SELECT id FROM users WHERE role = 'member' LIMIT 1), 'donation_received', 'Donation Received', 'Donation received from Anonymous Donor - $50.00', '{"donationId": "don-001", "donorName": "Anonymous Donor", "amount": 50.00}', '192.168.1.110', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '12 hours'),
((SELECT id FROM users WHERE role = 'member' LIMIT 1 OFFSET 1), 'donation_received', 'Donation Received', 'Donation received from Sarah Wilson - $100.00', '{"donationId": "don-002", "donorName": "Sarah Wilson", "amount": 100.00}', '192.168.1.111', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '24 hours'),
((SELECT id FROM users WHERE role = 'member' LIMIT 1 OFFSET 2), 'donation_received', 'Donation Received', 'Donation received from Robert Brown - $75.00', '{"donationId": "don-003", "donorName": "Robert Brown", "amount": 75.00}', '192.168.1.112', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15', NOW() - INTERVAL '36 hours'),

-- Onboarding Activities
((SELECT id FROM users WHERE role = 'patient' LIMIT 1), 'patient_onboarding_completed', 'Patient Onboarding Completed', 'Patient onboarding completed for John Smith', '{"patientId": "pat-001", "patientName": "John Smith"}', '192.168.1.113', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '48 hours'),
((SELECT id FROM users WHERE role = 'patient' LIMIT 1 OFFSET 1), 'patient_onboarding_completed', 'Patient Onboarding Completed', 'Patient onboarding completed for Emily Davis', '{"patientId": "pat-002", "patientName": "Emily Davis"}', '192.168.1.114', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15', NOW() - INTERVAL '72 hours'),
((SELECT id FROM users WHERE role = 'admin' LIMIT 1), 'admin_onboarding_completed', 'Admin Onboarding Completed', 'Admin onboarding completed for Admin User', '{"adminId": "adm-001", "adminName": "Admin User"}', '192.168.1.115', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '96 hours'),

-- Profile Updates
((SELECT id FROM users WHERE role = 'patient' LIMIT 1), 'profile_updated', 'Profile Updated', 'Profile updated for John Smith - Fields: phone, address', '{"userName": "John Smith", "fieldsUpdated": ["phone", "address"]}', '192.168.1.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '1 day'),
((SELECT id FROM users WHERE role = 'practitioner' LIMIT 1), 'profile_updated', 'Profile Updated', 'Profile updated for Dr. Sarah Johnson - Fields: bio, consultationFee', '{"userName": "Dr. Sarah Johnson", "fieldsUpdated": ["bio", "consultationFee"]}', '192.168.1.117', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '2 days'),

-- Password Changes
((SELECT id FROM users WHERE role = 'patient' LIMIT 1), 'password_changed', 'Password Changed', 'Password changed for John Smith', '{"userName": "John Smith"}', '192.168.1.118', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '3 days'),
((SELECT id FROM users WHERE role = 'practitioner' LIMIT 1), 'password_changed', 'Password Changed', 'Password changed for Dr. Sarah Johnson', '{"userName": "Dr. Sarah Johnson"}', '192.168.1.119', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '4 days'),

-- Admin Actions
((SELECT id FROM users WHERE role = 'admin' LIMIT 1), 'admin_action', 'Admin Action', 'User Management: Created new practitioner account for Dr. Michael Chen', '{"adminName": "Admin User", "action": "User Management", "details": "Created new practitioner account for Dr. Michael Chen"}', '192.168.1.120', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '5 days'),
((SELECT id FROM users WHERE role = 'admin' LIMIT 1), 'admin_action', 'Admin Action', 'System Settings: Updated email notification preferences', '{"adminName": "Admin User", "action": "System Settings", "details": "Updated email notification preferences"}', '192.168.1.121', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '6 days'),

-- System Events
(NULL, 'system_event', 'System Event', 'Database backup completed successfully', '{"event": "Database Backup", "description": "Daily backup completed successfully"}', '192.168.1.122', 'System/1.0', NOW() - INTERVAL '12 hours'),
(NULL, 'system_event', 'System Event', 'Email service restarted after maintenance', '{"event": "Service Restart", "description": "Email service restarted after scheduled maintenance"}', '192.168.1.123', 'System/1.0', NOW() - INTERVAL '24 hours'),
(NULL, 'system_event', 'System Event', 'Security scan completed - no threats detected', '{"event": "Security Scan", "description": "Daily security scan completed with no threats detected"}', '192.168.1.124', 'System/1.0', NOW() - INTERVAL '36 hours'),

-- Message Activities
((SELECT id FROM users WHERE role = 'patient' LIMIT 1), 'message_sent', 'Message Sent', 'Message sent to Dr. Sarah Johnson regarding appointment', '{"messageId": "msg-001", "recipient": "Dr. Sarah Johnson", "subject": "Appointment Question"}', '192.168.1.125', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '1 hour'),
((SELECT id FROM users WHERE role = 'practitioner' LIMIT 1), 'message_read', 'Message Read', 'Message read from John Smith', '{"messageId": "msg-001", "sender": "John Smith", "subject": "Appointment Question"}', '192.168.1.126', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '30 minutes'),
((SELECT id FROM users WHERE role = 'practitioner' LIMIT 1), 'message_sent', 'Message Sent', 'Message sent to John Smith with appointment details', '{"messageId": "msg-002", "recipient": "John Smith", "subject": "Appointment Confirmation"}', '192.168.1.127', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '15 minutes'),

-- Additional User Activities
((SELECT id FROM users WHERE role = 'patient' LIMIT 1), 'user_login', 'User Login', 'User John Smith logged in', '{"email": "john.smith@example.com"}', '192.168.1.128', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '30 minutes'),
((SELECT id FROM users WHERE role = 'practitioner' LIMIT 1), 'user_login', 'User Login', 'User Dr. Sarah Johnson logged in', '{"email": "sarah.johnson@tinhih.org"}', '192.168.1.129', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '45 minutes'),
((SELECT id FROM users WHERE role = 'admin' LIMIT 1), 'user_login', 'User Login', 'User Admin User logged in', '{"email": "admin@tinhih.org"}', '192.168.1.130', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '1 hour'),

-- Appointment Activities
((SELECT id FROM users WHERE role = 'patient' LIMIT 1), 'appointment_created', 'Appointment Created', 'Appointment "Follow-up Consultation" was created', '{"appointmentId": "apt-001", "patientId": "pat-001", "practitionerId": "prac-001", "title": "Follow-up Consultation"}', '192.168.1.131', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '2 days'),
((SELECT id FROM users WHERE role = 'practitioner' LIMIT 1), 'appointment_updated', 'Appointment Updated', 'Appointment "Follow-up Consultation" was updated', '{"appointmentId": "apt-001", "title": "Follow-up Consultation"}', '192.168.1.132', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '1 day'),
((SELECT id FROM users WHERE role = 'patient' LIMIT 1), 'appointment_cancelled', 'Appointment Cancelled', 'Appointment "Initial Consultation" was cancelled', '{"appointmentId": "apt-002", "title": "Initial Consultation"}', '192.168.1.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '3 days'),
((SELECT id FROM users WHERE role = 'practitioner' LIMIT 1), 'appointment_completed', 'Appointment Completed', 'Appointment "Therapy Session" was completed', '{"appointmentId": "apt-003", "title": "Therapy Session"}', '192.168.1.134', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', NOW() - INTERVAL '4 days');

-- Display the count of activities created
SELECT 'Sample activities created successfully!' as message, COUNT(*) as total_activities FROM activities;
