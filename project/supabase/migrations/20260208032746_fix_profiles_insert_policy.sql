/*
  # Fix Profiles Insert Policy for New User Registration

  1. Problem
    - New users get 401 error when trying to create profile
    - No INSERT policy exists for profiles table
    - Trigger might not be working properly

  2. Solution
    - Recreate the handle_new_user trigger function with proper permissions
    - Add INSERT policy to allow new users to create their own profile
    - Ensure trigger is properly attached to auth.users

  3. Security
    - Users can only insert profile with their own user ID
    - Balance defaults to 0
    - Role defaults to 'user'
*/

-- Drop existing trigger and function to recreate cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate function with proper SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, balance, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    0,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add INSERT policy as fallback (in case trigger doesn't fire)
DROP POLICY IF EXISTS "Users can insert own profile during signup" ON profiles;

CREATE POLICY "Users can insert own profile during signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'user' AND balance = 0);

-- Ensure any existing auth users without profiles get them created
INSERT INTO public.profiles (id, full_name, balance, role)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
  0,
  'user'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;