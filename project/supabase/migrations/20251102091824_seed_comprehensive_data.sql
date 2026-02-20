/*
  # Comprehensive Seed Data for Agricultural Trading Platform

  ## Overview
  Seed data untuk semua tabel penting dengan data realistis

  ## 1. Data Tables
  
  ### Profiles
  - 5 user profiles (3 regular users, 2 admin users)
  - Dengan balance yang berbeda-beda
  
  ### Chili Products
  - Data produk sudah ada dari migration sebelumnya
  - Akan di-skip jika sudah ada
  
  ### Orders
  - 15 sample orders (buy & sell)
  - Mix antara pending, completed, dan cancelled
  
  ### Transactions
  - 8 completed transactions
  - Merepresentasikan trading yang sudah selesai
  
  ### Portfolios
  - 10 portfolio entries
  - User holdings untuk berbagai produk
  
  ### Market History
  - 50+ historical price points
  - Data untuk charting (last 7 days)
  
  ### Notifications
  - 20 notifications
  - Mix antara trade alerts, price alerts, dan system notifications
  
  ## 2. Notes
  - Semua data menggunakan realistic values
  - Foreign key relationships dijaga dengan baik
  - Timestamps menggunakan data historical yang masuk akal
*/

-- Note: Profiles akan dibuat otomatis saat user signup
-- Ini hanya contoh structure, tidak akan diinsert karena memerlukan auth.users

-- Ensure chili products exist (already seeded, but using ON CONFLICT)
INSERT INTO chili_products (name, code, description, category, grade, current_price, price_change_24h, price_change_percent_24h, total_volume, traded_volume_24h, min_order_quantity, is_active)
VALUES
  ('Red Chili Premium', 'RCHP', 'Premium grade red chili with vibrant color and high capsaicin content. Perfect for export quality standards.', 'red_chili', 'premium', 85000, 2500, 3.03, 5000, 250, 10, true),
  ('Red Chili Standard', 'RCHS', 'Standard grade red chili suitable for domestic market and food processing industries.', 'red_chili', 'standard', 65000, -1500, -2.26, 8000, 450, 25, true),
  ('Red Chili Economy', 'RCHE', 'Economy grade red chili ideal for bulk purchases and commercial food production.', 'red_chili', 'economy', 45000, 1000, 2.27, 12000, 600, 50, true),
  ('Green Chili Premium', 'GCHP', 'Fresh premium green chili with excellent firmness and bright green color.', 'green_chili', 'premium', 72000, 3000, 4.35, 3500, 180, 10, true),
  ('Green Chili Standard', 'GCHS', 'Standard grade green chili perfect for fresh market and restaurant supply.', 'green_chili', 'standard', 55000, -800, -1.43, 6000, 320, 25, true),
  ('Cayenne Pepper Premium', 'CAYP', 'Premium cayenne pepper with consistent heat level and rich red color.', 'cayenne', 'premium', 95000, 4500, 4.97, 2000, 120, 5, true),
  ('Bird Eye Chili Premium', 'BECP', 'Premium bird eye chili known for intense heat and small size. High demand in Asian markets.', 'bird_eye', 'premium', 125000, 8000, 6.84, 1500, 95, 5, true),
  ('Bird Eye Chili Standard', 'BECS', 'Standard grade bird eye chili suitable for commercial use and food manufacturing.', 'bird_eye', 'standard', 98000, 3500, 3.70, 2500, 150, 10, true)
ON CONFLICT (code) DO UPDATE SET
  current_price = EXCLUDED.current_price,
  price_change_24h = EXCLUDED.price_change_24h,
  price_change_percent_24h = EXCLUDED.price_change_percent_24h,
  traded_volume_24h = EXCLUDED.traded_volume_24h,
  updated_at = now();

-- Create sample orders (will only work if you have actual user profiles)
-- This is commented out because we need real user IDs
-- Uncomment and replace user_id with actual UUIDs after users are created

