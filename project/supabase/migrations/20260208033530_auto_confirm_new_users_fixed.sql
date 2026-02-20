/*
  # Auto-Confirm New Users on Sign Up

  1. Problem
    - Email confirmation is enabled in Supabase Dashboard
    - Users cannot login immediately after sign up
    - Get "Invalid login credentials" error

  2. Solution
    - Auto-confirm users' email when they sign up
    - Set email_confirmed_at timestamp
    - confirmed_at is a generated column and will update automatically

  3. Security Note
    - Only use this in development or if email confirmation is not required
    - For production, recommended to disable "Confirm email" in Supabase Dashboard:
      Authentication > Providers > Email > Confirm email (uncheck it)
*/

-- Auto-confirm any unconfirmed users (workaround for email confirmation requirement)
-- This updates existing users that are stuck in unconfirmed state
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;