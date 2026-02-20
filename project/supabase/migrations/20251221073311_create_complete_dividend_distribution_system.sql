/*
  # Complete Dividend Distribution System

  ## Overview
  Implements a complete dividend distribution system where harvest revenue is distributed
  to all unit holders (investors) based on their ownership percentage. Units = Shares.

  ## Concept
  - **Units = Shares**: Each unit represents ownership in the product
  - **Harvest = Dividend**: Revenue from harvest is distributed based on units owned
  - **Distribution Formula**:
    - Total revenue / total units = revenue per unit
    - User revenue = units owned × revenue per unit
    - Unsold units revenue goes to admin

  ## Example
  - Total units: 1,000
  - Harvest revenue: Rp 1,000,000
  - Revenue per unit: Rp 1,000
  - User A owns 100 units → receives Rp 100,000
  - User B owns 50 units → receives Rp 50,000
  - Admin owns 850 units (unsold) → receives Rp 850,000

  ## New Tables

  ### `user_harvest_distributions`
  Tracks individual dividend distributions to each user per harvest event.

  #### Fields:
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users) - User receiving dividend
  - `product_id` (uuid, references chili_products) - Product that was harvested
  - `harvest_id` (uuid, references harvest_revenue_history) - Specific harvest event
  - `units_owned` (integer) - Number of units user owns
  - `revenue_per_unit` (numeric) - Revenue amount per unit for this harvest
  - `user_revenue` (numeric) - Total revenue user received
  - `harvest_kg` (numeric) - Amount harvested in kg
  - `total_harvest_revenue` (integer) - Total revenue from harvest
  - `total_units` (integer) - Total units in circulation
  - `ownership_percentage` (numeric) - User's ownership percentage
  - `created_at` (timestamptz) - Distribution timestamp

  ## Changes

  1. Remove `inventory_kg` field from chili_products (no longer needed)
  2. Create `user_harvest_distributions` table for tracking all distributions
  3. Create `distribute_harvest_dividend()` function for automatic distribution
  4. Create trigger to auto-distribute when harvest is recorded
  5. Automatically update user balances
  6. Send notifications to all dividend recipients
  7. Handle admin's dividend from unsold units
  8. Fix constraint to use (user_id, harvest_id) instead of (user_id, product_id, created_at)
  9. Fix admin duplicate distribution with ON CONFLICT

  ## Security
  - Enable RLS on user_harvest_distributions
  - Users can only view their own distributions
  - Admin can view all distributions
  - Function uses SECURITY DEFINER for balance updates

  ## Process Flow

  1. Admin records harvest → INSERT INTO harvest_revenue_history
  2. Trigger automatically fires → distribute_harvest_dividend()
  3. Calculate revenue per unit = total_revenue / total_units
  4. For each portfolio holder:
     - Calculate user's dividend
     - Update user's balance
     - Record distribution in user_harvest_distributions
     - Send notification to user
  5. Calculate admin's dividend from unsold units
  6. Update admin balance and send notification (with ON CONFLICT handling)
*/

-- Step 1: Remove inventory_kg field (no longer needed in dividend system)
ALTER TABLE chili_products DROP COLUMN IF EXISTS inventory_kg;

-- Drop old inventory trigger and function if exists
DROP TRIGGER IF EXISTS trigger_add_harvest_to_inventory ON harvest_revenue_history;
DROP FUNCTION IF EXISTS add_harvest_to_inventory();

-- Drop old distribution functions if exist
DROP TRIGGER IF EXISTS trigger_distribute_harvest_on_insert ON harvest_revenue_history;
DROP FUNCTION IF EXISTS distribute_harvest_to_users();

