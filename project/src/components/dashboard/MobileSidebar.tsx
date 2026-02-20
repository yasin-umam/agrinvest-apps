import { X, User, Lock, LogOut, TrendingUp, TrendingDown, Wallet, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatRupiah } from '../../lib/formatters';

type Page = 'market' | 'portfolio' | 'transactions' | 'notifications' | 'admin' | 'account';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
  onOpenBalanceModal: () => void;
}

export function MobileSidebar({ isOpen, onClose, onNavigate, onOpenBalanceModal }: MobileSidebarProps) {
  const { profile, user, signOut } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [balancePercentage, setBalancePercentage] = useState(0);
  const [todayHarvestRevenue, setTodayHarvestRevenue] = useState(0);
  const [harvestTrend, setHarvestTrend] = useState(0);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!profile || isAdmin || !isOpen) return;

    let isMounted = true;

    const fetchBalanceData = async () => {
      try {
        const { data: percentageData, error: percentageError } = await supabase.rpc('get_user_balance_percentage_change', {
          p_user_id: profile.id,
        });

        const { data: todayHarvest, error: harvestError } = await supabase.rpc('get_user_today_harvest_revenue', {
          p_user_id: profile.id,
        });

        const { data: harvestTrendData, error: trendError } = await supabase.rpc('get_user_harvest_revenue_trend', {
          p_user_id: profile.id,
        });

        if (isMounted && !percentageError && !harvestError && !trendError) {
          setBalancePercentage(percentageData || 0);
          setTodayHarvestRevenue(todayHarvest || 0);
          setHarvestTrend(harvestTrendData || 0);
        }
      } catch (error) {
        console.error('Error fetching balance data:', error);
      }
    };

    fetchBalanceData();

    return () => {
      isMounted = false;
    };
  }, [profile, isAdmin, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setBalancePercentage(0);
      setTodayHarvestRevenue(0);
      setHarvestTrend(0);
      setExpandedSection(null);
    }
  }, [isOpen]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleNavigation = (page: Page) => {
    onNavigate(page);
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div className={`fixed inset-y-0 left-0 w-80 bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center gap-3 mb-3">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover border-3 border-green-500"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">{profile?.full_name}</div>
                  <div className="text-sm text-gray-600">{user?.email}</div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="text-xs text-gray-500">Saldo</div>
                <div className="text-lg font-bold text-gray-900">
                  Rp {profile?.balance ? formatRupiah(profile.balance) : '0'}
                </div>
                {!isAdmin && (
                  <div className="mt-2 space-y-1">
                    {balancePercentage !== 0 && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        balancePercentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {balancePercentage >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {balancePercentage >= 0 ? '+' : ''}{balancePercentage.toFixed(2)}%
                      </div>
                    )}
                    {todayHarvestRevenue > 0 && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        harvestTrend >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {harvestTrend >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        +panen Rp {formatRupiah(todayHarvestRevenue)}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  onOpenBalanceModal();
                  onClose();
                }}
                className="mt-3 w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-2.5 px-4 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2 transition"
              >
                <Wallet className="w-5 h-5" />
                Kelola Saldo
              </button>
            </div>

            <div className="p-2">
              {isAdmin && (
                <button
                  onClick={() => handleNavigation('admin')}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900">Admin Panel</span>
                  </div>
                </button>
              )}

              <button
                onClick={() => handleNavigation('account')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Informasi Akun</span>
                </div>
              </button>

              <button
                onClick={() => handleNavigation('portfolio')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Portfolio</span>
                </div>
              </button>

              <button
                onClick={() => handleNavigation('transactions')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Transaksi</span>
                </div>
              </button>

              <button
                onClick={() => toggleSection('security')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Keamanan</span>
                </div>
              </button>

              {expandedSection === 'security' && (
                <div className="ml-8 mt-1 space-y-1">
                  <div className="p-2 text-sm text-gray-600">
                    Pengaturan keamanan segera hadir
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 rounded-lg transition text-red-700 font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
