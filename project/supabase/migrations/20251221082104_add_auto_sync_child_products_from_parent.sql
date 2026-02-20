/*
  # Auto-Sync Child Products from Parent Product Updates

  ## Overview
  Automatically synchronize important fields from parent products to all child products
  when the parent product is updated by admin.

  ## Changes

  1. Function: `sync_child_products_from_parent`
    - Triggered when a parent product is updated
    - Automatically updates all child products with the same information
    - Syncs critical fields like harvest status, revenue, costs, etc.
    
  2. Trigger: `trigger_sync_child_products`
    - Fires AFTER UPDATE on chili_products table
    - Only processes products that have children (parent products)
    - Updates all children with parent's latest information

  ## Fields Synced from Parent to Children
  
  ### Harvest Information
  - harvest_status (planted, growing, ready, harvested)
  - harvest_kg (total kg harvested)
  - harvest_count (number of harvests)
  - total_revenue (total revenue from harvests)
  - revenue_vs_cost_percent (profit percentage)
  
  ### Product Details
  - description (product description)
  - image_url (product image)
  - selling_price_per_kg (selling price per kg)
  - age_days (plant age in days)
  
  ### Farming Costs & Details
  - area_size (land area in m²)
  - plant_population (number of plants)
  - cost_per_plant (cost per plant)
  - cost_per_area (total cost for area)
  - location (farming location)

  ## Security
  - Function runs with SECURITY DEFINER to ensure atomic updates
  - Only updates child products (where parent_product_id IS NOT NULL)
  - Preserves child-specific fields like code, available_units, seller info
*/

-- Function to sync child products when parent is updated
CREATE OR REPLACE FUNCTION sync_child_products_from_parent()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_child_count integer;
BEGIN
  -- Only proceed if this is a parent product (has children)
  SELECT COUNT(*) INTO v_child_count
  FROM chili_products
  WHERE parent_product_id = NEW.id;
  
  -- If no children, skip
  IF v_child_count = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Update all child products with parent's information
  UPDATE chili_products
  SET
    -- Harvest information
    harvest_status = NEW.harvest_status,
    harvest_kg = NEW.harvest_kg,
    harvest_count = NEW.harvest_count,
    total_revenue = NEW.total_revenue,
    revenue_vs_cost_percent = NEW.revenue_vs_cost_percent,
    
    -- Product details
    description = NEW.description,
    image_url = NEW.image_url,
    selling_price_per_kg = NEW.selling_price_per_kg,
    age_days = NEW.age_days,
    
    -- Farming costs and details
    area_size = NEW.area_size,
    plant_population = NEW.plant_population,
    cost_per_plant = NEW.cost_per_plant,
    cost_per_area = NEW.cost_per_area,
    location = NEW.location,
    
    -- Metadata
    updated_at = now()
  WHERE parent_product_id = NEW.id;
  
  RAISE NOTICE 'Synced % child products from parent %', v_child_count, NEW.code;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-sync
DROP TRIGGER IF EXISTS trigger_sync_child_products ON chili_products;

CREATE TRIGGER trigger_sync_child_products
  AFTER UPDATE ON chili_products
  FOR EACH ROW
  EXECUTE FUNCTION sync_child_products_from_parent();

-- Manually sync existing child products with their parents (one-time)
UPDATE chili_products AS child
SET
  harvest_status = parent.harvest_status,
  harvest_kg = parent.harvest_kg,
  harvest_count = parent.harvest_count,
  total_revenue = parent.total_revenue,
  revenue_vs_cost_percent = parent.revenue_vs_cost_percent,
  description = parent.description,
  image_url = parent.image_url,
  selling_price_per_kg = parent.selling_price_per_kg,
  age_days = parent.age_days,
  area_size = parent.area_size,
  plant_population = parent.plant_population,
  cost_per_plant = parent.cost_per_plant,
  cost_per_area = parent.cost_per_area,
  location = parent.location,
  updated_at = now()
FROM chili_products AS parent
WHERE child.parent_product_id = parent.id
  AND child.parent_product_id IS NOT NULL;
