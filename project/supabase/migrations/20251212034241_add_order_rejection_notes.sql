/*
  # Add rejection notes to orders table

  1. Changes
    - Add `rejection_notes` column to `orders` table
      - Stores admin's notes when rejecting an order
      - NULL by default, populated only when order is rejected
    - Add `reviewed_by` column to track which admin reviewed the order
    - Add `reviewed_at` timestamp to track when the order was reviewed

  2. Security
    - No RLS changes needed (existing policies cover this)
*/

-- Add rejection notes and review tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'rejection_notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN rejection_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE orders ADD COLUMN reviewed_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN reviewed_at timestamptz;
  END IF;
END $$;