# API Usage: Dividend Distribution System

## Quick Start

### Endpoint
```
POST https://your-project.supabase.co/functions/v1/distribute-harvest
```

### Authentication
Requires admin JWT token in Authorization header.

---

## Frontend Integration Example

### React/TypeScript Implementation

```typescript
import { supabase } from './lib/supabase';

interface HarvestInput {
  product_id: string;
  harvest_kg: number;
  harvest_revenue: number;
}

interface DistributionResult {
  user_id: string;
  units: number;
  dividend: number;
  ownership: string;
}

interface HarvestResponse {
  success: boolean;
  message: string;
  data: {
    harvest_id: string;
    product_name: string;
    harvest_kg: number;
    total_revenue: number;
    revenue_per_unit: number;
    total_units: number;
    units_sold: number;
    admin_units: number;
    investors_count: number;
    distributions: DistributionResult[];
  };
}

/**
 * Distribute harvest dividend to all unit owners
 */
export async function distributeHarvestDividend(
  harvestData: HarvestInput
): Promise<HarvestResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/distribute-harvest`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(harvestData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to distribute harvest');
    }

    const result: HarvestResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Error distributing harvest:', error);
    throw error;
  }
}

/**
 * Get user's harvest distribution history
 */
export async function getUserHarvestHistory(userId: string) {
  const { data, error } = await supabase
    .from('user_harvest_distributions')
    .select(`
      *,
      chili_products (
        name,
        code
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get product harvest history
 */
export async function getProductHarvestHistory(productId: string) {
  const { data, error } = await supabase
    .from('harvest_revenue_history')
    .select('*')
    .eq('product_id', productId)
    .order('harvest_date', { ascending: false });

  if (error) throw error;
  return data;
}
```

---

## Component Example

### Admin Harvest Input Form

```typescript
import React, { useState } from 'react';
import { distributeHarvestDividend } from '../services/harvestService';

interface Product {
  id: string;
  name: string;
  total_units: number;
  available_units: number;
}

export function HarvestDistributionForm({ products }: { products: Product[] }) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [harvestKg, setHarvestKg] = useState('');
  const [harvestRevenue, setHarvestRevenue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await distributeHarvestDividend({
        product_id: selectedProduct,
        harvest_kg: parseFloat(harvestKg),
        harvest_revenue: parseFloat(harvestRevenue),
      });

      setResult(response.data);
      alert('Harvest dividend distributed successfully!');

      // Reset form
      setSelectedProduct('');
      setHarvestKg('');
      setHarvestRevenue('');
    } catch (err: any) {
      setError(err.message || 'Failed to distribute harvest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Distribusi Dividen Panen</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Pilih Produk
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            required
          >
            <option value="">-- Pilih Produk --</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (Total: {product.total_units} units)
              </option>
            ))}
          </select>
        </div>

        {/* Harvest Weight */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Berat Panen (kg)
          </label>
          <input
            type="number"
            value={harvestKg}
            onChange={(e) => setHarvestKg(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="1000"
            min="0"
            step="0.01"
            required
          />
        </div>

        {/* Revenue */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Total Revenue (Rp)
          </label>
          <input
            type="number"
            value={harvestRevenue}
            onChange={(e) => setHarvestRevenue(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="50000000"
            min="0"
            step="1000"
            required
          />
          {harvestRevenue && (
            <p className="text-sm text-gray-500 mt-1">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
              }).format(parseFloat(harvestRevenue))}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Distribusikan Dividen'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">
            Distribusi Berhasil!
          </h3>
          <div className="text-sm space-y-1">
            <p>Produk: <strong>{result.product_name}</strong></p>
            <p>Panen: <strong>{result.harvest_kg} kg</strong></p>
            <p>Total Revenue: <strong>Rp {result.total_revenue.toLocaleString('id-ID')}</strong></p>
            <p>Revenue per Unit: <strong>Rp {result.revenue_per_unit.toLocaleString('id-ID')}</strong></p>
            <p>Investor: <strong>{result.investors_count} orang</strong></p>
            <p>Unit Terjual: <strong>{result.units_sold}</strong></p>
            <p>Unit Admin: <strong>{result.admin_units}</strong></p>
          </div>

          {result.distributions && result.distributions.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Distribusi Detail:</h4>
              <div className="space-y-2">
                {result.distributions.map((dist: DistributionResult) => (
                  <div
                    key={dist.user_id}
                    className="flex justify-between items-center p-2 bg-white rounded"
                  >
                    <span className="text-xs text-gray-600">
                      {dist.units} units ({dist.ownership})
                    </span>
                    <span className="font-medium text-green-700">
                      Rp {dist.dividend.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## User Side: Harvest History Display

```typescript
import React, { useEffect, useState } from 'react';
import { getUserHarvestHistory } from '../services/harvestService';
import { useAuth } from '../contexts/AuthContext';

export function HarvestHistoryList() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const data = await getUserHarvestHistory(user!.id);
      setHistory(data);
    } catch (error) {
      console.error('Error loading harvest history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Belum ada riwayat dividen panen
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Riwayat Dividen Panen</h2>

      {history.map((item) => (
        <div
          key={item.id}
          className="p-4 bg-white rounded-lg shadow border"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold">
                {item.chili_products?.name}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(item.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">
                +Rp {item.user_revenue.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Unit Dimiliki</p>
              <p className="font-medium">{item.units_owned} units</p>
            </div>
            <div>
              <p className="text-gray-500">Kepemilikan</p>
              <p className="font-medium">
                {item.ownership_percentage.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-gray-500">Panen</p>
              <p className="font-medium">{item.harvest_kg} kg</p>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t text-xs text-gray-600">
            Revenue per unit: Rp {item.revenue_per_unit.toLocaleString('id-ID')}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Direct Database Queries (Alternative)

If you prefer direct database operations instead of using the Edge Function:

```typescript
/**
 * Direct insert to harvest_revenue_history
 * Trigger will automatically handle distribution
 */
export async function recordHarvest(data: HarvestInput) {
  const { data: harvest, error } = await supabase
    .from('harvest_revenue_history')
    .insert({
      product_id: data.product_id,
      harvest_kg: data.harvest_kg,
      harvest_revenue: data.harvest_revenue,
      harvest_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) throw error;

  // Trigger automatically distributes dividends
  // Wait a bit for trigger to complete
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Get distribution results
  const { data: distributions } = await supabase
    .from('user_harvest_distributions')
    .select('*')
    .eq('harvest_id', harvest.id);

  return {
    harvest,
    distributions,
  };
}
```

---

## Realtime Updates

Listen to notifications in real-time:

```typescript
import { useEffect } from 'react';
import { supabase } from './lib/supabase';

export function useHarvestNotifications(userId: string) {
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new;

          if (notification.metadata?.type === 'harvest_dividend') {
            // Show toast notification
            showToast({
              title: notification.title,
              message: notification.message,
              type: 'success',
            });

            // Play sound
            playNotificationSound();

            // Update balance display
            refreshBalance();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
```

---

## Testing

### Manual Test via curl

```bash
# Get your JWT token first
JWT_TOKEN="your-jwt-token-here"
SUPABASE_URL="https://your-project.supabase.co"

# Distribute harvest
curl -X POST \
  "${SUPABASE_URL}/functions/v1/distribute-harvest" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "fc1173a1-adb2-427b-9901-b3794280df6b",
    "harvest_kg": 1000,
    "harvest_revenue": 50000000
  }'
```

### Automated Test

```typescript
import { expect, test } from '@jest/globals';
import { distributeHarvestDividend } from './harvestService';

test('should distribute harvest dividend correctly', async () => {
  const result = await distributeHarvestDividend({
    product_id: 'test-product-id',
    harvest_kg: 1000,
    harvest_revenue: 10000000,
  });

  expect(result.success).toBe(true);
  expect(result.data.revenue_per_unit).toBe(10000);
  expect(result.data.distributions.length).toBeGreaterThan(0);
});
```

---

## Error Handling Best Practices

```typescript
export async function distributeHarvestWithRetry(
  harvestData: HarvestInput,
  maxRetries = 3
): Promise<HarvestResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await distributeHarvestDividend(harvestData);
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}
```

---

## Performance Tips

1. **Batch Operations**: Process multiple harvests if needed
2. **Caching**: Cache product data to reduce queries
3. **Indexing**: Ensure database indexes on frequently queried columns
4. **Connection Pooling**: Use Supabase connection pooling for better performance

---

## Monitoring Dashboard Queries

```sql
-- Total dividends distributed today
SELECT
  SUM(user_revenue) as total_distributed,
  COUNT(DISTINCT user_id) as investors_paid
FROM user_harvest_distributions
WHERE DATE(created_at) = CURRENT_DATE;

-- Top products by harvest revenue
SELECT
  p.name,
  COUNT(h.id) as harvest_count,
  SUM(h.harvest_revenue) as total_revenue
FROM harvest_revenue_history h
JOIN chili_products p ON p.id = h.product_id
GROUP BY p.id, p.name
ORDER BY total_revenue DESC
LIMIT 10;

-- User earnings from dividends
SELECT
  pr.full_name,
  COUNT(d.id) as dividend_count,
  SUM(d.user_revenue) as total_earned
FROM user_harvest_distributions d
JOIN profiles pr ON pr.id = d.user_id
GROUP BY pr.id, pr.full_name
ORDER BY total_earned DESC;
```

---

## Support

For issues or questions:
- Check logs in Supabase Dashboard
- Review trigger function execution
- Verify RLS policies
- Test with simple scenarios first

Happy harvesting!
