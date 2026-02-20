/*
  # Enable Realtime for Admin Accounts

  1. Changes
    - Enable realtime publication for admin_accounts table
    - Set replica identity to FULL for complete change tracking

  2. Purpose
    - Allow real-time updates when admin accounts are modified
    - Sync changes instantly to all connected clients
*/

ALTER PUBLICATION supabase_realtime ADD TABLE admin_accounts;

ALTER TABLE admin_accounts REPLICA IDENTITY FULL;