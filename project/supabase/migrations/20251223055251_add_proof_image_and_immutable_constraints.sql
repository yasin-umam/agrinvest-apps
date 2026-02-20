-- Add Proof Image and Immutable Constraints to Balance Transactions
--
-- 1. Changes
--   - Add proof_image_url column for storing transfer proof
--   - Add trigger to validate proof_image_url on insert for topup transactions
--   - Add trigger to prevent modification of core transaction data after creation
--   - Ensure snapshot data (account_number, account_name, payment_method, amount) is immutable
--
-- 2. Security
--   - Transaction data cannot be modified after creation (only status and review fields)
--   - Maintain audit trail integrity

-- Add proof_image_url column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'balance_transactions' AND column_name = 'proof_image_url'
  ) THEN
    ALTER TABLE balance_transactions ADD COLUMN proof_image_url text;
  END IF;
END $$;

-- Create function to validate proof_image_url on insert
CREATE OR REPLACE FUNCTION validate_topup_proof()
RETURNS TRIGGER AS $$
BEGIN
  -- Require proof_image_url for new topup transactions
  IF TG_OP = 'INSERT' AND NEW.type = 'topup' AND NEW.proof_image_url IS NULL THEN
    RAISE EXCEPTION 'Bukti transfer wajib di-upload untuk top-up';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate proof on insert
DROP TRIGGER IF EXISTS trg_validate_topup_proof ON balance_transactions;
CREATE TRIGGER trg_validate_topup_proof
  BEFORE INSERT ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_topup_proof();

-- Create function to enforce immutability of transaction core data
CREATE OR REPLACE FUNCTION enforce_balance_transaction_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates only to specific fields (status, reviewed_by, reviewed_at, rejection_notes)
  IF OLD.user_id IS DISTINCT FROM NEW.user_id
    OR OLD.type IS DISTINCT FROM NEW.type
    OR OLD.amount IS DISTINCT FROM NEW.amount
    OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
    OR OLD.account_number IS DISTINCT FROM NEW.account_number
    OR OLD.account_name IS DISTINCT FROM NEW.account_name
    OR (OLD.proof_image_url IS NOT NULL AND OLD.proof_image_url IS DISTINCT FROM NEW.proof_image_url) THEN
    RAISE EXCEPTION 'Cannot modify immutable transaction data. Only status, reviewed_by, reviewed_at, and rejection_notes can be updated.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce immutability
DROP TRIGGER IF EXISTS trg_enforce_balance_transaction_immutability ON balance_transactions;
CREATE TRIGGER trg_enforce_balance_transaction_immutability
  BEFORE UPDATE ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_balance_transaction_immutability();