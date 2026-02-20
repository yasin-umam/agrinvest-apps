/*
  # Fix admin_audit_log Table Name Reference

  1. Problem
    - Multiple functions reference `admin_audit_log` (singular)
    - Actual table name is `admin_audit_logs` (plural)
    - Causes 404 error when approving balance transactions

  2. Changes
    - Drop and recreate `log_balance_transaction_status_change` function with correct table name
    - Drop and recreate `log_admin_account_update` function with correct table name
    - Ensure all references use `admin_audit_logs` (plural)

  3. Security
    - No changes to RLS policies
    - Functions maintain same security context
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS log_balance_transaction_status_change() CASCADE;
DROP FUNCTION IF EXISTS log_admin_account_update() CASCADE;

-- Recreate log_balance_transaction_status_change with correct table name
CREATE OR REPLACE FUNCTION log_balance_transaction_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_id_val uuid;
  old_status_val text;
  new_status_val text;
BEGIN
  -- Only log if status changed AND reviewed_by is set
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.reviewed_by IS NOT NULL THEN
    admin_id_val := NEW.reviewed_by;
    old_status_val := OLD.status;
    new_status_val := NEW.status;
    
    -- Insert to admin_audit_logs (PLURAL)
    INSERT INTO admin_audit_logs (
      admin_id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data,
      notes
    )
    VALUES (
      admin_id_val,
      CASE
        WHEN new_status_val = 'approved' THEN 'approve_balance_transaction'
        WHEN new_status_val = 'rejected' THEN 'reject_balance_transaction'
        ELSE 'update_balance_transaction'
      END,
      'balance_transaction',
      NEW.id,
      jsonb_build_object('status', old_status_val),
      jsonb_build_object('status', new_status_val),
      NEW.admin_notes
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate log_admin_account_update with correct table name
CREATE OR REPLACE FUNCTION log_admin_account_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Log all updates to admin accounts
  IF OLD IS DISTINCT FROM NEW THEN
    -- Insert to admin_audit_logs (PLURAL)
    INSERT INTO admin_audit_logs (
      admin_id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data
    )
    VALUES (
      auth.uid(),
      'update_admin_account',
      'admin_account',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER audit_balance_transaction_status_changes
  AFTER UPDATE ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION log_balance_transaction_status_change();

CREATE TRIGGER audit_admin_account_updates
  AFTER UPDATE ON admin_accounts
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_account_update();

-- Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_audit_logs'
  ) THEN
    RAISE EXCEPTION 'Table admin_audit_logs does not exist! Cannot create triggers.';
  END IF;
END $$;
