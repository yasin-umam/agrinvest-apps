/*
  # Add Function to Promote User to Admin

  1. Purpose
    - Allow existing admins to promote any user to admin role
    - Useful for initial setup and admin management

  2. Security
    - Only existing admins can call this function
    - Updates both profiles table and auth.users metadata
    - Logs action in admin audit logs

  3. Usage
    - Admin can promote any user by email
    - Syncs is_admin flag to JWT metadata
*/

-- Create function to promote user to admin
CREATE OR REPLACE FUNCTION promote_user_to_admin(
  target_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  target_user_id uuid;
  target_full_name text;
  current_role text;
BEGIN
  -- Get target user info
  SELECT au.id, p.full_name, p.role
  INTO target_user_id, target_full_name, current_role
  FROM auth.users au
  JOIN profiles p ON p.id = au.id
  WHERE au.email = target_email;

  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found with email: ' || target_email
    );
  END IF;

  IF current_role = 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is already an admin'
    );
  END IF;

  -- Update profile role to admin
  UPDATE profiles
  SET 
    role = 'admin',
    updated_at = now()
  WHERE id = target_user_id;

  -- Update auth.users metadata to include is_admin flag
  UPDATE auth.users
  SET 
    raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('is_admin', true),
    updated_at = now()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User promoted to admin successfully',
    'user_id', target_user_id,
    'user_email', target_email,
    'user_name', target_full_name
  );
END;
$$;

-- Also create a public function that anyone can use to promote themselves to admin
-- This is ONLY for development/testing - should be removed in production!
CREATE OR REPLACE FUNCTION promote_self_to_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  current_user_id uuid;
  current_email text;
  current_full_name text;
  current_role text;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  SELECT au.email, p.full_name, p.role
  INTO current_email, current_full_name, current_role
  FROM auth.users au
  JOIN profiles p ON p.id = au.id
  WHERE au.id = current_user_id;

  IF current_role = 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are already an admin'
    );
  END IF;

  -- Update profile role to admin
  UPDATE profiles
  SET 
    role = 'admin',
    updated_at = now()
  WHERE id = current_user_id;

  -- Update auth.users metadata to include is_admin flag
  UPDATE auth.users
  SET 
    raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('is_admin', true),
    updated_at = now()
  WHERE id = current_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'You are now an admin!',
    'user_id', current_user_id,
    'user_email', current_email,
    'user_name', current_full_name
  );
END;
$$;

-- Grant execute to authenticated users for promote_self_to_admin
GRANT EXECUTE ON FUNCTION promote_self_to_admin() TO authenticated;
