/*
  # Optimize Triggers - Remove Unnecessary Sync on Every Query
  
  ## Problem
  Triggers on profiles table are running on every INSERT, causing:
  - Extra queries to auth.users
  - Slower profile loads
  - Unnecessary overhead for normal users
  
  ## Solution
  Only sync admin metadata when role actually changes or on explicit admin promotion
  
  ## Changes
  1. Remove trigger on INSERT (new users are never admin by default)
  2. Keep UPDATE trigger only for when role changes
*/

-- Drop the INSERT trigger (new users are never admin anyway)
DROP TRIGGER IF EXISTS on_profile_insert_sync_metadata ON profiles;
DROP FUNCTION IF EXISTS trigger_sync_admin_metadata_insert();

-- Ensure UPDATE trigger only fires when role actually changes
CREATE OR REPLACE FUNCTION trigger_sync_admin_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if role changed to/from admin
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM sync_admin_role_to_metadata(NEW.id, NEW.role = 'admin');
    RAISE NOTICE 'Synced admin metadata for user %: is_admin=%', NEW.id, (NEW.role = 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (ensure it exists and is properly configured)
DROP TRIGGER IF EXISTS on_profile_role_change ON profiles;
CREATE TRIGGER on_profile_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION trigger_sync_admin_metadata();
