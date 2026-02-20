/*
  # Tambah Transfer Pembayaran ke Seller dan Notifikasi
  
  ## Perubahan
  
  1. Update Function: `update_portfolio_on_order_complete`
    - Cek apakah product dibeli dari seller (user listing)
    - Jika ada seller_id, transfer uang ke seller bukan system
    - Kirim notifikasi ke seller saat asetnya terjual
    - Kirim notifikasi ke buyer saat order berhasil
    
  2. Notifications
    - Seller: "Aset Anda Terjual"
    - Buyer: "Pembelian Berhasil" 
    
  ## Keamanan
  - Function berjalan dengan SECURITY DEFINER untuk atomic operation
  - Validasi saldo user dan seller balance
*/

-- Update function untuk handle seller payment
CREATE OR REPLACE FUNCTION update_portfolio_on_order_complete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_balance numeric;
  v_existing_portfolio portfolios%ROWTYPE;
  v_new_avg_price numeric;
  v_new_quantity integer;
  v_product_seller_id uuid;
  v_product_name text;
  v_product_code text;
BEGIN
  -- Hanya proses jika:
  -- 1. Status berubah menjadi 'completed'
  -- 2. Status sebelumnya bukan 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    IF NEW.type = 'buy' THEN
      -- Ambil info produk dan seller
      SELECT seller_id, name, code INTO v_product_seller_id, v_product_name, v_product_code
      FROM chili_products
      WHERE id = NEW.product_id;
      
      -- Cek saldo user
      SELECT balance INTO v_user_balance
      FROM profiles
      WHERE id = NEW.user_id;
      
      IF v_user_balance < NEW.total_amount THEN
        RAISE EXCEPTION 'Saldo user tidak mencukupi. Saldo: %, Dibutuhkan: %',
          v_user_balance, NEW.total_amount;
      END IF;
      
      -- Kurangi saldo buyer
      UPDATE profiles
      SET 
        balance = balance - NEW.total_amount,
        updated_at = now()
      WHERE id = NEW.user_id;
      
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
          NEW.price::numeric::text || '/unit. Total penerimaan: Rp ' || NEW.total_amount::numeric::text || 
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
        NEW.price::numeric::text || '/unit telah berhasil. Total pembayaran: Rp ' || 
        NEW.total_amount::numeric::text || '. Aset telah ditambahkan ke portfolio Anda.',
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
        'Penjualan ' || NEW.quantity || ' unit senilai Rp ' || NEW.total_amount::numeric::text || 
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

-- Trigger sudah ada, tidak perlu dibuat ulang
-- DROP TRIGGER IF EXISTS trigger_update_portfolio_on_order_complete ON orders;
-- CREATE TRIGGER trigger_update_portfolio_on_order_complete
--   AFTER UPDATE ON orders
--   FOR EACH ROW
--   EXECUTE FUNCTION update_portfolio_on_order_complete();