-- Step 2: Create user_harvest_distributions table
CREATE TABLE IF NOT EXISTS user_harvest_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES chili_products(id) ON DELETE CASCADE,
  harvest_id uuid NOT NULL REFERENCES harvest_revenue_history(id) ON DELETE CASCADE,
  units_owned integer NOT NULL DEFAULT 0,
  revenue_per_unit numeric NOT NULL DEFAULT 0,
  user_revenue numeric NOT NULL DEFAULT 0,
  harvest_kg numeric NOT NULL DEFAULT 0,
  total_harvest_revenue integer NOT NULL DEFAULT 0,
  total_units integer NOT NULL DEFAULT 0,
  ownership_percentage numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Drop old problematic constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_harvest_distributions_user_id_product_id_created_at_key'
  ) THEN
    ALTER TABLE user_harvest_distributions
    DROP CONSTRAINT user_harvest_distributions_user_id_product_id_created_at_key;
  END IF;
END $$;

-- Add correct constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_harvest_distributions_user_harvest_unique'
  ) THEN
    ALTER TABLE user_harvest_distributions
    ADD CONSTRAINT user_harvest_distributions_user_harvest_unique 
    UNIQUE (user_id, harvest_id);
  END IF;
END $$;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_harvest_distributions_user_id
  ON user_harvest_distributions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_harvest_distributions_product_id
  ON user_harvest_distributions(product_id);
CREATE INDEX IF NOT EXISTS idx_user_harvest_distributions_harvest_id
  ON user_harvest_distributions(harvest_id);
CREATE INDEX IF NOT EXISTS idx_user_harvest_distributions_created_at
  ON user_harvest_distributions(created_at DESC);

-- Step 4: Enable RLS
ALTER TABLE user_harvest_distributions ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
DROP POLICY IF EXISTS "Users can view own harvest distributions" ON user_harvest_distributions;
CREATE POLICY "Users can view own harvest distributions"
  ON user_harvest_distributions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all harvest distributions" ON user_harvest_distributions;
CREATE POLICY "Admin can view all harvest distributions"
  ON user_harvest_distributions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Step 6: Create dividend distribution function
CREATE OR REPLACE FUNCTION distribute_harvest_dividend()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product chili_products%ROWTYPE;
  v_revenue_per_unit numeric;
  v_total_units_sold numeric;
  v_admin_units numeric;
  v_admin_revenue numeric;
  v_admin_id uuid;
  v_distribution RECORD;
