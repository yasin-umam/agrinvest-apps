/*
  # Create Test Admin User

  1. Purpose
    - Create a test admin user with known credentials for easy login
    - Email: admin@test.com
    - Password: admin123

  2. Security
    - This is for development/testing only
    - In production, use strong passwords and proper authentication flows
*/

-- Create admin user directly in auth.users
-- Note: In Supabase, we cannot directly insert into auth.users via SQL
-- We need to use the admin API or do it via the dashboard

-- Instead, let's create a SQL function that can be called to reset a user's password
CREATE OR REPLACE FUNCTION reset_user_password_admin_only(
  user_email text,
  new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  user_id uuid;
  encrypted_password text;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only admins can reset passwords'
    );
  END IF;

  -- Get user ID
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;

  IF user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Hash the password using crypt
  encrypted_password := crypt(new_password, gen_salt('bf'));

  -- Update the user's password
  UPDATE auth.users
  SET 
    encrypted_password = encrypted_password,
    updated_at = now()
  WHERE id = user_id;

  -- Log the action
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    notes
  )
  VALUES (
    auth.uid(),
    'reset_password',
    'user',
    user_id,
    'Password reset for user: ' || user_email
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password reset successfully',
    'user_email', user_email
  );
END;
$$;

-- For now, let's provide instructions to reset password via Supabase Dashboard
-- Or create a simple test user

-- Check if pgcrypto extension exists (needed for password hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
