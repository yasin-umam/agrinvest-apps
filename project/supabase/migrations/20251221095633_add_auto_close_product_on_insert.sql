/*
  # Auto-close product on insert if sold out

  1. Changes
    - Add trigger to automatically set is_active to false when product is created with available_units = 0
  
  2. Security
    - No security changes, trigger runs at database level
*/

-- Drop the old trigger
DROP TRIGGER IF EXISTS trigger_auto_close_product_on_sold_out ON chili_products;

-- Create trigger on chili_products for both INSERT and UPDATE
CREATE TRIGGER trigger_auto_close_product_on_sold_out
  BEFORE INSERT OR UPDATE OF available_units
  ON chili_products
  FOR EACH ROW
  EXECUTE FUNCTION auto_close_product_on_sold_out();
