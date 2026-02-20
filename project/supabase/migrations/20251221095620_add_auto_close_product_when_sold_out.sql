/*
  # Auto-close product when sold out

  1. Changes
    - Add trigger to automatically set is_active to false when available_units reaches 0
    - Add trigger to automatically set is_active to true when available_units becomes > 0 again
  
  2. Security
    - No security changes, trigger runs at database level
*/

-- Function to auto-close product when sold out
CREATE OR REPLACE FUNCTION auto_close_product_on_sold_out()
RETURNS TRIGGER AS $$
BEGIN
  -- If available_units is 0 or less, set is_active to false
  IF NEW.available_units <= 0 THEN
    NEW.is_active := false;
  -- If available_units becomes greater than 0 and was previously 0 or less, set is_active to true
  ELSIF OLD.available_units <= 0 AND NEW.available_units > 0 THEN
    NEW.is_active := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on chili_products
DROP TRIGGER IF EXISTS trigger_auto_close_product_on_sold_out ON chili_products;

CREATE TRIGGER trigger_auto_close_product_on_sold_out
  BEFORE UPDATE OF available_units
  ON chili_products
  FOR EACH ROW
  EXECUTE FUNCTION auto_close_product_on_sold_out();
