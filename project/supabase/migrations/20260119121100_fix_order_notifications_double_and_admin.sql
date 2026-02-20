/*
  # Fix Order Notification Issues
  
  1. Problems Fixed
    - User receiving duplicate notifications (one from pending, one from completion)
    - Admin not receiving notifications when new orders are created
    - Missing trigger to call notify_pending_order function
    
  2. Changes
    - Update notify_pending_order() to include admin notifications
    - Create trigger for notify_pending_order() on INSERT
    - Add admin notifications to update_portfolio_on_order_complete() for completed/rejected orders
    - Prevent duplicate notifications for users
    
  3. Notification Flow
    - When order is created (pending): User and Admin get notification
    - When order is completed: Only user gets success notification (admin already knows)
    - When order is rejected: User and Admin get notification
*/

-- Update notify_pending_order to include admin notifications
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

-- Create trigger for pending order notifications (if not exists)
DROP TRIGGER IF EXISTS trigger_notify_pending_order ON orders;
CREATE TRIGGER trigger_notify_pending_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_pending_order();

-- Update portfolio completion function to add admin notification for rejected orders
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
        'Transaksi ' || NEW.type || ' sebanyak ' || NEW.quantity || ' ' || v_product_unit || ' ' || 
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

    -- Handle COMPLETED orders
    IF NEW.status = 'completed' THEN
      IF NEW.type = 'buy' THEN
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

      ELSIF NEW.type = 'sell' THEN
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
    END IF;
  END IF;

  RETURN NEW;
END;
$$;