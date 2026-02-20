import { useState, useEffect } from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle, XCircle, Eye, Settings, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { BalanceTransactionModal } from './BalanceTransactionModal';

type BalanceTransaction = Database['public']['Tables']['balance_transactions']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  reviewer?: Database['public']['Tables']['profiles']['Row'];
};

type AdminAccount = {
  id: string;
  payment_method: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
};

export function BalanceManagement() {
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterType, setFilterType] = useState<'all' | 'topup' | 'withdrawal'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<BalanceTransaction | null>(null);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ account_number: '', account_name: '' });

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from('balance_transactions')
        .select(`
          *,
          profiles:user_id(
            id,
            full_name,
            avatar_url,
            balance
          ),
          reviewer:reviewed_by(
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      setTransactions(data as unknown as BalanceTransaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_accounts')
        .select('*')
        .order('payment_method');

      if (error) throw error;
      setAdminAccounts(data || []);
    } catch (error) {
      console.error('Error fetching admin accounts:', error);
    }
  };

  const handleEditAccount = (account: AdminAccount) => {
    setEditingAccount(account.id);
    setEditForm({
      account_number: account.account_number,
      account_name: account.account_name,
    });
  };

  const handleSaveAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('admin_accounts')
        .update({
          account_number: editForm.account_number,
          account_name: editForm.account_name,
        })
        .eq('id', accountId);

      if (error) throw error;

      await fetchAdminAccounts();
      setEditingAccount(null);
    } catch (error) {
      console.error('Error updating admin account:', error);
      alert('Gagal mengupdate rekening');
    }
  };

  const handleCancelEdit = () => {
    setEditingAccount(null);
    setEditForm({ account_number: '', account_name: '' });
  };

  useEffect(() => {
    fetchTransactions();
    fetchAdminAccounts();

    const channel = supabase
      .channel('balance-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'balance_transactions',
        },
        () => {
          fetchTransactions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_accounts',
        },
        () => {
          fetchAdminAccounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus, filterType]);

  const stats = {
    pending: transactions.filter(t => t.status === 'pending').length,
    approved: transactions.filter(t => t.status === 'approved').length,
    rejected: transactions.filter(t => t.status === 'rejected').length,
    totalTopup: transactions
      .filter(t => t.type === 'topup' && t.status === 'approved')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    totalWithdrawal: transactions
      .filter(t => t.type === 'withdrawal' && t.status === 'approved')
      .reduce((sum, t) => sum + Number(t.amount), 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'topup'
      ? 'bg-green-100 text-green-800'
      : 'bg-blue-100 text-blue-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="w-8 h-8 text-gray-900" />
          <h2 className="text-2xl font-bold text-gray-900">Balance Management</h2>
        </div>
        <button
          onClick={() => setShowAccountSettings(!showAccountSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
        >
          <Settings className="w-4 h-4" />
          Kelola Rekening Admin
        </button>
      </div>

      {showAccountSettings && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Pengaturan Rekening Admin</h3>
          <div className="space-y-4">
            {adminAccounts.map((account) => (
              <div key={account.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-gray-100 rounded-lg font-semibold text-gray-900 uppercase">
                      {account.payment_method}
                    </div>
                    {account.is_active && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  {editingAccount === account.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveAccount(account.id)}
                        className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditAccount(account)}
                      className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {editingAccount === account.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nomor Rekening
                      </label>
                      <input
                        type="text"
                        value={editForm.account_number}
                        onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama Pemilik Rekening
                      </label>
                      <input
                        type="text"
                        value={editForm.account_name}
                        onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Nomor:</span>
                      <span className="font-medium text-gray-900">{account.account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Atas Nama:</span>
                      <span className="font-medium text-gray-900">{account.account_name}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Pending</span>
          </div>
          <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Approved</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{stats.approved}</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">Rejected</span>
          </div>
          <div className="text-2xl font-bold text-red-900">{stats.rejected}</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Total Top Up</span>
          </div>
          <div className="text-lg font-bold text-blue-900">
            Rp {stats.totalTopup.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Total Withdrawal</span>
          </div>
          <div className="text-lg font-bold text-purple-900">
            Rp {stats.totalWithdrawal.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'approved'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'rejected'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejected
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterType('topup')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'topup'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Top Up
            </button>
            <button
              onClick={() => setFilterType('withdrawal')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterType === 'withdrawal'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Withdrawal
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment Method</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{transaction.profiles.full_name}</div>
                        <div className="text-sm text-gray-500">
                          Balance: Rp {Number(transaction.profiles.balance).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(transaction.type)}`}>
                        {transaction.type === 'topup' ? (
                          <span className="flex items-center gap-1">
                            <ArrowUpCircle className="w-3 h-3" />
                            Top Up
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <ArrowDownCircle className="w-3 h-3" />
                            Withdrawal
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900">
                        Rp {Number(transaction.amount).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 uppercase">{transaction.payment_method}</div>
                        <div className="text-gray-500">{transaction.account_number}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 border rounded-full text-xs font-semibold ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(transaction.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTransaction && (
        <BalanceTransactionModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onSuccess={() => {
            setSelectedTransaction(null);
            fetchTransactions();
          }}
        />
      )}
    </div>
  );
}
