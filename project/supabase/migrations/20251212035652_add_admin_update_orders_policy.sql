/*
  # Add admin policy to update orders
  
  1. Changes
    - Add policy for admins to update any order (for approve/reject functionality)
    
  2. Security
    - Only authenticated users with admin role can update orders
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Admins can update all orders'
  ) THEN
    CREATE POLICY "Admins can update all orders"
      ON orders
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;
