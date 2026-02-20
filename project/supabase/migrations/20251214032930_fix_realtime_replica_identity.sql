/*
  # Fix Realtime Replica Identity

  1. Changes
    - Set replica identity to FULL for chili_products table
    - This ensures realtime receives complete row data for all changes
    - Required for proper UPDATE and DELETE event handling

  2. Notes
    - Default replica identity only includes primary key
    - FULL replica identity includes all columns
    - This is recommended for Supabase Realtime
*/

ALTER TABLE chili_products REPLICA IDENTITY FULL;