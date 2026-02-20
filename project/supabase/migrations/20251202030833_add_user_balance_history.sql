/*
  # Add User Balance History Tracking

  ## Overview
  Creates a system to track daily user balance changes for calculating
  percentage increases/decreases compared to yesterday

  ## Features
  - Track daily balance snapshots for all users
  - Calculate percentage change (today vs yesterday)
  - Support for harvest revenue additions to user balance
  - Functions to get today's and yesterday's balance for any user

  ## Security
  - RLS policies to restrict access to own balance history
  - Users can only view their own history
  - Only admins can insert on behalf of users (for harvest revenue)
*/

-- Create user balance history table
CREATE TABLE IF NOT EXISTS user_balance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  balance_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'harvest',
  product_id uuid REFERENCES chili_products(id) ON DELETE SET NULL,
  amount_added numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_balance_user_date 
  ON user_balance_history(user_id, balance_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_balance_product 
  ON user_balance_history(product_id);

-- Enable RLS
ALTER TABLE user_balance_history ENABLE ROW LEVEL SECURITY;

-- Policies for user_balance_history
CREATE POLICY "Users can view own balance history"
  ON user_balance_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all balance history"
  ON user_balance_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert balance history"
  ON user_balance_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to get user's balance for a specific date
CREATE OR REPLACE FUNCTION get_user_balance_for_date(p_user_id uuid, p_date date)
RETURNS numeric AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT balance
  INTO v_balance
  FROM user_balance_history
  WHERE user_id = p_user_id
  AND balance_date = p_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get user's today balance
CREATE OR REPLACE FUNCTION get_user_today_balance(p_user_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN get_user_balance_for_date(p_user_id, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Function to get user's yesterday balance
CREATE OR REPLACE FUNCTION get_user_yesterday_balance(p_user_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN get_user_balance_for_date(p_user_id, CURRENT_DATE - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user balance percentage change
CREATE OR REPLACE FUNCTION get_user_balance_percentage_change(p_user_id uuid)
RETURNS numeric AS $$
DECLARE
  v_today_balance numeric;
  v_yesterday_balance numeric;
  v_percentage numeric;
BEGIN
  v_today_balance := get_user_today_balance(p_user_id);
  v_yesterday_balance := get_user_yesterday_balance(p_user_id);
  
  IF v_yesterday_balance = 0 AND v_today_balance > 0 THEN
    v_percentage := 100;
  ELSIF v_yesterday_balance > 0 THEN
    v_percentage := ((v_today_balance - v_yesterday_balance) / v_yesterday_balance) * 100;
  ELSE
    v_percentage := 0;
  END IF;
  
  RETURN v_percentage;
END;
$$ LANGUAGE plpgsql;

-- Function to record balance snapshot
CREATE OR REPLACE FUNCTION record_user_balance_snapshot(
  p_user_id uuid,
  p_amount_added numeric DEFAULT 0,
  p_source text DEFAULT 'harvest',
  p_product_id uuid DEFAULT NULL
)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE user_balance_history IS 'Tracks daily user balance snapshots for trend analysis';
COMMENT ON FUNCTION get_user_balance_for_date IS 'Get user balance for a specific date';
COMMENT ON FUNCTION get_user_today_balance IS 'Get user balance for today';
COMMENT ON FUNCTION get_user_yesterday_balance IS 'Get user balance for yesterday';
COMMENT ON FUNCTION get_user_balance_percentage_change IS 'Calculate percentage change in balance (today vs yesterday)';
COMMENT ON FUNCTION record_user_balance_snapshot IS 'Record a balance snapshot for a user';
