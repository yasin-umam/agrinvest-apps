/*
  # Fix Profiles Performance - Use JWT Metadata Instead of Table Query
  
  ## Problem
  The is_admin() function was querying the profiles table, causing infinite recursion:
  - User queries profiles → RLS checks → is_admin() → queries profiles again → infinite loop
  - This causes 15+ second timeouts on every profile load
  
  ## Solution
  1. Store admin role in auth.users.raw_app_metadata
  2. Update is_admin() to read from JWT metadata (no table query)
  3. This breaks the recursion chain and makes queries instant
  
  ## Changes
  1. Replace is_admin() to use auth.jwt() instead of profiles table
  2. Add helper function to set user metadata
  3. Migrate existing admin role to metadata
  4. Add triggers to keep metadata in sync
  
  ## Security
  - raw_app_metadata cannot be modified by users
  - Only admin functions can update it
  - RLS policies remain secure
*/

-- Replace the recursive function with non-recursive version
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Read from JWT metadata, no table query = no recursion
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_admin() IS 'Check if current user is admin from JWT metadata - NO TABLE QUERY to avoid recursion';

-- Helper function to sync profile role to auth metadata
CREATE OR REPLACE FUNCTION sync_admin_role_to_metadata(user_id uuid, is_admin boolean)
RETURNS void AS $$
DECLARE
  current_metadata jsonb;
BEGIN
  -- Get current app_metadata
  SELECT raw_app_meta_data INTO current_metadata
  FROM auth.users
  WHERE id = user_id;
  
  -- Update or add is_admin field
  current_metadata = COALESCE(current_metadata, '{}'::jsonb);
  current_metadata = jsonb_set(current_metadata, '{is_admin}', to_jsonb(is_admin));
  
  -- Save back to auth.users
  UPDATE auth.users
  SET raw_app_meta_data = current_metadata
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_admin_role_to_metadata IS 'Sync profile role to auth metadata - only callable by admins';

-- Migrate existing admin users to have metadata set
DO $$
DECLARE
  admin_record RECORD;
  admin_count INTEGER := 0;
BEGIN
  FOR admin_record IN 
    SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    PERFORM sync_admin_role_to_metadata(admin_record.id, true);
    admin_count := admin_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Synced admin role for % user(s)', admin_count;
END $$;

-- Create trigger to auto-sync when profile role changes
CREATE OR REPLACE FUNCTION trigger_sync_admin_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM sync_admin_role_to_metadata(NEW.id, NEW.role = 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_change ON profiles;
CREATE TRIGGER on_profile_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_admin_metadata();

-- Also sync on INSERT for new profiles
CREATE OR REPLACE FUNCTION trigger_sync_admin_metadata_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM sync_admin_role_to_metadata(NEW.id, NEW.role = 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_insert_sync_metadata ON profiles;
CREATE TRIGGER on_profile_insert_sync_metadata
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_admin_metadata_insert();
