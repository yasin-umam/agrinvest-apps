/*
  # Fix all admin policies to use is_admin() function
  
  1. Changes
    - Update portfolios policies to use is_admin() function
    - Update notifications policies to use is_admin() function
    - Update chili_products policies to use is_admin() function
  
  2. Security
    - Prevent infinite recursion by using SECURITY DEFINER function
    - Maintain existing access control rules
*/

-- Fix portfolios policies
DROP POLICY IF EXISTS "Admins can view all portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can view own portfolio" ON portfolios;

CREATE POLICY "Users and admins can view portfolios"
  ON portfolios
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR is_admin()
  );

-- Fix notifications policies if they exist
DO $$
BEGIN
  -- Drop existing admin policies on notifications if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname LIKE '%admin%'
  ) THEN
    DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
    
    CREATE POLICY "Users and admins can view notifications"
      ON notifications
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = user_id OR is_admin()
      );
  END IF;
END $$;

-- Fix chili_products policies if they exist
DO $$
BEGIN
  -- Drop existing admin policies on chili_products if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chili_products' 
    AND policyname LIKE '%admin%'
  ) THEN
    DROP POLICY IF EXISTS "Admins can update chili_products" ON chili_products;
    DROP POLICY IF EXISTS "Admins can insert chili_products" ON chili_products;
    DROP POLICY IF EXISTS "Admins can delete chili_products" ON chili_products;
    
    CREATE POLICY "Admins can manage chili_products"
      ON chili_products
      FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;
