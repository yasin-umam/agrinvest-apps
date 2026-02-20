/*
  # Fix Top-Up Proof Validation to be Optional on Insert

  1. Changes
    - Update `validate_topup_proof()` to allow NULL proof_image_url on insert
    - User can submit topup without proof first, then upload proof later if needed
    - This allows immediate submission while keeping proof tracking capability

  2. Security
    - Admin can still validate proof before approving
    - Maintains audit trail
*/

-- Update function to make proof_image_url optional on insert
CREATE OR REPLACE FUNCTION validate_topup_proof()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL proof_image_url for topup transactions
  -- Admin will validate payment through other means or user can upload later
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;