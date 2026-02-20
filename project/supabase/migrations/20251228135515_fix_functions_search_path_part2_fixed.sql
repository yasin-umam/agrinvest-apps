/*
  # Fix Function Search Path - Part 2: Balance & Revenue Functions
  
  ## Changes
  Add immutable search_path to:
  - Balance tracking functions
  - Revenue tracking functions
  - Portfolio functions
*/

-- Drop and recreate balance tracking functions with proper search_path
DROP FUNCTION IF EXISTS get_user_balance_for_date(UUID, DATE);
CREATE FUNCTION get_user_balance_for_date(target_user_id UUID, target_date DATE)
RETURNS NUMERIC AS $$
DECLARE
  balance_value NUMERIC;
BEGIN
  SELECT balance INTO balance_value
  FROM balance_snapshots
  WHERE user_id = target_user_id 
    AND snapshot_date = target_date
  LIMIT 1;
  
  IF balance_value IS NULL THEN
    SELECT balance INTO balance_value
    FROM profiles
    WHERE id = target_user_id;
  END IF;
  
  RETURN COALESCE(balance_value, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS get_user_today_balance(UUID);
CREATE FUNCTION get_user_today_balance(target_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN get_user_balance_for_date(target_user_id, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS get_user_yesterday_balance(UUID);
CREATE FUNCTION get_user_yesterday_balance(target_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN get_user_balance_for_date(target_user_id, CURRENT_DATE - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS get_today_balance_change(UUID);
CREATE FUNCTION get_today_balance_change(target_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  today_balance NUMERIC;
  yesterday_balance NUMERIC;
BEGIN
  today_balance := get_user_today_balance(target_user_id);
  yesterday_balance := get_user_yesterday_balance(target_user_id);
  
  RETURN today_balance - yesterday_balance;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS get_yesterday_balance_change(UUID);
CREATE FUNCTION get_yesterday_balance_change(target_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  yesterday_balance NUMERIC;
  two_days_ago_balance NUMERIC;
BEGIN
  yesterday_balance := get_user_yesterday_balance(target_user_id);
  two_days_ago_balance := get_user_balance_for_date(target_user_id, CURRENT_DATE - INTERVAL '2 days');
  
  RETURN yesterday_balance - two_days_ago_balance;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS get_user_balance_percentage_change(UUID);
CREATE FUNCTION get_user_balance_percentage_change(target_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  today_balance NUMERIC;
  yesterday_balance NUMERIC;
  change_amount NUMERIC;
  percentage_change NUMERIC;
BEGIN
  today_balance := get_user_today_balance(target_user_id);
  yesterday_balance := get_user_yesterday_balance(target_user_id);
  change_amount := today_balance - yesterday_balance;
  
  IF yesterday_balance = 0 OR yesterday_balance IS NULL THEN
    IF change_amount > 0 THEN
      RETURN 100;
    ELSE
      RETURN 0;
    END IF;
  END IF;
  
  percentage_change := (change_amount / yesterday_balance) * 100;
  RETURN ROUND(percentage_change, 2);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Harvest revenue functions
DROP FUNCTION IF EXISTS get_today_harvest_revenue(UUID);
CREATE FUNCTION get_today_harvest_revenue(target_product_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  revenue_value NUMERIC;
BEGIN
  SELECT total_revenue INTO revenue_value
  FROM harvest_revenue_tracking
  WHERE product_id = target_product_id 
    AND harvest_date = CURRENT_DATE
  LIMIT 1;
  
  RETURN COALESCE(revenue_value, 0);
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS get_yesterday_harvest_revenue(UUID);
CREATE FUNCTION get_yesterday_harvest_revenue(target_product_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  revenue_value NUMERIC;
BEGIN
  SELECT total_revenue INTO revenue_value
  FROM harvest_revenue_tracking
  WHERE product_id = target_product_id 
    AND harvest_date = CURRENT_DATE - INTERVAL '1 day'
  LIMIT 1;
  
  RETURN COALESCE(revenue_value, 0);
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS update_revenue_trend(UUID);
CREATE FUNCTION update_revenue_trend(target_product_id UUID)
RETURNS VOID AS $$
DECLARE
  today_rev NUMERIC;
  yesterday_rev NUMERIC;
  trend_value NUMERIC;
BEGIN
  today_rev := get_today_harvest_revenue(target_product_id);
  yesterday_rev := get_yesterday_harvest_revenue(target_product_id);
  
  IF yesterday_rev = 0 THEN
    IF today_rev > 0 THEN
      trend_value := 100;
    ELSE
      trend_value := 0;
    END IF;
  ELSE
    trend_value := ((today_rev - yesterday_rev) / yesterday_rev) * 100;
  END IF;
  
  UPDATE chili_products
  SET revenue_trend = ROUND(trend_value, 2)
  WHERE id = target_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS update_all_revenue_trends();
CREATE FUNCTION update_all_revenue_trends()
RETURNS VOID AS $$
DECLARE
  product_record RECORD;
BEGIN
  FOR product_record IN SELECT id FROM chili_products WHERE is_active = true LOOP
    PERFORM update_revenue_trend(product_record.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Portfolio functions
DROP FUNCTION IF EXISTS get_portfolio_value(UUID);
CREATE FUNCTION get_portfolio_value(target_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_value NUMERIC;
BEGIN
  SELECT COALESCE(SUM(pf.quantity * p.current_price), 0) INTO total_value
  FROM portfolios pf
  JOIN chili_products p ON pf.product_id = p.id
  WHERE pf.user_id = target_user_id AND pf.quantity > 0;
  
  RETURN total_value;
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS get_trending_products(INTEGER);
CREATE FUNCTION get_trending_products(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  current_price NUMERIC,
  price_change_percent_24h NUMERIC,
  traded_volume_24h NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.code,
    p.name,
    p.current_price,
    p.price_change_percent_24h,
    p.traded_volume_24h
  FROM chili_products p
  WHERE p.is_active = true
  ORDER BY p.traded_volume_24h DESC, p.price_change_percent_24h DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp;
