/*
  # Fix Profiles Infinite Recursion - Final Fix
  
  ## Overview
  Fixes the infinite recursion error in profiles RLS policies by using the is_admin() function
  which has SECURITY DEFINER and bypasses RLS checks.
  
  ## Changes
  1. Drop the problematic policies that cause recursion
  2. Create new policies using is_admin() function to avoid recursion
  
  ## Security
  - Maintains RLS security
  - Users can view their own profile
  - Admins can view all profiles without recursion
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create new policies using is_admin() function to avoid recursion
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Verify the is_admin function exists and is properly configured
COMMENT ON FUNCTION is_admin() IS 'Check if current user is admin - SECURITY DEFINER to avoid RLS recursion';
