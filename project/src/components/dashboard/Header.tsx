import { useAuth } from '../../contexts/AuthContext';
import { Bell, LogOut, User, TrendingUp, TrendingDown, Shield, Search as SearchIcon, Leaf, Wallet, Briefcase, Receipt, Users, FileText, CheckSquare, Heart} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MobileSidebar } from './MobileSidebar';
import { BalanceModal } from './BalanceModal';
import { formatRupiah } from '../../lib/formatters';

type Page = 'market' | 'portfolio' | 'transactions' | 'notifications' | 'admin' | 'account' | 'dashboard' | 'connections' | 'protocol' | 'tasks' | 'contributions';

interface HeaderProps {
  onNavigate: (page: Page) => void;
  currentPage: Page;
  onSearchToggle?: () => void;
  showMobileSearch?: boolean;
  onSidebarToggle?: (isOpen: boolean) => void;
  onBalanceModalChange?: (isOpen: boolean) => void;
}

export function Header({ onNavigate, currentPage, onSearchToggle, onSidebarToggle, onBalanceModalChange }: HeaderProps) {
  const { profile, signOut, refreshProfile } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  const handleBalanceModalChange = (isOpen: boolean) => {
    setShowBalanceModal(isOpen);
    onBalanceModalChange?.(isOpen);
  };
  const [unreadCount, setUnreadCount] = useState(0);
  const [balancePercentage, setBalancePercentage] = useState<number>(0);
  const [todayBalance, setTodayBalance] = useState<number>(0);
  const [yesterdayBalance, setYesterdayBalance] = useState<number>(0);
  const [todayHarvestRevenue, setTodayHarvestRevenue] = useState<number>(0);
  const [yesterdayHarvestRevenue, setYesterdayHarvestRevenue] = useState<number>(0);
  const [harvestTrend, setHarvestTrend] = useState<number>(0);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!profile) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    };

    const fetchBalanceData = async () => {
      if (profile.role === 'admin') return;

      const { data: todayData } = await supabase.rpc('get_user_today_balance', {
        p_user_id: profile.id,
      });

      const { data: yesterdayData } = await supabase.rpc('get_user_yesterday_balance', {
        p_user_id: profile.id,
      });

      const { data: percentageData } = await supabase.rpc('get_user_balance_percentage_change', {
        p_user_id: profile.id,
      });

      const { data: todayHarvest } = await supabase.rpc('get_user_today_harvest_revenue', {
        p_user_id: profile.id,
      });

      const { data: yesterdayHarvest } = await supabase.rpc('get_user_yesterday_harvest_revenue', {
        p_user_id: profile.id,
      });

      const { data: harvestTrendData } = await supabase.rpc('get_user_harvest_revenue_trend', {
        p_user_id: profile.id,
      });

      console.log('Balance data fetched:', {
        todayData,
        yesterdayData,
        percentageData,
        todayHarvest,
        yesterdayHarvest,
        harvestTrendData,
        currentBalance: profile.balance
      });

      setTodayBalance(todayData || 0);
      setYesterdayBalance(yesterdayData || 0);
      setBalancePercentage(percentageData || 0);
      setTodayHarvestRevenue(todayHarvest || 0);
      setYesterdayHarvestRevenue(yesterdayHarvest || 0);
      setHarvestTrend(harvestTrendData || 0);
    };

    fetchUnreadCount();
    fetchBalanceData();

    const channel = supabase
      .channel('notifications-header-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`,
        },
        () => {
          fetchBalanceData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_balance_history',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchBalanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  useEffect(() => {
    if (currentPage === 'notifications') {
      setUnreadCount(0);
    }
  }, [currentPage]);

  return (
    <>
    <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 h-12 md:h-16">
      {(currentPage === 'market' || currentPage === 'dashboard') && (
        <div className="fixed top-12 left-4 right-4 z-40 md:hidden">
          <div
            onClick={onSearchToggle}
            className="bg-white rounded-full p-1 shadow-lg border-2 border-green-500 h-12 flex items-center justify-between px-3 cursor-pointer hover:bg-gray-50 transition"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMobileSidebar(true);
                onSidebarToggle?.(true);
              }}
              className="hover:bg-gray-100 rounded-full transition h-10 w-10 flex items-center justify-center flex-shrink-0"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
            </button>

            <div className="flex items-center gap-2">
              {onSearchToggle && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearchToggle();
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                >
                  <SearchIcon className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('notifications');
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition relative"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-12 flex items-center z-10 md:hidden">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-1.5 hover:opacity-80 transition"
        >
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-1.5 rounded-lg">
            <Leaf className="w-3 h-3 text-white" />
          </div>
          <span className="text-base font-bold text-gray-900">Agrinvest</span>
        </button>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-16">
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('dashboard')}
              className="hidden md:flex items-center gap-2 hover:opacity-80 transition"
            >
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Agrinvest</span>
            </button>

            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onNavigate('market')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentPage === 'market'
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Pasar
              </button>
              <button
                onClick={() => onNavigate('connections')}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  currentPage === 'connections'
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                Koneksi
              </button>
              <button
                onClick={() => onNavigate('protocol')}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  currentPage === 'protocol'
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Protokol
              </button>
              <button
                onClick={() => onNavigate('tasks')}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  currentPage === 'tasks'
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                Task
              </button>
              <button
                onClick={() => onNavigate('contributions')}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  currentPage === 'contributions'
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Heart className="w-4 h-4" />
                Kontribusi
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => handleBalanceModalChange(true)}
              className="hidden sm:flex items-center gap-3 px-4 py-2 hover:bg-gray-50 rounded-lg transition group"
            >
              <Wallet className="w-5 h-5 text-gray-600 group-hover:text-green-600 transition" />
              <div className="text-right">
                <div className="text-xs text-gray-500">Saldo</div>
                <div className="text-base font-bold text-gray-900">
                  Rp {profile?.balance ? formatRupiah(profile.balance) : '0'}
                </div>
                {!isAdmin && balancePercentage !== 0 && (
                  <div className={`flex items-center justify-end gap-1 text-xs font-medium ${
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
                {!isAdmin && todayHarvestRevenue > 0 && (
                  <div className={`flex items-center justify-end gap-1 text-xs font-medium ${
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
            </button>

            <button
              onClick={() => onNavigate('notifications')}
              className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="relative hidden md:block">
              <button
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setShowMobileSidebar(true);
                    onSidebarToggle?.(true);
                  } else {
                    setShowUserMenu(!showUserMenu);
                  }
                }}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border-2 border-green-500"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {profile?.full_name}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden md:block">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('account');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Pengaturan Akun
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('portfolio');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Briefcase className="w-4 h-4" />
                    Portfolio
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('transactions');
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Receipt className="w-4 h-4" />
                    Transaksi
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('admin');
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      Admin
                    </button>
                  )}
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>

    <MobileSidebar
      isOpen={showMobileSidebar}
      onClose={() => {
        setShowMobileSidebar(false);
        onSidebarToggle?.(false);
      }}
      onNavigate={onNavigate}
      onOpenBalanceModal={() => handleBalanceModalChange(true)}
    />

    {showBalanceModal && (
      <BalanceModal
        onClose={() => handleBalanceModalChange(false)}
        onSuccess={() => refreshProfile()}
      />
    )}
    </>
  );
}
