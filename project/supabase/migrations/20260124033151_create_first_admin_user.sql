/*
  # Create First Admin User

  1. Problem
    - No admin users exist in the system
    - Users cannot approve/reject balance transactions without admin role
    - validate_profile_update prevents non-admins from changing their own role
    - This creates a chicken-and-egg problem
    
  2. Solution
    - Create a one-time function to promote the first user to admin
    - This function bypasses the validation trigger
    - Auto-syncs admin metadata to JWT
    
  3. Security
    - Function is SECURITY DEFINER (runs with elevated privileges)
    - Only promotes users with existing profiles
    - Automatically syncs JWT metadata for proper RLS
*/

-- Create function to promote first user to admin (bypasses validation)
CREATE OR REPLACE FUNCTION create_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  first_user_id uuid;
  admin_count int;
BEGIN
  -- Check if admin already exists
  SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
  
  IF admin_count > 0 THEN
    RAISE NOTICE 'Admin user already exists, skipping...';
    RETURN;
  END IF;
  
  -- Get first user
  SELECT id INTO first_user_id FROM profiles ORDER BY created_at LIMIT 1;
  
  IF first_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in profiles table';
  END IF;
  
  -- Temporarily disable trigger
  ALTER TABLE profiles DISABLE TRIGGER validate_profile_update_trigger;
  
  -- Update role to admin
  UPDATE profiles
  SET role = 'admin'
  WHERE id = first_user_id;
  
  -- Re-enable trigger
  ALTER TABLE profiles ENABLE TRIGGER validate_profile_update_trigger;
  
  -- Sync metadata to JWT
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
  WHERE id = first_user_id;
  
  RAISE NOTICE 'Successfully promoted user % to admin', first_user_id;
END;
$$;

-- Execute the function to create first admin
SELECT create_first_admin();

-- Verify
DO $$
DECLARE
  admin_info RECORD;
BEGIN
  SELECT 
    p.id,
    p.full_name,
    p.role,
    (au.raw_app_meta_data->>'is_admin')::boolean as has_admin_metadata
  INTO admin_info
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE p.role = 'admin'
  LIMIT 1;
  
  IF admin_info.id IS NOT NULL THEN
    RAISE NOTICE 'Admin created successfully:';
    RAISE NOTICE '  ID: %', admin_info.id;
    RAISE NOTICE '  Name: %', admin_info.full_name;
    RAISE NOTICE '  Role: %', admin_info.role;
    RAISE NOTICE '  JWT Metadata: %', admin_info.has_admin_metadata;
  ELSE
    RAISE WARNING 'No admin user found!';
  END IF;
END $$;
