/*
  # Add Farming and Revenue Details to Chili Products

  1. New Fields Added
    - `selling_price_per_kg` (numeric) - Harga jual sayuran per kilogram
    - `selling_price_change_percent` (numeric) - Persentase perubahan harga jual dari hari sebelumnya
    - `area_size` (numeric) - Luas area lahan dalam m²
    - `plant_population` (integer) - Jumlah total populasi tanaman
    - `cost_per_plant` (numeric) - Modal per 1 tanaman
    - `cost_per_area` (numeric) - Modal per 1 area (otomatis: cost_per_plant * plant_population)
    - `harvest_kg` (numeric) - Kuantitas panen dalam kilogram (hanya untuk status 'harvested')
    - `total_revenue` (numeric) - Total pendapatan dari panen (harvest_kg * selling_price_per_kg)
    - `revenue_vs_cost_percent` (numeric) - Persentase keuntungan vs modal tanam

  2. Notes
    - All fields are optional for backward compatibility
    - Default values set to 0 where appropriate
    - harvest_kg and revenue fields only relevant when harvest_status = 'harvested'
*/

DO $$
BEGIN
  -- Add selling_price_per_kg field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'selling_price_per_kg'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN selling_price_per_kg numeric DEFAULT 0;
  END IF;

  -- Add selling_price_change_percent field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'selling_price_change_percent'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN selling_price_change_percent numeric DEFAULT 0;
  END IF;

  -- Add area_size field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'area_size'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN area_size numeric DEFAULT 0;
  END IF;

  -- Add plant_population field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'plant_population'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN plant_population integer DEFAULT 0;
  END IF;

  -- Add cost_per_plant field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'cost_per_plant'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN cost_per_plant numeric DEFAULT 0;
  END IF;

  -- Add cost_per_area field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'cost_per_area'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN cost_per_area numeric DEFAULT 0;
  END IF;

  -- Add harvest_kg field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'harvest_kg'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN harvest_kg numeric DEFAULT 0;
  END IF;

  -- Add total_revenue field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'total_revenue'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN total_revenue numeric DEFAULT 0;
  END IF;

  -- Add revenue_vs_cost_percent field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'revenue_vs_cost_percent'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN revenue_vs_cost_percent numeric DEFAULT 0;
  END IF;
END $$;

-- Seed sample data for existing products
UPDATE chili_products
SET 
  selling_price_per_kg = current_price * (0.8 + RANDOM() * 0.4),
  selling_price_change_percent = -5 + (RANDOM() * 10),
  area_size = 1000 + (RANDOM() * 4000),
  plant_population = 500 + (RANDOM() * 1500)::integer,
  cost_per_plant = 5000 + (RANDOM() * 15000),
  harvest_kg = CASE 
    WHEN harvest_status = 'harvested' THEN 100 + (RANDOM() * 400)
    ELSE 0
  END
WHERE selling_price_per_kg = 0;

-- Calculate derived fields
UPDATE chili_products
SET 
  cost_per_area = cost_per_plant * plant_population,
  total_revenue = harvest_kg * selling_price_per_kg,
  revenue_vs_cost_percent = CASE 
    WHEN cost_per_plant * plant_population > 0 THEN 
      ((harvest_kg * selling_price_per_kg - (cost_per_plant * plant_population)) / (cost_per_plant * plant_population)) * 100
    ELSE 0
  END
WHERE cost_per_area = 0 OR total_revenue = 0;