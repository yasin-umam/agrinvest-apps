/*
  # Fix CRITICAL-5: Add Portfolio Validation for Sell Orders
  
  ## Critical Security Issue
  Users could potentially create sell orders for assets they don't own or exceed
  their portfolio quantity, either through:
  1. Direct API calls bypassing frontend validation
  2. Race conditions (clicking sell button multiple times)
  3. Manipulating requests to create fraudulent sell orders
  
  ## Example Attack (Before Fix)
  ```javascript
  // User owns 0 units, but creates sell order
  await supabase.from('orders').insert({
    type: 'sell',
    product_id: 'product-id',
    quantity: 1000,
    price: 50000
  });
  ```
  
  ## Impact
  - Fake sell orders clutter the system
  - Admin time wasted reviewing invalid orders
  - Market manipulation possible
  - User gets paid for assets they don't own if admin approves
  
  ## Changes Made
  
  1. **Trigger Function for Sell Order Validation**
     - Checks portfolio quantity before INSERT of sell orders
     - Prevents sell orders exceeding owned quantity
     - Raises exception if validation fails
  
  2. **RLS Policy Enhancement**
     - Added CHECK policy for sell order creation
     - Validates portfolio ownership at database level
  
  3. **Race Condition Protection**
     - Uses SELECT FOR UPDATE to lock portfolio row during validation
     - Prevents concurrent sell orders exceeding total quantity
  
  ## Security After Fix
  
  - ✅ Impossible to create sell orders without sufficient portfolio
  - ✅ Race conditions prevented with row-level locks
  - ✅ Both frontend AND backend validation in place
  - ✅ Admin only sees valid, executable orders
*/

-- Function to validate sell orders against portfolio
CREATE OR REPLACE FUNCTION validate_sell_order()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_portfolio_quantity integer;
  v_total_pending_sell integer;
  v_available_to_sell integer;
BEGIN
  -- Only validate sell orders at INSERT
  IF NEW.type = 'sell' AND TG_OP = 'INSERT' THEN
    
    -- Lock the portfolio row to prevent race conditions
    -- Check current portfolio quantity
    SELECT quantity INTO v_portfolio_quantity
    FROM portfolios
    WHERE user_id = NEW.user_id
      AND product_id = NEW.product_id
    FOR UPDATE;  -- Lock row to prevent concurrent modifications
    
    -- If portfolio doesn't exist, user doesn't own this asset
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot create sell order: You do not own any units of this product. Product ID: %', NEW.product_id;
    END IF;
    
    -- Calculate total pending sell orders for this product
    SELECT COALESCE(SUM(quantity), 0) INTO v_total_pending_sell
    FROM orders
    WHERE user_id = NEW.user_id
      AND product_id = NEW.product_id
      AND type = 'sell'
      AND status = 'pending';
    
    -- Calculate available quantity to sell
    v_available_to_sell := v_portfolio_quantity - v_total_pending_sell;
    
    -- Validate new sell order doesn't exceed available quantity
    IF NEW.quantity > v_available_to_sell THEN
      RAISE EXCEPTION 'Cannot create sell order: Insufficient portfolio quantity. You own % units, have % units in pending sell orders, and are trying to sell % more units. Available to sell: % units.',
        v_portfolio_quantity,
        v_total_pending_sell,
        NEW.quantity,
        v_available_to_sell;
    END IF;
    
    -- Validation passed
    RAISE NOTICE 'Sell order validation passed for user % product %: selling % units out of % available',
      NEW.user_id,
      NEW.product_id,
      NEW.quantity,
      v_available_to_sell;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate sell orders BEFORE insert
DROP TRIGGER IF EXISTS validate_sell_order_trigger ON orders;
CREATE TRIGGER validate_sell_order_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_sell_order();

-- Add RLS policy to double-check at policy level (defense in depth)
-- This policy restricts sell order creation to only valid portfolio quantities
DROP POLICY IF EXISTS "Users can only create valid sell orders" ON orders;
CREATE POLICY "Users can only create valid sell orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow all buy orders
    type = 'buy'
    OR
    -- For sell orders, verify portfolio ownership
    (
      type = 'sell'
      AND EXISTS (
        SELECT 1 FROM portfolios
        WHERE portfolios.user_id = auth.uid()
          AND portfolios.product_id = orders.product_id
          AND portfolios.quantity >= orders.quantity
      )
    )
  );

-- Add constraint to ensure positive quantities
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS check_positive_quantity;

ALTER TABLE orders
ADD CONSTRAINT check_positive_quantity
CHECK (quantity > 0);

-- Add comment documenting the validation
COMMENT ON FUNCTION validate_sell_order IS 'Validates sell orders against portfolio quantity with row-level locks to prevent race conditions. Checks total pending sell orders to prevent overselling.';

COMMENT ON TRIGGER validate_sell_order_trigger ON orders IS 'Prevents users from creating sell orders exceeding their portfolio quantity.';
