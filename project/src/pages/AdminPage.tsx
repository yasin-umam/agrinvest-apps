import { useState } from 'react';
import { Shield, ArrowLeft, Leaf, MapPinned, ShieldAlert } from 'lucide-react';
import { ProductManagement } from '../components/admin/ProductManagement';
import { RegionManagement } from '../components/admin/RegionManagement';
import { UserManagement } from '../components/admin/UserManagement';
import { TransactionMonitoring } from '../components/admin/TransactionMonitoring';
import { BalanceManagement } from '../components/admin/BalanceManagement';

type AdminSection = 'product' | 'users' | 'transactions' | 'balance';
type ProductSubTab = 'commodities' | 'regions' | 'non-syariah';

interface AdminPageProps {
  onBack?: () => void;
}

function NonSyariahManagement() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center min-h-[320px] flex items-center justify-center">
      <div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Non-Syariah Management</h2>
        <p className="mt-2 text-gray-600">Halaman admin untuk produk non-syariah belum tersedia.</p>
        <p className="mt-1 text-sm text-gray-400">Struktur submenu sudah disiapkan agar fitur ini bisa langsung dihubungkan saat komponennya dibuat.</p>
      </div>
    </div>
  );
}

export function AdminPage({ onBack }: AdminPageProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('product');
  const [activeProductTab, setActiveProductTab] = useState<ProductSubTab>('commodities');

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

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveSection('product')}
          className={`px-6 py-3 font-medium transition border-b-2 ${
            activeSection === 'product'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Product
        </button>
        <button
          onClick={() => setActiveSection('users')}
          className={`px-6 py-3 font-medium transition border-b-2 ${
            activeSection === 'users'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveSection('transactions')}
          className={`px-6 py-3 font-medium transition border-b-2 ${
            activeSection === 'transactions'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveSection('balance')}
          className={`px-6 py-3 font-medium transition border-b-2 ${
            activeSection === 'balance'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Balance
        </button>
      </div>

      {activeSection === 'product' && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <button
            onClick={() => setActiveProductTab('commodities')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              activeProductTab === 'commodities'
                ? 'bg-green-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-green-50 hover:text-green-700'
            }`}
          >
            <Leaf className="h-4 w-4" />
            Komoditas
          </button>
          <button
            onClick={() => setActiveProductTab('regions')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              activeProductTab === 'regions'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <MapPinned className="h-4 w-4" />
            Region
          </button>
          <button
            onClick={() => setActiveProductTab('non-syariah')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              activeProductTab === 'non-syariah'
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-red-50 hover:text-red-700'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Non-Syariah
          </button>
        </div>
      )}

      <div>
        {activeSection === 'product' && activeProductTab === 'commodities' && <ProductManagement />}
        {activeSection === 'product' && activeProductTab === 'regions' && <RegionManagement />}
        {activeSection === 'product' && activeProductTab === 'non-syariah' && <NonSyariahManagement />}
        {activeSection === 'users' && <UserManagement />}
        {activeSection === 'transactions' && <TransactionMonitoring />}
        {activeSection === 'balance' && <BalanceManagement />}
      </div>
    </div>
  );
}
