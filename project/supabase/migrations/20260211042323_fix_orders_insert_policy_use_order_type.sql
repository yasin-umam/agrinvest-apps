/*
  # Fix Orders INSERT Policy - Use order_type Column

  1. Problem
    - RLS policy "Users can only create valid sell orders" uses column `type`
    - The actual column name is `order_type`, not `type`
    - This causes 400 Bad Request error when inserting orders
    - Error: column "type" does not exist

  2. Solution
    - Update policy to use `order_type` instead of `type`
    - Keep all validation logic the same

  3. Changes
    - Replace `type = 'buy'` with `order_type = 'buy'`
    - Replace `type = 'sell'` with `order_type = 'sell'`
*/

-- Drop and recreate the policy with correct column name
DROP POLICY IF EXISTS "Users can only create valid sell orders" ON orders;

CREATE POLICY "Users can only create valid sell orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow all buy orders
    order_type = 'buy'
    OR
    -- For sell orders, verify portfolio ownership
    (
      order_type = 'sell'
      AND EXISTS (
        SELECT 1 FROM portfolios
        WHERE portfolios.user_id = auth.uid()
          AND portfolios.product_id = orders.product_id
          AND portfolios.quantity >= orders.quantity
      )
    )
  );

COMMENT ON POLICY "Users can only create valid sell orders" ON orders IS 
'Allows authenticated users to create buy orders freely. For sell orders, ensures user owns sufficient quantity in their portfolio.';
