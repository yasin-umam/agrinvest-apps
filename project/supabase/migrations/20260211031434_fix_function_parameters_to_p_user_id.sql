/*
  # Fix Function Parameters to Match Frontend Calls
  
  ## Problem
  Frontend is calling RPC functions with parameter `p_user_id` but functions 
  expect `target_user_id`, causing 404 errors for new users.
  
  ## Solution
  Rename all function parameters from `target_user_id` to `p_user_id` to match
  what the frontend is sending.
  
  ## Functions Updated
  1. get_user_balance_for_date - Changed to p_user_id, p_date
  2. get_user_today_balance - Changed to p_user_id
  3. get_user_yesterday_balance - Changed to p_user_id
  4. get_today_balance_change - Changed to p_user_id
  5. get_yesterday_balance_change - Changed to p_user_id
  6. get_user_balance_percentage_change - Changed to p_user_id
*/

-- Fix get_user_balance_for_date parameter names
DROP FUNCTION IF EXISTS get_user_balance_for_date(UUID, DATE);
CREATE FUNCTION get_user_balance_for_date(p_user_id UUID, p_date DATE)
RETURNS NUMERIC AS $$
DECLARE
  balance_value NUMERIC;
BEGIN
  -- Query from user_balance_history
  SELECT balance INTO balance_value
  FROM user_balance_history
  WHERE user_id = p_user_id 
    AND balance_date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Fallback to current profile balance if no history found
  IF balance_value IS NULL THEN
    SELECT balance INTO balance_value
    FROM profiles
    WHERE id = p_user_id;
  END IF;
  
  RETURN COALESCE(balance_value, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix get_user_today_balance parameter name
DROP FUNCTION IF EXISTS get_user_today_balance(UUID);
CREATE FUNCTION get_user_today_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN get_user_balance_for_date(p_user_id, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix get_user_yesterday_balance parameter name
DROP FUNCTION IF EXISTS get_user_yesterday_balance(UUID);
CREATE FUNCTION get_user_yesterday_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN get_user_balance_for_date(p_user_id, (CURRENT_DATE - INTERVAL '1 day')::DATE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix get_today_balance_change parameter name
DROP FUNCTION IF EXISTS get_today_balance_change(UUID);
CREATE FUNCTION get_today_balance_change(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  today_balance NUMERIC;
  yesterday_balance NUMERIC;
BEGIN
  today_balance := get_user_today_balance(p_user_id);
  yesterday_balance := get_user_yesterday_balance(p_user_id);
  
  RETURN today_balance - yesterday_balance;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix get_yesterday_balance_change parameter name
DROP FUNCTION IF EXISTS get_yesterday_balance_change(UUID);
CREATE FUNCTION get_yesterday_balance_change(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  yesterday_balance NUMERIC;
  two_days_ago_balance NUMERIC;
BEGIN
  yesterday_balance := get_user_yesterday_balance(p_user_id);
  two_days_ago_balance := get_user_balance_for_date(p_user_id, (CURRENT_DATE - INTERVAL '2 days')::DATE);
  
  RETURN yesterday_balance - two_days_ago_balance;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix get_user_balance_percentage_change parameter name
DROP FUNCTION IF EXISTS get_user_balance_percentage_change(UUID);
CREATE FUNCTION get_user_balance_percentage_change(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  today_balance NUMERIC;
  yesterday_balance NUMERIC;
  change_amount NUMERIC;
  percentage_change NUMERIC;
BEGIN
  today_balance := get_user_today_balance(p_user_id);
  yesterday_balance := get_user_yesterday_balance(p_user_id);
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_balance_for_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_today_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_yesterday_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_today_balance_change(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_yesterday_balance_change(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_balance_percentage_change(UUID) TO authenticated;