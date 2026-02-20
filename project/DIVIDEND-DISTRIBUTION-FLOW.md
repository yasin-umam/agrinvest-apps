# Sistem Distribusi Dividen Panen Berbasis Unit (Saham)

## Overview

Sistem ini mendistribusikan hasil panen (revenue) kepada pemilik unit secara proporsional berdasarkan jumlah unit yang dimiliki, mirip dengan sistem dividen saham.

---

## Alur Backend Lengkap

### 1. Input Total Hasil Panen

**Endpoint:** `POST /functions/v1/distribute-harvest`

**Request Body:**
```json
{
  "product_id": "uuid",
  "harvest_kg": 1000,
  "harvest_revenue": 50000000
}
```

**Validasi:**
- User harus admin
- Product harus ada
- harvest_kg dan harvest_revenue harus > 0

---

### 2. Ambil Data Total Unit dan Pemilik Unit

**Query 1: Get Product Data**
```sql
SELECT id, name, total_units, available_units
FROM chili_products
WHERE id = product_id;
```

**Query 2: Get Unit Owners**
```sql
SELECT user_id, quantity
FROM portfolios
WHERE product_id = product_id;
```

**Data yang didapat:**
- `total_units`: Total saham yang diterbitkan (contoh: 1000 units)
- `available_units`: Unit belum terjual (milik admin)
- `portfolios`: Daftar investor dan jumlah unit mereka

---

### 3. Hitung Dividen Per Unit

**Formula:**
```
revenue_per_unit = total_revenue / total_units
```

**Contoh:**
```
Total Revenue: Rp 10,000,000
Total Units: 1,000
Revenue per Unit = Rp 10,000,000 / 1,000 = Rp 10,000
```

**Hitung unit terjual dan tidak terjual:**
```
units_sold = SUM(portfolio.quantity)
admin_units = total_units - units_sold
```

---

### 4. Distribusikan Dividen

**Automatic Distribution (via Database Trigger)**

Ketika harvest record di-insert ke `harvest_revenue_history`, trigger otomatis jalan:

```sql
-- Update balance setiap pemilik unit
UPDATE profiles
SET balance = balance + (portfolio.quantity * revenue_per_unit)
FROM portfolios
WHERE portfolios.product_id = product_id
  AND portfolios.user_id = profiles.id;
```

**Contoh Distribusi:**
- User A (100 units) → Rp 100 x 10,000 = Rp 1,000,000
- User B (50 units) → Rp 50 x 10,000 = Rp 500,000
- Admin (850 units) → Rp 850 x 10,000 = Rp 8,500,000

---

### 5. Update Balance di Database

Balance setiap user otomatis di-update melalui trigger:

```sql
profiles.balance = profiles.balance + dividend_amount
```

**Balance Before:**
- User A: Rp 500,000
- User B: Rp 200,000

**Balance After:**
- User A: Rp 500,000 + Rp 1,000,000 = Rp 1,500,000
- User B: Rp 200,000 + Rp 500,000 = Rp 700,000

---

### 6. Simpan Riwayat Distribusi Dividen

**Table: `user_harvest_distributions`**

Setiap distribusi dicatat dengan detail lengkap:

```sql
INSERT INTO user_harvest_distributions (
  user_id,
  product_id,
  harvest_id,
  units_owned,
  revenue_per_unit,
  user_revenue,
  harvest_kg,
  ownership_percentage
)
```

**Contoh Record:**
```
{
  "user_id": "user-a-uuid",
  "product_id": "product-uuid",
  "harvest_id": "harvest-uuid",
  "units_owned": 100,
  "revenue_per_unit": 10000,
  "user_revenue": 1000000,
  "harvest_kg": 1000,
  "ownership_percentage": 10.00
}
```

**Kegunaan History:**
- Audit trail lengkap
- Tracking dividen per user
- Laporan keuangan
- Transparency untuk investor

---

### 7. Kirim Notifikasi ke Pemilik Unit

**Automatic Notification (via Trigger)**

Setiap pemilik unit langsung dapat notifikasi:

```sql
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  metadata
)
```

**Contoh Notifikasi:**

**User:**
```
Title: "Dividen Panen Diterima"
Message: "Anda menerima dividen sebesar Rp 1,000,000 dari panen Cabai Merah Premium.
          Unit yang dimiliki: 100 (10.00%)"
```

**Admin:**
```
Title: "Dividen Panen Diterima (Admin)"
Message: "Anda menerima dividen dari unit yang belum terjual sebesar Rp 8,500,000
          dari panen Cabai Merah Premium. Unit: 850 (85.00%)"
```

**Metadata (JSON):**
```json
{
  "type": "harvest_dividend",
  "product_id": "uuid",
  "product_name": "Cabai Merah Premium",
  "harvest_id": "uuid",
  "units_owned": 100,
  "dividend_amount": 1000000,
  "ownership_percentage": 10.00,
  "harvest_kg": 1000,
  "total_revenue": 10000000
}
```

---

