-- Add processed column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_processed ON transactions(processed);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_intent ON transactions(payment_intent_id);
