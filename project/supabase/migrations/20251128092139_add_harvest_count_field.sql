/*
  # Add Harvest Count Field to Chili Products

  1. New Field Added
    - `harvest_count` (integer) - Berapa kali sudah panen

  2. Notes
    - Field is optional for backward compatibility
    - Default value set to 0
    - For harvested products, value will be updated to simulate harvest count
*/

DO $$
BEGIN
  -- Add harvest_count field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'harvest_count'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN harvest_count integer DEFAULT 0;
  END IF;
END $$;

-- Seed sample data for existing products
UPDATE chili_products
SET harvest_count = CASE 
  WHEN harvest_status = 'harvested' THEN 1 + (RANDOM() * 4)::integer
  ELSE 0
END
WHERE harvest_count = 0;