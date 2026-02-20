/*
  # Add admin_alert type to notifications

  1. Changes
    - Update notifications_type_check constraint to include 'admin_alert'
    - This allows admin notifications to be created when new orders are placed
*/

-- Drop old constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with admin_alert included
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('trade', 'price_alert', 'system', 'admin_alert'));
