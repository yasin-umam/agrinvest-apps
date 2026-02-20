/*
  # Fix validate_sell_order Function - Use order_type Column

  1. Problem
    - Function still references NEW.type which was renamed to NEW.order_type
    - Causes errors when inserting sell orders

  2. Solution
    - Update function to use NEW.order_type instead of NEW.type

  3. Changes
    - Replace NEW.type with NEW.order_type in validation logic
*/

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
  IF NEW.order_type = 'sell' AND TG_OP = 'INSERT' THEN
    
    -- Lock the portfolio row to prevent race conditions
    -- Check current portfolio quantity
    SELECT quantity INTO v_portfolio_quantity
    FROM portfolios
    WHERE user_id = NEW.user_id
      AND product_id = NEW.product_id
    FOR UPDATE;  -- Lock row to prevent concurrent modifications
    
    -- If portfolio doesn't exist, user doesn't own this asset
    IF v_portfolio_quantity IS NULL THEN
      RAISE EXCEPTION 'Cannot create sell order: You do not own any units of this product in your portfolio.';
    END IF;
    
    -- Calculate total pending sell orders for this user and product
    SELECT COALESCE(SUM(quantity), 0) INTO v_total_pending_sell
    FROM orders
    WHERE user_id = NEW.user_id
      AND product_id = NEW.product_id
      AND order_type = 'sell'
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

COMMENT ON FUNCTION validate_sell_order IS 
'Validates sell orders against portfolio holdings before insert. Prevents overselling by checking available quantity minus pending sell orders.';
