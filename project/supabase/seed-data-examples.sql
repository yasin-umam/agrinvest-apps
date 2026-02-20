-- ============================================================================
-- CONTOH SQL UNTUK INSERT DATA SETELAH USER TERDAFTAR
-- ============================================================================
-- File ini berisi contoh query untuk memasukkan data sample setelah user
-- melakukan signup di aplikasi. Ganti 'user-uuid-here' dengan UUID asli
-- dari tabel profiles.
--
-- Cara mendapatkan user UUID:
-- SELECT id, full_name, email FROM auth.users;
-- atau
-- SELECT id, full_name FROM profiles;
-- ============================================================================

-- ============================================================================
-- 1. ORDERS (Sample Buy & Sell Orders)
-- ============================================================================
-- Pastikan untuk mengganti user_id dengan UUID user yang sebenarnya

-- Contoh: Dapatkan UUID user dan product terlebih dahulu
-- SELECT id, full_name FROM profiles LIMIT 3;
-- SELECT id, code, name FROM chili_products;

-- Insert Buy Orders
INSERT INTO orders (user_id, product_id, type, status, quantity, price, total_amount, filled_quantity, created_at, completed_at)
VALUES
  -- Ganti 'USER_UUID_1' dengan UUID user pertama
  -- Ganti 'PRODUCT_UUID_RCHP' dengan UUID produk RCHP
  (
    'USER_UUID_1',
    (SELECT id FROM chili_products WHERE code = 'RCHP'),
    'buy',
    'completed',
    100,
    85000,
    8500000,
    100,
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    'USER_UUID_1',
    (SELECT id FROM chili_products WHERE code = 'RCHS'),
    'buy',
    'pending',
    50,
    65000,
    3250000,
    0,
    now() - interval '3 hours',
    null
  );

