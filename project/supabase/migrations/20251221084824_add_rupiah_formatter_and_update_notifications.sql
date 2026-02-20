/*
  # Tambah Format Rupiah untuk Notifikasi

  1. Perubahan
    - Buat fungsi helper format_rupiah() untuk format nominal dengan pemisah ribuan
    - Update notify_pending_order() untuk format nominal di notifikasi pending
    - Update update_portfolio_on_order_complete() untuk format nominal di semua notifikasi

  2. Format
    - Mengubah format dari "Rp 15000" menjadi "Rp 15.000"
    - Menggunakan pemisah ribuan titik sesuai format Indonesia
*/

-- Buat fungsi helper untuk format rupiah dengan pemisah ribuan
CREATE OR REPLACE FUNCTION format_rupiah(amount numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Format angka dengan pemisah ribuan titik (format Indonesia)
  RETURN regexp_replace(
    to_char(amount, 'FM999G999G999G999G999'),
    'G',
    '.',
    'g'
  );
END;
$$;

-- Update fungsi notifikasi pending untuk format rupiah
CREATE OR REPLACE FUNCTION notify_pending_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if order is pending
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
    SELECT
      NEW.user_id,
      'trade',
      'Transaksi Menunggu Validasi',
      'Transaksi ' || NEW.type || ' sebanyak ' || NEW.quantity || ' ' || cp.unit || ' ' || cp.name ||
      ' senilai Rp ' || format_rupiah(NEW.total_amount) || ' sedang menunggu validasi admin. ' ||
      CASE
        WHEN NEW.type = 'buy' THEN 'Saldo Anda akan dipotong setelah transaksi disetujui.'
        ELSE 'Saldo Anda akan ditambah setelah transaksi disetujui.'
      END,
      jsonb_build_object(
        'order_id', NEW.id,
        'status', 'pending',
        'product_name', cp.name,
        'quantity', NEW.quantity,
        'total_amount', NEW.total_amount
      ),
      false
    FROM chili_products cp
    WHERE cp.id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function untuk handle seller payment dengan format rupiah
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
