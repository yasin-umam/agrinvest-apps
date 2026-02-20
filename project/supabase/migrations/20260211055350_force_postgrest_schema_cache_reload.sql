/*
  # Force PostgREST Schema Cache Reload
  
  1. Problem
    - PostgREST might be caching old schema with column "type" or "seller_id" in orders table
    - This causes REST API to fail with "column seller_id does not exist" error
    
  2. Solution
    - Send NOTIFY command to reload PostgREST schema cache
    - This forces PostgREST to re-read the current database schema
  
  3. Changes
    - Execute NOTIFY pgrst to trigger schema cache reload
*/

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Also ensure all constraints and indexes are up to date
REINDEX TABLE orders;
REINDEX TABLE chili_products;
REINDEX TABLE profiles;

-- Analyze tables for query planner optimization
ANALYZE orders;
ANALYZE chili_products;
ANALYZE profiles;
ANALYZE portfolios;
