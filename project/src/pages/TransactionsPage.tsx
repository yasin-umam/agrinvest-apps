import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowDownLeft, ArrowUpRight, Receipt, ArrowLeft } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'] & {
  chili_products: Database['public']['Tables']['chili_products']['Row'];
};

interface TransactionsPageProps {
  onBack?: () => void;
}

export function TransactionsPage({ onBack }: TransactionsPageProps = {}) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('orders')
      .select('*, chili_products(*)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, [profile]);

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.order_type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat transaksi...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen overflow-x-hidden">
      <div className="bg-white px-4 sm:px-6 py-6 shadow-md border-b border-slate-200 mb-0">
        {onBack && (
          <button
            onClick={onBack}
            className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:border-green-500 hover:-translate-y-px mb-4 md:hidden"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Transaksi</h1>
        <p className="text-gray-600 mb-4">Riwayat trading Anda</p>

        <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilter('buy')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'buy'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pembelian
        </button>
        <button
          onClick={() => setFilter('sell')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'sell'
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Penjualan
        </button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white border-b border-gray-200 p-12 text-center shadow-md">
          <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Transaksi</h3>
          <p className="text-gray-600">Aktivitas trading Anda akan muncul di sini</p>
        </div>
      ) : (
        <div className="bg-white border-b border-gray-200 overflow-hidden shadow-md pb-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Tipe
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Produk
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Jumlah
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Harga
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        order.order_type === 'buy'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {order.order_type === 'buy' ? (
                          <ArrowDownLeft className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {order.order_type === 'buy' ? 'Beli' : 'Jual'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {order.chili_products.image_url && (
                          <img
                            src={order.chili_products.image_url}
                            alt={order.chili_products.name}
                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-sm truncate">{order.chili_products.code}</div>
                          <div className="text-xs text-gray-500 truncate">{order.chili_products.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 text-sm whitespace-nowrap">
                      {order.quantity.toLocaleString('id-ID')} {order.chili_products.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 text-sm whitespace-nowrap">
                      Rp {order.price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 text-sm whitespace-nowrap">
                      Rp {order.total_amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        order.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : order.status === 'cancelled'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
