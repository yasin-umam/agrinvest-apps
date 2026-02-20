import { useState, useEffect } from 'react';
import { X, Wallet, ArrowUpCircle, ArrowDownCircle, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatRupiah } from '../../lib/formatters';

interface BalanceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type TransactionType = 'topup' | 'withdrawal';
type PaymentMethod = 'gopay' | 'dana' | 'ovo' | 'shopeepay';

type AdminAccount = {
  id: string;
  payment_method: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
};

const PAYMENT_METHODS = [
  { value: 'gopay', label: 'GoPay', color: 'bg-green-500' },
  { value: 'dana', label: 'DANA', color: 'bg-blue-500' },
  { value: 'ovo', label: 'OVO', color: 'bg-purple-500' },
  { value: 'shopeepay', label: 'ShopeePay', color: 'bg-orange-500' },
];

export function BalanceModal({ onClose, onSuccess }: BalanceModalProps) {
  const { profile } = useAuth();
  const [type, setType] = useState<TransactionType | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gopay');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const fetchAdminAccounts = async () => {
      const { data } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('is_active', true);

      if (data) {
        setAdminAccounts(data);
      }
    };

    fetchAdminAccounts();

    const channel = supabase
      .channel('admin-accounts-changes')
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
      document.body.style.overflow = 'unset';
      supabase.removeChannel(channel);
    };
  }, []);

  const formatNumber = (num: string) => {
    if (!num) return '';
    const numericValue = num.replace(/\./g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/\./g, '');
    if (numericValue === '' || /^\d+$/.test(numericValue)) {
      setAmount(numericValue);
    }
  };

  const getAdminAccount = (method: PaymentMethod) => {
    return adminAccounts.find(acc => acc.payment_method === method);
  };

  const handleCopyAccount = async () => {
    const accountToCopy = type === 'topup'
      ? getAdminAccount(paymentMethod)?.account_number || ''
      : accountNumber;
    await navigator.clipboard.writeText(accountToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickAmounts = [50000, 100000, 250000, 500000, 1000000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile) return;

    const amountNum = parseInt(amount);
    if (amountNum < 10000) {
      setError('Jumlah minimal adalah Rp 10.000');
      return;
    }

    if (type === 'withdrawal' && amountNum > profile.balance) {
      setError('Saldo tidak mencukupi');
      return;
    }

    if (!accountName.trim()) {
      setError('Nama pemilik rekening harus diisi');
      return;
    }

    if (type === 'withdrawal' && !accountNumber.trim()) {
      setError('Nomor rekening harus diisi');
      return;
    }

    setLoading(true);

    try {
      const adminAccount = getAdminAccount(paymentMethod);
      const { error: insertError } = await supabase
        .from('balance_transactions')
        .insert({
          user_id: profile.id,
          type,
          amount: amountNum,
          payment_method: paymentMethod,
          account_number: type === 'topup' ? (adminAccount?.account_number || '') : accountNumber,
          account_name: accountName,
          status: 'pending',
        });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setLoading(false);
    }
  };

  if (!type) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Kelola Saldo</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setType('topup')}
              className="w-full p-6 border-2 border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 group-hover:bg-green-200 rounded-lg transition">
                  <ArrowUpCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Top Up Saldo</h3>
                  <p className="text-sm text-gray-600">Tambah saldo ke akun Anda</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setType('withdrawal')}
              className="w-full p-6 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition">
                  <ArrowDownCircle className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tarik Saldo</h3>
                  <p className="text-sm text-gray-600">Tarik saldo ke e-wallet Anda</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Saldo Anda Saat Ini</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              Rp {profile?.balance ? formatRupiah(profile.balance) : '0'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setType(null)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {type === 'topup' ? 'Top Up Saldo' : 'Tarik Saldo'}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Saldo Saat Ini</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              Rp {profile?.balance ? formatRupiah(profile.balance) : '0'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih E-Wallet
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value as PaymentMethod)}
                  className={`p-4 border-2 rounded-lg font-semibold transition ${
                    paymentMethod === method.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${method.color} mb-2`} />
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah (Rp)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(amount)}
              onChange={(e) => handleAmountChange(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Masukkan jumlah"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Rp {formatRupiah(quickAmount)}
                </button>
              ))}
            </div>
          </div>

          {type === 'topup' && getAdminAccount(paymentMethod) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Rekening Tujuan Transfer</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">E-Wallet</span>
                  <span className="font-semibold text-blue-900">
                    {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">Nomor</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-900">{getAdminAccount(paymentMethod)?.account_number}</span>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="p-1 hover:bg-blue-200 rounded transition"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">Atas Nama</span>
                  <span className="font-semibold text-blue-900">{getAdminAccount(paymentMethod)?.account_name}</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-blue-700">
                Transfer ke rekening di atas, lalu tunggu konfirmasi admin
              </p>
            </div>
          )}

          {type === 'withdrawal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Rekening Anda
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Masukkan nomor rekening"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Pemilik Rekening
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Sesuai dengan nama di e-wallet"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Catatan Penting:</h4>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              {type === 'topup' ? (
                <>
                  <li>Transfer ke rekening admin yang tertera di atas</li>
                  <li>Pastikan jumlah transfer sesuai dengan nominal yang Anda isi</li>
                  <li>Admin akan memverifikasi dan menambahkan saldo Anda</li>
                  <li>Proses verifikasi memakan waktu 1-24 jam</li>
                </>
              ) : (
                <>
                  <li>Pastikan nama rekening sesuai dengan nama akun Anda</li>
                  <li>Saldo akan langsung dikurangi setelah admin approve</li>
                  <li>Dana akan dikirim ke rekening yang Anda input</li>
                  <li>Proses pengiriman memakan waktu 1-24 jam</li>
                </>
              )}
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
              type === 'topup'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                : 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
            }`}
          >
            {loading ? 'Memproses...' : type === 'topup' ? 'Ajukan Top Up' : 'Ajukan Penarikan'}
          </button>
        </form>
      </div>
    </div>
  );
}
