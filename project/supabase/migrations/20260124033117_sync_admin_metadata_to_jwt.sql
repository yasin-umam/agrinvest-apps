/*
  # Sync Admin Role to JWT Metadata

  1. Problem
    - Users with role='admin' in profiles table don't have is_admin in JWT metadata
    - is_admin() function checks auth.jwt() -> 'app_metadata' ->> 'is_admin'
    - This causes RLS policies to fail (return 404 instead of allowing access)
    
  2. Solution
    - Create function to sync profiles.role to auth.users.raw_app_meta_data
    - Add trigger to automatically sync when role changes
    - Run one-time sync for existing admin users
    
  3. Security
    - Only updates metadata, doesn't change RLS policies
    - Maintains existing security model
*/

-- Function to sync profile role to auth metadata
CREATE OR REPLACE FUNCTION sync_admin_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Update auth.users metadata when role changes
  IF (OLD.role IS DISTINCT FROM NEW.role) OR (TG_OP = 'INSERT') THEN
    UPDATE auth.users
    SET raw_app_meta_data = 
      CASE 
        WHEN NEW.role = 'admin' THEN 
          COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
        ELSE 
          COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": false}'::jsonb
      END
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-sync on profile changes
DROP TRIGGER IF EXISTS sync_admin_metadata_trigger ON profiles;
CREATE TRIGGER sync_admin_metadata_trigger
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_metadata();

-- One-time sync for existing admin users
DO $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN 
    SELECT id, role FROM profiles WHERE role = 'admin'
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
    WHERE id = admin_record.id;
    
    RAISE NOTICE 'Synced admin metadata for user: %', admin_record.id;
  END LOOP;
  
  -- Also sync non-admin users to ensure consistency
  FOR admin_record IN 
    SELECT id, role FROM profiles WHERE role != 'admin'
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": false}'::jsonb
    WHERE id = admin_record.id;
  END LOOP;
END $$;

-- Verify sync worked
DO $$
DECLARE
  admin_count int;
  metadata_count int;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
  SELECT COUNT(*) INTO metadata_count FROM auth.users WHERE (raw_app_meta_data->>'is_admin')::boolean = true;
  
  RAISE NOTICE 'Admins in profiles: %, Admins in metadata: %', admin_count, metadata_count;
END $$;
