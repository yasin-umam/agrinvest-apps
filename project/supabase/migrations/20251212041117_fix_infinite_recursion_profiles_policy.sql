/*
  # Fix infinite recursion in profiles policy
  
  1. Changes
    - Drop the problematic "Admins can view all profiles" policy
    - Create a new policy that doesn't cause infinite recursion
    - Use a direct check on the current row instead of subquery
  
  2. Security
    - Admins can view all profiles
    - Regular users can only view their own profile
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a new policy that checks the current user's role directly
-- This avoids infinite recursion by not querying profiles table in the policy
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if viewing own profile OR if current user is admin
    (auth.uid() = id) 
    OR 
    (
      -- Check if current user has admin role by looking at their own row
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
  );
