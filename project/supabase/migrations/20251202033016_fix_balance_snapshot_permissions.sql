/*
  # Fix Balance Snapshot Function Permissions

  ## Changes
  - Update record_user_balance_snapshot to use SECURITY DEFINER
  - Allow admins to record snapshots for users
  - Ensure function can write to user_balance_history table
*/

-- Drop and recreate with proper permissions
DROP FUNCTION IF EXISTS record_user_balance_snapshot(uuid, numeric, text, uuid);

CREATE OR REPLACE FUNCTION record_user_balance_snapshot(
  p_user_id uuid,
  p_amount_added numeric DEFAULT 0,
  p_source text DEFAULT 'harvest',
  p_product_id uuid DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_balance numeric;
BEGIN
  -- Get current balance from profiles
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;
  
  -- Insert snapshot
  INSERT INTO user_balance_history (
    user_id,
    balance,
    balance_date,
    source,
    product_id,
    amount_added
  ) VALUES (
    p_user_id,
    v_current_balance,
    CURRENT_DATE,
    p_source,
    p_product_id,
    p_amount_added
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION record_user_balance_snapshot(uuid, numeric, text, uuid) TO authenticated;

COMMENT ON FUNCTION record_user_balance_snapshot IS 'Record a balance snapshot for a user (SECURITY DEFINER allows admins to record for users)';
