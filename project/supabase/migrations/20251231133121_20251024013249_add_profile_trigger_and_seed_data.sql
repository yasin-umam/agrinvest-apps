/*
  # Add Profile Creation Trigger and Seed Data

  ## 1. Functions
  - Create automatic profile creation trigger for new users

  ## 2. Seed Data
  - Add sample chili products for trading
  - Create profiles for existing users

  ## 3. Security
  - Grant necessary permissions for profile creation
*/

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    'user',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users (if they don't exist)
INSERT INTO public.profiles (id, full_name, role, balance)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'User'),
  'user',
  0
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id
);

-- Insert sample chili products
INSERT INTO chili_products (name, code, description, category, grade, current_price, price_change_24h, price_change_percent_24h, total_volume, traded_volume_24h, min_order_quantity, is_active, available_units, total_units)
VALUES
  ('Red Chili Premium', 'RCHP', 'Premium grade red chili with vibrant color and high capsaicin content. Perfect for export quality standards.', 'red_chili', 'premium', 85000, 2500, 3.03, 5000, 250, 10, true, 1000, 1000),
  ('Red Chili Standard', 'RCHS', 'Standard grade red chili suitable for domestic market and food processing industries.', 'red_chili', 'standard', 65000, -1500, -2.26, 8000, 450, 25, true, 1000, 1000),
  ('Red Chili Economy', 'RCHE', 'Economy grade red chili ideal for bulk purchases and commercial food production.', 'red_chili', 'economy', 45000, 1000, 2.27, 12000, 600, 50, true, 1000, 1000),
  ('Green Chili Premium', 'GCHP', 'Fresh premium green chili with excellent firmness and bright green color.', 'green_chili', 'premium', 72000, 3000, 4.35, 3500, 180, 10, true, 1000, 1000),
  ('Green Chili Standard', 'GCHS', 'Standard grade green chili perfect for fresh market and restaurant supply.', 'green_chili', 'standard', 55000, -800, -1.43, 6000, 320, 25, true, 1000, 1000),
  ('Cayenne Pepper Premium', 'CAYP', 'Premium cayenne pepper with consistent heat level and rich red color.', 'cayenne', 'premium', 95000, 4500, 4.97, 2000, 120, 5, true, 1000, 1000),
  ('Bird Eye Chili Premium', 'BECP', 'Premium bird eye chili known for intense heat and small size. High demand in Asian markets.', 'bird_eye', 'premium', 125000, 8000, 6.84, 1500, 95, 5, true, 1000, 1000),
  ('Bird Eye Chili Standard', 'BECS', 'Standard grade bird eye chili suitable for commercial use and food manufacturing.', 'bird_eye', 'standard', 98000, 3500, 3.70, 2500, 150, 10, true, 1000, 1000)
ON CONFLICT (code) DO NOTHING;

-- Add policy to allow profile insertion during signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can insert own profile during signup'
  ) THEN
    CREATE POLICY "Users can insert own profile during signup"
      ON profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;