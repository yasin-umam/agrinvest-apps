/*
  # Add Harvest and Location Fields to Chili Products

  1. Changes
    - Add `location` (text) - Location/region where the chili is grown
    - Add `age_days` (integer) - Age of the plant in days
    - Add `harvest_status` (enum) - Status of harvest: 'planted', 'growing', 'ready', 'harvested'
    - Add `harvest_quantity` (integer) - Total quantity harvested in units
  
  2. Notes
    - All fields are optional to maintain compatibility with existing data
    - Default values provided where appropriate
    - harvest_status defaults to 'growing' for active products
*/

DO $$
BEGIN
  -- Add location field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'location'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN location text;
  END IF;

  -- Add age_days field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'age_days'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN age_days integer DEFAULT 0;
  END IF;

  -- Create harvest_status enum type if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'harvest_status_enum') THEN
    CREATE TYPE harvest_status_enum AS ENUM ('planted', 'growing', 'ready', 'harvested');
  END IF;

  -- Add harvest_status field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'harvest_status'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN harvest_status harvest_status_enum DEFAULT 'growing';
  END IF;

  -- Add harvest_quantity field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'harvest_quantity'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN harvest_quantity integer DEFAULT 0;
  END IF;
END $$;

-- Update existing products with sample data
UPDATE chili_products
SET 
  location = CASE 
    WHEN code LIKE 'CHI%' THEN 'Jawa Barat'
    WHEN code LIKE 'RED%' THEN 'Jawa Tengah'
    WHEN code LIKE 'GRN%' THEN 'Jawa Timur'
    ELSE 'Indonesia'
  END,
  age_days = CASE 
    WHEN grade = 'premium' THEN 120 + (RANDOM() * 30)::integer
    WHEN grade = 'standard' THEN 90 + (RANDOM() * 30)::integer
    ELSE 60 + (RANDOM() * 30)::integer
  END,
  harvest_status = CASE 
    WHEN is_active = true AND total_volume > 1000 THEN 'ready'::harvest_status_enum
    WHEN is_active = true THEN 'growing'::harvest_status_enum
    ELSE 'harvested'::harvest_status_enum
  END,
  harvest_quantity = total_volume
WHERE location IS NULL;