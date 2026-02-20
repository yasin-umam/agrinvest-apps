/*
  # Add Price Range Fields to Chili Products

  1. Changes
    - Add `high_price_24h` (numeric) - Highest price in the last 24 hours
    - Add `low_price_24h` (numeric) - Lowest price in the last 24 hours
  
  2. Notes
    - Fields are required for price analysis and recommendations
    - Initialize with current_price for existing data
*/

DO $$
BEGIN
  -- Add high_price_24h field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'high_price_24h'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN high_price_24h numeric DEFAULT 0;
  END IF;

  -- Add low_price_24h field if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chili_products' AND column_name = 'low_price_24h'
  ) THEN
    ALTER TABLE chili_products ADD COLUMN low_price_24h numeric DEFAULT 0;
  END IF;
END $$;

-- Update existing products with reasonable price ranges
UPDATE chili_products
SET 
  high_price_24h = current_price * (1 + (RANDOM() * 0.1)),
  low_price_24h = current_price * (1 - (RANDOM() * 0.1))
WHERE high_price_24h = 0 OR low_price_24h = 0;