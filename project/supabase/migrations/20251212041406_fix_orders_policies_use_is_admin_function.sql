/*
  # Fix orders policies to use is_admin() function
  
  1. Changes
    - Drop existing admin policies for orders
    - Create new policies using is_admin() function to avoid infinite recursion
  
  2. Security
    - Users can view their own orders
    - Admins can view all orders
    - Users can update their own orders
    - Admins can update all orders
*/

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;

-- Recreate SELECT policies
DROP POLICY IF EXISTS "Users can view own orders" ON orders;

CREATE POLICY "Users and admins can view orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    -- User can view own orders
    auth.uid() = user_id
    OR
    -- OR user is admin (using SECURITY DEFINER function)
    is_admin()
  );

-- Recreate UPDATE policies
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

CREATE POLICY "Users and admins can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update own orders
    auth.uid() = user_id
    OR
    -- OR user is admin (using SECURITY DEFINER function)
    is_admin()
  )
  WITH CHECK (
    -- User can update own orders
    auth.uid() = user_id
    OR
    -- OR user is admin (using SECURITY DEFINER function)
    is_admin()
  );