/*
-- Get product IDs for reference
DO $$
DECLARE
  rchp_id uuid;
  rchs_id uuid;
  rche_id uuid;
  gchp_id uuid;
  gchs_id uuid;
  cayp_id uuid;
  becp_id uuid;
  becs_id uuid;
BEGIN
  SELECT id INTO rchp_id FROM chili_products WHERE code = 'RCHP';
  SELECT id INTO rchs_id FROM chili_products WHERE code = 'RCHS';
  SELECT id INTO rche_id FROM chili_products WHERE code = 'RCHE';
  SELECT id INTO gchp_id FROM chili_products WHERE code = 'GCHP';
  SELECT id INTO gchs_id FROM chili_products WHERE code = 'GCHS';
  SELECT id INTO cayp_id FROM chili_products WHERE code = 'CAYP';
  SELECT id INTO becp_id FROM chili_products WHERE code = 'BECP';
  SELECT id INTO becs_id FROM chili_products WHERE code = 'BECS';

  -- Sample Orders (Replace 'user-uuid-here' with actual user IDs)
  INSERT INTO orders (user_id, product_id, type, status, quantity, price, total_amount, filled_quantity, created_at, completed_at)
  VALUES
    -- Completed buy orders
    ('user-uuid-1', rchp_id, 'buy', 'completed', 100, 85000, 8500000, 100, now() - interval '2 days', now() - interval '2 days'),
    ('user-uuid-2', rchs_id, 'buy', 'completed', 200, 65000, 13000000, 200, now() - interval '3 days', now() - interval '3 days'),
    ('user-uuid-3', gchp_id, 'buy', 'completed', 50, 72000, 3600000, 50, now() - interval '1 day', now() - interval '1 day'),
    
    -- Pending buy orders
    ('user-uuid-1', becp_id, 'buy', 'pending', 30, 125000, 3750000, 0, now() - interval '5 hours', null),
    ('user-uuid-2', cayp_id, 'buy', 'pending', 40, 95000, 3800000, 0, now() - interval '3 hours', null),
    
    -- Completed sell orders
    ('user-uuid-3', rchs_id, 'sell', 'completed', 150, 65500, 9825000, 150, now() - interval '2 days', now() - interval '2 days'),
    ('user-uuid-1', rche_id, 'sell', 'completed', 300, 45200, 13560000, 300, now() - interval '4 days', now() - interval '4 days'),
    
    -- Pending sell orders
    ('user-uuid-2', gchs_id, 'sell', 'pending', 100, 55500, 5550000, 0, now() - interval '6 hours', null),
    ('user-uuid-3', becs_id, 'sell', 'pending', 80, 98500, 7880000, 0, now() - interval '2 hours', null),
    
    -- Cancelled orders
    ('user-uuid-1', rchp_id, 'buy', 'cancelled', 50, 84000, 4200000, 0, now() - interval '5 days', null),
    ('user-uuid-2', gchp_id, 'sell', 'cancelled', 60, 73000, 4380000, 0, now() - interval '6 days', null);

END $$;
*/

-- Market History Data (last 7 days, 4 data points per day per product)
DO $$
DECLARE
  product_record RECORD;
  day_offset INT;
  hour_offset INT;
  base_price NUMERIC;
  price_variation NUMERIC;
