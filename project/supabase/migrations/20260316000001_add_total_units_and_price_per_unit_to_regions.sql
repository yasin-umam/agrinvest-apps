/*
  # Add total_units and price_per_unit to Regions

  1. Tambah kolom:
     - total_units  : total unit yang tersedia di region ini
     - price_per_unit : harga per unit region

  2. Perbarui kolom available_units:
     available_units = total_units - SUM(quantity order buy yang completed/partial)

  3. Perbaiki bug parameter name pada fungsi kalkulasi (ambiguitas region_id).
*/

-- -----------------------------------------------------------------------
-- 1. Tambah kolom available_units, total_units dan price_per_unit
-- -----------------------------------------------------------------------
ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS available_units decimal(15, 2) NOT NULL DEFAULT 0 CHECK (available_units >= 0),
  ADD COLUMN IF NOT EXISTS total_units     decimal(15, 2) NOT NULL DEFAULT 0 CHECK (total_units >= 0),
  ADD COLUMN IF NOT EXISTS price_per_unit  decimal(15, 2) NOT NULL DEFAULT 0 CHECK (price_per_unit >= 0);

-- Tambah dukungan order untuk region.
-- Orders lama tetap memakai product_id, sedangkan order region akan memakai region_id.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id) ON DELETE CASCADE;

-- Region order tidak selalu punya product_id, jadi buat kolom ini nullable.
ALTER TABLE orders
  ALTER COLUMN product_id DROP NOT NULL;

-- Pastikan setiap order mengacu minimal ke product atau region.
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_product_or_region_required;

ALTER TABLE orders
  ADD CONSTRAINT orders_product_or_region_required
  CHECK (product_id IS NOT NULL OR region_id IS NOT NULL);

-- Inisialisasi total_units dari total_volume yang sudah ada
UPDATE regions
SET total_units = total_volume
WHERE total_units = 0 AND total_volume > 0;

-- Sinkronkan total_volume ke total_units bila total_units sudah terisi.
UPDATE regions
SET total_volume = total_units
WHERE total_units > 0
  AND total_volume IS DISTINCT FROM total_units;

-- Inisialisasi price_per_unit dari total_company_value / total_units bila memungkinkan.
UPDATE regions
SET price_per_unit = total_company_value / total_units
WHERE total_units > 0
  AND total_company_value > 0
  AND price_per_unit IS DISTINCT FROM total_company_value / total_units;

-- Fallback ke current_price bila total_company_value belum tersedia.
UPDATE regions
SET price_per_unit = current_price
WHERE price_per_unit = 0 AND current_price > 0;

-- Sinkronkan current_price ke price_per_unit bila price_per_unit sudah terisi.
UPDATE regions
SET current_price = price_per_unit
WHERE price_per_unit > 0
  AND current_price IS DISTINCT FROM price_per_unit;

-- Hapus trigger dan function lama dulu.
-- Postgres tidak mengizinkan perubahan nama parameter pada CREATE OR REPLACE FUNCTION.
DROP TRIGGER IF EXISTS trigger_update_region_available_units ON orders;
DROP TRIGGER IF EXISTS trigger_sync_region_market_fields ON regions;
DROP TRIGGER IF EXISTS trigger_sync_region_available_units ON regions;
DROP FUNCTION IF EXISTS trigger_update_region_available_units();
DROP FUNCTION IF EXISTS update_region_available_units(uuid);
DROP FUNCTION IF EXISTS calculate_region_available_units(uuid);
DROP FUNCTION IF EXISTS sync_region_market_fields();
DROP FUNCTION IF EXISTS trigger_sync_region_available_units();

