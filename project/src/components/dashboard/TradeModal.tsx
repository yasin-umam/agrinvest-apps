import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type ChiliProduct = Database['public']['Tables']['chili_products']['Row'];

interface TradeModalProps {
  product: ChiliProduct;
  onClose: () => void;
  onSuccess: () => void;
}

export function TradeModal({ product, onClose, onSuccess }: TradeModalProps) {
  const { profile, refreshProfile } = useAuth();
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuantityChange = (value: string) => {
    // Only allow empty string or positive integers
    if (value === '' || /^\d+$/.test(value)) {
      setQuantity(value);
    }
  };

  const totalAmount = parseFloat(quantity || '0') * product.current_price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile) return;

    const qty = parseInt(quantity);
    if (qty < 1 || isNaN(qty)) {
      setError('Jumlah harus minimal 1 unit');
      return;
    }

    if (qty > product.available_units) {
      setError(`Stok tidak mencukupi. Tersedia: ${product.available_units} unit`);
      return;
    }

    if (totalAmount > profile.balance) {
      setError('Saldo tidak mencukupi untuk transaksi ini');
      return;
    }

    setLoading(true);

    try {
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: profile.id,
          product_id: product.id,
          order_type: 'buy',
          quantity: qty,
          price: product.current_price,
          total_amount: totalAmount,
          status: 'pending',
        });

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
          <h2 className="text-2xl font-bold text-gray-900">Trading {product.code}</h2>
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
              <span className="text-gray-600">Harga Saat Ini</span>
              <span className="font-semibold">Rp {product.current_price.toLocaleString('id-ID')}/unit</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unit Tersedia</span>
              <span className="font-semibold text-green-600">{product.available_units.toLocaleString('id-ID')} unit</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Saldo Anda</span>
              <span className="font-semibold">Rp {profile?.balance.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah (unit)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Masukkan jumlah"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maksimal: {product.available_units.toLocaleString('id-ID')} unit
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Pembayaran</span>
              <span className="text-2xl font-bold text-gray-900">
                Rp {totalAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Memproses...' : 'Beli Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
}
