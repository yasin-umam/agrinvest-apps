# Fix: Harvest Distribution Constraint Error

## Problem

Error saat mencatat harvest:
```
duplicate key value violates unique constraint
"user_harvest_distributions_user_id_product_id_created_at_key"
```

### Root Cause

**Old Constraint:** `UNIQUE (user_id, product_id, created_at)`

Masalah terjadi ketika:
- Admin input harvest untuk produk yang sama beberapa kali
- Harvest dilakukan dalam waktu sangat dekat (detik yang sama)
- `created_at` menggunakan `now()` yang bisa sama untuk beberapa record

**Scenario:**
1. Admin input harvest pertama untuk Product A → OK
2. Admin input harvest kedua untuk Product A (dalam 1 detik) → ERROR
3. Constraint mencegah karena kombinasi (user_id, product_id, created_at) sama

---

## Solution ✅

### New Constraint: `UNIQUE (user_id, harvest_id)`

Lebih logis karena:
- Setiap `harvest_id` adalah unique identifier untuk harvest event
- Setiap user hanya boleh punya 1 record per harvest
- User bisa menerima multiple harvests dari produk yang sama
- `harvest_id` adalah identifier yang tepat, bukan `created_at`

### Migration Applied

```sql
-- Drop old problematic constraint
ALTER TABLE user_harvest_distributions
DROP CONSTRAINT IF EXISTS user_harvest_distributions_user_id_product_id_created_at_key;

-- Add new logical constraint
ALTER TABLE user_harvest_distributions
ADD CONSTRAINT user_harvest_distributions_user_harvest_unique
UNIQUE (user_id, harvest_id);
```

**File:** `supabase/migrations/fix_harvest_distributions_constraint.sql`

---

## Impact

### Before Fix ❌
- Admin tidak bisa input harvest berturut-turut untuk produk yang sama
- Error muncul jika harvest dilakukan dalam timeframe yang dekat
- Workflow terganggu

### After Fix ✅
- Admin bisa input harvest kapan saja untuk produk yang sama
- Tidak ada error duplicate key
- Setiap harvest event tercatat dengan benar
- User tetap hanya dapat 1 dividen per harvest (logic correct)

---

## Testing Scenario

### Test Case: Multiple Harvests for Same Product

**Setup:**
- Product X dengan 1000 units
- User A memiliki 100 units (10%)

**Admin Actions:**
1. Input Harvest #1: 500 kg, Revenue Rp 5,000,000
2. Input Harvest #2: 800 kg, Revenue Rp 8,000,000 (immediately after)
3. Input Harvest #3: 600 kg, Revenue Rp 6,000,000 (same minute)

**Expected Results:**

| Harvest | User A Dividend | Total Balance |
|---------|----------------|---------------|
| #1      | Rp 500,000    | Rp 5,500,000 |
| #2      | Rp 800,000    | Rp 6,300,000 |
| #3      | Rp 600,000    | Rp 6,900,000 |

**Verification:**
- ✅ All harvests recorded successfully
- ✅ No duplicate key errors
- ✅ User receives correct dividend for each harvest
- ✅ Balance updated correctly
- ✅ Notifications sent for each harvest

---

## Database State

### Current Constraint

```sql
SELECT
  conname as constraint_name,
  pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
WHERE conrelid = 'user_harvest_distributions'::regclass
  AND contype = 'u';
```

**Result:**
```
constraint_name: user_harvest_distributions_user_harvest_unique
constraint_definition: UNIQUE (user_id, harvest_id)
```

---

## Key Points

1. **Old constraint was too strict** - prevented legitimate multiple harvests
2. **New constraint is logical** - one record per user per harvest
3. **harvest_id is the correct identifier** - not created_at timestamp
4. **No data loss** - existing records remain valid
5. **No breaking changes** - application code unchanged

---

## Related Files

- Migration: `supabase/migrations/fix_harvest_distributions_constraint.sql`
- Function: `distribute_harvest_dividend()` (no changes needed)
- Table: `user_harvest_distributions`

---

## Additional Fix: Admin Duplicate Issue

### Problem 2

After fixing the constraint, another error appeared:
```
duplicate key value violates unique constraint
"user_harvest_distributions_user_harvest_unique"
```

### Root Cause

Function `distribute_harvest_dividend()` inserted admin twice when:
1. Admin owns units through portfolio
2. There are also unsold units

**Scenario:**
```
Product A: 1000 units total
- User B owns: 300 units (via portfolio)
- Admin owns: 200 units (via portfolio)
- Unsold: 500 units

When harvest is recorded:
1. INSERT for User B → OK
2. INSERT for Admin (portfolio) → OK
3. INSERT for Admin (unsold units) → ERROR (duplicate!)
```

### Solution

Updated `distribute_harvest_dividend()` function to use `ON CONFLICT DO UPDATE`:

```sql
INSERT INTO user_harvest_distributions (...)
VALUES (v_admin_id, ...)
ON CONFLICT (user_id, harvest_id)
DO UPDATE SET
  units_owned = user_harvest_distributions.units_owned + EXCLUDED.units_owned,
  user_revenue = user_harvest_distributions.user_revenue + EXCLUDED.user_revenue,
  ownership_percentage = user_harvest_distributions.ownership_percentage + EXCLUDED.ownership_percentage;
```

**Behavior:**
- If admin already has record from portfolio: UPDATE (add unsold units)
- If admin has no record: INSERT new record

**File:** `supabase/migrations/fix_admin_duplicate_harvest_distribution.sql`

---

## Summary

**Two Fixes Applied:**

1. **Constraint Fix** - Changed from `UNIQUE (user_id, product_id, created_at)` to `UNIQUE (user_id, harvest_id)`
   - Allows multiple harvests for same product
   - Uses correct identifier (harvest_id)

2. **Function Fix** - Added `ON CONFLICT DO UPDATE` for admin's unsold units
   - Prevents duplicate when admin owns portfolio AND has unsold units
   - Combines both distributions into single record

**Result:**
- Admin can record harvests anytime without errors
- Admin with portfolio ownership handled correctly
- All users receive proper dividends
- No data loss or integrity issues

Sekarang admin bisa input harvest kapan saja tanpa error duplicate key!
