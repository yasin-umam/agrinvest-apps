/*
  # Fix Harvest Revenue Functions Permissions

  ## Changes
  - Update all harvest revenue functions to use SECURITY DEFINER
  - Grant execute permissions to authenticated users
  - Ensure functions can read from user_balance_history
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS get_user_today_harvest_revenue(uuid);
DROP FUNCTION IF EXISTS get_user_yesterday_harvest_revenue(uuid);
DROP FUNCTION IF EXISTS get_user_harvest_revenue_trend(uuid);

-- Recreate with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_today_harvest_revenue(p_user_id uuid)
RETURNS numeric
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_revenue numeric;
BEGIN
  SELECT COALESCE(SUM(amount_added), 0)
  INTO v_revenue
  FROM user_balance_history
  WHERE user_id = p_user_id
  AND balance_date = CURRENT_DATE
  AND source = 'harvest';
  
  RETURN v_revenue;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_yesterday_harvest_revenue(p_user_id uuid)
RETURNS numeric
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_revenue numeric;
BEGIN
  SELECT COALESCE(SUM(amount_added), 0)
  INTO v_revenue
  FROM user_balance_history
  WHERE user_id = p_user_id
  AND balance_date = CURRENT_DATE - INTERVAL '1 day'
  AND source = 'harvest';
  
  RETURN v_revenue;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_harvest_revenue_trend(p_user_id uuid)
RETURNS numeric
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_today_revenue numeric;
  v_yesterday_revenue numeric;
  v_percentage numeric;
BEGIN
  v_today_revenue := get_user_today_harvest_revenue(p_user_id);
  v_yesterday_revenue := get_user_yesterday_harvest_revenue(p_user_id);
  
  IF v_yesterday_revenue = 0 AND v_today_revenue > 0 THEN
    v_percentage := 100;
  ELSIF v_yesterday_revenue > 0 THEN
    v_percentage := ((v_today_revenue - v_yesterday_revenue) / v_yesterday_revenue) * 100;
  ELSE
    v_percentage := 0;
  END IF;
  
  RETURN v_percentage;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_today_harvest_revenue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_yesterday_harvest_revenue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_harvest_revenue_trend(uuid) TO authenticated;

-- Update comments
COMMENT ON FUNCTION get_user_today_harvest_revenue IS 'Get total harvest revenue added to user today';
COMMENT ON FUNCTION get_user_yesterday_harvest_revenue IS 'Get total harvest revenue added to user yesterday';
COMMENT ON FUNCTION get_user_harvest_revenue_trend IS 'Calculate percentage change in harvest revenue (today vs yesterday)';
