/*
  # Add User Harvest Revenue Tracking Functions

  ## Overview
  Creates functions to track and compare daily harvest revenue amounts
  that users receive from harvests

  ## Features
  - Get today's total harvest revenue for a user
  - Get yesterday's total harvest revenue for a user
  - Compare harvest revenues to show trend arrows
  - Filter by source='harvest' to get only harvest-related additions

  ## Usage
  Used in the user interface to display "+panen Rp x" with trend indicators
*/

-- Function to get user's harvest revenue for today
CREATE OR REPLACE FUNCTION get_user_today_harvest_revenue(p_user_id uuid)
RETURNS numeric AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get user's harvest revenue for yesterday
CREATE OR REPLACE FUNCTION get_user_yesterday_harvest_revenue(p_user_id uuid)
RETURNS numeric AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get harvest revenue trend (percentage change)
CREATE OR REPLACE FUNCTION get_user_harvest_revenue_trend(p_user_id uuid)
RETURNS numeric AS $$
DECLARE
  v_today_revenue numeric;
  v_yesterday_revenue numeric;
  v_percentage numeric;
BEGIN
  v_today_revenue := get_user_today_harvest_revenue(p_user_id);
  v_yesterday_revenue := get_user_yesterday_harvest_revenue(p_user_id);
  
  -- Calculate percentage change
  IF v_yesterday_revenue = 0 AND v_today_revenue > 0 THEN
    v_percentage := 100;
  ELSIF v_yesterday_revenue > 0 THEN
    v_percentage := ((v_today_revenue - v_yesterday_revenue) / v_yesterday_revenue) * 100;
  ELSE
    v_percentage := 0;
  END IF;
  
  RETURN v_percentage;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON FUNCTION get_user_today_harvest_revenue IS 'Get total harvest revenue added to user today';
COMMENT ON FUNCTION get_user_yesterday_harvest_revenue IS 'Get total harvest revenue added to user yesterday';
COMMENT ON FUNCTION get_user_harvest_revenue_trend IS 'Calculate percentage change in harvest revenue (today vs yesterday)';
