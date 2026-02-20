/*
  # Fix View and Policy After Column Rename

  1. Changes
    - Update market_statistics view to use order_type
    - Update orders INSERT policy to use order_type
    - Both now reference the correct column name

  2. Affected Objects
    - market_statistics view
    - "Users can only create valid sell orders" policy
*/

-- Fix market_statistics view
DROP VIEW IF EXISTS market_statistics;

CREATE VIEW market_statistics
WITH (security_invoker = true)
AS
SELECT 
  p.code,
  p.name,
  p.current_price,
  p.price_change_24h,
  p.price_change_percent_24h,
  p.traded_volume_24h,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(CASE WHEN o.order_type = 'buy' THEN o.quantity ELSE 0 END) as buy_volume,
  SUM(CASE WHEN o.order_type = 'sell' THEN o.quantity ELSE 0 END) as sell_volume
FROM chili_products p
LEFT JOIN orders o ON p.id = o.product_id AND o.created_at > NOW() - INTERVAL '24 hours'
WHERE p.is_active = true
GROUP BY p.id, p.code, p.name, p.current_price, p.price_change_24h, p.price_change_percent_24h, p.traded_volume_24h
ORDER BY p.traded_volume_24h DESC;

-- Fix orders INSERT policy
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

COMMENT ON VIEW market_statistics IS 
'Provides market statistics including trading volumes split by buy/sell order types.';

COMMENT ON POLICY "Users can only create valid sell orders" ON orders IS 
'Allows authenticated users to create buy orders freely. For sell orders, ensures user owns sufficient quantity in their portfolio.';
