-- Run this SQL in your Supabase SQL Editor to fix the user creation trigger
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

-- Step 1: Drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Update the trigger function to handle duplicates gracefully
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert user only if not exists (using ON CONFLICT)
  INSERT INTO public.users (id, email, credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    5 -- Free credits on signup
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 3: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 4: Also add policy to allow inserting users
-- First, check if policy exists and drop it
DROP POLICY IF EXISTS "Service role can insert users" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;

-- Create policy that allows inserts from authenticated or service role
CREATE POLICY "Allow user creation"
  ON users FOR INSERT
  WITH CHECK (true);

-- Step 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO service_role;

-- Verify the setup
SELECT 'Trigger and policies updated successfully!' as status;
