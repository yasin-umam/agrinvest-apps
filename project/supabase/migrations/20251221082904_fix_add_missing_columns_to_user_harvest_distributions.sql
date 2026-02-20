/*
  # Fix Missing Columns in user_harvest_distributions

  ## Problem
  Table user_harvest_distributions was created in an earlier migration without the
  `total_harvest_revenue` and `total_units` columns. Migration 20251221073311 used
  CREATE TABLE IF NOT EXISTS which skips table creation if it already exists,
  leaving these columns missing.

  ## Solution
  Add the missing columns to the existing table.

  ## Changes
  1. Add `total_harvest_revenue` column (integer)
  2. Add `total_units` column (integer)

  ## Security
  - No RLS changes needed
  - Existing policies remain intact
*/

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add total_harvest_revenue column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_harvest_distributions'
    AND column_name = 'total_harvest_revenue'
  ) THEN
    ALTER TABLE user_harvest_distributions
    ADD COLUMN total_harvest_revenue integer NOT NULL DEFAULT 0;
  END IF;

  -- Add total_units column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_harvest_distributions'
    AND column_name = 'total_units'
  ) THEN
    ALTER TABLE user_harvest_distributions
    ADD COLUMN total_units integer NOT NULL DEFAULT 0;
  END IF;
END $$;
