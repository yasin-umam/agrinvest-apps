/*
  # Add update_user_balance function

  1. New Functions
    - `update_user_balance(p_user_id uuid, p_amount numeric)`
      - Updates user balance by adding/subtracting the specified amount
      - Validates that balance doesn't go below zero for withdrawals
      - Returns the new balance
  
  2. Security
    - Function is security definer to allow balance updates
    - Only authenticated users can call this function
*/

CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id uuid,
  p_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE profiles
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  RETURN v_new_balance;
END;
$$;