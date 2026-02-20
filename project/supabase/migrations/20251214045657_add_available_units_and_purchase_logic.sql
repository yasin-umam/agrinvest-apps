/*
  # Tambah Available Units dan Logika Pembelian

  ## Perubahan
  
  1. Kolom Baru di `chili_products`
    - `available_units` (integer) - jumlah unit yang tersedia untuk dibeli
    - Default 0, NOT NULL
    
  2. Function: `reduce_available_units`
    - Mengurangi available_units ketika order approved (completed)
    - Validasi available_units mencukupi
    - Atomic operation untuk mencegah race condition
    
  3. Trigger: `trigger_reduce_available_units`
    - Otomatis mengurangi available_units ketika order status berubah ke 'completed'
    - Hanya untuk order type 'buy'
  
  ## Keamanan
  - Function berjalan dengan SECURITY DEFINER untuk memastikan atomic update
  - Validasi ketat untuk mencegah overselling
*/

-- 1. Tambah kolom available_units ke chili_products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chili_products' AND column_name = 'available_units'
  ) THEN
    ALTER TABLE chili_products 
    ADD COLUMN available_units integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. Function untuk mengurangi available_units secara atomic
CREATE OR REPLACE FUNCTION reduce_available_units()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Hanya proses jika:
  -- 1. Status berubah menjadi 'completed'
  -- 2. Status sebelumnya bukan 'completed' 
  -- 3. Order type adalah 'buy'
  IF NEW.status = 'completed' 
     AND OLD.status != 'completed' 
     AND NEW.type = 'buy' THEN
    
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
$$;

-- 3. Buat trigger pada orders table
DROP TRIGGER IF EXISTS trigger_reduce_available_units ON orders;

CREATE TRIGGER trigger_reduce_available_units
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION reduce_available_units();

-- 4. Set initial available_units berdasarkan total_volume (migrasi data existing)
UPDATE chili_products
SET available_units = GREATEST(total_volume::integer, 0)
WHERE available_units = 0;

-- 5. Tambah index untuk performa
CREATE INDEX IF NOT EXISTS idx_chili_products_available_units 
ON chili_products(available_units) 
WHERE is_active = true AND available_units > 0;
