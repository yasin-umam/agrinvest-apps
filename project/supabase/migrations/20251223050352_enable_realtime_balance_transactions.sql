/*
  # Enable Realtime for Balance Transactions
  
  ## Overview
  Enables realtime updates for the balance_transactions table so admin can see
  new transactions immediately without refreshing the page.
  
  ## Changes
  1. Enable realtime publication for balance_transactions table
  2. Set replica identity to FULL for proper change tracking
*/

-- Enable realtime for balance_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE balance_transactions;

-- Set replica identity to FULL to include all columns in realtime events
ALTER TABLE balance_transactions REPLICA IDENTITY FULL;

COMMENT ON TABLE balance_transactions IS 'User balance top-up and withdrawal transactions with admin approval workflow - realtime enabled';
