/*
  # Create Admin Accounts Management System

  1. New Tables
    - `admin_accounts`
      - `id` (uuid, primary key)
      - `payment_method` (text) - gopay, dana, ovo, shopeepay
      - `account_number` (text) - nomor rekening
      - `account_name` (text) - nama pemilik rekening
      - `is_active` (boolean) - status aktif/tidak
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `admin_accounts` table
    - Admin can view and update accounts
    - Regular users can only view active accounts

  3. Initial Data
    - Seed with default admin accounts for all payment methods
*/

CREATE TABLE IF NOT EXISTS admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method text NOT NULL UNIQUE CHECK (payment_method IN ('gopay', 'dana', 'ovo', 'shopeepay')),
  account_number text NOT NULL,
  account_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active admin accounts"
  ON admin_accounts
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can update admin accounts"
  ON admin_accounts
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can insert admin accounts"
  ON admin_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION update_admin_account_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_accounts_timestamp
  BEFORE UPDATE ON admin_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_account_timestamp();

INSERT INTO admin_accounts (payment_method, account_number, account_name) VALUES
  ('gopay', '081234567890', 'ChiliTrade Indonesia'),
  ('dana', '081234567890', 'ChiliTrade Indonesia'),
  ('ovo', '081234567890', 'ChiliTrade Indonesia'),
  ('shopeepay', '081234567890', 'ChiliTrade Indonesia')
ON CONFLICT (payment_method) DO NOTHING;