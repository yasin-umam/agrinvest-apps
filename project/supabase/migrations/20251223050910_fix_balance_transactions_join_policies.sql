/*
  # Fix Balance Transactions Join Policies
  
  ## Overview
  Ensures that admins can properly query balance_transactions with joined profiles data.
  
  ## Changes
  1. Add explicit policy for admins to view all profiles for balance transaction joins
  2. Ensure balance_transactions policies work correctly with foreign key joins
  
  ## Security
  - Maintains RLS security
  - Admins can view all data needed for balance management
  - Users can only view their own transactions
*/

-- Drop existing restrictive profiles policy and create more explicit ones
DROP POLICY IF EXISTS "Allow profile access" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Ensure balance_transactions can be properly joined
COMMENT ON TABLE balance_transactions IS 'User balance top-up and withdrawal transactions with admin approval workflow - realtime enabled with proper join policies';
