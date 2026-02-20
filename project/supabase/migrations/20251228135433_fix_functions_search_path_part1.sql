/*
  # Fix Function Search Path - Part 1: Core & Admin Functions
  
  ## Problem
  Functions have mutable search_path which is a security vulnerability.
  Attackers could manipulate search_path to hijack function behavior.
  
  ## Solution
  Add `SET search_path = public, pg_temp` to all functions.
  
  ## Changes
  Add immutable search_path to:
  - Core utility functions
  - Admin functions
  - Format functions
*/

-- Core utility functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION format_rupiah(amount NUMERIC)
RETURNS TEXT AS $$
BEGIN
  RETURN 'Rp ' || TO_CHAR(amount, 'FM999,999,999,999');
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp;

-- Admin functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

DROP FUNCTION IF EXISTS sync_admin_role_to_metadata(UUID, BOOLEAN);
CREATE FUNCTION sync_admin_role_to_metadata(target_user_id UUID, is_admin_value BOOLEAN)
RETURNS VOID AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('is_admin', is_admin_value)
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION trigger_sync_admin_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM sync_admin_role_to_metadata(NEW.id, NEW.role = 'admin');
    RAISE NOTICE 'Synced admin metadata for user %: is_admin=%', NEW.id, (NEW.role = 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION validate_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.balance IS DISTINCT FROM OLD.balance THEN
    RAISE EXCEPTION 'Users cannot update their own balance';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Users cannot update their own role';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- User creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role, balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'user',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
