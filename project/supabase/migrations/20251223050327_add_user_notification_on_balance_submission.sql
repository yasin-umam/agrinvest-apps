/*
  # Add User Notification on Balance Transaction Submission
  
  ## Overview
  Adds notification to users when they submit a balance transaction request (top-up or withdrawal).
  
  ## Changes
  1. Updates the `notify_admin_new_balance_transaction` function to also notify the user
  2. User receives immediate confirmation that their request is being processed
  
  ## Notifications
  - Top-up: "Pengajuan top up senilai X sedang diproses. Mohon tunggu konfirmasi admin."
  - Withdrawal: "Pengajuan penarikan senilai X ke rekening Y sedang diproses. Mohon tunggu konfirmasi admin."
*/

-- Update function to notify both admins and user
CREATE OR REPLACE FUNCTION notify_admin_new_balance_transaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_record RECORD;
  v_user_name text;
BEGIN
  -- Only notify on new pending transactions
  IF NEW.status = 'pending' THEN
    
    -- Get user name
    SELECT full_name INTO v_user_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Notify the user who submitted the request
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'system',
      CASE 
        WHEN NEW.type = 'topup' THEN 'Top Up Sedang Diproses'
        ELSE 'Penarikan Sedang Diproses'
      END,
      CASE 
        WHEN NEW.type = 'topup' THEN 
          'Pengajuan top up senilai Rp ' || format_rupiah(NEW.amount) || 
          ' sedang diproses. Mohon tunggu konfirmasi admin.'
        ELSE 
          'Pengajuan penarikan senilai Rp ' || format_rupiah(NEW.amount) || 
          ' ke rekening ' || NEW.payment_method || ' (' || NEW.account_number || 
          ') sedang diproses. Mohon tunggu konfirmasi admin.'
      END,
      jsonb_build_object(
        'transaction_id', NEW.id,
        'type', NEW.type,
        'amount', NEW.amount,
        'payment_method', NEW.payment_method,
        'account_number', NEW.account_number,
        'status', 'pending'
      )
    );
    
    -- Notify all admins
    FOR v_admin_record IN 
      SELECT id FROM profiles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, type, title, message, metadata)
      VALUES (
        v_admin_record.id,
        'system',
        CASE 
          WHEN NEW.type = 'topup' THEN 'Top Up Baru'
          ELSE 'Penarikan Baru'
        END,
        v_user_name || ' mengajukan ' || 
        CASE 
          WHEN NEW.type = 'topup' THEN 'top up'
          ELSE 'penarikan'
        END || 
        ' senilai Rp ' || format_rupiah(NEW.amount),
        jsonb_build_object(
          'transaction_id', NEW.id,
          'user_id', NEW.user_id,
          'user_name', v_user_name,
          'type', NEW.type,
          'amount', NEW.amount,
          'payment_method', NEW.payment_method,
          'account_number', NEW.account_number
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS notify_admin_new_balance_transaction_trigger ON balance_transactions;
CREATE TRIGGER notify_admin_new_balance_transaction_trigger
  AFTER INSERT ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_balance_transaction();

COMMENT ON FUNCTION notify_admin_new_balance_transaction IS 'Notifies user and all admins when a new balance transaction is created';
