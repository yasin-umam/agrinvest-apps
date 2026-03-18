import { TrendingUp, TrendingDown, X} from 'lucide-react';
import { useState } from 'react';

interface ExtendedRegion {
  id: string;
  code: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  company_count?: number;
  total_company_value?: number;
  available_units?: number;
  current_price: number;
  price_change_percent_24h?: number;
  total_volume?: number;
  total_revenue?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  total_units?: number;
  price_per_unit?: number;
  company_growth_percent?: number;
  company_decline_percent?: number;
  revenue_growth_yoy_percent?: number;
}

interface RegionCardProps {
  region: ExtendedRegion;
  onTrade: (region: ExtendedRegion) => void; 
  onModalChange?: (isOpen: boolean) => void;
  
}

  export function RegionCard ({ region, onTrade, onModalChange}:RegionCardProps) {
    const [showModal, setShowModal] = useState(false);
    const priceChange = region?.price_change_percent_24h ?? 0;
    const isPositive = priceChange >= 0;
    const totalCompanyValue = region.total_company_value ?? 0;
    const totalUnits = region.total_units ?? region.total_volume ?? 0;
    const pricePerUnit = region.price_per_unit ?? region.current_price;
    const availableUnits = region.available_units ?? 0;
    const soldUnits = Math.max(0, totalUnits - availableUnits);
    const netProfit = (region.total_revenue ?? 0) - totalCompanyValue;
    const profitMarginPercent = totalCompanyValue > 0 ? (netProfit / totalCompanyValue) * 100 : 0;
    const companyGrowthPercent = region.company_growth_percent ?? 0;
    const companyDeclinePercent = region.company_decline_percent ?? 0;
    const revenueGrowthYoYPercent = region.revenue_growth_yoy_percent ?? 0;
    const handleCardClick = () => {
      setShowModal(true);
      onModalChange?.(true);
    }

  const handleTradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(false);
    onModalChange?.(false);
    onTrade(region);
  };

    const getImageUrl = () => {
    return region.image_url || 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=300&fit=crop';
  };

  return (
   <>
      <div
        className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-gray-900">{region.code}</h3>
              {region.is_active && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Aktif
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{region.name}</p>
          </div>

          <img
            src={getImageUrl()}
            alt={region.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              Rp {pricePerUnit.toLocaleString('id-ID')}
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {isPositive ? '+' : ''}{(region.price_change_percent_24h ?? 0).toFixed(2)}%
            </div>
          </div>

          <div className="text-sm">
            <div className="text-gray-500">Unit Tersedia</div>
            <div className={`font-semibold ${
              availableUnits > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {availableUnits.toLocaleString('id-ID')} unit
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onTrade(region);
            }}
            disabled={(region.company_count ?? 0) === 0}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
          >
            {(region.company_count ?? 0) === 0 ? 'Tidak Tersedia' : 'Lihat Detail'}
          </button>
        </div>
      </div>


      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowModal(false);
            onModalChange?.(false);
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-white/90 rounded-full w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-colors z-10 shadow-lg"
              onClick={() => {
                setShowModal(false);
                onModalChange?.(false);
              }}
            >
              <X size={20} />
            </button>

            <div className="relative h-72">
              <img
                src={getImageUrl()}
                alt={region.name}
                className="w-full h-full object-cover rounded-t-2xl"
              />
            </div>

            <div className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">{region.code}</h2>
                  {region.is_active && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-xl text-gray-600 font-medium">{region.name}</p>
                <p className="text-sm text-gray-500 mt-2">{region.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 shadow-sm">
                  <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                    Informasi Harga
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-green-600 mb-2 font-semibold uppercase tracking-wide">Harga per Unit</div>
                      <div className="text-3xl font-bold text-gray-900">
                        Rp {pricePerUnit.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="border-t border-green-200 pt-4">
                      <div className="text-xs text-green-600 mb-2 font-semibold uppercase tracking-wide">Total Unit</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {totalUnits.toLocaleString('id-ID')} unit
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Sinkron dengan total nilai perusahaan di region ini
                      </div>
                    </div>
                    <div className="border-t border-green-200 pt-4">
                      <div className="text-xs text-green-600 mb-2 font-semibold uppercase tracking-wide">Unit Tersedia</div>
                      <div className={`text-2xl font-semibold ${
                        availableUnits > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {availableUnits.toLocaleString('id-ID')} unit
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {soldUnits.toLocaleString('id-ID')} unit sudah terbeli
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t border-green-200 pt-4">
                      <div className={`flex items-center gap-1 text-sm font-semibold ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {isPositive ? '+' : ''}{(region.price_change_percent_24h ?? 0).toFixed(2)}%
                      </div>
                      <span className="text-xs text-gray-500">pergerakan harga 24 jam</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                    Informasi Perusahaan
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-blue-600 mb-2 font-semibold uppercase tracking-wide">Jumlah Perusahaan</div>
                      <div className={`text-3xl font-bold ${
                        (region.company_count ?? 0) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(region.company_count ?? 0).toLocaleString('id-ID')}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-white/70 p-3 border border-blue-100">
                          <div className="text-blue-600 font-semibold uppercase tracking-wide">Pertambahan</div>
                          <div className="mt-1 font-bold text-green-600">+{companyGrowthPercent.toFixed(2)}%</div>
                        </div>
                        <div className="rounded-xl bg-white/70 p-3 border border-blue-100">
                          <div className="text-blue-600 font-semibold uppercase tracking-wide">Pengurangan</div>
                          <div className="mt-1 font-bold text-red-600">-{companyDeclinePercent.toFixed(2)}%</div>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-blue-200 pt-4">
                      <div className="text-xs text-blue-600 mb-2 font-semibold uppercase tracking-wide">Total Pendapatan Perusahaan</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        Rp {(region.total_revenue ?? 0).toLocaleString('id-ID')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {revenueGrowthYoYPercent >= 0 ? '+' : ''}{revenueGrowthYoYPercent.toFixed(2)}% dibanding bulan yang sama tahun lalu
                      </div>
                    </div>
                    <div className="border-t border-blue-200 pt-4">
                      <div className="text-xs text-blue-600 mb-2 font-semibold uppercase tracking-wide">Laba Bersih</div>
                      <div className={`text-2xl font-semibold ${
                        netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Rp {netProfit.toLocaleString('id-ID')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {profitMarginPercent >= 0 ? '+' : ''}{profitMarginPercent.toFixed(2)}% dari total nilai seluruh perusahaan di region ini
                      </div>
                    </div>
                    <div className="border-t border-blue-200 pt-4">
                      <div className="text-xs text-blue-600 mb-2 font-semibold uppercase tracking-wide">Total Nilai Perusahaan</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        Rp {totalCompanyValue.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleTradeClick}
                  disabled={(region.company_count ?? 0) === 0}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                >
                  {(region.company_count ?? 0) === 0 ? 'Tidak Ada Perusahaan' : 'Lihat Detail'}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    onModalChange?.(false);
                  }}
                  className="px-6 py-3 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    
   </>
  );
}
