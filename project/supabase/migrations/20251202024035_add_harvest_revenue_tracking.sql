/*
  # Add Harvest Revenue Tracking and Admin Balance History

  ## Overview
  This migration adds support for tracking daily harvest revenues and admin balance changes
  to enable trend comparisons (today vs yesterday).

  ## 1. New Tables
  
  ### harvest_revenue_history
  - Tracks each harvest event with revenue data
  - Enables accumulative revenue tracking per product
  - Links to chili_products for synchronization
  
  ### admin_balance_history
  - Tracks daily admin balance changes
  - Enables trend arrows (today vs yesterday comparison)
  - Records balance additions from harvests

  ## 2. Features
  - Automatic timestamp for tracking trends
  - Product-specific revenue history
  - Daily balance change tracking
  - Support for accumulative revenue sync

  ## 3. Security
  - Enable RLS on all new tables
  - Restrict access to admin users only
  - Ensure data integrity with proper constraints
*/

-- Create harvest revenue history table
CREATE TABLE IF NOT EXISTS harvest_revenue_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES chili_products(id) ON DELETE CASCADE,
  harvest_kg numeric NOT NULL DEFAULT 0 CHECK (harvest_kg >= 0),
  harvest_revenue numeric NOT NULL DEFAULT 0 CHECK (harvest_revenue >= 0),
  harvest_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create admin balance history table
CREATE TABLE IF NOT EXISTS admin_balance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance_change numeric NOT NULL DEFAULT 0,
  balance_after numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'harvest',
  product_id uuid REFERENCES chili_products(id) ON DELETE SET NULL,
  change_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_harvest_revenue_product_date 
  ON harvest_revenue_history(product_id, harvest_date DESC);

CREATE INDEX IF NOT EXISTS idx_admin_balance_admin_date 
  ON admin_balance_history(admin_id, change_date DESC);

CREATE INDEX IF NOT EXISTS idx_admin_balance_product 
  ON admin_balance_history(product_id);

-- Enable RLS
ALTER TABLE harvest_revenue_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_balance_history ENABLE ROW LEVEL SECURITY;

-- Policies for harvest_revenue_history
CREATE POLICY "Admins can view all harvest revenue history"
  ON harvest_revenue_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert harvest revenue history"
  ON harvest_revenue_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update harvest revenue history"
  ON harvest_revenue_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete harvest revenue history"
  ON harvest_revenue_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policies for admin_balance_history
CREATE POLICY "Admins can view all balance history"
  ON admin_balance_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert balance history"
  ON admin_balance_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Helper function to get yesterday's harvest revenue for a product
CREATE OR REPLACE FUNCTION get_yesterday_harvest_revenue(p_product_id uuid)
RETURNS numeric AS $$
DECLARE
  yesterday_revenue numeric;
BEGIN
  SELECT COALESCE(SUM(harvest_revenue), 0)
  INTO yesterday_revenue
  FROM harvest_revenue_history
  WHERE product_id = p_product_id
  AND harvest_date = CURRENT_DATE - INTERVAL '1 day';
  
  RETURN yesterday_revenue;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get today's harvest revenue for a product
CREATE OR REPLACE FUNCTION get_today_harvest_revenue(p_product_id uuid)
RETURNS numeric AS $$
DECLARE
  today_revenue numeric;
BEGIN
  SELECT COALESCE(SUM(harvest_revenue), 0)
  INTO today_revenue
  FROM harvest_revenue_history
  WHERE product_id = p_product_id
  AND harvest_date = CURRENT_DATE;
  
  RETURN today_revenue;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get yesterday's admin balance change
CREATE OR REPLACE FUNCTION get_yesterday_balance_change(p_admin_id uuid)
RETURNS numeric AS $$
DECLARE
  yesterday_change numeric;
BEGIN
  SELECT COALESCE(SUM(balance_change), 0)
  INTO yesterday_change
  FROM admin_balance_history
  WHERE admin_id = p_admin_id
  AND change_date = CURRENT_DATE - INTERVAL '1 day';
  
  RETURN yesterday_change;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get today's admin balance change
CREATE OR REPLACE FUNCTION get_today_balance_change(p_admin_id uuid)
RETURNS numeric AS $$
DECLARE
  today_change numeric;
BEGIN
  SELECT COALESCE(SUM(balance_change), 0)
  INTO today_change
  FROM admin_balance_history
  WHERE admin_id = p_admin_id
  AND change_date = CURRENT_DATE;
  
  RETURN today_change;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE harvest_revenue_history IS 'Tracks daily harvest revenue per product for trend analysis';
COMMENT ON TABLE admin_balance_history IS 'Tracks daily admin balance changes for trend analysis';
COMMENT ON FUNCTION get_yesterday_harvest_revenue IS 'Get total harvest revenue for a product from yesterday';
COMMENT ON FUNCTION get_today_harvest_revenue IS 'Get total harvest revenue for a product from today';
COMMENT ON FUNCTION get_yesterday_balance_change IS 'Get total balance change for admin from yesterday';
COMMENT ON FUNCTION get_today_balance_change IS 'Get total balance change for admin from today';
