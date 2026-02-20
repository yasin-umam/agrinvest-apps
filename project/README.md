# Meetra Apps Trade - ChiliTrade

Platform trading komoditas agrikultur berbasis web dengan fokus pada perdagangan cabai di Indonesia.

## 🚀 Fitur

- **Autentikasi**: Login dan registrasi pengguna dengan Supabase Auth
- **Market**: Lihat harga real-time komoditas cabai
- **Portfolio**: Kelola kepemilikan komoditas Anda
- **Transaksi**: Riwayat pembelian dan penjualan lengkap
- **Notifikasi**: Update real-time untuk aktivitas trading
- **Admin Panel**: Kelola produk, user, dan transaksi (untuk admin)

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+
- npm atau yarn
- Akun Supabase (untuk database)

## 🔧 Setup & Installation

### 1. Clone repository

```bash
git clone git@github.com:yasin-umam/meetra-apps-trade.git
cd meetra-apps-trade
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Buat file `.env` di root project:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Catatan**: File `.env` sudah ada di repository untuk development. Untuk production, ganti dengan credentials Anda sendiri.

### 4. Jalankan Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

## 📦 Available Scripts

```bash
# Development
npm run dev          # Jalankan dev server

# Build
npm run build        # Build untuk production
npm run preview      # Preview production build

# Linting
npm run lint         # Check code quality

# Type Checking
npm run typecheck    # Check TypeScript types
```

## 🗄️ Database Setup

### Migrations

Database migrations tersedia di folder `supabase/migrations/`.

Migrations sudah include:
- Schema tables (products, portfolios, orders, notifications, profiles)
- Row Level Security (RLS) policies
- Sample data untuk testing

### Supabase Setup

1. Buat project baru di [Supabase](https://supabase.com)
2. Jalankan migrations yang ada di `supabase/migrations/`
3. Copy URL dan Anon Key ke file `.env`

## 👤 Test Accounts

Setelah menjalankan migrations, Anda bisa menggunakan test account:

**User Biasa:**
- Email: `user@example.com`
- Password: Buat account baru via registrasi

**Admin:**
- Email: `admin@example.com`
- Password: Buat account baru, lalu update role di database

## 📱 Fitur Utama

### 1. Market Page
- Lihat daftar produk cabai
- Filter berdasarkan kategori
- Search produk
- Trading langsung dari market

### 2. Portfolio Page
- Lihat kepemilikan Anda
- Track profit/loss
- Sell produk dari portfolio

### 3. Transactions Page
- Riwayat lengkap transaksi
- Filter by type (buy/sell)
- Detail setiap transaksi

### 4. Admin Panel
- User management
- Product management
- Transaction monitoring

## 🔐 Security

- Row Level Security (RLS) enabled di semua tables
- Authentication menggunakan Supabase Auth
- Environment variables untuk sensitive data
- No hardcoded credentials

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables di Vercel dashboard
```

### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

Jangan lupa set environment variables di dashboard hosting Anda.

## 📁 Project Structure

```
meetra-apps-trade/
├── src/
│   ├── components/       # React components
│   │   ├── admin/       # Admin components
│   │   ├── auth/        # Auth components
│   │   └── dashboard/   # Dashboard components
│   ├── contexts/        # React contexts
│   ├── lib/            # Utilities & configs
│   ├── pages/          # Page components
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── supabase/
│   └── migrations/     # Database migrations
├── scripts/           # Utility scripts
└── public/           # Static assets
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💻 Author

Yasin Umam

## 🐛 Known Issues

Tidak ada issues yang diketahui saat ini.

## 📞 Support

Jika ada pertanyaan atau masalah, silakan buat issue di GitHub repository.

---

**Made with ❤️ in Indonesia**
