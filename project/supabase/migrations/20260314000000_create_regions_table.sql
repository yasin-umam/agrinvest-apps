/*
  # Create Regions Table

  ## Table Definition
  Tabel untuk menyimpan data region dengan informasi perusahaan dan kinerja
  
  ## Fields
  - id: UUID primary key
  - name: Nama region
  - description: Deskripsi region
  - code: Unique code untuk region
  - image_url: URL gambar region
  - company_count: Jumlah perusahaan
  - total_company_value: Total nilai perusahaan
  - current_price: Harga saat ini
  - price_change_percent_24h: Perubahan harga 24 jam
  - total_volume: Total volume
  - total_revenue: Total revenue
  - is_active: Status aktif
  - created_at: Timestamp pembuatan
  - updated_at: Timestamp update terakhir
*/

-- Drop existing regions table if it exists
DROP TABLE IF EXISTS regions CASCADE;

-- Create regions table
CREATE TABLE regions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  code text UNIQUE,
  image_url text,
  company_count integer DEFAULT 0,
  total_company_value decimal(18, 2) DEFAULT 0,
  current_price decimal(15, 2) NOT NULL DEFAULT 0,
  price_change_percent_24h decimal(10, 4) DEFAULT 0,
  total_volume decimal(15, 2) DEFAULT 0,
  total_revenue decimal(15, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index untuk performance
CREATE INDEX IF NOT EXISTS idx_regions_is_active ON regions(is_active);
CREATE INDEX IF NOT EXISTS idx_regions_created_at ON regions(created_at DESC);

-- Function to auto-deactivate region when company_count reaches 0
CREATE OR REPLACE FUNCTION auto_deactivate_region_on_no_companies()
RETURNS TRIGGER AS $$
BEGIN
  -- If company_count is 0 or less, set is_active to false
  IF NEW.company_count <= 0 THEN
    NEW.is_active := false;
  -- If company_count becomes greater than 0 and was previously 0 or less, set is_active to true
  ELSIF OLD.company_count <= 0 AND NEW.company_count > 0 THEN
    NEW.is_active := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger untuk regions
DROP TRIGGER IF EXISTS update_regions_updated_at ON regions;

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON regions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create auto-deactivate trigger on regions
DROP TRIGGER IF EXISTS trigger_auto_deactivate_region_on_no_companies ON regions;

CREATE TRIGGER trigger_auto_deactivate_region_on_no_companies
  BEFORE UPDATE OF company_count
  ON regions
  FOR EACH ROW
  EXECUTE FUNCTION auto_deactivate_region_on_no_companies();

-- Enable Row Level Security
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- RLS Policies untuk regions
-- Admin dapat melihat dan mengelola semua regions
DROP POLICY IF EXISTS "Admin can view all regions" ON regions;
CREATE POLICY "Admin can view all regions"
  ON regions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR true  -- Public read access
  );

DROP POLICY IF EXISTS "Admin can insert regions" ON regions;
CREATE POLICY "Admin can insert regions"
  ON regions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can update regions" ON regions;
CREATE POLICY "Admin can update regions"
  ON regions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can delete regions" ON regions;
CREATE POLICY "Admin can delete regions"
  ON regions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Public read policy untuk regions (untuk semua user)
DROP POLICY IF EXISTS "Anyone can view active regions" ON regions;
CREATE POLICY "Anyone can view active regions"
  ON regions FOR SELECT
  TO public
  USING (is_active = true);

-- Seed data untuk regions
INSERT INTO regions (name, description, code, image_url, company_count, total_company_value, current_price, price_change_percent_24h, total_volume, total_revenue, is_active)
VALUES
  (
    'Jawa Timur Farming Corp',
    'Koperasi pertanian terbesar di Jawa Timur dengan fokus pada pertanian organik dan berkelanjutan.',
    'JAWA_TIMUR',
    'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop',
    5,
    500000000,
    150000,
    3.45,
    2000,
    125000000,
    true
  ),
  (
    'Jawa Barat Agro Makmur',
    'Pengembang pertanian integratif dengan teknologi modern untuk meningkatkan produktivitas.',
    'JAWA_BARAT',
    'https://images.unsplash.com/photo-1500595046891-c6de13798c86?w=400&h=300&fit=crop',
    4,
    400000000,
    120000,
    -1.64,
    1800,
    77000000,
    true
  ),
  (
    'Sumatra Utara Pertani Maju',
    'Petani andal di Sumatera Utara dengan komitmen pada pertanian berkelanjutan dan berdampak sosial.',
    'SUMATRA_UTARA',
    'https://images.unsplash.com/photo-1488459716781-6f7ee1f583b1?w=400&h=300&fit=crop',
    3,
    300000000,
    95000,
    8.42,
    1500,
    45000000,
    true
  ),
  (
    'Kalimantan Selatan AgriTech',
    'Perusahaan agritech yang menggunakan IoT dan data analytics untuk optimalisasi hasil panen.',
    'KALIMANTAN_SELATAN',
    'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop',
    6,
    600000000,
    135000,
    2.15,
    2200,
    140000000,
    true
  ),
  (
    'Sulawesi Tengah Harvest',
    'Kolaborasi petani lokal dengan dukungan penuh dari pemerintah untuk meningkatkan kualitas hasil panen.',
    'SULAWESI_TENGAH',
    'https://images.unsplash.com/photo-1500595046891-c6de13798c86?w=400&h=300&fit=crop',
    3,
    280000000,
    110000,
    0.85,
    1600,
    65000000,
    true
  );

