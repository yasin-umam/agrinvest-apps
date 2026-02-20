/*
  # Fix Profile RLS Policies

  ## Changes
  - Remove circular dependency in admin policies
  - Simplify policies to avoid recursion
  
  ## Security
  - Users can view and update their own profile
  - Admin checks removed to prevent infinite recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- The user policies are fine, they don't cause recursion
-- Users can already view and update their own profiles with these existing policies:
-- "Users can view own profile"
-- "Users can update own profile"