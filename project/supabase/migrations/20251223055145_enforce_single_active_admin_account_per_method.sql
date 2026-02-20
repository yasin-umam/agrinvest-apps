/*
  # Enforce Single Active Admin Account Per Payment Method

  1. Changes
    - Add unique partial index to ensure only one active account per payment method
    - Add trigger to auto-deactivate other accounts when one is activated
    - Ensure data integrity for admin account management

  2. Security
    - Prevent multiple active accounts for same payment method
    - Maintain data consistency
*/

-- Create unique partial index to enforce only one active account per payment method
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_accounts_active_per_method
  ON admin_accounts (payment_method)
  WHERE is_active = true;

-- Create function to auto-deactivate other accounts when one is activated
CREATE OR REPLACE FUNCTION enforce_single_active_admin_account()
RETURNS TRIGGER AS $$
BEGIN
  -- If the account is being set to active
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    -- Deactivate all other accounts with the same payment method
    UPDATE admin_accounts
    SET is_active = false
    WHERE payment_method = NEW.payment_method
      AND id != NEW.id
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single active account
DROP TRIGGER IF EXISTS trg_enforce_single_active_admin_account ON admin_accounts;
CREATE TRIGGER trg_enforce_single_active_admin_account
  BEFORE INSERT OR UPDATE ON admin_accounts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_active_admin_account();