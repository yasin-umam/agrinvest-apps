/*
  # Tambah Portfolio Update Saat Order Completed
  
  ## Perubahan
  
  1. Function: `update_portfolio_on_order_complete`
    - Menambahkan unit ke portfolio user ketika order type 'buy' approved
    - Mengurangi saldo user
    - Update average buy price
    - Jika portfolio belum ada, buat baru
    - Jika sudah ada, update quantity dan average price
    
  2. Trigger: `trigger_update_portfolio_on_order_complete`
    - Otomatis update portfolio dan saldo ketika order completed
    
  ## Keamanan
  - Function berjalan dengan SECURITY DEFINER untuk atomic operation
  - Validasi saldo user mencukupi sebelum proses
*/

-- Function untuk update portfolio dan saldo user
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
BEGIN
  -- Hanya proses jika:
  -- 1. Status berubah menjadi 'completed'
  -- 2. Status sebelumnya bukan 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    IF NEW.type = 'buy' THEN
      -- Cek saldo user
      SELECT balance INTO v_user_balance
      FROM profiles
      WHERE id = NEW.user_id;
      
      IF v_user_balance < NEW.total_amount THEN
        RAISE EXCEPTION 'Saldo user tidak mencukupi. Saldo: %, Dibutuhkan: %',
          v_user_balance, NEW.total_amount;
      END IF;
      
      -- Kurangi saldo user
      UPDATE profiles
      SET 
        balance = balance - NEW.total_amount,
        updated_at = now()
      WHERE id = NEW.user_id;
      
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
      
    ELSIF NEW.type = 'sell' THEN
      -- Tambah saldo user dari penjualan
      UPDATE profiles
      SET 
        balance = balance + NEW.total_amount,
        updated_at = now()
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Buat trigger
DROP TRIGGER IF EXISTS trigger_update_portfolio_on_order_complete ON orders;

CREATE TRIGGER trigger_update_portfolio_on_order_complete
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_on_order_complete();
