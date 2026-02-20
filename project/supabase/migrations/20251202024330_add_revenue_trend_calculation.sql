/*
  # Add Revenue Trend Calculation Function

  ## Overview
  Creates a function to automatically calculate revenue trend percentages
  by comparing today's revenue to yesterday's revenue

  ## Features
  - Calculates selling_price_change_percent based on harvest history
  - Compares today vs yesterday revenue
  - Updates product records with trend data

  ## Usage
  Called after harvest data is added to update trend arrows
*/

-- Function to calculate and update revenue trend for a product
CREATE OR REPLACE FUNCTION update_revenue_trend(p_product_id uuid)
RETURNS void AS $$
DECLARE
  v_today_revenue numeric;
  v_yesterday_revenue numeric;
  v_change_percent numeric;
BEGIN
  -- Get today's total revenue
  SELECT COALESCE(SUM(harvest_revenue), 0)
  INTO v_today_revenue
  FROM harvest_revenue_history
  WHERE product_id = p_product_id
  AND harvest_date = CURRENT_DATE;

  -- Get yesterday's total revenue
  SELECT COALESCE(SUM(harvest_revenue), 0)
  INTO v_yesterday_revenue
  FROM harvest_revenue_history
  WHERE product_id = p_product_id
  AND harvest_date = CURRENT_DATE - INTERVAL '1 day';

  -- Calculate percentage change
  IF v_yesterday_revenue > 0 THEN
    v_change_percent := ((v_today_revenue - v_yesterday_revenue) / v_yesterday_revenue) * 100;
  ELSIF v_today_revenue > 0 THEN
    v_change_percent := 100;
  ELSE
    v_change_percent := 0;
  END IF;

  -- Update product with trend
  UPDATE chili_products
  SET selling_price_change_percent = v_change_percent
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update all product revenue trends
CREATE OR REPLACE FUNCTION update_all_revenue_trends()
RETURNS void AS $$
DECLARE
  product_record RECORD;
BEGIN
  FOR product_record IN 
    SELECT id FROM chili_products WHERE harvest_status = 'harvested'
  LOOP
    PERFORM update_revenue_trend(product_record.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_revenue_trend IS 'Calculate and update revenue trend percentage for a product';
COMMENT ON FUNCTION update_all_revenue_trends IS 'Update revenue trends for all harvested products';
