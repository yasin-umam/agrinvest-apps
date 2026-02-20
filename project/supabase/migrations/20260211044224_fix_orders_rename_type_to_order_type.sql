/*
  # Rename orders.type column to order_type

  1. Problem
    - Some functions/policies use `order_type` but column is still named `type`
    - Need to rename for consistency and to fix 400 errors
    - Must handle case where column might already be renamed

  2. Solution
    - Safely rename column from `type` to `order_type`
    - Update constraint to use new column name
    - Handle case where rename already happened

  3. Changes
    - Rename type column to order_type if it exists
    - Update CHECK constraint
*/

-- Check if we need to rename the column
DO $$
BEGIN
  -- Check if 'type' column exists and 'order_type' doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'order_type'
  ) THEN
    -- Rename the column
    ALTER TABLE orders RENAME COLUMN type TO order_type;
    
    -- Drop old constraint if exists
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_type_check;
    
    -- Add new constraint
    ALTER TABLE orders 
    DROP CONSTRAINT IF EXISTS orders_order_type_check;
    
    ALTER TABLE orders 
    ADD CONSTRAINT orders_order_type_check 
    CHECK (order_type IN ('buy', 'sell'));
    
    RAISE NOTICE 'Successfully renamed orders.type to orders.order_type';
  ELSE
    RAISE NOTICE 'Column rename not needed - order_type already exists or type does not exist';
  END IF;
END $$;
