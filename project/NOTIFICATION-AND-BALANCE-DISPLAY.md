# Notifikasi & Tampilan Saldo Dividen Harvest

## Status: COMPLETE ✅

Sistem notifikasi dan tampilan saldo harvest revenue sudah lengkap dengan semua informasi yang dibutuhkan user.

---

## 1. Notifikasi Dividen Panen

### Trigger Otomatis ✅

**Function:** `distribute_harvest_dividend()`
**Triggered On:** INSERT to `harvest_revenue_history`

Setiap kali admin input harvest, notifikasi otomatis dikirim ke SEMUA pemilik unit.

### Isi Notifikasi

**Title:** "Dividen Panen Diterima"

**Message:**
```
Anda menerima dividen sebesar Rp [JUMLAH] dari panen [PRODUCT NAME].
Unit yang dimiliki: [UNITS] ([PERCENTAGE]%)
```

**Metadata (JSON):**
```json
{
  "type": "harvest_dividend",
  "product_id": "uuid",
  "product_name": "Cabe Keriting",
  "harvest_id": "uuid",
  "units_owned": 50,
  "dividend_amount": 500000,
  "ownership_percentage": 5.0,
  "harvest_kg": 1000,
  "total_revenue": 10000000
}
```

### Tampilan di Notifications Page

**Visual Enhanced:**
- Icon emerald untuk harvest notification
- Card dengan gradient green-to-emerald
- Grid layout showing:
  - **Dividen Anda** (Bold, green, large)
  - **Unit Dimiliki** (dengan persentase)
  - **Total Panen** (kg)
  - **Total Revenue** (keseluruhan)
  - **Product Name** (italic)

**Screenshot:**
```
┌─────────────────────────────────────┐
│ 🔔 Dividen Panen Diterima          │
│                            2 Jan    │
├─────────────────────────────────────┤
│ Anda menerima dividen sebesar       │
│ Rp 500,000 dari panen Cabe         │
│ Keriting. Unit: 50 (5.0%)          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Dividen Anda    Unit Dimiliki   │ │
│ │ Rp 500,000     50 unit (5.0%)   │ │
│ │                                 │ │
│ │ Total Panen    Total Revenue    │ │
│ │ 1000 kg        Rp 10,000,000    │ │
│ │                                 │ │
│ │ Cabe Keriting                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [tandai sudah dibaca]              │
└─────────────────────────────────────┘
```

---

## 2. Tampilan Saldo di Account Page

### Section: Balance & Latest Harvest ✅

**Location:** Account Page - Top Section (after profile header)

**Background:** Gradient green-to-emerald with border

### Information Displayed:

#### A. Current Balance (Large)
```
Saldo Anda
Rp 10,500,000
```

#### B. Latest Dividend (with Percentage Increase) ⭐ NEW

**Title:** "Dividen Panen Terakhir"

**Main Display:**
```
+ Rp 500,000    [+5.00%]
                 ↑ Badge with percentage
```

**Balance Comparison:**
```
Saldo sebelumnya: Rp 10,000,000 → Saldo sekarang: Rp 10,500,000
```

**Detail Information (small text):**
- Unit Anda: **50**
- Per Unit: **Rp 10,000**
- Total Panen: **1000 kg**
- Date: **2 Januari 2025**

**Formula Display:**
```
Dividen dihitung: 50 unit × Rp 10,000
```

### Percentage Calculation Formula

```typescript
const previousBalance = currentBalance - dividendAmount;
const percentageIncrease = (dividendAmount / previousBalance) * 100;
```

**Example:**
- Current Balance: Rp 10,500,000
- Dividend: Rp 500,000
- Previous Balance: Rp 10,000,000
- Percentage: (500,000 / 10,000,000) × 100 = **5.00%**

### Visual Layout

```
┌────────────────────────────────────────────────┐
│  Balance & Latest Harvest                      │
│  ┌──────────────────────────────────────────┐  │
│  │ Saldo Anda                               │  │
│  │ Rp 10,500,000                           │  │
│  ├──────────────────────────────────────────┤  │
│  │ 📈 Dividen Panen Terakhir               │  │
│  │                                          │  │
│  │ + Rp 500,000  [+5.00%]                  │  │
│  │                                          │  │
│  │ Saldo sebelumnya: Rp 10,000,000 →       │  │
│  │ Saldo sekarang: Rp 10,500,000           │  │
│  │                                          │  │
│  │ Unit Anda: 50 | Per Unit: Rp 10,000     │  │
│  │ Total Panen: 1000 kg | 2 Januari 2025   │  │
│  │                                          │  │
│  │ Dividen dihitung: 50 unit × Rp 10,000   │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

## 3. Data Flow

### When Admin Inputs Harvest:

```
1. Admin → ProductManagement
   ↓
