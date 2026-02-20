# Database Seeding Scripts

Scripts untuk populate database Supabase dengan sample data untuk testing.

## 🚀 Cara Menggunakan

### Option 1: Menggunakan Node.js (Recommended)

```bash
# Jalankan script
node scripts/seed-database.js
```

### Option 2: Menggunakan TypeScript (jika punya tsx)

```bash
# Install tsx jika belum ada
npm install -g tsx

# Jalankan script
npx tsx scripts/seed-database.ts
```

## 📦 Yang Akan Dibuat

Script ini akan otomatis membuat:

### 1. **3 User Accounts**
   - `john.doe@example.com` / `password123` (Regular User)
   - `jane.smith@example.com` / `password123` (Regular User)
   - `admin@example.com` / `admin123` (Admin User dengan balance Rp 5,000,000)

### 2. **Orders**
   - Buy orders (completed & pending)
   - Sell orders (completed & pending)
   - Total: 4-6 sample orders

### 3. **Portfolios**
   - Otomatis dibuat untuk completed buy orders
   - Menampilkan holdings user

### 4. **Notifications**
   - Welcome notification untuk setiap user
   - Trade notifications untuk orders
   - Price alert notifications

### 5. **Price Alerts**
   - Alert ketika harga naik 10%
   - Alert ketika harga turun 10%

## ⚙️ Konfigurasi

Script sudah dikonfigurasi dengan credentials Supabase Anda:
- URL: `https://rwmedqwzxtrmdgmzgzoo.supabase.co`
- Anon Key: Already configured

## 📝 Output Example

```
🌱 Starting database seeding...

📦 Fetching products...
✅ Found 8 products

👥 Creating sample users...
   Creating user: john.doe@example.com
   ✅ Created: john.doe@example.com
   Creating user: jane.smith@example.com
   ✅ Created: jane.smith@example.com
   Creating user: admin@example.com
   ✅ Created: admin@example.com
✅ Created 3 new users

👑 Setting admin role...
   ✅ Admin role set for admin@example.com

📋 Creating orders...
   ✅ Buy order: 100 kg RCHP
   ✅ Buy order: 50 kg RCHS (pending)
   ✅ Sell order: 75 kg RCHE
✅ Created 3 orders

💼 Creating portfolios...
   ✅ Portfolio: 100 kg RCHP
✅ Created 1 portfolios

🔔 Creating notifications...
✅ Created 3 notifications

⏰ Creating price alerts...
   ✅ Alert: RCHP above Rp 93,500
   ✅ Alert: RCHS above Rp 71,500
✅ Created 2 price alerts

🎉 Database seeding completed!

📊 Summary:
   Products: 8
   Users: 3
   Orders: 3
   Portfolios: 1
   Notifications: 3
   Price Alerts: 2

👤 Test Accounts:
   john.doe@example.com / password123 (User)
   jane.smith@example.com / password123 (User)
   admin@example.com / admin123 (Admin)

✅ Script completed!
```

## 🔄 Menjalankan Ulang

Jika user sudah ada, script akan:
- Skip pembuatan user yang sudah ada
- Menggunakan existing users untuk membuat orders baru
- Tetap membuat notifications dan price alerts baru

## ⚠️ Catatan Penting

1. **Email Confirmation**: Script ini akan langsung membuat user tanpa email confirmation (karena menggunakan Supabase auth)

2. **Duplicate Users**: Jika user sudah ada, script akan skip dan lanjut ke data berikutnya

3. **Balance**:
   - Regular users: Rp 1,000,000 (default dari trigger)
   - Admin user: Rp 5,000,000

4. **RLS Policies**: Semua data mengikuti RLS policies yang sudah ada

## 🧹 Clean Up (Jika Perlu)

Jika ingin menghapus semua sample data:

```sql
-- Jalankan di Supabase SQL Editor

-- Delete notifications
DELETE FROM notifications WHERE user_id IN (
  SELECT id FROM profiles WHERE full_name IN ('John Doe', 'Jane Smith', 'Admin User')
);

-- Delete price alerts
DELETE FROM price_alerts WHERE user_id IN (
  SELECT id FROM profiles WHERE full_name IN ('John Doe', 'Jane Smith', 'Admin User')
);

-- Delete portfolios
DELETE FROM portfolios WHERE user_id IN (
  SELECT id FROM profiles WHERE full_name IN ('John Doe', 'Jane Smith', 'Admin User')
);

-- Delete orders
DELETE FROM orders WHERE user_id IN (
  SELECT id FROM profiles WHERE full_name IN ('John Doe', 'Jane Smith', 'Admin User')
);

-- Delete profiles (ini akan trigger delete di auth.users)
DELETE FROM profiles WHERE full_name IN ('John Doe', 'Jane Smith', 'Admin User');
```

## 🐛 Troubleshooting

### Error: "User already registered"
**Solusi**: Script akan otomatis skip user yang sudah ada

### Error: "new row violates row-level security policy"
**Solusi**: Pastikan RLS policies sudah benar di Supabase Dashboard

### Error: "Could not set admin role"
**Solusi**: Ini warning saja, user tetap dibuat dengan role 'user'

### Script hang/tidak selesai
**Solusi**:
1. Pastikan internet connection stabil
2. Check Supabase Dashboard → Logs untuk error details
3. Jalankan ulang script

## 📚 Dokumentasi Lainnya

- `supabase/MIGRATION-GUIDE-ID.md` - Panduan lengkap migrasi
- `supabase/seed-data-examples.sql` - Contoh SQL manual
