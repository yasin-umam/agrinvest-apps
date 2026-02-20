# 🚀 Quick Start Guide - AgriTrade Platform

Panduan cepat untuk menjalankan dan testing platform trading agricultural products.

## ✅ Prerequisites

- Node.js 18+ installed
- Supabase account sudah terhubung

## 🎯 Setup dalam 3 Langkah

### 1. Install Dependencies

```bash
npm install
```

### 2. Seed Database dengan Sample Data

```bash
node scripts/seed-database.js
```

Script ini akan membuat:
- ✅ 3 user accounts (john, jane, admin)
- ✅ 2-4 sample orders
- ✅ Sample portfolios
- ✅ Notifications
- ✅ Price alerts

### 3. Jalankan Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

## 👤 Test Accounts

Gunakan akun berikut untuk login:

| Email | Password | Role | Balance |
|-------|----------|------|---------|
| `admin@example.com` | `admin123` | Admin | Rp 5,000,000 |
| `john.doe@example.com` | `password123` | User | Rp 1,000,000 |
| `jane.smith@example.com` | `password123` | User | Rp 1,000,000 |

## 🎨 Fitur yang Tersedia

### Regular Users
- ✅ View market prices & trends
- ✅ Buy & sell chili products
- ✅ View portfolio with P&L
- ✅ View transaction history
- ✅ Set price alerts
- ✅ Receive notifications
- ✅ Real-time price updates

### Admin Users
- ✅ All regular user features
- ✅ Product management (add/edit/delete)
- ✅ User management
- ✅ Transaction monitoring
- ✅ System-wide analytics

## 📊 Database Info

### Supabase Connection
- URL: `https://rwmedqwzxtrmdgmzgzoo.supabase.co`
- Environment: `.env` file sudah dikonfigurasi

### Current Data
- **8 Chili Products** - Ready to trade
- **224+ Market History** - 7 days historical data
- **6 Users** - Including admin accounts
- **26 Orders** - Mix of buy/sell, completed/pending
- **27 Notifications** - System & trade alerts
- **2 Price Alerts** - Active monitoring

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start dev server (auto-refresh)

# Production
npm run build            # Build for production
npm run preview          # Preview production build

# Database
node scripts/seed-database.js  # Seed sample data

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking
```

## 🔄 Re-seeding Database

Jika ingin menambah lebih banyak data:

```bash
# Jalankan script lagi (akan skip existing users)
node scripts/seed-database.js
```

Script akan:
- Skip users yang sudah ada
- Tambah orders baru
- Tambah notifications baru
- Tidak duplicate data yang sama

## 📁 Project Structure

```
project/
├── src/
│   ├── components/          # Reusable components
│   │   ├── admin/          # Admin-only components
│   │   ├── auth/           # Auth forms
│   │   └── dashboard/      # Dashboard components
│   ├── contexts/           # React contexts (Auth)
│   ├── lib/                # Utilities & Supabase client
│   ├── pages/              # Main pages
│   └── App.tsx             # Main app component
├── supabase/
│   ├── migrations/         # Database migrations (4 files)
│   ├── MIGRATION-GUIDE-ID.md  # Detailed migration guide
│   └── seed-data-examples.sql  # SQL examples
└── scripts/
    ├── seed-database.js    # Seeding script
    └── README.md           # Script documentation
```

## 🎯 Testing Flow

### 1. Login sebagai User
```
1. Go to http://localhost:5173
2. Login dengan john.doe@example.com / password123
3. View market prices
4. Create buy order untuk Red Chili Premium
5. Check portfolio
6. Set price alert
```

### 2. Login sebagai Admin
```
1. Logout
2. Login dengan admin@example.com / admin123
3. Access Admin panel
4. View all users
5. Monitor transactions
6. Add/edit products
```

## 🔍 Monitoring & Debugging

### Check Data di Supabase Dashboard
1. Go to https://supabase.com
2. Select your project
3. Go to Table Editor
4. View: `profiles`, `orders`, `portfolios`, `notifications`

### Check Logs
1. Supabase Dashboard → Logs
2. Browser Console (F12)
3. Network tab for API calls

## 🚨 Troubleshooting

### Script Error: "No products found"
**Solusi**: Products sudah ada (8 items), script akan tetap berjalan

### Login Error: "Invalid credentials"
**Solusi**:
- Pastikan email dan password benar
- Atau jalankan seed script lagi

### RLS Policy Error
**Solusi**:
- Script otomatis login sebagai admin
- Jika masih error, check Supabase Dashboard → Authentication

### Real-time tidak update
**Solusi**:
- Refresh browser
- Check internet connection
- Check Supabase Dashboard → Realtime (should be enabled)

## 📚 Next Steps

1. ✅ **Customize Products** - Edit di Admin panel
2. ✅ **Test Trading** - Create buy/sell orders
3. ✅ **Check Notifications** - Real-time alerts
4. ✅ **Monitor Portfolio** - View P&L
5. ✅ **Set Price Alerts** - Get notified on price changes

## 🆘 Need Help?

Dokumentasi lengkap:
- `supabase/MIGRATION-GUIDE-ID.md` - Database & migration guide
- `scripts/README.md` - Seeding script documentation
- `supabase/seed-data-examples.sql` - SQL examples

---

**Happy Trading! 🌶️📈**
