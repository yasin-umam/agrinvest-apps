import { useState } from 'react';
import { X, CheckCircle, XCircle, User, Wallet, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type BalanceTransaction = Database['public']['Tables']['balance_transactions']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  reviewer?: Database['public']['Tables']['profiles']['Row'];
};

interface BalanceTransactionModalProps {
  transaction: BalanceTransaction;
  onClose: () => void;
  onSuccess: () => void;
}

export function BalanceTransactionModal({ transaction, onClose, onSuccess }: BalanceTransactionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const isWithdrawal = transaction.type === 'withdrawal';
  const isPending = transaction.status === 'pending';
  const hasInsufficientBalance = isWithdrawal && Number(transaction.profiles.balance) < Number(transaction.amount);

  const handleApprove = async () => {
    if (hasInsufficientBalance) {
      alert('Cannot approve: User has insufficient balance for this withdrawal.');
      return;
    }

    const confirmMessage = isWithdrawal
      ? `Approve withdrawal of Rp ${Number(transaction.amount).toLocaleString('id-ID')}? User's balance will be deducted.`
      : `Approve top-up of Rp ${Number(transaction.amount).toLocaleString('id-ID')}? User's balance will be increased.`;

    if (!confirm(confirmMessage)) return;

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase.from('balance_transactions') as unknown as any)
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', transaction.id);

      if (error) throw error;

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
    if (!adminNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    if (!confirm('Reject this transaction?')) return;

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase.from('balance_transactions') as unknown as any)
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', transaction.id);

      if (error) throw error;

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
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Review Transaction</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className={`border-l-4 rounded-r-lg p-4 ${
            transaction.type === 'topup'
              ? 'bg-green-50 border-green-500'
              : 'bg-blue-50 border-blue-500'
          }`}>
            <div className="flex items-center gap-3">
              {transaction.type === 'topup' ? (
                <div className="p-2 bg-green-100 rounded-lg">
                  <Wallet className="w-6 h-6 text-green-600" />
                </div>
              ) : (
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
              )}
              <div>
                <div className="font-semibold text-lg">
                  {transaction.type === 'topup' ? 'Top Up Request' : 'Withdrawal Request'}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  Rp {Number(transaction.amount).toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">User Information</span>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-gray-900">{transaction.profiles.full_name}</div>
                <div className="text-sm text-gray-600">Current Balance:</div>
                <div className="text-lg font-bold text-gray-900">
                  Rp {Number(transaction.profiles.balance).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Transaction Date</span>
              </div>
              <div className="font-semibold text-gray-900">
                {new Date(transaction.created_at).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
              <div className="text-sm text-gray-600">
                {new Date(transaction.created_at).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Payment Details</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">E-Wallet</span>
                <span className="font-semibold text-gray-900 uppercase">{transaction.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Number</span>
                <span className="font-semibold text-gray-900">{transaction.account_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Name</span>
                <span className="font-semibold text-gray-900">{transaction.account_name}</span>
              </div>
            </div>
          </div>

          {hasInsufficientBalance && isPending && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-red-600 font-semibold">Cannot Approve Withdrawal</div>
                  <div className="text-red-700 text-sm mt-1">
                    User's current balance (Rp {Number(transaction.profiles.balance).toLocaleString('id-ID')})
                    is less than the withdrawal amount (Rp {Number(transaction.amount).toLocaleString('id-ID')}).
                    This withdrawal cannot be approved.
                  </div>
                </div>
              </div>
            </div>
          )}

          {isWithdrawal && !hasInsufficientBalance && isPending && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-blue-600 font-semibold">Withdrawal Validation</div>
                  <div className="text-blue-700 text-sm mt-1">
                    After approval:
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>User balance will be deducted by Rp {Number(transaction.amount).toLocaleString('id-ID')}</li>
                      <li>New balance: Rp {(Number(transaction.profiles.balance) - Number(transaction.amount)).toLocaleString('id-ID')}</li>
                      <li>You must transfer the funds to the user's account manually</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isWithdrawal && isPending && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-green-600 font-semibold">Top-Up Validation</div>
                  <div className="text-green-700 text-sm mt-1">
                    Before approval, verify:
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Payment received in admin e-wallet</li>
                      <li>Amount matches: Rp {Number(transaction.amount).toLocaleString('id-ID')}</li>
                      <li>Sender name matches: {transaction.account_name}</li>
                    </ul>
                    After approval, user balance will be: Rp {(Number(transaction.profiles.balance) + Number(transaction.amount)).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {transaction.status !== 'pending' && (
            <div className={`rounded-lg p-4 ${
              transaction.status === 'approved'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {transaction.status === 'approved' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className={`font-semibold ${
                  transaction.status === 'approved' ? 'text-green-900' : 'text-red-900'
                }`}>
                  Transaction {transaction.status === 'approved' ? 'Approved' : 'Rejected'}
                </span>
              </div>
              {transaction.reviewer && (
                <div className="text-sm text-gray-700 mb-1">
                  Reviewed by: {transaction.reviewer.full_name}
                </div>
              )}
              {transaction.reviewed_at && (
                <div className="text-sm text-gray-600 mb-2">
                  {new Date(transaction.reviewed_at).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
              {transaction.admin_notes && (
                <div className="mt-2 p-2 bg-white rounded text-sm">
                  <span className="font-medium">Notes:</span> {transaction.admin_notes}
                </div>
              )}
            </div>
          )}

          {isPending && showRejectionForm && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Rejection Reason</span>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explain why this transaction is being rejected..."
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={4}
                  required
                />
              </label>
            </div>
          )}

          {isPending && !showRejectionForm && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Admin Notes (Optional)</span>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this transaction..."
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </label>
            </div>
          )}
        </div>

        {isPending && (
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
                  {isProcessing ? 'Processing...' : hasInsufficientBalance ? 'Insufficient Balance' : 'Approve'}
                </button>
                <button
                  onClick={() => setShowRejectionForm(true)}
                  disabled={isProcessing}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Reject
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setShowRejectionForm(false);
                    setAdminNotes('');
                  }}
                  disabled={isProcessing}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !adminNotes.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  {isProcessing ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
