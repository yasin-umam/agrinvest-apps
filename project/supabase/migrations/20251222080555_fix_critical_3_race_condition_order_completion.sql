/*
  # Fix CRITICAL-3: Eliminate Race Condition in Order Completion
  
  ## Critical Security Issue
  The idempotency check used notifications table, creating a race condition window where
  two simultaneous admin approvals could both pass the check before notifications are inserted,
  resulting in:
  - Double balance deduction from buyer
  - Double payment to seller
  - Duplicate portfolio entries
  - Money loss for users
  
  ## Attack Scenario (Before Fix)
  ```
  Time  Admin A                          Admin B
  T1    Check notifications (none)       
  T2                                     Check notifications (none)
  T3    Deduct buyer $1000               
  T4                                     Deduct buyer $1000 (DUPLICATE!)
  T5    Insert notification              
  T6                                     Insert notification
  Result: Buyer charged $2000 for one order
  ```
  
  ## Root Causes
  1. Idempotency check happens AFTER status change
  2. Notifications table is not an idempotency lock (can be deleted/modified)
  3. No database-level lock preventing concurrent processing
  
  ## Changes Made
  
  1. **Advisory Lock**
     - Use PostgreSQL advisory lock on order ID
     - Prevents concurrent processing of same order
     - Automatically released at transaction end
  
  2. **Status-Based Guard**
     - Check OLD.status != 'completed' ensures first-time processing
     - Order status itself is the idempotency lock
     - Cannot be bypassed by external changes
  
  3. **Atomic Operations**
     - All balance updates remain atomic with balance checks
     - Portfolio updates remain transaction-safe
  
  ## Security After Fix
  
  - ✅ Impossible for two admins to process same order twice
  - ✅ Even if notifications fail, idempotency is maintained
  - ✅ Order status is source of truth for processing state
  - ✅ Lock is automatically released on transaction commit/rollback
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
  v_lock_acquired boolean;
BEGIN
  -- Hanya proses jika status berubah menjadi 'completed' dan sebelumnya bukan 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- ============================================================
    -- CRITICAL: ADVISORY LOCK - Prevent Concurrent Processing
    -- ============================================================
    -- Try to acquire an exclusive lock on this order ID
    -- This prevents race conditions where two admins approve simultaneously
    -- Lock is automatically released when transaction ends
    SELECT pg_try_advisory_xact_lock(hashtext(NEW.id::text)) INTO v_lock_acquired;
    
    IF NOT v_lock_acquired THEN
      -- Another transaction is already processing this order
      RAISE NOTICE 'Order % is being processed by another transaction. Skipping.', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Double-check: Verify order status hasn't changed during lock acquisition
    -- This handles edge case where status was changed between trigger start and lock
    IF (SELECT status FROM orders WHERE id = NEW.id) != 'completed' THEN
      RAISE NOTICE 'Order % status changed during processing. Skipping.', NEW.id;
      RETURN NEW;
    END IF;
    
    IF NEW.type = 'buy' THEN
      -- Ambil info produk dan seller
      SELECT seller_id, name, code INTO v_product_seller_id, v_product_name, v_product_code
      FROM chili_products
      WHERE id = NEW.product_id;
      
      -- Validate product exists
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found for order %', NEW.id;
      END IF;
      
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
        -- Check if user exists or just insufficient balance
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id) THEN
          RAISE EXCEPTION 'User % not found', NEW.user_id;
        ELSE
          RAISE EXCEPTION 'Saldo user tidak mencukupi untuk order %. Required: %, Available: %', 
            NEW.id, 
            NEW.total_amount,
            (SELECT balance FROM profiles WHERE id = NEW.user_id);
        END IF;
      END IF;
      
      -- Jika produk punya seller (user listing), transfer uang ke seller
      IF v_product_seller_id IS NOT NULL THEN
        -- Tambah saldo seller (atomic operation)
        UPDATE profiles
        SET 
          balance = balance + NEW.total_amount,
          updated_at = now()
        WHERE id = v_product_seller_id;
        
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Seller % not found', v_product_seller_id;
        END IF;
        
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
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Seller % not found', NEW.user_id;
      END IF;
      
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

-- Add comment documenting the locking mechanism
COMMENT ON FUNCTION update_portfolio_on_order_complete IS 'Trigger function for order completion with advisory locks to prevent race conditions. Uses pg_try_advisory_xact_lock for idempotency.';