-- Insert Sell Orders
INSERT INTO orders (user_id, product_id, type, status, quantity, price, total_amount, filled_quantity, created_at, completed_at)
VALUES
  (
    'USER_UUID_2',
    (SELECT id FROM chili_products WHERE code = 'GCHP'),
    'sell',
    'completed',
    75,
    72500,
    5437500,
    75,
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  (
    'USER_UUID_2',
    (SELECT id FROM chili_products WHERE code = 'BECP'),
    'sell',
    'pending',
    30,
    126000,
    3780000,
    0,
    now() - interval '2 hours',
    null
  );

-- ============================================================================
-- 2. TRANSACTIONS (Completed Trades)
-- ============================================================================
-- Transactions menghubungkan buyer dan seller orders

-- Cara membuat transaction:
-- 1. Pastikan ada buy order dan sell order yang matching
-- 2. Kedua order harus untuk product yang sama
-- 3. Status order harus 'completed'

INSERT INTO transactions (buy_order_id, sell_order_id, buyer_id, seller_id, product_id, quantity, price, total_amount, created_at)
VALUES
  (
    'BUY_ORDER_UUID_1',  -- UUID dari buy order
    'SELL_ORDER_UUID_1', -- UUID dari sell order
    'BUYER_USER_UUID',   -- UUID buyer
    'SELLER_USER_UUID',  -- UUID seller
    (SELECT id FROM chili_products WHERE code = 'RCHP'), -- Product ID
    100,                 -- Quantity yang ditransaksikan
    85000,               -- Price per unit
    8500000,             -- Total amount
    now() - interval '2 days'
  );

-- ============================================================================
-- 3. PORTFOLIOS (User Holdings)
-- ============================================================================
-- Portfolio menunjukkan kepemilikan user terhadap produk

INSERT INTO portfolios (user_id, product_id, quantity, average_buy_price, total_invested, created_at)
VALUES
  -- User 1 portfolio
  (
    'USER_UUID_1',
    (SELECT id FROM chili_products WHERE code = 'RCHP'),
    100,      -- Quantity yang dimiliki
    85000,    -- Average buy price
    8500000,  -- Total invested
    now() - interval '2 days'
  ),
  (
    'USER_UUID_1',
    (SELECT id FROM chili_products WHERE code = 'RCHS'),
    200,
    65000,
    13000000,
    now() - interval '3 days'
  ),

  -- User 2 portfolio
  (
    'USER_UUID_2',
    (SELECT id FROM chili_products WHERE code = 'GCHP'),
    150,
    71500,
    10725000,
    now() - interval '5 days'
  );

-- ============================================================================
-- 4. NOTIFICATIONS (User Alerts)
-- ============================================================================

INSERT INTO notifications (user_id, type, title, message, is_read, metadata, created_at)
VALUES
  -- Trade notifications
  (
    'USER_UUID_1',
    'trade',
    'Order Completed',
    'Your buy order for 100 kg of Red Chili Premium has been completed at Rp 85,000/kg',
    false,
    jsonb_build_object(
      'order_id', 'ORDER_UUID_1',
      'product_code', 'RCHP',
      'quantity', 100,
      'price', 85000
    ),
    now() - interval '2 days'
  ),

  -- Price alert notifications
  (
    'USER_UUID_1',
    'price_alert',
    'Price Alert Triggered',
    'Red Chili Premium has reached your target price of Rp 85,000/kg',
    false,
    jsonb_build_object(
      'product_code', 'RCHP',
      'target_price', 85000,
      'current_price', 85000
    ),
    now() - interval '1 day'
  ),

  -- System notifications
  (
    'USER_UUID_1',
    'system',
    'Welcome to AgriTrade',
    'Welcome to the Agricultural Capital Trading Platform. Your account has been verified with a starting balance of Rp 1,000,000',
    true,
    jsonb_build_object('balance', 1000000),
    now() - interval '7 days'
  ),

  (
    'USER_UUID_2',
    'system',
    'Market Update',
    'Trading volume today reached 1,500 kg across all products',
    false,
    jsonb_build_object('total_volume', 1500, 'date', current_date),
    now() - interval '12 hours'
  );

-- ============================================================================
-- 5. PRICE ALERTS (User Price Monitoring)
-- ============================================================================

INSERT INTO price_alerts (user_id, product_id, target_price, condition, is_active, created_at)
VALUES
  -- Alert ketika harga di atas target
  (
    'USER_UUID_1',
    (SELECT id FROM chili_products WHERE code = 'RCHP'),
    90000,
    'above',
    true,
    now() - interval '5 days'
  ),

  -- Alert ketika harga di bawah target
  (
    'USER_UUID_1',
    (SELECT id FROM chili_products WHERE code = 'RCHP'),
    80000,
    'below',
    true,
    now() - interval '5 days'
  ),

  (
    'USER_UUID_2',
    (SELECT id FROM chili_products WHERE code = 'GCHP'),
    75000,
    'above',
    true,
    now() - interval '3 days'
  ),

  (
    'USER_UUID_2',
    (SELECT id FROM chili_products WHERE code = 'BECP'),
    120000,
    'below',
    false,  -- Tidak aktif
    now() - interval '2 days'
  );

-- ============================================================================
-- HELPER QUERIES - Query untuk membantu development
-- ============================================================================

-- Query 1: Lihat semua user yang terdaftar
-- SELECT id, full_name, email, role, balance FROM profiles;

-- Query 2: Lihat semua produk
-- SELECT id, code, name, current_price, category, grade FROM chili_products;

-- Query 3: Lihat orders dari user tertentu
-- SELECT o.*, p.name, p.code
-- FROM orders o
-- JOIN chili_products p ON o.product_id = p.id
-- WHERE o.user_id = 'USER_UUID_HERE'
-- ORDER BY o.created_at DESC;

-- Query 4: Lihat portfolio user tertentu dengan P&L
-- SELECT
--   p.code,
--   p.name,
--   pf.quantity,
--   pf.average_buy_price,
--   p.current_price,
--   (p.current_price - pf.average_buy_price) * pf.quantity as unrealized_pnl,
--   ((p.current_price - pf.average_buy_price) / pf.average_buy_price * 100) as pnl_percentage
-- FROM portfolios pf
-- JOIN chili_products p ON pf.product_id = p.id
-- WHERE pf.user_id = 'USER_UUID_HERE' AND pf.quantity > 0;

-- Query 5: Lihat market statistics
-- SELECT * FROM market_statistics;

-- Query 6: Lihat trending products
-- SELECT * FROM get_trending_products(5);

-- Query 7: Hitung total portfolio value user
-- SELECT get_portfolio_value('USER_UUID_HERE');

-- Query 8: Lihat notifikasi user yang belum dibaca
-- SELECT * FROM notifications
-- WHERE user_id = 'USER_UUID_HERE' AND is_read = false
-- ORDER BY created_at DESC;

-- Query 9: Lihat price alerts yang aktif
-- SELECT pa.*, p.code, p.name, p.current_price
-- FROM price_alerts pa
-- JOIN chili_products p ON pa.product_id = p.id
-- WHERE pa.user_id = 'USER_UUID_HERE' AND pa.is_active = true;

-- Query 10: Lihat transaction history user
-- SELECT
--   t.*,
--   p.code,
--   p.name,
--   CASE
--     WHEN t.buyer_id = 'USER_UUID_HERE' THEN 'BUY'
--     ELSE 'SELL'
--   END as transaction_type
-- FROM transactions t
-- JOIN chili_products p ON t.product_id = p.id
-- WHERE t.buyer_id = 'USER_UUID_HERE' OR t.seller_id = 'USER_UUID_HERE'
-- ORDER BY t.created_at DESC;

-- ============================================================================
-- CONTOH LENGKAP: Insert data untuk 1 user yang baru signup
-- ============================================================================
/*
-- Misalkan user baru signup dengan:
-- Email: john@example.com
-- Password: (di-handle oleh Supabase Auth)
-- Profile akan otomatis dibuat oleh trigger

-- Step 1: Dapatkan UUID user
DO $$
DECLARE
  v_user_id uuid;
  v_rchp_id uuid;
  v_rchs_id uuid;
  v_order1_id uuid;
  v_order2_id uuid;
BEGIN
  -- Ambil user ID (ganti dengan actual user ID)
  SELECT id INTO v_user_id FROM profiles WHERE full_name = 'John Doe' LIMIT 1;

  -- Ambil product IDs
  SELECT id INTO v_rchp_id FROM chili_products WHERE code = 'RCHP';
  SELECT id INTO v_rchs_id FROM chili_products WHERE code = 'RCHS';

  -- Insert completed buy order
  INSERT INTO orders (user_id, product_id, type, status, quantity, price, total_amount, filled_quantity, created_at, completed_at)
  VALUES (v_user_id, v_rchp_id, 'buy', 'completed', 50, 85000, 4250000, 50, now() - interval '1 day', now() - interval '1 day')
  RETURNING id INTO v_order1_id;

  -- Insert portfolio untuk order yang completed
  INSERT INTO portfolios (user_id, product_id, quantity, average_buy_price, total_invested)
  VALUES (v_user_id, v_rchp_id, 50, 85000, 4250000);

  -- Update balance user (kurangi dari pembelian)
  UPDATE profiles
  SET balance = balance - 4250000
  WHERE id = v_user_id;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    v_user_id,
    'trade',
    'Order Completed',
    'Your buy order for 50 kg of Red Chili Premium has been completed',
    jsonb_build_object('order_id', v_order1_id, 'product_code', 'RCHP')
  );

  -- Insert price alert
  INSERT INTO price_alerts (user_id, product_id, target_price, condition, is_active)
  VALUES (v_user_id, v_rchp_id, 90000, 'above', true);

  RAISE NOTICE 'Sample data inserted for user %', v_user_id;
END $$;
*/
