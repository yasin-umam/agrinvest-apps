/*
  # Harden Portfolio Order Complete Function
  
  Improvements:
  1. Idempotency guard - prevents double processing
  2. Atomic balance update - single UPDATE with balance check
  3. Self-trade protection - buyer cannot be seller
  4. Security hardening - explicit search_path
  
  Business logic UNCHANGED - same amounts, same recipients, same behavior.
*/

CREATE OR REPLACE FUNCTION update_portfolio_on_order_complete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_portfolio portfolios%ROWTYPE;
  v_new_avg_price numeric;
  v_new_quantity integer;
  v_product_seller_id uuid;
  v_product_name text;
  v_product_code text;
  v_already_processed boolean;
BEGIN
  -- Hanya proses jika status berubah menjadi 'completed' dan sebelumnya bukan 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- ============================================================
    -- IDEMPOTENCY CHECK: Prevent duplicate processing
    -- ============================================================
    -- Check if this order has already been processed by looking for existing notification
    SELECT EXISTS(
      SELECT 1 FROM notifications
      WHERE metadata->>'order_id' = NEW.id::text
        AND user_id = NEW.user_id
    ) INTO v_already_processed;
    
    IF v_already_processed THEN
      RAISE NOTICE 'Order % already processed. Skipping.', NEW.id;
      RETURN NEW;
    END IF;
    
    IF NEW.type = 'buy' THEN
      -- Ambil info produk dan seller
      SELECT seller_id, name, code INTO v_product_seller_id, v_product_name, v_product_code
      FROM chili_products
      WHERE id = NEW.product_id;
      
      -- ============================================================
      -- CONSISTENCY CHECK: Prevent self-trade
      -- ============================================================
      IF v_product_seller_id IS NOT NULL AND v_product_seller_id = NEW.user_id THEN
        RAISE EXCEPTION 'Self-trade not allowed. Buyer and seller cannot be the same user.';
      END IF;
      
      -- ============================================================
      -- ATOMIC BALANCE UPDATE: Single UPDATE with balance check
      -- ============================================================
      -- Kurangi saldo buyer (atomic check and update in one operation)
      UPDATE profiles
      SET 
        balance = balance - NEW.total_amount,
        updated_at = now()
      WHERE id = NEW.user_id
        AND balance >= NEW.total_amount;
      
      -- Check if update succeeded (balance was sufficient)
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Saldo user tidak mencukupi untuk order %', NEW.id;
      END IF;
      
      -- Jika produk punya seller (user listing), transfer uang ke seller
      IF v_product_seller_id IS NOT NULL THEN
        -- Tambah saldo seller
        UPDATE profiles
        SET 
          balance = balance + NEW.total_amount,
          updated_at = now()
        WHERE id = v_product_seller_id;
        
        -- Notifikasi untuk seller: aset terjual
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
      
      -- Cek apakah portfolio sudah ada
      SELECT * INTO v_existing_portfolio
      FROM portfolios
      WHERE user_id = NEW.user_id
        AND product_id = NEW.product_id;
      
      IF FOUND THEN
        -- Update portfolio yang sudah ada
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
        -- Buat portfolio baru
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
      
      -- Notifikasi untuk buyer: pembelian berhasil
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
      
    ELSIF NEW.type = 'sell' THEN
      -- Tambah saldo user dari penjualan (jika ada order sell yang di-approve admin)
      UPDATE profiles
      SET 
        balance = balance + NEW.total_amount,
        updated_at = now()
      WHERE id = NEW.user_id;
      
      -- Notifikasi untuk seller: penjualan disetujui
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
  END IF;
  
  RETURN NEW;
END;
$$;