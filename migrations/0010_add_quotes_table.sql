-- Migration: Add quotes table
-- Date: 2024-01-XX

CREATE TABLE IF NOT EXISTS "quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "text" text NOT NULL,
  "author" text NOT NULL,
  "category" text DEFAULT 'general',
  "tags" jsonb DEFAULT '[]',
  "is_active" boolean NOT NULL DEFAULT true,
  "is_featured" boolean NOT NULL DEFAULT false,
  "display_order" integer DEFAULT 0,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS "quotes_category_idx" ON "quotes"("category");
CREATE INDEX IF NOT EXISTS "quotes_is_active_idx" ON "quotes"("is_active");
CREATE INDEX IF NOT EXISTS "quotes_is_featured_idx" ON "quotes"("is_featured");
CREATE INDEX IF NOT EXISTS "quotes_display_order_idx" ON "quotes"("display_order");
CREATE INDEX IF NOT EXISTS "quotes_created_by_idx" ON "quotes"("created_by");

-- Insert some sample quotes
INSERT INTO "quotes" ("text", "author", "category", "tags", "is_featured", "display_order") VALUES
('The greatest wealth is health.', 'Ralph Waldo Emerson', 'health', '["health", "wealth", "wellness"]', true, 1),
('Healing is a matter of time, but it is sometimes also a matter of opportunity.', 'Hippocrates', 'recovery', '["healing", "time", "opportunity"]', true, 2),
('The doctor of the future will give no medicine, but will instruct his patient in the care of the human frame, in diet, and in the cause and prevention of disease.', 'Thomas Edison', 'wellness', '["prevention", "diet", "health"]', true, 3),
('Take care of your body. It''s the only place you have to live.', 'Jim Rohn', 'motivation', '["body", "care", "motivation"]', true, 4),
('Health is not valued till sickness comes.', 'Thomas Fuller', 'health', '["health", "sickness", "value"]', false, 5),
('The art of medicine consists of amusing the patient while nature cures the disease.', 'Voltaire', 'recovery', '["medicine", "nature", "healing"]', false, 6),
('Your health is an investment, not an expense.', 'Unknown', 'motivation', '["health", "investment", "motivation"]', false, 7),
('Wellness is the complete integration of body, mind, and spirit.', 'Greg Anderson', 'wellness', '["wellness", "integration", "mind"]', false, 8),
('The first wealth is health.', 'Ralph Waldo Emerson', 'health', '["health", "wealth", "first"]', false, 9),
('Prevention is better than cure.', 'Desiderius Erasmus', 'wellness', '["prevention", "cure", "wellness"]', false, 10);
