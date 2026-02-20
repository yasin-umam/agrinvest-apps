/*
  # Fix Balance Functions to Use Correct Table

  ## Problem
  Functions are querying `balance_snapshots` table which doesn't exist.
  The correct table is `user_balance_history` with column `balance_date` not `snapshot_date`.

  ## Solution
  Update all balance tracking functions to use the correct table and columns.

  ## Changes
  1. Fix `get_user_balance_for_date` to query `user_balance_history`
  2. Ensure all dependent functions work correctly
*/

-- Drop and recreate balance tracking functions with correct table
DROP FUNCTION IF EXISTS get_user_balance_for_date(UUID, DATE);
CREATE FUNCTION get_user_balance_for_date(target_user_id UUID, target_date DATE)
RETURNS NUMERIC AS $$
DECLARE
  balance_value NUMERIC;
BEGIN
  -- Query from user_balance_history instead of balance_snapshots
  SELECT balance INTO balance_value
  FROM user_balance_history
  WHERE user_id = target_user_id 
    AND balance_date = target_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Fallback to current profile balance if no history found
  IF balance_value IS NULL THEN
    SELECT balance INTO balance_value
    FROM profiles
    WHERE id = target_user_id;
  END IF;
  
  RETURN COALESCE(balance_value, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Recreate get_user_today_balance
DROP FUNCTION IF EXISTS get_user_today_balance(UUID);
CREATE FUNCTION get_user_today_balance(target_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN get_user_balance_for_date(target_user_id, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Recreate get_user_yesterday_balance
DROP FUNCTION IF EXISTS get_user_yesterday_balance(UUID);
CREATE FUNCTION get_user_yesterday_balance(target_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN get_user_balance_for_date(target_user_id, (CURRENT_DATE - INTERVAL '1 day')::DATE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Recreate get_today_balance_change
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

-- Recreate get_yesterday_balance_change
DROP FUNCTION IF EXISTS get_yesterday_balance_change(UUID);
CREATE FUNCTION get_yesterday_balance_change(target_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  yesterday_balance NUMERIC;
  two_days_ago_balance NUMERIC;
BEGIN
  yesterday_balance := get_user_yesterday_balance(target_user_id);
  two_days_ago_balance := get_user_balance_for_date(target_user_id, (CURRENT_DATE - INTERVAL '2 days')::DATE);
  
  RETURN yesterday_balance - two_days_ago_balance;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Recreate get_user_balance_percentage_change
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_balance_for_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_today_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_yesterday_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_today_balance_change(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_yesterday_balance_change(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_balance_percentage_change(UUID) TO authenticated;
