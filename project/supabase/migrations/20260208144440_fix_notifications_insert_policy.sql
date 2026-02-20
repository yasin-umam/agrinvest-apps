/*
  # Fix Notifications Insert Policy

  ## Problem
  Users cannot create notifications for themselves when selling from portfolio,
  resulting in 403 Forbidden error.

  ## Changes
  1. Add INSERT policy for notifications table
     - Allow authenticated users to insert notifications only for themselves
     - Enforces that user_id must match auth.uid()
     - Prevents users from creating notifications for other users

  ## Security
  - Restrictive: Users can ONLY create notifications where user_id = auth.uid()
  - WITH CHECK ensures the inserted row has correct user_id
*/

-- Add policy to allow users to create their own notifications
CREATE POLICY "Users can create own notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
