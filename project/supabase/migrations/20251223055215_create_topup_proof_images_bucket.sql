-- Create Storage Bucket for Top-Up Proof Images
--
-- 1. New Storage Bucket
--   - topup-proofs bucket for storing transfer proof images
--   - Maximum file size: 5MB
--   - Allowed file types: image/*
--
-- 2. Security Policies
--   - Authenticated users can upload proof for their own top-up
--   - Admins can view all proofs
--   - Users can view their own proofs
--   - No one can delete uploaded proofs (immutable)

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'topup-proofs',
  'topup-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own proof images
CREATE POLICY "Users can upload their own topup proofs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'topup-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can view their own proof images
CREATE POLICY "Users can view their own topup proofs"
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

-- Policy: Admins can view all proof images
CREATE POLICY "Admins can view all topup proofs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'topup-proofs'
    AND is_admin()
  );

-- No delete policy - proofs are immutable