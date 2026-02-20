/*
  # Remove All References to rejection_notes

  1. Changes
    - Update `enforce_balance_transaction_immutability()` to completely remove rejection_notes from comments
    - Ensure only admin_notes is referenced

  2. Security
    - No changes to RLS policies
    - Maintains existing immutability constraints
*/

-- Recreate function without any rejection_notes references
CREATE OR REPLACE FUNCTION enforce_balance_transaction_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates only to specific fields (status, reviewed_by, reviewed_at, admin_notes)
  IF OLD.user_id IS DISTINCT FROM NEW.user_id
    OR OLD.type IS DISTINCT FROM NEW.type
    OR OLD.amount IS DISTINCT FROM NEW.amount
    OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
    OR OLD.account_number IS DISTINCT FROM NEW.account_number
    OR OLD.account_name IS DISTINCT FROM NEW.account_name THEN
    RAISE EXCEPTION 'Cannot modify immutable transaction data. Only status, reviewed_by, reviewed_at, and admin_notes can be updated.';
  END IF;
  
  -- Allow proof_image_url update only from 'pending' to actual path (one-time update)
  IF OLD.proof_image_url IS DISTINCT FROM NEW.proof_image_url THEN
    -- Only allow update if old value is 'pending' or NULL
    IF OLD.proof_image_url IS NOT NULL AND OLD.proof_image_url != 'pending' THEN
      RAISE EXCEPTION 'Cannot modify proof_image_url after it has been set. Proof images are immutable.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;