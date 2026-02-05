-- DataFlow - Safe Setup (handles existing tables)
-- Run this if you get "relation already exists" errors

-- ============================================
-- STEP 1: Check if trigger exists and drop it
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- ============================================
-- STEP 2: Drop existing tables (CASCADE removes dependencies)
-- ============================================
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS scrape_data CASCADE;
DROP TABLE IF EXISTS scrape_jobs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- STEP 3: Drop existing functions
-- ============================================
DROP FUNCTION IF EXISTS deduct_credits(UUID, INTEGER);

-- ============================================
-- STEP 4: Create fresh tables
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  credits INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scrape Jobs table
CREATE TABLE scrape_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  csv_path TEXT,
  products_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scrape Data table (temporary storage for products)
CREATE TABLE scrape_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund')),
  amount INTEGER NOT NULL,
  plan_id TEXT,
  payment_intent_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 5: Create indexes for better performance
-- ============================================
CREATE INDEX idx_scrape_jobs_user_id ON scrape_jobs(user_id);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX idx_scrape_jobs_created_at ON scrape_jobs(created_at DESC);
CREATE INDEX idx_scrape_data_job_id ON scrape_data(job_id);
CREATE INDEX idx_scrape_data_expires_at ON scrape_data(expires_at);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================
-- STEP 6: Create functions
-- ============================================

-- Function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  user_id UUID,
  amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT credits INTO current_credits FROM users WHERE id = user_id;
  IF current_credits < amount THEN RETURN FALSE; END IF;
  UPDATE users SET credits = credits - amount, updated_at = NOW() WHERE id = user_id;
  INSERT INTO transactions (user_id, type, amount, description) 
  VALUES (user_id, 'usage', -amount, 'Scrape job deduction');
  RETURN TRUE;
END;
$$;

-- Function to add credits
CREATE OR REPLACE FUNCTION add_credits(
  user_id UUID,
  amount INTEGER,
  plan_id TEXT DEFAULT NULL,
  payment_intent_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users SET credits = credits + amount, updated_at = NOW() WHERE id = user_id;
  INSERT INTO transactions (user_id, type, amount, plan_id, payment_intent_id, description) 
  VALUES (user_id, 'purchase', amount, plan_id, payment_intent_id, 'Credit purchase');
  RETURN TRUE;
END;
$$;

-- ============================================
-- STEP 7: Create trigger for new user signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO users (id, email, credits) VALUES (NEW.id, NEW.email, 5);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STEP 8: Enable Row Level Security
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 9: Create RLS Policies
-- ============================================
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own scrape jobs" ON scrape_jobs;
CREATE POLICY "Users can view own scrape jobs" ON scrape_jobs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own scrape jobs" ON scrape_jobs;
CREATE POLICY "Users can create own scrape jobs" ON scrape_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own scrape jobs" ON scrape_jobs;
CREATE POLICY "Users can update own scrape jobs" ON scrape_jobs FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own scrape data" ON scrape_data;
CREATE POLICY "Users can view own scrape data" ON scrape_data FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own scrape data" ON scrape_data;
CREATE POLICY "Users can create own scrape data" ON scrape_data FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- STEP 10: Cleanup function for old data
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_scrape_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM scrape_data WHERE expires_at < NOW();
END;
$$;

-- Success message
SELECT 'Database setup complete!' as status;
