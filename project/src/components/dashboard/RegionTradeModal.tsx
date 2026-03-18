import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Region interface matching the new schema
interface Region {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  image_url: string | null;
  company_count: number;
  total_company_value: number;
  current_price: number;
  price_change_percent_24h: number;
  total_volume: number;
  total_revenue: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  available_units: number;
  total_units: number;
  price_per_unit: number;
}

interface RegionTradeModalProps {
  region: Region;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegionTradeModal({ region, onClose, onSuccess }: RegionTradeModalProps) {
  const { profile, refreshProfile } = useAuth();
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalUnits = region.total_units || region.total_volume || 0;
  const pricePerUnit = region.price_per_unit || region.current_price || 0;
  const availableUnits = region.available_units || 0;

  const handleQuantityChange = (value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setQuantity(value);
    }
  };

  const totalAmount = parseFloat(quantity || '0') * pricePerUnit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile) return;

    const qty = parseInt(quantity);
    if (qty < 1 || isNaN(qty)) {
      setError('Jumlah harus minimal 1 unit');
      return;
    }

    if (qty > availableUnits) {
      setError(`Unit tidak mencukupi. Tersedia: ${availableUnits} unit`);
      return;
    }

    if (totalAmount > profile.balance) {
      setError('Saldo tidak mencukupi untuk transaksi ini');
      return;
    }

    setLoading(true);

    try {
      // Sesuaikan nama tabel tujuan transaksi region (misal: 'region_orders' atau tetap 'orders')
      const { error: orderError } = await supabase
        .from('orders') 
        .insert({
          user_id: profile.id,
          region_id: region.id, // Pastikan tabel orders punya kolom region_id
          order_type: 'buy',
          quantity: qty,
          price: pricePerUnit,
          total_amount: totalAmount,
          status: 'pending',
        } as any);

      if (orderError) throw orderError;

      await refreshProfile();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Investasi {region.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Harga Per Unit</span>
              <span className="font-semibold">Rp {pricePerUnit.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Unit</span>
              <span className="font-semibold text-gray-900">{totalUnits.toLocaleString('id-ID')} unit</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unit Tersedia</span>
              <span className="font-semibold text-blue-600">{availableUnits.toLocaleString('id-ID')} unit</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Saldo Anda</span>
              <span className="font-semibold">Rp {profile?.balance.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah Unit Investasi
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masukkan jumlah"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maksimal: {availableUnits.toLocaleString('id-ID')} unit
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Investasi</span>
              <span className="text-2xl font-bold text-gray-900">
                Rp {totalAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Memproses...' : 'Konfirmasi Investasi'}
          </button>
        </form>
      </div>
    </div>
  );
}