# Region Management CRUD - Dokumentasi Lengkap

## Overview
Region Management memungkinkan admin untuk mengelola region/lokasi pertanian untuk produk chili dengan fitur CRUD (Create, Read, Update, Delete) lengkap.

## Struktur Database

### Tabel: `regions`
Tabel ini menyimpan informasi tentang region/lokasi pertanian.

#### Kolom-Kolom:
```sql
- id (UUID)                    : Primary key, auto-generated
- name (TEXT)                  : Nama region (required)
- code (TEXT)                  : Unique code untuk region (optional)
- description (TEXT)           : Deskripsi detail region
- image_url (TEXT)             : URL gambar/photo region
- category (TEXT)              : Kategori produk (e.g., red_chili)
- grade (TEXT)                 : Grade kualitas (premium, standard, economy)
- location (TEXT)              : Lokasi geografis
- harvest_status (TEXT)        : Status panen (planted, growing, ready, harvested)
- current_price (DECIMAL)      : Harga per unit saat ini
- price_change_percent_24h  : Perubahan harga 24 jam (%)
- total_volume (DECIMAL)       : Total volume produk
- area_size (DECIMAL)          : Ukuran lahan (m²)
- plant_population (INTEGER)   : Jumlah tanaman
- cost_per_plant (DECIMAL)     : Modal per tanaman (Rp)
- cost_per_area (DECIMAL)      : Modal total per area (Rp)
- selling_price_per_kg     : Harga jual per kg
- harvest_kg (DECIMAL)         : Total kg yang dipanen
- total_revenue (DECIMAL)      : Total revenue dari panen
- harvest_count (INTEGER)      : Jumlah kali panen
- is_active (BOOLEAN)          : Status aktif/inactive
- created_at (TIMESTAMPTZ)     : Timestamp pembuatan
- updated_at (TIMESTAMPTZ)     : Timestamp update terakhir
```

### SQL Migration

Sudah dijalankan dalam file: `20260314000000_create_regions_table.sql`

Untuk menjalankan manual:

```sql
-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  code text UNIQUE,
  location text,
  image_url text,
  grade text NOT NULL DEFAULT 'standard' CHECK (grade IN ('premium', 'standard', 'economy')),
  harvest_status text NOT NULL DEFAULT 'growing' CHECK (harvest_status IN ('planted', 'growing', 'ready', 'harvested')),
  category text,
  current_price decimal(15, 2) NOT NULL DEFAULT 0,
  price_change_percent_24h decimal(10, 4) DEFAULT 0,
  total_volume decimal(15, 2) DEFAULT 0,
  area_size decimal(15, 2) DEFAULT 0,
  plant_population integer DEFAULT 0,
  cost_per_plant decimal(15, 2) DEFAULT 0,
  cost_per_area decimal(15, 2) DEFAULT 0,
  selling_price_per_kg decimal(15, 2) DEFAULT 0,
  harvest_kg decimal(15, 2) DEFAULT 0,
  total_revenue decimal(15, 2) DEFAULT 0,
  harvest_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexing untuk performance
CREATE INDEX IF NOT EXISTS idx_regions_is_active ON regions(is_active);
CREATE INDEX IF NOT EXISTS idx_regions_category ON regions(category);
CREATE INDEX IF NOT EXISTS idx_regions_harvest_status ON regions(harvest_status);
CREATE INDEX IF NOT EXISTS idx_regions_created_at ON regions(created_at DESC);

-- Trigger untuk auto-update timestamp
CREATE TRIGGER IF NOT EXISTS update_regions_updated_at BEFORE UPDATE ON regions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## RLS (Row Level Security) Policies

### Public Read
- Semua user dapat membaca regions yang `is_active = true`

### Admin-Only
- Hanya admin yang dapat:
  - Melihat semua regions (termasuk yang tidak aktif)
  - Membuat region baru (INSERT)
  - Mengupdate region (UPDATE)
  - Menghapus region (DELETE)

## Seed Data Sample

```sql
INSERT INTO regions (name, code, description, category, grade, location, harvest_status, current_price, total_volume, area_size, plant_population, cost_per_plant, cost_per_area)
VALUES
  ('Bandung Premium Farm', 'BPF', 'Premium chili farm di daerah Bandung', 'red_chili', 'premium', 'Bandung, Jawa Barat', 'growing', 85000, 5000, 1000, 2500, 5000, 12500000),
  ('Medan Standard Farm', 'MSF', 'Chili farming area di Medan dengan hasil standard', 'red_chili', 'standard', 'Medan, Sumatera Utara', 'ready', 65000, 8000, 1500, 4000, 4000, 16000000),
  ('Yogyakarta Economy', 'YEF', 'Chili farm ekonomis di Yogyakarta untuk bulk production', 'red_chili', 'economy', 'Yogyakarta, DIY', 'growing', 45000, 12000, 2000, 6000, 3000, 18000000),
  ('Bogor Green Chili', 'BGC', 'Green chili specialty farm dari Bogor', 'green_chili', 'premium', 'Bogor, Jawa Barat', 'harvested', 72000, 3500, 700, 1750, 6000, 10500000);