BEGIN
  -- Get product details
  SELECT * INTO v_product
  FROM chili_products
  WHERE id = NEW.product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Calculate total units sold (from portfolios)
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_units_sold
  FROM portfolios
  WHERE product_id = NEW.product_id;

  -- Calculate unsold units (admin's units)
  v_admin_units := v_product.total_units - v_total_units_sold;

  -- Calculate revenue per unit
  v_revenue_per_unit := NEW.harvest_revenue / v_product.total_units;

  -- Distribute to all unit owners
  UPDATE profiles
  SET balance = balance + (p.quantity * v_revenue_per_unit)
  FROM portfolios p
  WHERE p.product_id = NEW.product_id
    AND p.user_id = profiles.id;

  -- Record distribution for each user
  INSERT INTO user_harvest_distributions (
    user_id,
    product_id,
    harvest_id,
    units_owned,
    revenue_per_unit,
    user_revenue,
    harvest_kg,
    total_harvest_revenue,
    total_units,
    ownership_percentage
  )
  SELECT
    p.user_id,
    NEW.product_id,
    NEW.id,
    p.quantity,
    v_revenue_per_unit,
    p.quantity * v_revenue_per_unit,
    NEW.harvest_kg,
    NEW.harvest_revenue,
    v_product.total_units,
    (p.quantity::numeric / v_product.total_units * 100)
  FROM portfolios p
  WHERE p.product_id = NEW.product_id;

  -- Send notifications to all unit owners
  FOR v_distribution IN
    SELECT
      user_id,
      units_owned,
      user_revenue,
      ownership_percentage
    FROM user_harvest_distributions
    WHERE harvest_id = NEW.id
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata
    ) VALUES (
      v_distribution.user_id,
      'system',
      'Dividen Panen Diterima',
      'Anda menerima dividen sebesar Rp ' ||
        TO_CHAR(v_distribution.user_revenue, 'FM999,999,999') ||
        ' dari panen ' || v_product.name ||
        '. Unit yang dimiliki: ' || v_distribution.units_owned ||
        ' (' || ROUND(v_distribution.ownership_percentage, 2) || '%)',
      jsonb_build_object(
        'type', 'harvest_dividend',
        'product_id', NEW.product_id,
        'product_name', v_product.name,
        'harvest_id', NEW.id,
        'units_owned', v_distribution.units_owned,
        'dividend_amount', v_distribution.user_revenue,
        'ownership_percentage', v_distribution.ownership_percentage,
        'harvest_kg', NEW.harvest_kg,
        'total_revenue', NEW.harvest_revenue
      )
    );
  END LOOP;

  -- Give admin the revenue from unsold units
  IF v_admin_units > 0 THEN
    v_admin_revenue := v_admin_units * v_revenue_per_unit;

    -- Get admin user
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE role = 'admin'
    LIMIT 1;

    IF FOUND THEN
      -- Update admin balance
      UPDATE profiles
      SET balance = balance + v_admin_revenue
      WHERE id = v_admin_id;

      -- Record admin's dividend (use ON CONFLICT to handle if admin already has record)
      INSERT INTO user_harvest_distributions (
        user_id,
        product_id,
        harvest_id,
        units_owned,
        revenue_per_unit,
        user_revenue,
        harvest_kg,
        total_harvest_revenue,
        total_units,
        ownership_percentage
      ) VALUES (
        v_admin_id,
        NEW.product_id,
        NEW.id,
        v_admin_units,
        v_revenue_per_unit,
        v_admin_revenue,
        NEW.harvest_kg,
        NEW.harvest_revenue,
        v_product.total_units,
        (v_admin_units::numeric / v_product.total_units * 100)
      )
      ON CONFLICT (user_id, harvest_id)
      DO UPDATE SET
        units_owned = user_harvest_distributions.units_owned + EXCLUDED.units_owned,
        user_revenue = user_harvest_distributions.user_revenue + EXCLUDED.user_revenue,
        ownership_percentage = user_harvest_distributions.ownership_percentage + EXCLUDED.ownership_percentage;

      -- Send notification to admin (only for unsold units dividend)
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        metadata
      ) VALUES (
        v_admin_id,
        'system',
        'Dividen Panen Diterima (Unit Belum Terjual)',
        'Anda menerima dividen dari unit yang belum terjual sebesar Rp ' ||
          TO_CHAR(v_admin_revenue, 'FM999,999,999') ||
          ' dari panen ' || v_product.name ||
          '. Unit: ' || v_admin_units ||
          ' (' || ROUND((v_admin_units::numeric / v_product.total_units * 100), 2) || '%)',
        jsonb_build_object(
          'type', 'harvest_dividend_unsold',
          'product_id', NEW.product_id,
          'product_name', v_product.name,
          'harvest_id', NEW.id,
          'units_owned', v_admin_units,
          'dividend_amount', v_admin_revenue,
          'ownership_percentage', (v_admin_units::numeric / v_product.total_units * 100),
          'harvest_kg', NEW.harvest_kg,
          'total_revenue', NEW.harvest_revenue
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 7: Create trigger for automatic distribution
DROP TRIGGER IF EXISTS trigger_distribute_harvest_dividend ON harvest_revenue_history;
CREATE TRIGGER trigger_distribute_harvest_dividend
  AFTER INSERT ON harvest_revenue_history
  FOR EACH ROW
  EXECUTE FUNCTION distribute_harvest_dividend();

-- Step 8: Add helpful comments
COMMENT ON TABLE user_harvest_distributions IS 'Tracks dividend distributions to users based on their unit ownership in products';
COMMENT ON FUNCTION distribute_harvest_dividend IS 'Distributes harvest revenue as dividends based on units owned. Unsold units dividend goes to admin. Includes notifications to all recipients. Handles duplicate admin records with ON CONFLICT.';