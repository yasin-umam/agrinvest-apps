/*
  # Fix User Balance Function Date Casting
  
  ## Changes
  
  1. Fix `get_user_yesterday_balance` function to properly cast date
    - Issue: CURRENT_DATE - INTERVAL returns timestamp, but function expects date
    - Solution: Cast to date explicitly
    
  ## Details
  
  The error occurred because PostgreSQL's `CURRENT_DATE - INTERVAL '1 day'` returns 
  a timestamp, but our function expects a date type. This fix ensures proper type casting.
*/

-- Function to get user's yesterday balance (fixed)
CREATE OR REPLACE FUNCTION get_user_yesterday_balance(p_user_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN get_user_balance_for_date(p_user_id, (CURRENT_DATE - INTERVAL '1 day')::date);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_yesterday_balance IS 'Get user balance for yesterday (with proper date casting)';