## Flowchart Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN INPUT PANEN                         │
│                                                              │
│  POST /functions/v1/distribute-harvest                       │
│  {                                                           │
│    product_id: "uuid",                                       │
│    harvest_kg: 1000,                                         │
│    harvest_revenue: 10000000                                 │
│  }                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              VALIDASI & AUTENTIKASI                          │
│                                                              │
│  ✓ Cek user adalah admin                                     │
│  ✓ Cek product exists                                        │
│  ✓ Validasi input data                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           AMBIL DATA DARI DATABASE                           │
│                                                              │
│  1. Get product data:                                        │
│     - total_units: 1000                                      │
│     - available_units: 850                                   │
│                                                              │
│  2. Get portfolios:                                          │
│     - User A: 100 units                                      │
│     - User B: 50 units                                       │
│     Total sold: 150 units                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              HITUNG DIVIDEN PER UNIT                         │
│                                                              │
│  revenue_per_unit = total_revenue / total_units              │
│  10,000,000 / 1,000 = 10,000                                 │
│                                                              │
│  admin_units = 1000 - 150 = 850                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         INSERT HARVEST RECORD (TRIGGER START)                │
│                                                              │
│  INSERT INTO harvest_revenue_history                         │
│  → Auto trigger: distribute_harvest_dividend()               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          DISTRIBUSI DIVIDEN KE SEMUA PEMILIK                 │
│                                                              │
│  FOR EACH portfolio:                                         │
│    dividend = units_owned × revenue_per_unit                 │
│                                                              │
│  User A: 100 × 10,000 = 1,000,000                            │
│  User B: 50 × 10,000 = 500,000                               │
│  Admin: 850 × 10,000 = 8,500,000                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│             UPDATE BALANCE PEMILIK                           │
│                                                              │
│  UPDATE profiles                                             │
│  SET balance = balance + dividend                            │
│                                                              │
│  User A: 500,000 → 1,500,000                                 │
│  User B: 200,000 → 700,000                                   │
│  Admin: 1,000,000 → 9,500,000                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          SIMPAN RIWAYAT DISTRIBUSI                           │
│                                                              │
│  INSERT INTO user_harvest_distributions                      │
│  → Record lengkap untuk setiap pemilik:                      │
│    - units_owned                                             │
│    - revenue_per_unit                                        │
│    - user_revenue                                            │
│    - ownership_percentage                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          KIRIM NOTIFIKASI KE SEMUA PEMILIK                   │
│                                                              │
│  FOR EACH unit owner:                                        │
│    INSERT INTO notifications                                 │
│                                                              │
│  Notifikasi berisi:                                          │
│  - Jumlah dividen diterima                                   │
│  - Nama produk                                               │
│  - Jumlah unit dimiliki                                      │
│  - Persentase kepemilikan                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  RETURN SUCCESS RESPONSE                     │
│                                                              │
│  {                                                           │
│    success: true,                                            │
│    harvest_id: "uuid",                                       │
│    revenue_per_unit: 10000,                                  │
│    investors_count: 2,                                       │
│    distributions: [...]                                      │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Diagram Sequence

```
Admin           API Endpoint         Database           Trigger         Notification
  │                  │                   │                 │                 │
  │  POST /harvest   │                   │                 │                 │
  ├─────────────────>│                   │                 │                 │
  │                  │                   │                 │                 │
  │                  │  Get Product      │                 │                 │
  │                  ├──────────────────>│                 │                 │
  │                  │<──────────────────┤                 │                 │
  │                  │                   │                 │                 │
  │                  │  Get Portfolios   │                 │                 │
  │                  ├──────────────────>│                 │                 │
  │                  │<──────────────────┤                 │                 │
  │                  │                   │                 │                 │
  │                  │  Calculate Dividend                 │                 │
  │                  │  per Unit         │                 │                 │
  │                  │                   │                 │                 │
  │                  │  INSERT harvest   │                 │                 │
  │                  ├──────────────────>│                 │                 │
  │                  │                   │  TRIGGER FIRE   │                 │
  │                  │                   ├────────────────>│                 │
  │                  │                   │                 │                 │
  │                  │                   │  UPDATE balances│                 │
  │                  │                   │<────────────────┤                 │
  │                  │                   │                 │                 │
  │                  │                   │  INSERT history │                 │
  │                  │                   │<────────────────┤                 │
  │                  │                   │                 │                 │
  │                  │                   │  INSERT notify  │                 │
  │                  │                   │<────────────────┤                 │
  │                  │                   │                 │                 │
  │                  │                   │                 │  Send to Users  │
  │                  │                   │                 ├────────────────>│
  │                  │<──────────────────┤                 │                 │
  │                  │                   │                 │                 │
  │  Success         │                   │                 │                 │
  │<─────────────────┤                   │                 │                 │
  │                  │                   │                 │                 │
```

---

## Contoh Penggunaan API

### Request

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/distribute-harvest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "fc1173a1-adb2-427b-9901-b3794280df6b",
    "harvest_kg": 1000,
    "harvest_revenue": 50000000
  }'
