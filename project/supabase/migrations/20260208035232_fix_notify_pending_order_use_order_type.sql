/*
  # Fix notify_pending_order function to use order_type column

  1. Changes
    - Update notify_pending_order() function to use NEW.order_type instead of NEW.type
    - This fixes the "record 'new' has no field 'type'" error when inserting orders
*/

CREATE OR REPLACE FUNCTION public.notify_pending_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      'Transaksi ' || NEW.order_type || ' sebanyak ' || NEW.quantity || ' ' || v_product_unit || ' ' || v_product_name ||
      ' senilai Rp ' || format_rupiah(NEW.total_amount) || ' sedang menunggu validasi admin. ' ||
      CASE
        WHEN NEW.order_type = 'buy' THEN 'Saldo Anda akan dipotong setelah transaksi disetujui.'
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
      'User baru melakukan order ' || NEW.order_type || ' sebanyak ' || NEW.quantity || ' ' || v_product_unit || 
      ' ' || v_product_name || ' senilai Rp ' || format_rupiah(NEW.total_amount) || '. Harap segera validasi.',
      jsonb_build_object(
        'order_id', NEW.id, 
        'user_id', NEW.user_id,
        'order_type', NEW.order_type,
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
$function$;