```

## API Operations

### 1. CREATE (Insert New Region)
```typescript
const { error } = await supabase
  .from('regions')
  .insert({
    name: 'Farm Name',
    code: 'FARM_CODE',
    description: 'Farm description',
    category: 'red_chili',
    grade: 'premium',
    location: 'City, Province',
    harvest_status: 'growing',
    current_price: 85000,
    total_volume: 5000,
    area_size: 1000,
    plant_population: 2500,
    cost_per_plant: 5000,
    cost_per_area: 12500000
  });
```

### 2. READ (Get All Regions)
```typescript
const { data, error } = await supabase
  .from('regions')
  .select('*')
  .order('created_at', { ascending: false });
```

### 3. READ (Get Single Region)
```typescript
const { data, error } = await supabase
  .from('regions')
  .select('*')
  .eq('id', region_id)
  .single();
```

### 4. UPDATE (Update Region)
```typescript
const { error } = await supabase
  .from('regions')
  .update({
    name: 'Updated Name',
    harvest_status: 'ready',
    total_volume: 6000,
    current_price: 90000
  })
  .eq('id', region_id);
```

### 5. DELETE (Delete Region)
```typescript
const { error } = await supabase
  .from('regions')
  .delete()
  .eq('id', region_id);
```

### 6. TOGGLE ACTIVE STATUS
```typescript
const { error } = await supabase
  .from('regions')
  .update({ is_active: !current_is_active })
  .eq('id', region_id);
```

## UI Component Usage

File komponen: `src/components/admin/RegionManagement.tsx`

### Import di Admin Page
```tsx
import { RegionManagement } from '../admin/RegionManagement';

// Dalam JSX
<RegionManagement />
```

### Features
1. **List Regions**: Tabel dengan kolom Name, Location, Category, Status, Area, Harvest Status
2. **Add Region**: Form untuk menambah region baru dengan:
   - Validasi input format (integer, decimal, currency)
   - Image upload dengan compression
   - Auto-calculation cost_per_area (plant_population × cost_per_plant)
   
3. **Edit Region**: Bisa mengedit semua field kecuali code
4. **Delete Region**: Dengan confirmation dialog
5. **Toggle Active**: Untuk mengaktifkan/nonaktifkan region
6. **Realtime Updates**: Subscribe ke perubahan regions dari database

## Image Upload
- Max size: 5MB
- Format: PNG, JPG, WebP
- Compressed: Auto-resize max width 800px, quality 80%
- Storage bucket: `product-images`
- Path: `regions/{filename}`

## Currency Formatting
- Input akan auto-format menggunakan locale 'id-ID'
- Display: Rp 1.234.567 (dengan separator titik)
- Storage: Disimpan sebagai plain integer (tanpa separator)

## Notes & Best Practices
1. **Code field**: Harus unique, tidak bisa diubah setelah dibuat (disabled saat edit)
2. **Name field**: Required, harus diisi
3. **Grade**: Hanya 3 pilihan - economy, standard, premium
4. **Harvest Status**: 4 pilihan - planted, growing, ready, harvested
5. **Cost Calculation**: cost_per_area dihitung otomatis dari plant_population × cost_per_plant
6. **Active Status**: Region yang inactive tetap tersimpan tapi tidak ditampilkan ke user umum
7. **Realtime**: Perubahan di device lain langsung terrefresh tanpa hard reload

## Error Handling
- File terlalu besar: "File too large. Maximum 5MB."
- Failed insert: Menampilkan error message dari Supabase
- Failed upload: Alert jika image upload gagal
- Network error: Tertangani dengan try-catch

## Validation Rules
- Plant Population: Hanya integer positif
- Area Size: Decimal positif
- Cost Per Plant: Integer positif
- Current Price: Integer positif
- Total Volume: Decimal positif

---
**Last Updated**: 14 Mar 2026
**Status**: Production Ready
