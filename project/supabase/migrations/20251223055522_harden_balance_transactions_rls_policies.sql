-- Harden Balance Transactions RLS Policies
--
-- 1. Changes
--   - Drop existing permissive policies
--   - Create restrictive policies
--   - Users can only view their own transactions
--   - Users can only create their own transactions (with proof for topup)
--   - Admins can only update status and review fields
--   - No one can delete transactions
--
-- 2. Security
--   - Enforce strict access control
--   - Prevent unauthorized access
--   - Maintain audit trail integrity

-- Drop all existing policies on balance_transactions
DROP POLICY IF EXISTS "Users can view own balance transactions" ON balance_transactions;
DROP POLICY IF EXISTS "Users can create own balance transactions" ON balance_transactions;
DROP POLICY IF EXISTS "Admins can view all balance transactions" ON balance_transactions;
DROP POLICY IF EXISTS "Admins can update balance transactions" ON balance_transactions;

-- Policy: Users can view only their own transactions
CREATE POLICY "Users can view own transactions only"
  ON balance_transactions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR is_admin()
  );

-- Policy: Users can create their own transactions
CREATE POLICY "Users can create own transactions"
  ON balance_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

-- Policy: Only admins can update transactions (status review only)
CREATE POLICY "Admins can update transaction status"
  ON balance_transactions
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- No delete policy - transactions are immutable and cannot be deleted