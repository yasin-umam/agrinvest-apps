/*
  # Fix Duplicate Notification Triggers
  
  ## Problems Fixed
  1. Duplicate triggers causing double notifications
    - order_pending_notification (old)
    - trigger_notify_pending_order (new) 
    Both calling notify_pending_order() on INSERT
    
  2. Old unused triggers still active
    - on_order_status_change (calls old function)
    - trigger_create_sell_order_notification (not needed)
    
  3. Admin not receiving notifications
    - Ensure admin notification works properly
    
  ## Solution
  1. Drop all old/duplicate triggers
  2. Drop old unused functions
  3. Keep only the correct triggers:
    - trigger_notify_pending_order (AFTER INSERT)
    - trigger_update_portfolio_on_order_complete (AFTER UPDATE when completed)
  4. Ensure notify_pending_order() sends to admin correctly
    
  ## Final Trigger Setup
  - AFTER INSERT: trigger_notify_pending_order → notify_pending_order()
  - AFTER UPDATE (completed): trigger_update_portfolio_on_order_complete → update_portfolio_on_order_complete()
*/

-- ============================================
-- STEP 1: Drop old/duplicate triggers
-- ============================================

-- Drop duplicate pending order trigger
DROP TRIGGER IF EXISTS order_pending_notification ON orders;

-- Drop old status change trigger
DROP TRIGGER IF EXISTS on_order_status_change ON orders;

-- Drop old sell order trigger
DROP TRIGGER IF EXISTS trigger_create_sell_order_notification ON orders;

-- ============================================
-- STEP 2: Drop old unused functions
-- ============================================

-- Drop old notification functions if they exist
DROP FUNCTION IF EXISTS trigger_create_order_notification() CASCADE;
DROP FUNCTION IF EXISTS create_sell_order_notification() CASCADE;

-- ============================================
-- STEP 3: Ensure notify_pending_order() is correct
-- ============================================

-- Recreate the function to ensure it's correct
CREATE OR REPLACE FUNCTION notify_pending_order()
RETURNS TRIGGER AS $$
DECLARE
  v_product_name text;
  v_product_unit text;
BEGIN
  -- Only create notification if order is pending
  IF NEW.status = 'pending' THEN
    -- Get product info
    SELECT name, unit INTO v_product_name, v_product_unit
    FROM chili_products
    WHERE id = NEW.product_id;

    -- A. NOTIFICATION FOR USER (Order Creator)
    INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
    VALUES (
      NEW.user_id,
      'trade',
      'Transaksi Menunggu Validasi',
      'Transaksi ' || NEW.type || ' sebanyak ' || NEW.quantity || ' ' || v_product_unit || ' ' || v_product_name ||
      ' senilai Rp ' || format_rupiah(NEW.total_amount) || ' sedang menunggu validasi admin. ' ||
      CASE
        WHEN NEW.type = 'buy' THEN 'Saldo Anda akan dipotong setelah transaksi disetujui.'
        ELSE 'Saldo Anda akan ditambah setelah transaksi disetujui.'
      END,
      jsonb_build_object(
        'order_id', NEW.id,
        'status', 'pending',
        'product_name', v_product_name,
        'quantity', NEW.quantity,
        'total_amount', NEW.total_amount
      ),
      false
    );

    -- B. NOTIFICATION FOR ALL ADMINS
    INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
    SELECT 
      id, 
      'admin_alert', 
      'Pesanan Baru Perlu Validasi', 
      'User baru melakukan order ' || NEW.type || ' sebanyak ' || NEW.quantity || ' ' || v_product_unit || 
      ' ' || v_product_name || ' senilai Rp ' || format_rupiah(NEW.total_amount) || '. Harap segera validasi.',
      jsonb_build_object(
        'order_id', NEW.id, 
        'user_id', NEW.user_id,
        'order_type', NEW.type,
        'product_name', v_product_name,
        'quantity', NEW.quantity,
        'total_amount', NEW.total_amount
      ),
      false
    FROM profiles 
    WHERE role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================
-- STEP 4: Ensure correct trigger exists
-- ============================================

-- Recreate the trigger (will replace if exists)
DROP TRIGGER IF EXISTS trigger_notify_pending_order ON orders;
CREATE TRIGGER trigger_notify_pending_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_pending_order();

-- ============================================
-- VERIFICATION
-- ============================================

-- List all remaining triggers on orders table
-- (for verification - this is just a comment)
-- SELECT tgname, pg_get_triggerdef(oid) 
-- FROM pg_trigger 
-- WHERE tgrelid = 'orders'::regclass AND tgisinternal = false;
