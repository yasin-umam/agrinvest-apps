/*
  # Fix update_portfolio_on_order_complete to use system context
  
  1. Problem
    - Function update_portfolio_on_order_complete() tries to update profiles.balance
    - But validate_profile_update() trigger blocks balance updates from non-system context
    - This causes "Users cannot update their own balance" error
  
  2. Solution
    - Set session variable 'app.system_update' = 'true' before updating balances
    - This allows the system function to modify balance
  
  3. Changes
    - Add PERFORM set_config() calls before balance updates
    - Reset session variable after transaction completes
*/

CREATE OR REPLACE FUNCTION public.update_portfolio_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_balance numeric;
  v_existing_portfolio portfolios%ROWTYPE;
  v_new_avg_price numeric;
  v_new_quantity integer;
  v_product_seller_id uuid;
  v_product_name text;
  v_product_code text;
  v_product_unit text;
BEGIN
  -- Only process if:
  -- 1. Status changes to 'completed' or 'rejected'
  -- 2. Previous status was not 'completed' or 'rejected'
  IF (NEW.status = 'completed' OR NEW.status = 'rejected') AND 
     (OLD.status != 'completed' AND OLD.status != 'rejected') THEN

    -- Get product info
    SELECT seller_id, name, code, unit INTO v_product_seller_id, v_product_name, v_product_code, v_product_unit
    FROM chili_products
    WHERE id = NEW.product_id;

    -- Handle REJECTED orders
    IF NEW.status = 'rejected' THEN
      -- Notification for user: order rejected
      INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
      VALUES (
        NEW.user_id,
        'trade',
        'Transaksi Ditolak',
        'Transaksi ' || NEW.order_type || ' sebanyak ' || NEW.quantity || ' ' || v_product_unit || ' ' || 
        v_product_name || ' senilai Rp ' || format_rupiah(NEW.total_amount) || ' telah ditolak oleh admin.',
        jsonb_build_object(
          'order_id', NEW.id,
          'product_id', NEW.product_id,
          'product_name', v_product_name,
          'quantity', NEW.quantity,
          'total_amount', NEW.total_amount,
          'status', 'rejected'
        ),
        false
      );

      RETURN NEW;
    END IF;

    -- Handle COMPLETED orders - Set system context for balance updates
    IF NEW.status = 'completed' THEN
      -- CRITICAL: Enable system update mode to bypass balance update restrictions
      PERFORM set_config('app.system_update', 'true', true);
      
      IF NEW.order_type = 'buy' THEN
        -- Check user balance
        SELECT balance INTO v_user_balance
        FROM profiles
        WHERE id = NEW.user_id;

        IF v_user_balance < NEW.total_amount THEN
          RAISE EXCEPTION 'Saldo user tidak mencukupi. Saldo: %, Dibutuhkan: %',
            v_user_balance, NEW.total_amount;
        END IF;

        -- Deduct buyer balance
        UPDATE profiles
        SET
          balance = balance - NEW.total_amount,
          updated_at = now()
        WHERE id = NEW.user_id;

        -- If product has seller (user listing), transfer money to seller
        IF v_product_seller_id IS NOT NULL THEN
          -- Add to seller balance
          UPDATE profiles
          SET
            balance = balance + NEW.total_amount,
            updated_at = now()
          WHERE id = v_product_seller_id;

          -- Notification for seller: asset sold
          INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
          VALUES (
            v_product_seller_id,
            'trade',
            'Aset Anda Terjual!',
            NEW.quantity || ' unit ' || v_product_name || ' berhasil terjual dengan harga Rp ' ||
            format_rupiah(NEW.price) || '/unit. Total penerimaan: Rp ' || format_rupiah(NEW.total_amount) ||
            '. Saldo Anda telah ditambahkan.',
            jsonb_build_object(
              'order_id', NEW.id,
              'product_id', NEW.product_id,
              'product_name', v_product_name,
              'product_code', v_product_code,
              'quantity', NEW.quantity,
              'price', NEW.price,
              'total_amount', NEW.total_amount,
              'buyer_id', NEW.user_id
            ),
            false
          );
        END IF;

        -- Check if portfolio already exists
        SELECT * INTO v_existing_portfolio
        FROM portfolios
        WHERE user_id = NEW.user_id
          AND product_id = NEW.product_id;

        IF FOUND THEN
          -- Update existing portfolio
          v_new_quantity := v_existing_portfolio.quantity + NEW.quantity;
          v_new_avg_price := (
            (v_existing_portfolio.quantity * v_existing_portfolio.average_buy_price) +
            (NEW.quantity * NEW.price)
          ) / v_new_quantity;

          UPDATE portfolios
          SET
            quantity = v_new_quantity,
            average_buy_price = v_new_avg_price,
            total_invested = total_invested + NEW.total_amount,
            updated_at = now()
          WHERE id = v_existing_portfolio.id;
        ELSE
          -- Create new portfolio
          INSERT INTO portfolios (
            user_id,
            product_id,
            quantity,
            average_buy_price,
            total_invested
          ) VALUES (
            NEW.user_id,
            NEW.product_id,
            NEW.quantity,
            NEW.price,
            NEW.total_amount
          );
        END IF;

        -- Notification for buyer: purchase successful
        INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
        VALUES (
          NEW.user_id,
          'trade',
          'Pembelian Berhasil',
          'Pembelian ' || NEW.quantity || ' unit ' || v_product_name || ' dengan harga Rp ' ||
          format_rupiah(NEW.price) || '/unit telah berhasil. Total pembayaran: Rp ' ||
          format_rupiah(NEW.total_amount) || '. Aset telah ditambahkan ke portfolio Anda.',
          jsonb_build_object(
            'order_id', NEW.id,
            'product_id', NEW.product_id,
            'product_name', v_product_name,
            'product_code', v_product_code,
            'quantity', NEW.quantity,
            'price', NEW.price,
            'total_amount', NEW.total_amount,
            'seller_id', v_product_seller_id
          ),
          false
        );

      ELSIF NEW.order_type = 'sell' THEN
        -- Add to user balance from sale
        UPDATE profiles
        SET
          balance = balance + NEW.total_amount,
          updated_at = now()
        WHERE id = NEW.user_id;

        -- Notification for seller: sale approved
        INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
        VALUES (
          NEW.user_id,
          'trade',
          'Penjualan Disetujui',
          'Penjualan ' || NEW.quantity || ' unit senilai Rp ' || format_rupiah(NEW.total_amount) ||
          ' telah disetujui. Saldo Anda telah ditambahkan.',
          jsonb_build_object(
            'order_id', NEW.id,
            'product_id', NEW.product_id,
            'quantity', NEW.quantity,
            'total_amount', NEW.total_amount
          ),
          false
        );
      END IF;
      
      -- Reset system update flag (automatically reset at end of transaction anyway)
      PERFORM set_config('app.system_update', 'false', true);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
