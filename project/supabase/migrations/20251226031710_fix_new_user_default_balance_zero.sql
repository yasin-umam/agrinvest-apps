/*
  # Fix Default Balance for New Users

  ## Changes
  - Update `handle_new_user()` function to set default balance to 0
  - New users will start with 0 balance
  - Balance only increases when top-up is approved by admin

  ## Security
  - Maintains existing RLS policies
  - Balance can only be updated through approved top-up transactions
*/

-- Update the handle_new_user function to set balance to 0
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    'user',
    0  -- Default balance is now 0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;