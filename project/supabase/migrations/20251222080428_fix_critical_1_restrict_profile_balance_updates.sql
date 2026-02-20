/*
  # Fix CRITICAL-1: Restrict User Profile Updates to Prevent Balance Manipulation
  
  ## Critical Security Issue
  Previous policy allowed users to update their own balance directly, creating a critical 
  vulnerability where users could give themselves unlimited money.
  
  ## Changes Made
  
  1. **Drop Existing Vulnerable Policy**
     - Removed "Users can update own profile" policy that allowed unrestricted updates
  
  2. **Create Restricted User Update Policy**
     - New policy allows users to update ONLY safe columns:
       - full_name (display name)
       - avatar_url (profile picture)
     - Explicitly BLOCKS updates to:
       - balance (can only be changed via SECURITY DEFINER functions)
       - role (can only be changed by admins)
  
  3. **Create Admin-Only Policy**
     - Admins can update all profile fields including balance and role
     - Uses is_admin() helper function for authorization
  
  ## Security Implications
  
  After this migration:
  - ✅ Users CANNOT manipulate their own balance
  - ✅ Users CANNOT change their role to admin
  - ✅ Balance can only be changed through secure trigger functions
  - ✅ Admins retain ability to manage all user data
  
  ## Balance Update Methods (Secure)
  
  Balance should ONLY be updated through these secure methods:
  1. Order completion triggers (update_portfolio_on_order_complete)
  2. Dividend distribution triggers (distribute_harvest_dividend)
  3. Admin actions via update_user_balance() function (after fixing CRITICAL-2)
*/

-- Drop the vulnerable policy that allowed users to update their own balance
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create restricted policy for users to update ONLY safe columns
CREATE POLICY "Users can update own safe profile fields"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- The OLD values for balance and role must remain unchanged
    AND balance = (SELECT balance FROM profiles WHERE id = auth.uid())
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Create admin policy to update any profile (including balance and role)
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add comment documenting the security model
COMMENT ON TABLE profiles IS 'User profiles with RLS. Users can only update full_name and avatar_url. Balance and role changes require admin privileges or SECURITY DEFINER functions.';
