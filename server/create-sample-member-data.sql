-- Create sample data for member dashboard testing
-- This script adds sample donations and store orders for the member user

-- First, get the member user ID
DO $$
DECLARE
    member_user_id UUID;
BEGIN
    -- Get the member user ID
    SELECT id INTO member_user_id FROM users WHERE email = 'member@tinhih.org' AND role = 'member' LIMIT 1;
    
    IF member_user_id IS NOT NULL THEN
        -- Insert sample donations
        INSERT INTO donations (amount, currency, email, first_name, last_name, message, is_anonymous, stripe_payment_intent_id, status, donor_id, created_at, updated_at)
        VALUES 
            (50.00, 'usd', 'member@tinhih.org', 'Community', 'Member', 'Supporting healthcare initiatives', false, 'pi_test_donation_1', 'completed', member_user_id, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
            (100.00, 'usd', 'member@tinhih.org', 'Community', 'Member', 'Monthly contribution', false, 'pi_test_donation_2', 'completed', member_user_id, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
            (25.00, 'usd', 'member@tinhih.org', 'Community', 'Member', 'Small contribution', false, 'pi_test_donation_3', 'completed', member_user_id, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days');
        
        -- Insert sample store orders
        INSERT INTO store_orders (order_number, customer_id, customer_email, customer_name, customer_phone, shipping_address, items, subtotal, shipping, tax, total, currency, status, payment_status, fulfillment_status, stripe_payment_intent_id, created_at, updated_at)
        VALUES 
            ('ORD-001', member_user_id, 'member@tinhih.org', 'Community Member', '+1-555-000-0006', 
             '{"street": "123 Community St", "city": "Anytown", "state": "CA", "zip": "90210", "country": "USA"}',
             '[{"name": "TiNHiH T-Shirt", "quantity": 2, "price": 25.00}, {"name": "Wellness Journal", "quantity": 1, "price": 15.00}]',
             65.00, 5.00, 5.85, 75.85, 'usd', 'delivered', 'paid', 'delivered', 'pi_test_order_1',
             NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
            
            ('ORD-002', member_user_id, 'member@tinhih.org', 'Community Member', '+1-555-000-0006',
             '{"street": "123 Community St", "city": "Anytown", "state": "CA", "zip": "90210", "country": "USA"}',
             '[{"name": "Mental Health Awareness Bracelet", "quantity": 1, "price": 12.00}]',
             12.00, 3.00, 1.35, 16.35, 'usd', 'delivered', 'paid', 'delivered', 'pi_test_order_2',
             NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days');
        
        -- Insert sample activities for events attended
        INSERT INTO activities (user_id, type, title, description, metadata, ip_address, user_agent, created_at)
        VALUES 
            (member_user_id, 'appointment_completed', 'Wellness Workshop Attended', 'Attended monthly wellness workshop', '{"eventType": "workshop", "duration": "2 hours"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '10 days'),
            (member_user_id, 'appointment_completed', 'Support Group Session', 'Participated in community support group', '{"eventType": "support_group", "duration": "1.5 hours"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '5 days'),
            (member_user_id, 'appointment_completed', 'Mental Health Seminar', 'Attended mental health awareness seminar', '{"eventType": "seminar", "duration": "3 hours"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', NOW() - INTERVAL '2 days');
        
        RAISE NOTICE 'Sample data created for member user: %', member_user_id;
    ELSE
        RAISE NOTICE 'Member user not found. Please run the seed script first.';
    END IF;
END $$;
