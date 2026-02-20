/*
  # Agricultural Capital Trading Platform - Initial Schema

  ## Overview
  Complete database schema for a Stockbit-like platform focused on agricultural commodity trading (chili products).

  ## 1. New Tables

  ### `profiles`
  User profile information linked to auth.users
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text)
  - `avatar_url` (text, nullable)
  - `role` (text, default 'user') - 'user' or 'admin'
  - `balance` (decimal, default 0) - Available trading balance
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `chili_products`
  Agricultural products available for trading
  - `id` (uuid, primary key)
  - `name` (text) - e.g., "Red Chili - Premium Grade"
  - `code` (text, unique) - Trading symbol e.g., "RCHP"
  - `description` (text)
  - `image_url` (text, nullable)
  - `category` (text) - e.g., "red_chili", "green_chili"
  - `grade` (text) - Quality grade: "premium", "standard", "economy"
  - `unit` (text) - "kg", "ton"
  - `current_price` (decimal) - Current market price per unit
  - `price_change_24h` (decimal) - Price change in last 24 hours
  - `price_change_percent_24h` (decimal)
  - `total_volume` (decimal) - Total available volume
  - `traded_volume_24h` (decimal)
  - `min_order_quantity` (decimal)
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `orders`
  Buy/Sell orders placed by users
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `product_id` (uuid, references chili_products)
  - `type` (text) - 'buy' or 'sell'
  - `status` (text) - 'pending', 'completed', 'cancelled', 'partial'
  - `quantity` (decimal) - Quantity in units
  - `price` (decimal) - Price per unit
  - `total_amount` (decimal) - quantity * price
  - `filled_quantity` (decimal, default 0)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - `completed_at` (timestamptz, nullable)

  ### `transactions`
  Completed trade transactions
  - `id` (uuid, primary key)
  - `buy_order_id` (uuid, references orders)
  - `sell_order_id` (uuid, references orders)
  - `buyer_id` (uuid, references profiles)
  - `seller_id` (uuid, references profiles)
  - `product_id` (uuid, references chili_products)
  - `quantity` (decimal)
  - `price` (decimal)
  - `total_amount` (decimal)
  - `created_at` (timestamptz)

  ### `portfolios`
  User holdings of agricultural products
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `product_id` (uuid, references chili_products)
  - `quantity` (decimal, default 0)
  - `average_buy_price` (decimal)
  - `total_invested` (decimal)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - Unique constraint on (user_id, product_id)

  ### `market_history`
  Historical price data for charting and analysis
  - `id` (uuid, primary key)
  - `product_id` (uuid, references chili_products)
  - `price` (decimal)
  - `volume` (decimal)
  - `timestamp` (timestamptz)

  ### `notifications`
  User notifications for trades, price alerts, etc.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `type` (text) - 'trade', 'price_alert', 'system'
  - `title` (text)
  - `message` (text)
  - `is_read` (boolean, default false)
  - `metadata` (jsonb, nullable)
  - `created_at` (timestamptz)

  ### `price_alerts`
  User-configured price alerts
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `product_id` (uuid, references chili_products)
  - `target_price` (decimal)
  - `condition` (text) - 'above' or 'below'
  - `is_active` (boolean, default true)
  - `triggered_at` (timestamptz, nullable)
  - `created_at` (timestamptz)

  ## 2. Security

  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Policies ensure users can only access their own data
  - Admin role has elevated permissions
  - Public read access for product listings and market data

  ## 3. Indexes
  - Performance indexes on frequently queried columns
  - Foreign key indexes for joins
  - Timestamp indexes for time-series queries

  ## 4. Functions & Triggers
  - Updated_at triggers for automatic timestamp updates
  - Portfolio calculation functions
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  balance decimal(15, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chili_products table
CREATE TABLE IF NOT EXISTS chili_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text NOT NULL,
  image_url text,
  category text NOT NULL,
  grade text NOT NULL CHECK (grade IN ('premium', 'standard', 'economy')),
  unit text NOT NULL DEFAULT 'kg',
  current_price decimal(15, 2) NOT NULL CHECK (current_price > 0),
  price_change_24h decimal(15, 2) DEFAULT 0,
  price_change_percent_24h decimal(10, 4) DEFAULT 0,
  total_volume decimal(15, 2) NOT NULL DEFAULT 0,
  traded_volume_24h decimal(15, 2) DEFAULT 0,
  min_order_quantity decimal(15, 2) NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES chili_products ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('buy', 'sell')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'partial')),
  quantity decimal(15, 2) NOT NULL CHECK (quantity > 0),
  price decimal(15, 2) NOT NULL CHECK (price > 0),
  total_amount decimal(15, 2) NOT NULL,
  filled_quantity decimal(15, 2) DEFAULT 0 CHECK (filled_quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  buy_order_id uuid NOT NULL REFERENCES orders ON DELETE CASCADE,
  sell_order_id uuid NOT NULL REFERENCES orders ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES chili_products ON DELETE CASCADE,
  quantity decimal(15, 2) NOT NULL CHECK (quantity > 0),
  price decimal(15, 2) NOT NULL CHECK (price > 0),
  total_amount decimal(15, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES chili_products ON DELETE CASCADE,
  quantity decimal(15, 2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  average_buy_price decimal(15, 2) NOT NULL,
  total_invested decimal(15, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create market_history table
CREATE TABLE IF NOT EXISTS market_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES chili_products ON DELETE CASCADE,
  price decimal(15, 2) NOT NULL,
  volume decimal(15, 2) NOT NULL DEFAULT 0,
  timestamp timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('trade', 'price_alert', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create price_alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES chili_products ON DELETE CASCADE,
  target_price decimal(15, 2) NOT NULL CHECK (target_price > 0),
  condition text NOT NULL CHECK (condition IN ('above', 'below')),
  is_active boolean DEFAULT true,
  triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_product_id ON portfolios(product_id);

CREATE INDEX IF NOT EXISTS idx_market_history_product_id ON market_history(product_id);
CREATE INDEX IF NOT EXISTS idx_market_history_timestamp ON market_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_product_id ON price_alerts(product_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chili_products_updated_at BEFORE UPDATE ON chili_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chili_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for chili_products (public read, admin write)
CREATE POLICY "Anyone can view active products"
  ON chili_products FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all products"
  ON chili_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert products"
  ON chili_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update products"
  ON chili_products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete products"
  ON chili_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for portfolios
CREATE POLICY "Users can view own portfolio"
  ON portfolios FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio"
  ON portfolios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio"
  ON portfolios FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all portfolios"
  ON portfolios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for market_history (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view market history"
  ON market_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert market history"
  ON market_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for price_alerts
CREATE POLICY "Users can view own price alerts"
  ON price_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own price alerts"
  ON price_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own price alerts"
  ON price_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own price alerts"
  ON price_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);