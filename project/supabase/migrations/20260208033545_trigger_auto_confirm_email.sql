/*
  # Trigger to Auto-Confirm Email on User Sign Up

  1. Problem
    - Email confirmation is enabled in Supabase Dashboard
    - Users get "Invalid login credentials" error after sign up
    - Cannot login immediately after registration

  2. Solution
    - Create trigger that auto-confirms email for new users
    - Runs BEFORE INSERT so user is confirmed immediately
    - This allows users to login right after sign up

  3. How it Works
    - When new user signs up, trigger fires
    - Sets email_confirmed_at to current timestamp
    - User can login immediately without email confirmation
*/

-- Create function to auto-confirm email for new users
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-confirm the email for new users
  NEW.email_confirmed_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users that fires BEFORE insert
DROP TRIGGER IF EXISTS on_auth_user_email_confirm ON auth.users;

CREATE TRIGGER on_auth_user_email_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email();

-- Confirm any existing unconfirmed users
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;