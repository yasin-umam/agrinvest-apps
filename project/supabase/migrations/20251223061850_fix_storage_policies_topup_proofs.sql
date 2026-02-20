-- Fix Storage Policies for Top-Up Proof Images
--
-- 1. Changes
--   - Drop redundant policies that may conflict
--   - Create single comprehensive policies
--   - Ensure admins can access all proof images for signed URLs
--
-- 2. Security
--   - Users can upload to their own folder
--   - Users can view their own proofs
--   - Admins can view all proofs
--   - No delete allowed

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own topup proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own topup proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all topup proofs" ON storage.objects;

-- Policy: Users can upload their own proof images
CREATE POLICY "Users upload own topup proofs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'topup-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users and admins can view proof images
CREATE POLICY "View topup proofs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'topup-proofs'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
    )
  );

-- No update or delete policies - proofs are immutable