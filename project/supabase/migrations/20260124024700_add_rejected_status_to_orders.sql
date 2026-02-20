/*
  # Add 'rejected' Status to Orders Table
  
  ## Problem
  The orders table constraint only allows: 'pending', 'completed', 'cancelled', 'partial'
  But the trigger functions use 'rejected' status, causing failures when admins reject orders.
  
  ## Solution
  Update the constraint to include 'rejected' status
  
  ## Changes
  1. Drop old status constraint
  2. Create new constraint with 'rejected' included
*/

-- Drop the old status constraint
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with 'rejected' status
ALTER TABLE orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'completed', 'cancelled', 'partial', 'rejected'));
