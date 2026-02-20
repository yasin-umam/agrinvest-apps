import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Clock, Eye } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { TransactionReviewModal } from './TransactionReviewModal';

type Order = Database['public']['Tables']['orders']['Row'] & {
  chili_products: Database['public']['Tables']['chili_products']['Row'];
  profiles: Database['public']['Tables']['profiles']['Row'];
};

export function TransactionMonitoring() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalVolume: 0,
    totalValue: 0,
    pendingCount: 0,
  });

  const loadOrders = async (retryCount = 0) => {
    console.log(`Loading orders... (attempt ${retryCount + 1})`);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        chili_products(*),
        profiles:user_id(*)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading orders:', error);

      if (error.message.includes('Failed to fetch') && retryCount < 3) {
        console.log(`Retrying in ${(retryCount + 1) * 1000}ms...`);
        setTimeout(() => loadOrders(retryCount + 1), (retryCount + 1) * 1000);
        return;
      }

      console.error('Error details:', JSON.stringify(error, null, 2));
      return;
    }

    if (data) {
      console.log('Raw data received:', data);
      const allOrders = data as Order[];
      const pending = allOrders.filter((o) => o.status === 'pending');

      setOrders(allOrders);
      setPendingOrders(pending);

      const totalOrders = allOrders.length;
      const totalVolume = allOrders.reduce((sum, o) => sum + Number(o.quantity), 0);
      const totalValue = allOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const pendingCount = pending.length;

      setStats({ totalOrders, totalVolume, totalValue, pendingCount });
      console.log(`✓ Loaded ${totalOrders} orders, ${pendingCount} pending`);
    }
  };

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const displayOrders = activeTab === 'pending' ? pendingOrders : orders;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Transaction Monitoring</h2>
        <p className="text-gray-600">Real-time transaction overview and validation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-sm text-gray-500">Pending Validation</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.pendingCount}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-sm text-gray-500">Total Orders</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-gray-500">Total Volume</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalVolume.toLocaleString('id-ID')} kg
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-sm text-gray-500">Total Value</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            Rp {stats.totalValue.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending Validation ({stats.pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All Transactions ({stats.totalOrders})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>
                {activeTab === 'pending' && (
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayOrders.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'pending' ? 9 : 8} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      {activeTab === 'pending'
                        ? 'No pending transactions to validate'
                        : 'No transactions found'}
                    </div>
                  </td>
                </tr>
              ) : (
                displayOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{order.profiles.full_name}</div>
                      <div className="text-sm text-gray-500">{order.user_id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          order.order_type === 'buy'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {order.order_type === 'buy' ? (
                          <ArrowDownLeft className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {order.chili_products.image_url && (
                          <img
                            src={order.chili_products.image_url}
                            alt={order.chili_products.name}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{order.chili_products.code}</div>
                          <div className="text-sm text-gray-500">{order.chili_products.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {Number(order.quantity).toLocaleString('id-ID')} {order.chili_products.unit}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      Rp {Number(order.price).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      Rp {Number(order.total_amount).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : order.status === 'cancelled'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    {activeTab === 'pending' && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <TransactionReviewModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSuccess={() => {
            loadOrders();
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}
