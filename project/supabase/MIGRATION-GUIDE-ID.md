# Panduan Lengkap Migrasi Data ke Supabase

## 📋 Daftar Isi
1. [Status Migrasi Saat Ini](#status-migrasi-saat-ini)
2. [Data yang Sudah Ada](#data-yang-sudah-ada)
3. [Cara Insert Data Manual](#cara-insert-data-manual)
4. [Cara Insert Data via UI](#cara-insert-data-via-ui)
5. [Query Helper yang Berguna](#query-helper-yang-berguna)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Status Migrasi Saat Ini

### Database Schema
✅ **SUDAH LENGKAP** - Semua tabel sudah dibuat dengan struktur lengkap:

| Tabel | Status | Keterangan |
|-------|--------|------------|
| `profiles` | ✅ Aktif | Auto-create saat user signup |
| `chili_products` | ✅ Aktif + Data | 8 produk chili sudah ada |
| `orders` | ✅ Aktif | Siap menerima order |
| `transactions` | ✅ Aktif | Siap menerima transaksi |
| `portfolios` | ✅ Aktif | Siap menerima portfolio |
| `market_history` | ✅ Aktif + Data | 224+ data points historis |
| `notifications` | ✅ Aktif | Siap menerima notifikasi |
| `price_alerts` | ✅ Aktif | Siap menerima alert |

### Row Level Security (RLS)
✅ **SUDAH AKTIF** - Semua tabel sudah dilindungi dengan RLS policies

### Authentication
✅ **SUDAH TERINTEGRASI** - Supabase Auth sudah aktif dengan:
- Email/Password signup & login
- Auto-create profile saat signup
- Balance awal Rp 1.000.000 untuk user baru

### Real-time Subscriptions
✅ **SUDAH AKTIF** di 4 komponen:
- MarketPage (produk changes)
- NotificationsPage (notifikasi changes)
- Header (notifikasi changes)
- TransactionMonitoring (order changes)

---

## 📊 Data yang Sudah Ada

### 1. Chili Products (8 produk)
```
RCHP - Red Chili Premium      (Rp 85,000/kg)
RCHS - Red Chili Standard     (Rp 65,000/kg)
RCHE - Red Chili Economy      (Rp 45,000/kg)
GCHP - Green Chili Premium    (Rp 72,000/kg)
GCHS - Green Chili Standard   (Rp 55,000/kg)
CAYP - Cayenne Pepper Premium (Rp 95,000/kg)
BECP - Bird Eye Chili Premium (Rp 125,000/kg)
BECS - Bird Eye Chili Standard(Rp 98,000/kg)
```

### 2. Market History
✅ 224+ historical price points (7 hari terakhir, 4 data/hari/produk)

### 3. Views & Functions
✅ Sudah dibuat:
- `market_statistics` - Statistik pasar real-time
- `portfolio_summary` - Ringkasan portfolio dengan P&L
- `get_trending_products()` - Produk trending
- `get_portfolio_value(user_id)` - Total nilai portfolio user

---

## 🔧 Cara Insert Data Manual

### Cara 1: Via Supabase Dashboard

1. **Buka Supabase Dashboard**
   - Login ke https://supabase.com
   - Pilih project Anda
   - Klik "SQL Editor" di sidebar

2. **Jalankan Query**
   - Copy query dari file `seed-data-examples.sql`
   - Ganti `USER_UUID_HERE` dengan UUID user asli
   - Klik "Run" untuk execute

### Cara 2: Via Application Code

Setelah user signup, Anda bisa insert data via TypeScript:

```typescript
import { supabase } from './lib/supabase';

// 1. User baru signup - Profile otomatis dibuat
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      full_name: 'John Doe'
    }
  }
});

// 2. Insert buy order
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({
    user_id: authData.user.id,
    product_id: 'PRODUCT_UUID_HERE',
    type: 'buy',
    status: 'pending',
    quantity: 100,
    price: 85000,
    total_amount: 8500000
  })
  .select()
  .single();

// 3. Insert notification
await supabase
  .from('notifications')
  .insert({
    user_id: authData.user.id,
    type: 'trade',
    title: 'Order Placed',
    message: 'Your buy order has been placed successfully',
    metadata: { order_id: order.id }
  });

// 4. Insert price alert
await supabase
  .from('price_alerts')
  .insert({
    user_id: authData.user.id,
    product_id: 'PRODUCT_UUID_HERE',
    target_price: 90000,
    condition: 'above',
    is_active: true
  });
```

---

## 📝 Cara Insert Data via UI

### Step-by-step untuk Testing:

1. **Signup User Baru**
   ```
   - Buka aplikasi Anda
   - Klik "Register"
   - Isi email & password
   - Profile otomatis dibuat dengan balance Rp 1,000,000
   ```

2. **Dapatkan User UUID**
   ```sql
   -- Di Supabase SQL Editor
   SELECT id, full_name, email FROM auth.users;
   -- atau
   SELECT id, full_name, balance FROM profiles;
   ```

3. **Dapatkan Product UUID**
   ```sql
   SELECT id, code, name, current_price FROM chili_products;
   ```

4. **Insert Sample Order**
   ```sql
   -- Ganti USER_UUID dan PRODUCT_UUID dengan nilai asli
   INSERT INTO orders (user_id, product_id, type, status, quantity, price, total_amount)
   VALUES (
     'USER_UUID_HERE',
     'PRODUCT_UUID_HERE',
     'buy',
     'pending',
     50,
     85000,
     4250000
   );
   ```

5. **Insert Sample Portfolio (setelah order completed)**
   ```sql
   INSERT INTO portfolios (user_id, product_id, quantity, average_buy_price, total_invested)
   VALUES (
     'USER_UUID_HERE',
     'PRODUCT_UUID_HERE',
     50,
     85000,
     4250000
   );
   ```

6. **Insert Sample Notification**
   ```sql
   INSERT INTO notifications (user_id, type, title, message, metadata)
   VALUES (
     'USER_UUID_HERE',
     'trade',
     'Order Completed',
     'Your buy order for 50 kg has been completed',
     '{"order_id": "ORDER_UUID_HERE", "product_code": "RCHP"}'::jsonb
   );
   ```

---

## 🛠️ Query Helper yang Berguna

### 1. Cek Total User
```sql
SELECT COUNT(*) as total_users FROM profiles;
```

### 2. Cek Total Orders per User
```sql
SELECT
  p.full_name,
  COUNT(o.id) as total_orders,
  SUM(CASE WHEN o.type = 'buy' THEN 1 ELSE 0 END) as buy_orders,
  SUM(CASE WHEN o.type = 'sell' THEN 1 ELSE 0 END) as sell_orders
FROM profiles p
LEFT JOIN orders o ON p.id = o.user_id
GROUP BY p.id, p.full_name;
```

### 3. Cek Portfolio User dengan P&L
```sql
SELECT * FROM portfolio_summary WHERE user_id = 'USER_UUID_HERE';
```

### 4. Cek Market Statistics
```sql
SELECT * FROM market_statistics;
```

### 5. Cek Trending Products
```sql
SELECT * FROM get_trending_products(5);
```

### 6. Cek Total Portfolio Value
```sql
SELECT get_portfolio_value('USER_UUID_HERE');
```

### 7. Cek Notifications yang Belum Dibaca
```sql
SELECT * FROM notifications
WHERE user_id = 'USER_UUID_HERE' AND is_read = false
ORDER BY created_at DESC;
```

### 8. Cek Price Alerts Aktif
```sql
SELECT pa.*, p.code, p.name, p.current_price
FROM price_alerts pa
JOIN chili_products p ON pa.product_id = p.id
WHERE pa.user_id = 'USER_UUID_HERE' AND pa.is_active = true;
```

### 9. Cek Transaction History
```sql
SELECT
  t.*,
  p.code,
  p.name,
  buyer.full_name as buyer_name,
  seller.full_name as seller_name
FROM transactions t
JOIN chili_products p ON t.product_id = p.id
JOIN profiles buyer ON t.buyer_id = buyer.id
JOIN profiles seller ON t.seller_id = seller.id
WHERE t.buyer_id = 'USER_UUID_HERE' OR t.seller_id = 'USER_UUID_HERE'
ORDER BY t.created_at DESC;
```

### 10. Update User Balance
```sql
UPDATE profiles
SET balance = balance + 1000000  -- Tambah Rp 1,000,000
WHERE id = 'USER_UUID_HERE';
```

---

## 🔍 Troubleshooting

### Error: "new row violates row-level security policy"
**Penyebab:** User tidak punya akses untuk insert/update data
**Solusi:**
- Pastikan Anda login sebagai user yang benar
- Untuk testing, bisa temporary disable RLS:
  ```sql
  ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
  ```
- Jangan lupa enable lagi setelah testing!

### Error: "null value in column violates not-null constraint"
**Penyebab:** Ada kolom required yang tidak diisi
**Solusi:** Pastikan semua kolom NOT NULL terisi, contoh:
```sql
-- Yang benar
INSERT INTO orders (user_id, product_id, type, quantity, price, total_amount, ...)

-- Yang salah (missing required fields)
INSERT INTO orders (user_id, product_id, ...)
```

### Error: "duplicate key value violates unique constraint"
**Penyebab:** Mencoba insert data dengan kunci unik yang sudah ada
**Solusi:**
```sql
-- Gunakan ON CONFLICT untuk update instead of insert
INSERT INTO chili_products (code, name, ...)
VALUES ('RCHP', 'Red Chili Premium', ...)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  current_price = EXCLUDED.current_price;
```

### Market History tidak muncul
**Penyebab:** Data historical sudah lewat 7 hari
**Solusi:** Jalankan migration lagi atau insert manual:
```sql
-- Re-generate market history untuk hari ini
INSERT INTO market_history (product_id, price, volume, timestamp)
SELECT
  id,
  current_price + (random() * 0.1 - 0.05) * current_price,
  (random() * 100 + 50)::numeric,
  now() - (generate_series(0, 23) || ' hours')::interval
FROM chili_products
WHERE is_active = true;
```

### Real-time tidak update
**Penyebab:** Subscription channel belum di-setup
**Solusi:** Pastikan Anda sudah subscribe ke channel:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('table-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'table_name'
    }, (payload) => {
      console.log('Change received!', payload);
      // Refresh data
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## 📊 Contoh Skenario Lengkap

### Skenario: User beli 100kg Red Chili Premium

```sql
DO $$
DECLARE
  v_user_id uuid := 'USER_UUID_HERE';
  v_product_id uuid := (SELECT id FROM chili_products WHERE code = 'RCHP');
  v_order_id uuid;
  v_price numeric := 85000;
  v_quantity numeric := 100;
  v_total numeric := v_price * v_quantity;
BEGIN
  -- 1. Check balance
  IF (SELECT balance FROM profiles WHERE id = v_user_id) < v_total THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- 2. Create order
  INSERT INTO orders (user_id, product_id, type, status, quantity, price, total_amount, filled_quantity)
  VALUES (v_user_id, v_product_id, 'buy', 'completed', v_quantity, v_price, v_total, v_quantity)
  RETURNING id INTO v_order_id;

  -- 3. Update or create portfolio
  INSERT INTO portfolios (user_id, product_id, quantity, average_buy_price, total_invested)
  VALUES (v_user_id, v_product_id, v_quantity, v_price, v_total)
  ON CONFLICT (user_id, product_id) DO UPDATE SET
    quantity = portfolios.quantity + v_quantity,
    average_buy_price = (portfolios.total_invested + v_total) / (portfolios.quantity + v_quantity),
    total_invested = portfolios.total_invested + v_total;

  -- 4. Update user balance
  UPDATE profiles SET balance = balance - v_total WHERE id = v_user_id;

  -- 5. Create notification
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    v_user_id,
    'trade',
    'Order Completed',
    format('Your buy order for %s kg of Red Chili Premium has been completed at Rp %s/kg', v_quantity, v_price),
    jsonb_build_object('order_id', v_order_id, 'product_code', 'RCHP', 'quantity', v_quantity, 'price', v_price)
  );

  RAISE NOTICE 'Transaction completed successfully!';
END $$;
```

---

## 📞 Support

Jika Anda mengalami masalah, cek:
1. Supabase Dashboard → Logs
2. Browser Console untuk error messages
3. File `seed-data-examples.sql` untuk contoh query

**Happy Trading! 🌶️📈**
