/*
  # Fix Security Definer Views
  
  ## Problem
  Views `portfolio_summary` and `market_statistics` run with SECURITY DEFINER
  which uses owner privileges instead of caller privileges.
  
  ## Solution
  Recreate views with SECURITY INVOKER to enforce proper RLS policies.
  
  ## Changes
  1. Drop and recreate portfolio_summary with security_invoker = true
  2. Drop and recreate market_statistics with security_invoker = true
*/

-- Recreate portfolio_summary with SECURITY INVOKER
DROP VIEW IF EXISTS portfolio_summary;
CREATE VIEW portfolio_summary 
WITH (security_invoker = true)
AS
SELECT 
  pf.user_id,
  p.code,
  p.name,
  pf.quantity,
  pf.average_buy_price,
  p.current_price,
  (p.current_price - pf.average_buy_price) * pf.quantity as unrealized_pnl,
  ((p.current_price - pf.average_buy_price) / pf.average_buy_price * 100) as pnl_percentage,
  pf.total_invested,
  pf.quantity * p.current_price as current_value
FROM portfolios pf
JOIN chili_products p ON pf.product_id = p.id
WHERE pf.quantity > 0
ORDER BY pf.user_id, unrealized_pnl DESC;

-- Recreate market_statistics with SECURITY INVOKER
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
  SUM(CASE WHEN o.type = 'buy' THEN o.quantity ELSE 0 END) as buy_volume,
  SUM(CASE WHEN o.type = 'sell' THEN o.quantity ELSE 0 END) as sell_volume
FROM chili_products p
LEFT JOIN orders o ON p.id = o.product_id AND o.created_at > NOW() - INTERVAL '24 hours'
WHERE p.is_active = true
GROUP BY p.id, p.code, p.name, p.current_price, p.price_change_24h, p.price_change_percent_24h, p.traded_volume_24h
ORDER BY p.traded_volume_24h DESC;
