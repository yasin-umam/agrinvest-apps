import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, TrendingDown, ChevronRight, ArrowLeft } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { SellModal } from '../components/dashboard/SellModal';

type Portfolio = Database['public']['Tables']['portfolios']['Row'] & {
  chili_products: Database['public']['Tables']['chili_products']['Row'];
};

type HarvestDistribution = {
  id: string;
  product_id: string;
  harvest_kg: number;
  user_revenue: number;
  user_units: number;
  ownership_percentage: number;
  created_at: string;
  chili_products: {
    name: string;
  };
};

interface PortfolioPageProps {
  onBack?: () => void;
}

export function PortfolioPage({ onBack }: PortfolioPageProps = {}) {
  const { profile } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [latestHarvest, setLatestHarvest] = useState<HarvestDistribution | null>(null);
  const [totalHarvestRevenue, setTotalHarvestRevenue] = useState(0);
  const [previousHarvestRevenue, setPreviousHarvestRevenue] = useState(0);
  const [productHarvestRevenue, setProductHarvestRevenue] = useState<Record<string, number>>({});
  const [previousProductHarvestRevenue, setPreviousProductHarvestRevenue] = useState<Record<string, number>>({});

  const loadPortfolio = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('portfolios')
      .select('*, chili_products(*)')
      .eq('user_id', profile.id)
      .order('total_invested', { ascending: false });

    if (!error && data) {
      setPortfolios(data as Portfolio[]);
    }
    setLoading(false)
  };

  const loadLatestHarvest = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('user_harvest_distributions')
      .select('*, chili_products(name)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setLatestHarvest(data as HarvestDistribution);
    }
  };

  const loadHarvestRevenue = async () => {
    if (!profile) return;

    const { data: allHarvests, error } = await supabase
      .from('user_harvest_distributions')
      .select('user_revenue, created_at, product_id')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && allHarvests && allHarvests.length > 0) {
      const total = allHarvests.reduce((sum, h) => sum + h.user_revenue, 0);
      setTotalHarvestRevenue(total);

      if (allHarvests.length > 1) {
        const previous = allHarvests.slice(1).reduce((sum, h) => sum + h.user_revenue, 0);
        setPreviousHarvestRevenue(previous);
      } else {
        setPreviousHarvestRevenue(0);
      }

      const revenueByProduct: Record<string, number> = {};
      const previousRevenueByProduct: Record<string, number> = {};

      allHarvests.forEach(harvest => {
        if (!revenueByProduct[harvest.product_id]) {
          revenueByProduct[harvest.product_id] = 0;
        }
        revenueByProduct[harvest.product_id] += harvest.user_revenue;
      });

      if (allHarvests.length > 1) {
        allHarvests.slice(1).forEach(harvest => {
          if (!previousRevenueByProduct[harvest.product_id]) {
            previousRevenueByProduct[harvest.product_id] = 0;
          }
          previousRevenueByProduct[harvest.product_id] += harvest.user_revenue;
        });
      }

      setProductHarvestRevenue(revenueByProduct);
      setPreviousProductHarvestRevenue(previousRevenueByProduct);
    }
  };

  useEffect(() => {
    loadPortfolio();
    loadLatestHarvest();
    loadHarvestRevenue();

    if (!profile) return;

    const portfolioChannel = supabase
      .channel('portfolio-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolios',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          loadPortfolio();
        }
      )
      .subscribe();

    const harvestChannel = supabase
      .channel('harvest-distributions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_harvest_distributions',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          loadLatestHarvest();
          loadHarvestRevenue();
        }
      )
      .subscribe();

    const productsChannel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chili_products',
        },
        () => {
          loadPortfolio();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(portfolioChannel);
      supabase.removeChannel(harvestChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [profile]);

  const totalUnits = portfolios.reduce((sum, p) => sum + p.quantity, 0);
  const totalAssetValue = portfolios.reduce(
    (sum, p) => sum + p.quantity * p.chili_products.current_price,
    0
  );
  const totalInvested = portfolios.reduce((sum, p) => sum + p.total_invested, 0);
  const totalReturn = totalAssetValue - totalInvested;
  const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  const harvestChange = totalHarvestRevenue - previousHarvestRevenue;
  const harvestChangePercentage = previousHarvestRevenue > 0 ? (harvestChange / previousHarvestRevenue) * 100 : 0;
  const isHarvestIncreasing = harvestChange >= 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Memuat portofolio...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen overflow-x-hidden">
      <div className="bg-white px-4 sm:px-6 py-6 shadow-md border-b border-gray-200 mb-0">
        {onBack && (
          <button
            onClick={onBack}
            className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:border-green-500 hover:-translate-y-px mb-4 md:hidden"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Portfolio</h1>
        <p className="text-gray-600 mb-6">Investasi dan aset Anda</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-center">
              <h3 className="text-sm text-gray-600 mb-2 font-medium">
                Total Aset
              </h3>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${totalAssetValue >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(totalAssetValue)}
                  </span>
                  <div className="flex items-center gap-1">
                    {totalReturnPercentage >= 0 ? (
                      <>
                        <TrendingUp size={16} className="text-green-500" />
                        <span className="text-sm font-semibold text-green-500">
                          {Math.abs(totalReturnPercentage).toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown size={16} className="text-red-500" />
                        <span className="text-sm font-semibold text-red-500">
                          {Math.abs(totalReturnPercentage).toFixed(2)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-center">
              <h3 className="text-sm text-gray-600 mb-2 font-medium">
                Total Unit
              </h3>
              <span className="text-2xl font-bold text-gray-900">
                {formatNumber(totalUnits)} Unit
              </span>
            </div>

            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-center">
              <h3 className="text-sm text-gray-600 mb-2 font-medium">
                Akumulasi Hasil Panen
              </h3>
              <div className="flex flex-col items-center gap-2">
                <span className={`text-2xl font-bold ${isHarvestIncreasing ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(totalHarvestRevenue)}
                </span>
                {previousHarvestRevenue > 0 && (
                  <div className="flex items-center gap-1">
                    {isHarvestIncreasing ? (
                      <>
                        <TrendingUp size={16} className="text-green-500" />
                        <span className="text-sm font-semibold text-green-500">
                          {Math.abs(harvestChangePercentage).toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown size={16} className="text-red-500" />
                        <span className="text-sm font-semibold text-red-500">
                          {Math.abs(harvestChangePercentage).toFixed(2)}%
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      <div className="bg-white overflow-hidden shadow-md border-b border-gray-200 pb-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Aset
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    Harga per Unit
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    Nilai Panen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {portfolios.map((portfolio) => {
                  const harvestRevenue = productHarvestRevenue[portfolio.product_id] || 0;
                  const previousHarvestRev = previousProductHarvestRevenue[portfolio.product_id] || 0;
                  const harvestChange = harvestRevenue - previousHarvestRev;
                  const harvestChangePercent = previousHarvestRev > 0 ? (harvestChange / previousHarvestRev) * 100 : 0;
                  const isIncreasing = harvestChange >= 0;

                  return (
                    <tr
                      key={portfolio.id}
                      className="cursor-pointer hover:bg-gray-50 transition"
                      onClick={() => setSelectedPortfolio(portfolio)}
                    >
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900 text-sm">
                            {portfolio.chili_products.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {portfolio.chili_products.code}
                          </div>
                          <div className="font-medium text-gray-900 text-xs">
                            {formatNumber(portfolio.quantity)} {portfolio.chili_products.unit}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900 text-sm">
                            {formatCurrency(portfolio.chili_products.current_price)}
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            {portfolio.chili_products.price_change_percent_24h >= 0 ? (
                              <>
                                <TrendingUp size={12} className="text-green-500" />
                                <span className="text-xs font-semibold text-green-500">
                                  {Math.abs(portfolio.chili_products.price_change_percent_24h).toFixed(1)}%
                                </span>
                              </>
                            ) : (
                              <>
                                <TrendingDown size={12} className="text-red-500" />
                                <span className="text-xs font-semibold text-red-500">
                                  {Math.abs(portfolio.chili_products.price_change_percent_24h).toFixed(1)}%
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="space-y-1">
                          <div className={`font-semibold text-sm ${harvestRevenue > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                            {harvestRevenue > 0 ? formatCurrency(harvestRevenue) : 'Rp 0'}
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            {harvestRevenue > 0 && previousHarvestRev > 0 ? (
                              <>
                                {isIncreasing ? (
                                  <>
                                    <TrendingUp size={12} className="text-green-500" />
                                    <span className="text-xs font-semibold text-green-500">
                                      {Math.abs(harvestChangePercent).toFixed(1)}%
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <TrendingDown size={12} className="text-red-500" />
                                    <span className="text-xs font-semibold text-red-500">
                                      {Math.abs(harvestChangePercent).toFixed(1)}%
                                    </span>
                                  </>
                                )}
                              </>
                            ) : (
                              <span className="text-xs font-semibold text-gray-400">
                                0.0%
                              </span>
                            )}
                            <ChevronRight size={18} className="text-gray-400" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      {selectedPortfolio && (
        <SellModal
          portfolio={selectedPortfolio}
          onClose={() => setSelectedPortfolio(null)}
          onSuccess={loadPortfolio}
        />
      )}
    </div>
  );
}
