/*
  # Fix profiles RLS to avoid infinite recursion
  
  1. Changes
    - Drop all existing SELECT policies on profiles
    - Create a single comprehensive SELECT policy
    - Use a SECURITY DEFINER function to check admin status
  
  2. Security
    - Users can view their own profile
    - Admins can view all profiles
    - No infinite recursion
*/

-- Create a function to check if current user is admin
-- SECURITY DEFINER allows it to bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create new comprehensive SELECT policy
CREATE POLICY "Allow profile access"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User can view own profile
    auth.uid() = id
    OR
    -- OR user is admin (using SECURITY DEFINER function)
    is_admin()
  );
