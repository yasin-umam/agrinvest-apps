/*
  # Fix Function Search Path - Part 3: Transaction & Notification Functions
  
  ## Changes
  Add immutable search_path to:
  - Order notification functions
  - Balance transaction functions
  - Admin account functions
  - Product auto-close functions
*/

-- Order and notification functions
CREATE OR REPLACE FUNCTION notify_pending_order()
RETURNS TRIGGER AS $$
DECLARE
  buyer_name TEXT;
  product_name TEXT;
  total_price NUMERIC;
  formatted_price TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT full_name INTO buyer_name FROM profiles WHERE id = NEW.user_id;
    SELECT name INTO product_name FROM chili_products WHERE id = NEW.product_id;
    total_price := NEW.quantity * NEW.price;
    formatted_price := format_rupiah(total_price);
    
    INSERT INTO notifications (user_id, title, message, type, reference_id)
    VALUES (
      NEW.user_id,
      'Order Menunggu Konfirmasi',
      'Order ' || product_name || ' sebanyak ' || NEW.quantity || ' unit (' || formatted_price || ') menunggu verifikasi admin.',
      'order_pending',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Balance transaction functions
CREATE OR REPLACE FUNCTION update_balance_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION enforce_balance_transaction_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('approved', 'rejected') THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount OR
       NEW.method IS DISTINCT FROM OLD.method OR
       NEW.proof_image_url IS DISTINCT FROM OLD.proof_image_url THEN
      RAISE EXCEPTION 'Cannot modify amount, method, or proof_image_url of approved/rejected transactions';
    END IF;
  END IF;
  
  IF OLD.proof_image_url IS NOT NULL AND NEW.proof_image_url IS DISTINCT FROM OLD.proof_image_url THEN
    RAISE EXCEPTION 'Cannot modify proof_image_url once set';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION log_balance_transaction_status_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_id_val UUID;
  old_status_val TEXT;
  new_status_val TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    admin_id_val := NEW.reviewed_by;
    old_status_val := OLD.status;
    new_status_val := NEW.status;
    
    INSERT INTO admin_audit_log (admin_id, action, target_table, target_id, old_value, new_value)
    VALUES (
      admin_id_val,
      'status_change',
      'balance_transactions',
      NEW.id,
      jsonb_build_object('status', old_status_val),
      jsonb_build_object('status', new_status_val)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION validate_topup_proof()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.type = 'topup' AND NEW.proof_image_url IS NULL THEN
    NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

-- Admin account functions
CREATE OR REPLACE FUNCTION update_admin_account_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION enforce_single_active_admin_account()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = TRUE THEN
    UPDATE admin_accounts
    SET is_active = FALSE
    WHERE payment_method = NEW.payment_method
      AND id != NEW.id
      AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION log_admin_account_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_audit_log (admin_id, action, target_table, target_id, old_value, new_value)
  VALUES (
    auth.uid(),
    'update',
    'admin_accounts',
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Product auto-close function
CREATE OR REPLACE FUNCTION auto_close_product_on_sold_out()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.available_units <= 0 AND OLD.available_units > 0 THEN
    NEW.is_active := FALSE;
    
    INSERT INTO notifications (user_id, title, message, type, reference_id)
    SELECT DISTINCT 
      p.user_id,
      'Produk Terjual Habis',
      'Produk ' || NEW.name || ' telah terjual habis dan ditutup secara otomatis.',
      'product_sold_out',
      NEW.id
    FROM portfolios p
    WHERE p.product_id = NEW.id AND p.quantity > 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
