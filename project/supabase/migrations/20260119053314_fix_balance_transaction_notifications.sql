/*
  # Fix Balance Transaction Notifications

  ## Problem
  1. User receives duplicate notifications when transaction is validated
  2. Admin does not receive notifications when new transactions are submitted

  ## Solution
  1. Keep only one notification to user when submitting (pending status)
  2. Update notification when admin validates (approved/rejected)
  3. Ensure admin gets notified on new transactions
  4. Fix trigger execution order

  ## Changes
  1. Modified `process_balance_transaction` to update/remove duplicate user notifications
  2. Verified `notify_admin_new_balance_transaction` sends to all admins
  3. Fixed notification flow to avoid duplicates
*/

-- Drop existing triggers first
DROP TRIGGER IF EXISTS notify_admin_new_balance_transaction_trigger ON balance_transactions;
DROP TRIGGER IF EXISTS process_balance_transaction_trigger ON balance_transactions;

-- Updated function to notify admins on new transaction
CREATE OR REPLACE FUNCTION notify_admin_new_balance_transaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_record RECORD;
  v_user_name text;
  v_admin_count int := 0;
BEGIN
  -- Only notify on new pending transactions (INSERT)
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    
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
    
    -- Notify all admins about new transaction
    FOR v_admin_record IN 
      SELECT id, full_name FROM profiles WHERE role = 'admin'
    LOOP
      v_admin_count := v_admin_count + 1;
      
      INSERT INTO notifications (user_id, type, title, message, metadata)
      VALUES (
        v_admin_record.id,
        'system',
        CASE 
          WHEN NEW.type = 'topup' THEN 'Transaksi Top Up Baru'
          ELSE 'Transaksi Penarikan Baru'
        END,
        v_user_name || ' mengajukan ' || 
        CASE 
          WHEN NEW.type = 'topup' THEN 'top up'
          ELSE 'penarikan'
        END || 
        ' senilai Rp ' || format_rupiah(NEW.amount) || '. Mohon segera ditinjau.',
        jsonb_build_object(
          'transaction_id', NEW.id,
          'user_id', NEW.user_id,
          'user_name', v_user_name,
          'type', NEW.type,
          'amount', NEW.amount,
          'payment_method', NEW.payment_method,
          'account_number', NEW.account_number,
          'action_required', true
        )
      );
    END LOOP;
    
    -- Log if no admins were notified (for debugging)
    IF v_admin_count = 0 THEN
      RAISE WARNING 'No admin users found to notify for transaction %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Updated function to process balance transaction approval/rejection
CREATE OR REPLACE FUNCTION process_balance_transaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_profile profiles%ROWTYPE;
  v_reviewer_name text;
  v_old_notification_id uuid;
BEGIN
  -- Only process when status changes from pending to approved/rejected
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    
    -- Get user profile
    SELECT * INTO v_user_profile
    FROM profiles
    WHERE id = NEW.user_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Get reviewer name
    SELECT full_name INTO v_reviewer_name
    FROM profiles
    WHERE id = NEW.reviewed_by;
    
    -- Delete old "processing" notification to avoid duplicates
    DELETE FROM notifications
    WHERE user_id = NEW.user_id
      AND type = 'system'
      AND metadata->>'transaction_id' = NEW.id::text
      AND metadata->>'status' = 'pending';
    
    IF NEW.status = 'approved' THEN
      -- Process approved transaction
      IF NEW.type = 'topup' THEN
        -- Add balance for top-up
        UPDATE profiles
        SET 
          balance = balance + NEW.amount,
          updated_at = now()
        WHERE id = NEW.user_id;
        
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Failed to update user balance';
        END IF;
        
        -- Notify user of successful top-up (single notification)
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
          NEW.user_id,
          'system',
          'Top Up Disetujui',
          'Top up senilai Rp ' || format_rupiah(NEW.amount) || ' telah disetujui dan ditambahkan ke saldo Anda. Saldo sekarang: Rp ' || 
          format_rupiah(v_user_profile.balance + NEW.amount),
          jsonb_build_object(
            'transaction_id', NEW.id,
            'type', 'topup',
            'amount', NEW.amount,
            'new_balance', v_user_profile.balance + NEW.amount,
            'reviewed_by', v_reviewer_name,
            'status', 'approved'
          )
        );
        
      ELSIF NEW.type = 'withdrawal' THEN
        -- Deduct balance for withdrawal with atomic check
        UPDATE profiles
        SET 
          balance = balance - NEW.amount,
          updated_at = now()
        WHERE id = NEW.user_id
          AND balance >= NEW.amount;
        
        IF NOT FOUND THEN
          -- Check if user exists or just insufficient balance
          IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id) THEN
            RAISE EXCEPTION 'Insufficient balance for withdrawal. Required: %, Available: %',
              NEW.amount,
              (SELECT balance FROM profiles WHERE id = NEW.user_id);
          ELSE
            RAISE EXCEPTION 'User profile not found';
          END IF;
        END IF;
        
        -- Notify user of successful withdrawal (single notification)
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
          NEW.user_id,
          'system',
          'Penarikan Disetujui',
          'Penarikan senilai Rp ' || format_rupiah(NEW.amount) || ' telah disetujui dan akan dikirim ke rekening ' || 
          NEW.payment_method || ' (' || NEW.account_number || '). Saldo sekarang: Rp ' || 
          format_rupiah(v_user_profile.balance - NEW.amount),
          jsonb_build_object(
            'transaction_id', NEW.id,
            'type', 'withdrawal',
            'amount', NEW.amount,
            'payment_method', NEW.payment_method,
            'account_number', NEW.account_number,
            'new_balance', v_user_profile.balance - NEW.amount,
            'reviewed_by', v_reviewer_name,
            'status', 'approved'
          )
        );
      END IF;
      
    ELSIF NEW.status = 'rejected' THEN
      -- Notify user of rejection (single notification)
      INSERT INTO notifications (user_id, type, title, message, metadata)
      VALUES (
        NEW.user_id,
        'system',
        CASE 
          WHEN NEW.type = 'topup' THEN 'Top Up Ditolak'
          ELSE 'Penarikan Ditolak'
        END,
        CASE 
          WHEN NEW.type = 'topup' THEN 'Top up senilai Rp ' || format_rupiah(NEW.amount) || ' ditolak'
          ELSE 'Penarikan senilai Rp ' || format_rupiah(NEW.amount) || ' ditolak'
        END || 
        CASE 
          WHEN NEW.admin_notes IS NOT NULL AND NEW.admin_notes != '' 
          THEN '. Alasan: ' || NEW.admin_notes
          ELSE '.'
        END,
        jsonb_build_object(
          'transaction_id', NEW.id,
          'type', NEW.type,
          'amount', NEW.amount,
          'rejection_reason', NEW.admin_notes,
          'reviewed_by', v_reviewer_name,
          'status', 'rejected'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers in correct order
-- 1. First trigger: notify on INSERT (new transaction)
CREATE TRIGGER notify_admin_new_balance_transaction_trigger
  AFTER INSERT ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_balance_transaction();

-- 2. Second trigger: process on UPDATE (approve/reject)
CREATE TRIGGER process_balance_transaction_trigger
  AFTER UPDATE ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_balance_transaction();

-- Update comments
COMMENT ON FUNCTION notify_admin_new_balance_transaction IS 'Notifies user (pending status) and all admins when a new balance transaction is created';
COMMENT ON FUNCTION process_balance_transaction IS 'Processes balance transactions on approval/rejection, updates user balance atomically, and sends single notification to user';
