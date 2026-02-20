/*
  # Fix Missing Profile Auto-Creation Trigger
  
  1. Problem
    - Users can sign up but their profile is not automatically created
    - This causes the app to show blank screen because AuthContext times out waiting for profile
  
  2. Solution
    - Create trigger function to automatically create profile when user signs up
    - Set default balance to 0 and role to 'user'
    - Use full_name from auth metadata
  
  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only creates profile, doesn't modify existing ones
*/

-- Create function to handle new user
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

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create missing profiles for existing users
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
