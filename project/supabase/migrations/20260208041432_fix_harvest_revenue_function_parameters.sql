/*
  # Fix Harvest Revenue Function Parameters

  ## Problem
  The harvest revenue tracking functions use `p_user_id` parameter while the balance functions
  use `target_user_id` parameter, causing inconsistency and function call failures from frontend.

  ## Solution
  Update all harvest revenue functions to use `target_user_id` parameter name for consistency.

  ## Changes
  1. Drop and recreate `get_user_today_harvest_revenue` with `target_user_id` parameter
  2. Drop and recreate `get_user_yesterday_harvest_revenue` with `target_user_id` parameter
  3. Drop and recreate `get_user_harvest_revenue_trend` with `target_user_id` parameter
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_today_harvest_revenue(uuid);
DROP FUNCTION IF EXISTS get_user_yesterday_harvest_revenue(uuid);
DROP FUNCTION IF EXISTS get_user_harvest_revenue_trend(uuid);

-- Recreate with consistent parameter naming
CREATE FUNCTION get_user_today_harvest_revenue(target_user_id uuid)
RETURNS numeric
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_revenue numeric;
BEGIN
  SELECT COALESCE(SUM(user_revenue), 0) INTO v_revenue
  FROM user_harvest_distributions
  WHERE user_id = target_user_id
    AND DATE(created_at) = CURRENT_DATE;
  
  RETURN v_revenue;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE FUNCTION get_user_yesterday_harvest_revenue(target_user_id uuid)
RETURNS numeric
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_revenue numeric;
BEGIN
  SELECT COALESCE(SUM(user_revenue), 0) INTO v_revenue
  FROM user_harvest_distributions
  WHERE user_id = target_user_id
    AND DATE(created_at) = CURRENT_DATE - INTERVAL '1 day';
  
  RETURN v_revenue;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE FUNCTION get_user_harvest_revenue_trend(target_user_id uuid)
RETURNS numeric
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today_revenue numeric;
  v_yesterday_revenue numeric;
  v_percentage numeric;
BEGIN
  v_today_revenue := get_user_today_harvest_revenue(target_user_id);
  v_yesterday_revenue := get_user_yesterday_harvest_revenue(target_user_id);
  
  IF v_yesterday_revenue = 0 AND v_today_revenue > 0 THEN
    v_percentage := 100;
  ELSIF v_yesterday_revenue = 0 THEN
    v_percentage := 0;
  ELSE
    v_percentage := ((v_today_revenue - v_yesterday_revenue) / v_yesterday_revenue) * 100;
  END IF;
  
  RETURN ROUND(v_percentage, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_today_harvest_revenue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_yesterday_harvest_revenue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_harvest_revenue_trend(uuid) TO authenticated;

-- Update comments
COMMENT ON FUNCTION get_user_today_harvest_revenue IS 'Get total harvest revenue added to user today';
COMMENT ON FUNCTION get_user_yesterday_harvest_revenue IS 'Get total harvest revenue added to user yesterday';
COMMENT ON FUNCTION get_user_harvest_revenue_trend IS 'Calculate percentage change in harvest revenue (today vs yesterday)';