2. INSERT harvest_revenue_history
   ↓
3. Trigger: distribute_harvest_dividend()
   ↓
4. Calculate dividend per unit
   ↓
5. UPDATE all user balances
   ↓
6. INSERT user_harvest_distributions
   ↓
7. INSERT notifications (with metadata)
   ↓
8. User receives notification
   ↓
9. User sees updated balance in AccountPage
   ↓
10. User sees percentage increase
```

### User Experience Flow:

```
1. User receives notification bell
   ↓
2. Opens Notifications
   ↓
3. Sees detailed dividend info
   ↓
4. Goes to Account Page
   ↓
5. Sees updated balance
   ↓
6. Sees dividend amount + percentage increase
   ↓
7. Understands how much their balance grew
```

---

## 4. Implementation Details

### Files Modified:

1. **AccountPage.tsx** (Lines 342-395)
   - Added percentage calculation
   - Added balance comparison display
   - Enhanced dividend info section

2. **NotificationsPage.tsx** (Lines 149-227)
   - Added harvest notification styling
   - Added metadata parsing
   - Added detailed info grid
   - Enhanced visual design

3. **Database Function** (Already exists)
   - `distribute_harvest_dividend()`
   - Automatic notification creation

### Key Features:

1. **Real-time Balance Update** ✅
2. **Percentage Calculation** ✅
3. **Before/After Balance Display** ✅
4. **Detailed Notification** ✅
5. **Visual Metadata Card** ✅
6. **Responsive Design** ✅

---

## 5. Testing Checklist

### Test Scenario:

1. **Setup:**
   - User A has 100 units of Product X
   - User A balance: Rp 5,000,000

2. **Admin Action:**
   - Input harvest: 1000 kg
   - Revenue: Rp 10,000,000
   - Product total units: 1,000

3. **Expected Results:**

   **For User A:**
   - Revenue per unit: Rp 10,000
   - User dividend: 100 × 10,000 = Rp 1,000,000
   - New balance: Rp 6,000,000
   - Percentage increase: (1,000,000 / 5,000,000) × 100 = **20.00%**

4. **Verification:**

   **Notification:**
   - ✅ Title: "Dividen Panen Diterima"
   - ✅ Message shows Rp 1,000,000
   - ✅ Shows 100 units (10%)
   - ✅ Metadata complete

   **Account Page:**
   - ✅ Balance shows Rp 6,000,000
   - ✅ Dividend shows +Rp 1,000,000
   - ✅ Badge shows +20.00%
   - ✅ Previous balance: Rp 5,000,000
   - ✅ Current balance: Rp 6,000,000
   - ✅ All details correct

---

## 6. User Benefits

### Clear Visibility
- User tahu EXACTLY berapa dividen yang diterima
- User tahu berapa persen saldo mereka naik
- User tahu saldo sebelum dan sesudah

### Transparency
- Semua perhitungan ditampilkan
- Formula dividen jelas
- History lengkap

### Instant Notification
- User langsung tahu saat harvest
- Tidak perlu check manual
- Real-time update

### Beautiful Design
- Professional gradient colors
- Clear information hierarchy
- Easy to read and understand

---

## 7. Formula Reference

### Dividend Per Unit
```
revenue_per_unit = total_harvest_revenue / total_units
```

### User Dividend
```
user_dividend = user_units × revenue_per_unit
```

### Percentage Increase
```
previous_balance = current_balance - dividend_amount
percentage_increase = (dividend_amount / previous_balance) × 100
```

### Example:
```
Product: 1,000 total units
Revenue: Rp 10,000,000
Revenue per unit: Rp 10,000

User has 50 units:
  Dividend = 50 × 10,000 = Rp 500,000

User balance before: Rp 5,000,000
User balance after: Rp 5,500,000
Percentage: (500,000 / 5,000,000) × 100 = 10.00%
```

---

## Conclusion

Sistem notifikasi dan tampilan saldo harvest revenue sudah **COMPLETE** dengan fitur:

1. ✅ Notifikasi otomatis ke semua pemilik unit
2. ✅ Notifikasi dengan metadata lengkap
3. ✅ Visual card di notification page
4. ✅ Tampilan dividen di account page
5. ✅ Persentase kenaikan saldo
6. ✅ Comparison saldo sebelum/sesudah
7. ✅ Semua perhitungan transparan
8. ✅ Design professional dan responsive

User sekarang memiliki **FULL VISIBILITY** atas dividen harvest yang mereka terima!