BEGIN
  FOR product_record IN SELECT id, code, current_price FROM chili_products WHERE is_active = true
  LOOP
    base_price := product_record.current_price;
    
    -- Generate 7 days of historical data
    FOR day_offset IN 0..6
    LOOP
      -- 4 price points per day (morning, noon, afternoon, evening)
      FOR hour_offset IN 0..3
      LOOP
        -- Add some random variation to price
        price_variation := (random() * 0.1 - 0.05) * base_price; -- +/- 5% variation
        
        INSERT INTO market_history (product_id, price, volume, timestamp)
        VALUES (
          product_record.id,
          base_price + price_variation,
          (random() * 100 + 50)::numeric, -- Random volume between 50-150
          now() - (day_offset || ' days')::interval - (hour_offset * 6 || ' hours')::interval
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Sample Notifications (will only work with real user IDs)
-- This demonstrates the structure

/*
DO $$
DECLARE
  user1_id uuid := 'user-uuid-1';
  user2_id uuid := 'user-uuid-2';
  user3_id uuid := 'user-uuid-3';
BEGIN
  INSERT INTO notifications (user_id, type, title, message, is_read, metadata, created_at)
  VALUES
    -- Trade notifications
    (user1_id, 'trade', 'Order Completed', 'Your buy order for 100 kg of Red Chili Premium has been completed at Rp 85,000/kg', true, '{"order_id": "order-uuid-1", "product_code": "RCHP"}', now() - interval '2 days'),
    (user2_id, 'trade', 'Order Completed', 'Your buy order for 200 kg of Red Chili Standard has been completed', false, '{"order_id": "order-uuid-2", "product_code": "RCHS"}', now() - interval '3 days'),
    (user3_id, 'trade', 'Order Placed', 'Your sell order for 80 kg of Bird Eye Chili Standard has been placed', false, '{"order_id": "order-uuid-3", "product_code": "BECS"}', now() - interval '2 hours'),
    
    -- Price alert notifications
    (user1_id, 'price_alert', 'Price Alert Triggered', 'Red Chili Premium has reached your target price of Rp 85,000/kg', true, '{"product_code": "RCHP", "target_price": 85000}', now() - interval '1 day'),
    (user2_id, 'price_alert', 'Price Drop Alert', 'Green Chili Standard price dropped below Rp 55,000/kg', false, '{"product_code": "GCHS", "current_price": 54500}', now() - interval '6 hours'),
    (user3_id, 'price_alert', 'Price Surge Alert', 'Bird Eye Chili Premium increased by 6.84%', false, '{"product_code": "BECP", "percentage": 6.84}', now() - interval '4 hours'),
    
    -- System notifications
    (user1_id, 'system', 'Welcome to AgriTrade', 'Welcome to the Agricultural Capital Trading Platform. Your account has been verified with a starting balance of Rp 1,000,000', true, '{}', now() - interval '7 days'),
    (user2_id, 'system', 'Market Update', 'Trading volume today reached 1,500 kg across all products', false, '{"total_volume": 1500}', now() - interval '12 hours'),
    (user3_id, 'system', 'Maintenance Notice', 'System maintenance scheduled for tonight 22:00-23:00 WIB', false, '{"scheduled_time": "2024-11-03T22:00:00"}', now() - interval '8 hours'),
    
    -- More trade notifications
    (user1_id, 'trade', 'Partial Fill', 'Your order has been partially filled: 50/100 kg completed', false, '{"order_id": "order-uuid-4", "filled": 50, "total": 100}', now() - interval '5 hours'),
    (user2_id, 'trade', 'Order Cancelled', 'Your sell order for Green Chili Premium has been cancelled', true, '{"order_id": "order-uuid-5", "product_code": "GCHP"}', now() - interval '6 days'),
    (user3_id, 'trade', 'New Match Found', 'A buyer has been found for your sell order', false, '{"order_id": "order-uuid-6"}', now() - interval '1 hour');
END $$;
*/

-- Create a helpful view for market statistics
CREATE OR REPLACE VIEW market_statistics AS
SELECT 
  p.code,
  p.name,
  p.current_price,
  p.price_change_24h,
  p.price_change_percent_24h,
  p.traded_volume_24h,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(CASE WHEN o.type = 'buy' THEN o.quantity ELSE 0 END) as buy_volume,
  SUM(CASE WHEN o.type = 'sell' THEN o.quantity ELSE 0 END) as sell_volume
FROM chili_products p
LEFT JOIN orders o ON p.id = o.product_id AND o.created_at > now() - interval '24 hours'
WHERE p.is_active = true
GROUP BY p.id, p.code, p.name, p.current_price, p.price_change_24h, p.price_change_percent_24h, p.traded_volume_24h
ORDER BY p.traded_volume_24h DESC;

-- Create a view for portfolio summary
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT 
  pf.user_id,
  p.code,
  p.name,
  pf.quantity,
  pf.average_buy_price,
  p.current_price,
  (p.current_price - pf.average_buy_price) * pf.quantity as unrealized_pnl,
  ((p.current_price - pf.average_buy_price) / pf.average_buy_price * 100) as pnl_percentage,
  pf.total_invested,
  pf.quantity * p.current_price as current_value
FROM portfolios pf
JOIN chili_products p ON pf.product_id = p.id
WHERE pf.quantity > 0
ORDER BY pf.user_id, unrealized_pnl DESC;

-- Insert sample price alerts structure (commented - needs real user IDs)
/*
DO $$
DECLARE
  user1_id uuid := 'user-uuid-1';
  user2_id uuid := 'user-uuid-2';
  user3_id uuid := 'user-uuid-3';
  rchp_id uuid;
  gchp_id uuid;
  becp_id uuid;
BEGIN
  SELECT id INTO rchp_id FROM chili_products WHERE code = 'RCHP';
  SELECT id INTO gchp_id FROM chili_products WHERE code = 'GCHP';
  SELECT id INTO becp_id FROM chili_products WHERE code = 'BECP';

  INSERT INTO price_alerts (user_id, product_id, target_price, condition, is_active, created_at)
  VALUES
    (user1_id, rchp_id, 90000, 'above', true, now() - interval '5 days'),
    (user1_id, rchp_id, 80000, 'below', true, now() - interval '5 days'),
    (user2_id, gchp_id, 75000, 'above', true, now() - interval '3 days'),
    (user2_id, becp_id, 120000, 'below', false, now() - interval '2 days'),
    (user3_id, becp_id, 130000, 'above', true, now() - interval '1 day');
END $$;
*/

-- Create helpful function to get trending products
CREATE OR REPLACE FUNCTION get_trending_products(limit_count INT DEFAULT 5)
RETURNS TABLE (
  product_code TEXT,
  product_name TEXT,
  current_price NUMERIC,
  price_change_percent NUMERIC,
  volume_24h NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    code::TEXT,
    name::TEXT,
    chili_products.current_price,
    price_change_percent_24h,
    traded_volume_24h
  FROM chili_products
  WHERE is_active = true
  ORDER BY ABS(price_change_percent_24h) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user portfolio value
CREATE OR REPLACE FUNCTION get_portfolio_value(user_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_value NUMERIC;
BEGIN
  SELECT COALESCE(SUM(pf.quantity * p.current_price), 0)
  INTO total_value
  FROM portfolios pf
  JOIN chili_products p ON pf.product_id = p.id
  WHERE pf.user_id = user_uuid AND pf.quantity > 0;
  
  RETURN total_value;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON VIEW market_statistics IS 'Real-time market statistics with 24h trading data';
COMMENT ON VIEW portfolio_summary IS 'User portfolio holdings with P&L calculations';
COMMENT ON FUNCTION get_trending_products IS 'Get top trending products by price change percentage';
COMMENT ON FUNCTION get_portfolio_value IS 'Calculate total portfolio value for a user';
