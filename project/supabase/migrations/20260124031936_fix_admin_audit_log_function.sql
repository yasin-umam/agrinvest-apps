/*
  # Fix admin_audit_log Function
  
  ## Problem
  - Function `log_balance_transaction_status_change` tries to INSERT into `admin_audit_log` (singular)
  - But the actual table is `admin_audit_logs` (plural)
  - Column names also don't match: target_table vs entity_type, target_id vs entity_id, old_value vs old_data, new_value vs new_data
  
  ## Solution
  - Update function to use correct table name and column names
  
  ## Changes
  1. Update log_balance_transaction_status_change function to match admin_audit_logs table schema
*/

-- Fix the function to use correct table and column names
CREATE OR REPLACE FUNCTION log_balance_transaction_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Only log if status changed and reviewed_by is set (admin action)
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.reviewed_by IS NOT NULL THEN
    INSERT INTO admin_audit_logs (
      admin_id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data,
      notes
    ) VALUES (
      NEW.reviewed_by,
      CASE 
        WHEN NEW.status = 'approved' AND NEW.type = 'topup' THEN 'approve_topup'
        WHEN NEW.status = 'approved' AND NEW.type = 'withdrawal' THEN 'approve_withdrawal'
        WHEN NEW.status = 'rejected' AND NEW.type = 'topup' THEN 'reject_topup'
        WHEN NEW.status = 'rejected' AND NEW.type = 'withdrawal' THEN 'reject_withdrawal'
        ELSE 'update_transaction_status'
      END,
      'balance_transaction',
      NEW.id,
      jsonb_build_object(
        'status', OLD.status,
        'amount', OLD.amount,
        'user_id', OLD.user_id,
        'type', OLD.type
      ),
      jsonb_build_object(
        'status', NEW.status,
        'amount', NEW.amount,
        'user_id', NEW.user_id,
        'type', NEW.type
      ),
      NEW.admin_notes
    );
  END IF;
  
  RETURN NEW;
END;
$$;
