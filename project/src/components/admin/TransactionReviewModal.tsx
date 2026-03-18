import { useState } from 'react';
import { X, CheckCircle, XCircle, User, Package, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Order = Database['public']['Tables']['orders']['Row'] & {
  chili_products: Database['public']['Tables']['chili_products']['Row'];
  profiles: Database['public']['Tables']['profiles']['Row'];
};

interface TransactionReviewModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionReviewModal({ order, onClose, onSuccess }: TransactionReviewModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const hasInsufficientBalance = order.order_type === 'buy' && Number(order.profiles.balance) < Number(order.total_amount);

  const handleApprove = async () => {
    if (hasInsufficientBalance) {
      alert('Cannot approve: User has insufficient balance for this transaction.');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: orderError } = await (supabase.from('orders') as unknown as any)
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error approving transaction:', error);
      alert('Failed to approve transaction. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionNotes.trim()) {
      alert('Please provide rejection notes');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: orderError } = await (supabase.from('orders') as unknown as any)
        .update({
          status: 'cancelled',
          rejection_notes: rejectionNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      await (supabase.from('notifications') as unknown as any).insert({
        user_id: order.user_id,
        type: 'system',
        title: 'Transaksi Ditolak',
        message: `Transaksi ${order.order_type === 'buy' ? 'pembelian' : 'penjualan'} ${order.quantity} ${order.chili_products.unit} ${order.chili_products.name} senilai Rp ${Number(order.total_amount).toLocaleString('id-ID')} ditolak oleh admin. Alasan: ${rejectionNotes}`,
        metadata: {
          order_id: order.id,
          status: 'rejected',
          rejection_notes: rejectionNotes,
          product_name: order.chili_products.name,
          quantity: order.quantity,
        },
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      alert('Failed to reject transaction. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Review Transaction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <User className="w-4 h-4" />
                  <span>User Information</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="font-semibold text-gray-900">{order.profiles.full_name}</div>
                  <div className="text-sm text-gray-600">ID: {order.user_id.slice(0, 8)}...</div>
                  <div className="text-sm text-gray-600 mt-2">
                    Balance: Rp {Number(order.profiles.balance).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Package className="w-4 h-4" />
                  <span>Product Details</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    {order.chili_products.image_url && (
                      <img
                        src={order.chili_products.image_url}
                        alt={order.chili_products.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{order.chili_products.name}</div>
                      <div className="text-sm text-gray-600">{order.chili_products.code}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Transaction Details</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type</span>
                    <span
                      className={`text-sm font-semibold ${
                        order.order_type === 'buy' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {order.order_type.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Quantity</span>
                    <span className="text-sm font-medium text-gray-900">
                      {order.quantity} {order.chili_products.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Price per {order.chili_products.unit}</span>
                    <span className="text-sm font-medium text-gray-900">
                      Rp {Number(order.price).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between">
                    <span className="text-sm font-semibold text-gray-900">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">
                      Rp {Number(order.total_amount).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Order Date</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-900">
                    {new Date(order.created_at).toLocaleString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {hasInsufficientBalance && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-2">
                <div className="text-red-600 font-semibold">Cannot Approve:</div>
                <div className="text-red-700 text-sm">
                  User's balance (Rp {Number(order.profiles.balance).toLocaleString('id-ID')}) is less
                  than the order amount (Rp {Number(order.total_amount).toLocaleString('id-ID')}).
                  This order cannot be approved until the user has sufficient balance.
                </div>
              </div>
            </div>
          )}

          {showRejectionForm && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Rejection Notes</span>
                <textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Explain why this transaction is being rejected..."
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={4}
                />
              </label>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
          {!showRejectionForm ? (
            <>
              <button
                onClick={handleApprove}
                disabled={isProcessing || hasInsufficientBalance}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                title={hasInsufficientBalance ? 'Cannot approve: Insufficient user balance' : ''}
              >
                <CheckCircle className="w-5 h-5" />
                {isProcessing ? 'Processing...' : hasInsufficientBalance ? 'Insufficient Balance' : 'Approve Transaction'}
              </button>
              <button
                onClick={() => setShowRejectionForm(true)}
                disabled={isProcessing}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Reject Transaction
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowRejectionForm(false)}
                disabled={isProcessing}
                className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionNotes.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                {isProcessing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
