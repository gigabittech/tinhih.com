-- Add stripePaymentIntentId field to invoices table
ALTER TABLE invoices
ADD COLUMN stripe_payment_intent_id TEXT;

-- Add index for better performance
CREATE INDEX idx_invoices_stripe_payment_intent_id ON invoices(stripe_payment_intent_id);
