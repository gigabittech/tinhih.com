-- Add message delivery status fields
ALTER TABLE messages ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'read'));

-- Update existing messages to have 'sent' status
UPDATE messages SET delivery_status = 'sent' WHERE delivery_status IS NULL;

-- Add index for better performance
CREATE INDEX idx_messages_delivery_status ON messages(delivery_status);
CREATE INDEX idx_messages_delivered_at ON messages(delivered_at);