-- Sinkronkan field alias region agar admin panel dan market membaca angka yang sama.
CREATE OR REPLACE FUNCTION sync_region_market_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.total_units, 0) = 0 AND COALESCE(NEW.total_volume, 0) > 0 THEN
      NEW.total_units := NEW.total_volume;
    ELSIF COALESCE(NEW.total_units, 0) > 0 THEN
      NEW.total_volume := NEW.total_units;
    END IF;
  ELSE
    IF NEW.total_units IS DISTINCT FROM OLD.total_units THEN
      NEW.total_volume := NEW.total_units;
    ELSIF NEW.total_volume IS DISTINCT FROM OLD.total_volume THEN
      NEW.total_units := NEW.total_volume;
    ELSE
      NEW.total_units := COALESCE(NEW.total_units, NEW.total_volume, 0);
      NEW.total_volume := NEW.total_units;
    END IF;
  END IF;

  IF COALESCE(NEW.total_company_value, 0) > 0 AND COALESCE(NEW.total_units, 0) > 0 THEN
    NEW.price_per_unit := NEW.total_company_value / NEW.total_units;
    NEW.current_price := NEW.price_per_unit;
  ELSIF COALESCE(NEW.price_per_unit, 0) > 0 THEN
    NEW.current_price := NEW.price_per_unit;
    NEW.total_company_value := NEW.price_per_unit * COALESCE(NEW.total_units, 0);
  ELSIF COALESCE(NEW.current_price, 0) > 0 THEN
    NEW.price_per_unit := NEW.current_price;
    NEW.total_company_value := NEW.price_per_unit * COALESCE(NEW.total_units, 0);
  ELSE
    NEW.price_per_unit := 0;
    NEW.current_price := 0;
    NEW.total_company_value := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_region_market_fields ON regions;
CREATE TRIGGER trigger_sync_region_market_fields
  BEFORE INSERT OR UPDATE ON regions
  FOR EACH ROW
  EXECUTE FUNCTION sync_region_market_fields();

-- -----------------------------------------------------------------------
-- 2. Perbarui fungsi kalkulasi available_units
--    Gunakan p_region_id sebagai nama parameter untuk menghindari ambiguitas
--    dengan kolom region_id di tabel orders.
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_region_available_units(p_region_id uuid)
RETURNS decimal AS $$
DECLARE
  v_total_units decimal;
  v_sold_qty    decimal;
BEGIN
  -- Ambil total_units dari tabel regions
  SELECT total_units INTO v_total_units
  FROM regions
  WHERE id = p_region_id;

  -- Hitung jumlah unit yang sudah dibeli (buy orders yang completed/partial)
  SELECT COALESCE(SUM(quantity), 0) INTO v_sold_qty
  FROM orders
  WHERE region_id = p_region_id
    AND order_type = 'buy'
    AND status IN ('completed', 'partial');

  RETURN GREATEST(0, v_total_units - v_sold_qty);
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------
-- 3. Perbarui fungsi update (referensi ke fungsi kalkulasi baru)
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_region_available_units(p_region_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE regions
  SET available_units = calculate_region_available_units(p_region_id)
  WHERE id = p_region_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_sync_region_available_units()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_region_available_units(NEW.id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------
-- 4. Perbarui trigger function (sudah menggunakan p_region_id di atas,
--    tapi trigger memanggil update_region_available_units jadi tetap aman)
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_update_region_available_units()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.region_id IS NOT NULL THEN
    PERFORM update_region_available_units(NEW.region_id);

  ELSIF TG_OP = 'UPDATE' AND NEW.region_id IS NOT NULL THEN
    IF OLD.region_id IS DISTINCT FROM NEW.region_id
       OR OLD.quantity IS DISTINCT FROM NEW.quantity
       OR OLD.status  IS DISTINCT FROM NEW.status
    THEN
      IF OLD.region_id IS NOT NULL THEN
        PERFORM update_region_available_units(OLD.region_id);
      END IF;
      PERFORM update_region_available_units(NEW.region_id);
    END IF;

  ELSIF TG_OP = 'DELETE' AND OLD.region_id IS NOT NULL THEN
    PERFORM update_region_available_units(OLD.region_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop & recreate trigger
DROP TRIGGER IF EXISTS trigger_update_region_available_units ON orders;
CREATE TRIGGER trigger_update_region_available_units
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_region_available_units();

DROP TRIGGER IF EXISTS trigger_sync_region_available_units ON regions;
CREATE TRIGGER trigger_sync_region_available_units
  AFTER INSERT OR UPDATE OF total_units, total_volume ON regions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_region_available_units();

-- -----------------------------------------------------------------------
-- 5. Inisialisasi ulang available_units untuk semua region yang ada
-- -----------------------------------------------------------------------
UPDATE regions
SET available_units = calculate_region_available_units(id);

-- -----------------------------------------------------------------------
-- 6. Index untuk performa query
-- -----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_regions_available_units ON regions(available_units);
CREATE INDEX IF NOT EXISTS idx_regions_total_units     ON regions(total_units);
CREATE INDEX IF NOT EXISTS idx_regions_price_per_unit  ON regions(price_per_unit);
CREATE INDEX IF NOT EXISTS idx_orders_region_id        ON orders(region_id);