```

### Response

```json
{
  "success": true,
  "message": "Harvest dividend distributed successfully",
  "data": {
    "harvest_id": "abc123-uuid",
    "product_name": "Cabai Merah Premium",
    "harvest_kg": 1000,
    "total_revenue": 50000000,
    "revenue_per_unit": 50000,
    "total_units": 1000,
    "units_sold": 150,
    "admin_units": 850,
    "investors_count": 2,
    "distributions": [
      {
        "user_id": "user-a-uuid",
        "units": 100,
        "dividend": 5000000,
        "ownership": "10.00%"
      },
      {
        "user_id": "user-b-uuid",
        "units": 50,
        "dividend": 2500000,
        "ownership": "5.00%"
      }
    ]
  }
}
```

---

## Database Schema Terkait

### 1. chili_products
```sql
- id (uuid)
- name (text)
- total_units (integer)        -- Total saham diterbitkan
- available_units (integer)    -- Belum terjual (milik admin)
```

### 2. portfolios
```sql
- id (uuid)
- user_id (uuid)              -- Pemilik unit
- product_id (uuid)           -- Produk
- quantity (numeric)          -- Jumlah unit dimiliki
```

### 3. harvest_revenue_history
```sql
- id (uuid)
- product_id (uuid)
- harvest_kg (numeric)
- harvest_revenue (numeric)
- harvest_date (date)
```

### 4. user_harvest_distributions
```sql
- id (uuid)
- user_id (uuid)
- product_id (uuid)
- harvest_id (uuid)
- units_owned (numeric)
- revenue_per_unit (numeric)
- user_revenue (numeric)
- harvest_kg (numeric)
- ownership_percentage (numeric)
```

### 5. notifications
```sql
- id (uuid)
- user_id (uuid)
- type (text)                 -- 'system'
- title (text)
- message (text)
- metadata (jsonb)
- is_read (boolean)
```

---

## Keamanan & Best Practices

### 1. Authorization
- Hanya admin yang bisa input panen
- JWT verification di API endpoint
- Database-level RLS policies

### 2. Data Integrity
- Transaction safety via database trigger
- Atomic operations (all or nothing)
- Balance never goes negative

### 3. Audit Trail
- Semua distribusi tercatat di `user_harvest_distributions`
- Timestamp otomatis
- Immutable records

### 4. Real-time Updates
- Balance langsung update
- Notifikasi real-time
- History tracking lengkap

---

## Testing Scenario

### Test Case 1: Normal Distribution
```
Given:
  - Product: 1000 total units
  - Available: 850 units (admin)
  - Investor A: 100 units
  - Investor B: 50 units
  - Harvest: Rp 10,000,000

Expected:
  - Revenue per unit: Rp 10,000
  - User A gets: Rp 1,000,000
  - User B gets: Rp 500,000
  - Admin gets: Rp 8,500,000
  - All balances updated
  - 3 notifications sent
  - 3 distribution records created
```

### Test Case 2: No Investors (All Admin Units)
```
Given:
  - Product: 1000 total units
  - Available: 1000 units (all admin)
  - No investors
  - Harvest: Rp 10,000,000

Expected:
  - Revenue per unit: Rp 10,000
  - Admin gets: Rp 10,000,000
  - 1 notification sent
  - 1 distribution record created
```

### Test Case 3: All Units Sold
```
Given:
  - Product: 1000 total units
  - Available: 0 units
  - All units owned by investors
  - Harvest: Rp 10,000,000

Expected:
  - Revenue per unit: Rp 10,000
  - All revenue goes to investors
  - Admin gets: Rp 0
  - Multiple notifications
  - Multiple distribution records
```

---

## Error Handling

### 1. Product Not Found
```json
{
  "error": "Product not found",
  "status": 404
}
```

### 2. Unauthorized
```json
{
  "error": "Only admin can distribute harvest",
  "status": 403
}
```

### 3. Missing Fields
```json
{
  "error": "Missing required fields: product_id, harvest_kg, harvest_revenue",
  "status": 400
}
```

### 4. Database Error
```json
{
  "error": "Failed to record harvest",
  "details": "...",
  "status": 500
}
```

---

## Monitoring & Logs

Hal yang perlu di-monitor:
1. Total dividen terdistribusi per hari
2. Jumlah notifikasi terkirim
3. Error rate di trigger function
4. Balance consistency check
5. Distribution record completeness

---

## Summary

Sistem distribusi dividen ini:

✅ **Otomatis** - Trigger database langsung jalankan distribusi
✅ **Transparan** - Semua dicatat di history
✅ **Real-time** - Balance dan notifikasi langsung update
✅ **Aman** - Authorization dan RLS policies
✅ **Adil** - Proporsional berdasarkan unit ownership
✅ **Audit-able** - Complete trail untuk semua transaksi

Unit yang belum terjual tetap menghasilkan dividen untuk admin, memastikan tidak ada revenue yang hilang.
