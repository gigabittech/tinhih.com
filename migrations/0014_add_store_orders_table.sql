-- Migration: Add store_orders table
-- Date: 2024-01-XX

-- Create store_orders table
CREATE TABLE IF NOT EXISTS store_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    shipping_address JSONB NOT NULL,
    items JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    shipping DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    fulfillment_status TEXT NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id TEXT UNIQUE,
    printful_order_id TEXT UNIQUE,
    tracking_number TEXT,
    tracking_url TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_orders_customer_id ON store_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_customer_email ON store_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_payment_status ON store_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_store_orders_fulfillment_status ON store_orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_store_orders_created_at ON store_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_store_orders_stripe_payment_intent_id ON store_orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_printful_order_id ON store_orders(printful_order_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_store_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_store_orders_updated_at
    BEFORE UPDATE ON store_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_store_orders_updated_at();

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    order_num TEXT;
    counter INTEGER := 1;
BEGIN
    LOOP
        order_num := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(counter::text, 4, '0');
        
        -- Check if order number already exists
        IF NOT EXISTS (SELECT 1 FROM store_orders WHERE order_number = order_num) THEN
            RETURN order_num;
        END IF;
        
        counter := counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_store_order_number
    BEFORE INSERT ON store_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();
