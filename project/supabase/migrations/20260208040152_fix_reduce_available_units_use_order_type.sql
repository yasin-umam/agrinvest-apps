/*
  # Fix reduce_available_units function to use order_type column

  1. Changes
    - Update reduce_available_units() function to use NEW.order_type instead of NEW.type
    - This fixes the "record 'new' has no field 'type'" error when updating orders
*/

CREATE OR REPLACE FUNCTION public.reduce_available_units()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Hanya proses jika:
  -- 1. Status berubah menjadi 'completed'
  -- 2. Status sebelumnya bukan 'completed' 
  -- 3. Order type adalah 'buy'
  IF NEW.status = 'completed' 
     AND OLD.status != 'completed' 
     AND NEW.order_type = 'buy' THEN

    -- Update available_units dengan atomic operation
    UPDATE chili_products
    SET 
      available_units = available_units - NEW.quantity,
      updated_at = now()
    WHERE id = NEW.product_id
      AND available_units >= NEW.quantity; -- Validasi stok mencukupi

    -- Jika tidak ada row yang ter-update (stok tidak cukup), rollback
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stok tidak mencukupi untuk product_id: %. Available: %, Required: %',
        NEW.product_id,
        (SELECT available_units FROM chili_products WHERE id = NEW.product_id),
        NEW.quantity;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
