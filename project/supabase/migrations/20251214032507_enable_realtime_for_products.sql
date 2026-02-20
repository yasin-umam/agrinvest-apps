/*
  # Enable Realtime for Products Table

  1. Configuration
    - Enable realtime publication for `chili_products` table
    - This allows frontend to receive live updates when product data changes

  2. Notes
    - Frontend already has subscription code, just needs backend enabled
    - Changes in admin panel will now sync instantly to market page
*/

-- Enable realtime for chili_products table
ALTER PUBLICATION supabase_realtime ADD TABLE chili_products;