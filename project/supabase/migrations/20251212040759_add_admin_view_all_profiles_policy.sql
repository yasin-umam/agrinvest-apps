/*
  # Add admin policy to view all profiles
  
  1. Changes
    - Add policy for admins to view all user profiles
    - This is needed when admins query orders with joined profile data
  
  2. Security
    - Policy checks that user has admin role before allowing access
    - Regular users can still only view their own profile
*/

-- Add policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
