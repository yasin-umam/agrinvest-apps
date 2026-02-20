/*
  # Add DELETE policy for portfolios table

  1. Changes
    - Add RLS policy to allow users to delete their own portfolio entries
    - This is needed when users sell all their assets of a specific product
  
  2. Security
    - Users can only delete their own portfolio records
    - Policy checks that auth.uid() matches the user_id
*/

CREATE POLICY "Users can delete own portfolio"
  ON portfolios
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
