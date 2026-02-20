import { useState } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { ProductManagement } from '../components/admin/ProductManagement';
import { UserManagement } from '../components/admin/UserManagement';
import { TransactionMonitoring } from '../components/admin/TransactionMonitoring';
import { BalanceManagement } from '../components/admin/BalanceManagement';

type AdminTab = 'products' | 'users' | 'transactions' | 'balance';

interface AdminPageProps {
  onBack?: () => void;
}

export function AdminPage({ onBack }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('products');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition md:hidden"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
        )}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Manage platform operations</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-medium transition border-b-2 ${
            activeTab === 'products'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-medium transition border-b-2 ${
            activeTab === 'users'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-6 py-3 font-medium transition border-b-2 ${
            activeTab === 'transactions'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('balance')}
          className={`px-6 py-3 font-medium transition border-b-2 ${
            activeTab === 'balance'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Balance
        </button>
      </div>

      <div>
        {activeTab === 'products' && <ProductManagement />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'transactions' && <TransactionMonitoring />}
        {activeTab === 'balance' && <BalanceManagement />}
      </div>
    </div>
  );
}
