/*
  # Add RLS Policies for chili_products table

  1. Security Policies
    - Admin users can perform all operations (SELECT, INSERT, UPDATE, DELETE)
    - Regular users can only view active products (SELECT)
    - All policies check authentication status
  
  2. Changes
    - Add policy for admin to select all products
    - Add policy for admin to insert products
    - Add policy for admin to update products
    - Add policy for admin to delete products
    - Add policy for authenticated users to view active products
*/

-- Admin can view all products
CREATE POLICY "Admin can view all chili products"
  ON chili_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can insert products
CREATE POLICY "Admin can insert chili products"
  ON chili_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can update products
CREATE POLICY "Admin can update chili products"
  ON chili_products FOR UPDATE
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

-- Admin can delete products
CREATE POLICY "Admin can delete chili products"
  ON chili_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Regular users can view active products
CREATE POLICY "Users can view active chili products"
  ON chili_products FOR SELECT
  TO authenticated
  USING (is_active = true);
