/*
  # Fix market_statistics View - Use order_type Column

  1. Problem
    - View `market_statistics` references `o.type` from orders table
    - The correct column name is `order_type`, not `type`
    - This causes query errors when view is used

  2. Solution
    - Recreate view using `order_type` instead of `type`
    - Keep all other logic and structure the same

  3. Changes
    - Replace `o.type = 'buy'` with `o.order_type = 'buy'`
    - Replace `o.type = 'sell'` with `o.order_type = 'sell'`
*/

-- Recreate market_statistics view with correct column name
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

COMMENT ON VIEW market_statistics IS 
'Provides market statistics including trading volumes split by buy/sell order types. Uses security_invoker for proper RLS enforcement.';
