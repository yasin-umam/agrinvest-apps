/*
  # Create Balance Transactions System
  
  ## Overview
  Complete system for managing user balance top-ups and withdrawals with admin approval workflow.
  
  ## 1. New Tables
  
  ### `balance_transactions`
  Stores all balance transaction requests (top-up and withdrawal)
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `type` (text) - 'topup' or 'withdrawal'
  - `amount` (decimal) - Transaction amount
  - `status` (text) - 'pending', 'approved', 'rejected'
  - `payment_method` (text) - e-wallet name (e.g., 'gopay', 'dana', 'ovo')
  - `account_number` (text) - User's e-wallet account number
  - `account_name` (text) - Account holder name
  - `proof_image_url` (text, nullable) - Payment proof screenshot URL
  - `admin_notes` (text, nullable) - Admin rejection/approval notes
  - `reviewed_by` (uuid, nullable, references profiles) - Admin who reviewed
  - `reviewed_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## 2. Security
  - RLS enabled for all tables
  - Users can only view their own transactions
  - Admins can view and manage all transactions
  - Balance updates are atomic and validated
  
  ## 3. Notifications
  - Automatic notifications on transaction status changes
  - Admin notifications for new transaction requests
*/

-- Create balance_transactions table
CREATE TABLE IF NOT EXISTS balance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('topup', 'withdrawal')),
  amount decimal(15, 2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_method text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  proof_image_url text,
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_status ON balance_transactions(status);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at ON balance_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE balance_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own transactions
CREATE POLICY "Users can view own balance transactions"
  ON balance_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all transactions
CREATE POLICY "Admins can view all balance transactions"
  ON balance_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can create their own transactions
CREATE POLICY "Users can create own balance transactions"
  ON balance_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
  );

-- Admins can update transactions (approve/reject)
CREATE POLICY "Admins can update balance transactions"
  ON balance_transactions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to process balance transaction approval
CREATE OR REPLACE FUNCTION process_balance_transaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_profile profiles%ROWTYPE;
  v_reviewer_name text;
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
        
        -- Notify user of successful top-up
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
          NEW.user_id,
          'system',
          'Top Up Berhasil',
          'Top up senilai Rp ' || format_rupiah(NEW.amount) || ' telah berhasil. Saldo Anda sekarang: Rp ' || 
          format_rupiah(v_user_profile.balance + NEW.amount),
          jsonb_build_object(
            'transaction_id', NEW.id,
            'type', 'topup',
            'amount', NEW.amount,
            'new_balance', v_user_profile.balance + NEW.amount,
            'reviewed_by', v_reviewer_name
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
        
        -- Notify user of successful withdrawal
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
          NEW.user_id,
          'system',
          'Penarikan Berhasil',
          'Penarikan senilai Rp ' || format_rupiah(NEW.amount) || ' telah berhasil dikirim ke rekening ' || 
          NEW.payment_method || ' (' || NEW.account_number || '). Saldo Anda sekarang: Rp ' || 
          format_rupiah(v_user_profile.balance - NEW.amount),
          jsonb_build_object(
            'transaction_id', NEW.id,
            'type', 'withdrawal',
            'amount', NEW.amount,
            'payment_method', NEW.payment_method,
            'account_number', NEW.account_number,
            'new_balance', v_user_profile.balance - NEW.amount,
            'reviewed_by', v_reviewer_name
          )
        );
      END IF;
      
    ELSIF NEW.status = 'rejected' THEN
      -- Notify user of rejection
      INSERT INTO notifications (user_id, type, title, message, metadata)
      VALUES (
        NEW.user_id,
        'system',
        CASE 
          WHEN NEW.type = 'topup' THEN 'Top Up Ditolak'
          ELSE 'Penarikan Ditolak'
        END,
        CASE 
          WHEN NEW.type = 'topup' THEN 'Top up senilai Rp ' || format_rupiah(NEW.amount) || ' ditolak.'
          ELSE 'Penarikan senilai Rp ' || format_rupiah(NEW.amount) || ' ditolak.'
        END || 
        CASE 
          WHEN NEW.admin_notes IS NOT NULL THEN ' Alasan: ' || NEW.admin_notes
          ELSE ''
        END,
        jsonb_build_object(
          'transaction_id', NEW.id,
          'type', NEW.type,
          'amount', NEW.amount,
          'rejection_reason', NEW.admin_notes,
          'reviewed_by', v_reviewer_name
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for balance transaction processing
DROP TRIGGER IF EXISTS process_balance_transaction_trigger ON balance_transactions;
CREATE TRIGGER process_balance_transaction_trigger
  AFTER UPDATE ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION process_balance_transaction();

-- Function to notify admins of new balance transaction requests
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

-- Create trigger to notify admins
DROP TRIGGER IF EXISTS notify_admin_new_balance_transaction_trigger ON balance_transactions;
CREATE TRIGGER notify_admin_new_balance_transaction_trigger
  AFTER INSERT ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_balance_transaction();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_balance_transactions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_balance_transactions_updated_at_trigger ON balance_transactions;
CREATE TRIGGER update_balance_transactions_updated_at_trigger
  BEFORE UPDATE ON balance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_transactions_updated_at();

-- Add comments
COMMENT ON TABLE balance_transactions IS 'User balance top-up and withdrawal transactions with admin approval workflow';
COMMENT ON FUNCTION process_balance_transaction IS 'Processes balance transactions on approval/rejection, updates user balance atomically';
COMMENT ON FUNCTION notify_admin_new_balance_transaction IS 'Notifies all admins when a new balance transaction is created';
