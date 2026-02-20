import { useState } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type Portfolio = Database['public']['Tables']['portfolios']['Row'] & {
  chili_products: Database['public']['Tables']['chili_products']['Row'];
};

interface SellModalProps {
  portfolio: Portfolio;
  onClose: () => void;
  onSuccess: () => void;
}

export function SellModal({ portfolio, onClose, onSuccess }: SellModalProps) {
  const { profile, refreshProfile } = useAuth();
  const [quantity, setQuantity] = useState('');
  const [priceType, setPriceType] = useState<'market' | 'custom'>('market');
  const [customPrice, setCustomPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuantityChange = (value: string) => {
    // Only allow empty string or positive integers
    if (value === '' || /^\d+$/.test(value)) {
      setQuantity(value);
    }
  };

  const handleCustomPriceChange = (value: string) => {
    // Only allow empty string or positive integers
    if (value === '' || /^\d+$/.test(value)) {
      setCustomPrice(value);
    }
  };

  const product = portfolio.chili_products;

  const selectedPrice = priceType === 'market'
    ? product.current_price
    : parseFloat(customPrice || '0');

  const totalAmount = parseFloat(quantity || '0') * selectedPrice;
  const profit = totalAmount - (parseFloat(quantity || '0') * portfolio.average_buy_price);
  const profitPercent = (profit / (parseFloat(quantity || '0') * portfolio.average_buy_price)) * 100;

  const isPositive = product.price_change_percent_24h >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile) return;

    const qty = parseInt(quantity);
    if (qty < 1 || isNaN(qty)) {
      setError('Jumlah harus minimal 1 unit');
      return;
    }

    if (qty > portfolio.quantity) {
      setError(`Kepemilikan tidak mencukupi. Anda hanya punya ${portfolio.quantity} unit`);
      return;
    }

    if (priceType === 'custom' && selectedPrice <= 0) {
      setError('Harga jual harus lebih dari 0');
      return;
    }

    if (priceType === 'custom') {
      const minPrice = product.current_price * 0;
      const maxPrice = product.current_price * 2;

      if (selectedPrice < minPrice || selectedPrice > maxPrice) {
        setError(`Harga custom harus di antara Rp 0 dan Rp ${maxPrice.toLocaleString('id-ID')} (maksimal +100% dari harga pasar)`);
        return;
      }
    }

    setLoading(true);

    try {
      const parentProductId = product.parent_product_id || product.id;

      const { data: parentProduct } = await supabase
        .from('chili_products')
        .select('*')
        .eq('id', parentProductId)
        .single();

      if (!parentProduct) {
        throw new Error('Produk tidak ditemukan');
      }

      if (selectedPrice === parentProduct.current_price) {
        const { error: updateError } = await supabase
          .from('chili_products')
          .update({
            available_units: parentProduct.available_units + qty,
            total_volume: parentProduct.total_volume + qty,
            updated_at: new Date().toISOString(),
          })
          .eq('id', parentProductId);

        if (updateError) throw updateError;
      } else {
        const { data: existingUserProduct } = await supabase
          .from('chili_products')
          .select('*')
          .eq('parent_product_id', parentProductId)
          .eq('seller_id', profile.id)
          .eq('current_price', selectedPrice)
          .maybeSingle();

        if (existingUserProduct) {
          const { error: updateError } = await supabase
            .from('chili_products')
            .update({
              available_units: existingUserProduct.available_units + qty,
              total_volume: existingUserProduct.total_volume + qty,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingUserProduct.id);

          if (updateError) throw updateError;
        } else {
          const timestamp = Date.now().toString().slice(-6);
          const userCode = `${parentProduct.code}-U${profile.id.slice(0, 4)}-${timestamp}`;

          const { error: productError } = await supabase
            .from('chili_products')
            .insert({
              name: parentProduct.name,
              code: userCode,
              description: parentProduct.description,
              image_url: parentProduct.image_url,
              category: parentProduct.category,
              grade: parentProduct.grade,
              unit: parentProduct.unit,
              current_price: selectedPrice,
              price_change_24h: 0,
              price_change_percent_24h: 0,
              high_price_24h: selectedPrice,
              low_price_24h: selectedPrice,
              total_volume: qty,
              traded_volume_24h: 0,
              min_order_quantity: parentProduct.min_order_quantity,
              is_active: true,
              location: parentProduct.location,
              age_days: parentProduct.age_days,
              harvest_status: parentProduct.harvest_status,
              harvest_quantity: parentProduct.harvest_quantity,
              selling_price_per_kg: parentProduct.selling_price_per_kg,
              selling_price_change_percent: 0,
              area_size: parentProduct.area_size,
              plant_population: parentProduct.plant_population,
              cost_per_plant: parentProduct.cost_per_plant,
              cost_per_area: parentProduct.cost_per_area,
              harvest_kg: parentProduct.harvest_kg,
              total_revenue: parentProduct.total_revenue,
              revenue_vs_cost_percent: parentProduct.revenue_vs_cost_percent,
              harvest_count: parentProduct.harvest_count,
              available_units: qty,
              seller_type: 'user',
              seller_id: profile.id,
              parent_product_id: parentProductId,
              is_user_listing: true,
            });

          if (productError) throw productError;
        }
      }

      const newQuantity = portfolio.quantity - qty;
      if (newQuantity > 0) {
        const { error: portfolioError } = await supabase
          .from('portfolios')
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', portfolio.id);

        if (portfolioError) throw portfolioError;
      } else {
        const { error: portfolioError } = await supabase
          .from('portfolios')
          .delete()
          .eq('id', portfolio.id);

        if (portfolioError) throw portfolioError;
      }

      // Create notification for successful listing
      await supabase
        .from('notifications')
        .insert({
          user_id: profile.id,
          type: 'trade',
          title: 'Aset Berhasil Dilisting',
          message: `${qty} unit ${product.name} berhasil dilisting untuk dijual dengan harga ${priceType === 'market' ? 'pasar' : 'custom'} Rp ${selectedPrice.toLocaleString('id-ID')}/unit. Total nilai: Rp ${totalAmount.toLocaleString('id-ID')}`,
          metadata: {
            product_id: product.id,
            product_name: product.name,
            quantity: qty,
            price: selectedPrice,
            total_amount: totalAmount,
            listing_type: priceType
          },
          is_read: false
        });

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
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Jual {product.code}</h2>
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
              <span className="text-gray-600">Harga Pasar Saat Ini</span>
              <span className="font-semibold">Rp {product.current_price.toLocaleString('id-ID')}/unit</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Kepemilikan Anda</span>
              <span className="font-semibold">{portfolio.quantity.toLocaleString('id-ID')} unit</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Harga Beli Rata-rata</span>
              <span className="font-semibold">Rp {portfolio.average_buy_price.toLocaleString('id-ID')}</span>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Masukkan jumlah yang akan dijual"
            />
            <button
              type="button"
              onClick={() => setQuantity(portfolio.quantity.toString())}
              className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Jual semua {portfolio.quantity} unit
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Pilih Harga Jual
            </label>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPriceType('market')}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  priceType === 'market'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="space-y-2">
                  <div className="font-semibold text-gray-900">Harga Pasar</div>
                  <div className="text-2xl font-bold text-gray-900">
                    Rp {product.current_price.toLocaleString('id-ID')}
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-semibold ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {isPositive ? '+' : ''}{product.price_change_percent_24h.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    Harga saat ini
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPriceType('custom')}
                className={`p-4 border-2 rounded-lg text-left transition ${
                  priceType === 'custom'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="space-y-2">
                  <div className="font-semibold text-gray-900">Harga Custom</div>
                  <div className="text-2xl font-bold text-gray-900 break-words overflow-hidden">
                    {customPrice ? `Rp ${parseFloat(customPrice).toLocaleString('id-ID')}` : '-'}
                  </div>
                  <div className="text-sm text-gray-500 h-5">
                    {customPrice && (
                      <span>
                        {parseFloat(customPrice) > product.current_price ? '+' : ''}
                        {(((parseFloat(customPrice) - product.current_price) / product.current_price) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Tentukan sendiri
                  </div>
                </div>
              </button>
            </div>

            {priceType === 'custom' && (
              <div className="mt-4">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customPrice}
                  onChange={(e) => handleCustomPriceChange(e.target.value)}
                  placeholder="Masukkan harga jual per unit"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Harga dapat diatur dari Rp 0 hingga Rp {(product.current_price * 2).toLocaleString('id-ID')} (maksimal +100% dari harga pasar)
                </p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Penerimaan</span>
              <span className="text-2xl font-bold text-gray-900">
                Rp {totalAmount.toLocaleString('id-ID')}
              </span>
            </div>
            {parseFloat(quantity || '0') > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                <span className="text-sm text-gray-600">Estimasi Profit/Loss</span>
                <div className="text-right">
                  <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profit >= 0 ? '+' : ''}Rp {profit.toLocaleString('id-ID')}
                  </div>
                  <div className={`text-sm font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Memproses...' : 'Jual Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
}
