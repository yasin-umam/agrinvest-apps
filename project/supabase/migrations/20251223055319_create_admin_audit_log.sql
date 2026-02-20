-- Create Admin Audit Log System
--
-- 1. New Tables
--   - admin_audit_logs
--     - id (uuid, primary key)
--     - admin_id (uuid) - admin yang melakukan aksi
--     - action (text) - jenis aksi (approve_topup, reject_topup, update_admin_account, etc)
--     - entity_type (text) - tipe entitas (balance_transaction, admin_account)
--     - entity_id (uuid) - ID entitas yang diubah
--     - old_data (jsonb) - data sebelum perubahan
--     - new_data (jsonb) - data setelah perubahan
--     - notes (text) - catatan tambahan
--     - created_at (timestamptz)
--
-- 2. Security
--   - Enable RLS on admin_audit_logs
--   - Only admins can view audit logs
--   - No one can delete audit logs (immutable)
--
-- 3. Triggers
--   - Auto-log balance_transaction status changes by admins
--   - Auto-log admin_account updates

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Policy: System can insert audit logs (via triggers)
CREATE POLICY "System can insert audit logs"
  ON admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- No update or delete policies - audit logs are immutable

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- Function to log balance transaction status changes
CREATE OR REPLACE FUNCTION log_balance_transaction_status_change()
RETURNS TRIGGER AS $$
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
        WHEN NEW.status = 'approved' THEN 'approve_topup'
        WHEN NEW.status = 'rejected' THEN 'reject_topup'
        ELSE 'update_topup_status'
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
        'type', NEW.type,
        'rejection_notes', NEW.rejection_notes
      ),
      NEW.rejection_notes
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log balance transaction changes
DROP TRIGGER IF EXISTS trg_log_balance_transaction_changes ON balance_transactions;
CREATE TRIGGER trg_log_balance_transaction_changes
  AFTER UPDATE ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION log_balance_transaction_status_change();

-- Function to log admin account updates
CREATE OR REPLACE FUNCTION log_admin_account_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all updates to admin accounts
  IF OLD IS DISTINCT FROM NEW THEN
    INSERT INTO admin_audit_logs (
      admin_id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data
    ) VALUES (
      auth.uid(),
      'update_admin_account',
      'admin_account',
      NEW.id,
      jsonb_build_object(
        'payment_method', OLD.payment_method,
        'account_number', OLD.account_number,
        'account_name', OLD.account_name,
        'is_active', OLD.is_active
      ),
      jsonb_build_object(
        'payment_method', NEW.payment_method,
        'account_number', NEW.account_number,
        'account_name', NEW.account_name,
        'is_active', NEW.is_active
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log admin account changes
DROP TRIGGER IF EXISTS trg_log_admin_account_updates ON admin_accounts;
CREATE TRIGGER trg_log_admin_account_updates
  AFTER UPDATE ON admin_accounts
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_account_update();