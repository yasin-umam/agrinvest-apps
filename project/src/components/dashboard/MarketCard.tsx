import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { useState } from 'react';
import type { Database } from '../../lib/database.types';

type ChiliProduct = Database['public']['Tables']['chili_products']['Row'];

interface MarketCardProps {
  product: ChiliProduct;
  onTrade: (product: ChiliProduct) => void;
  onModalChange?: (isOpen: boolean) => void;
}

export function MarketCard({ product, onTrade, onModalChange }: MarketCardProps) {
  const [showModal, setShowModal] = useState(false);
  const isPositive = product.price_change_percent_24h >= 0;

  const handleCardClick = () => {
    setShowModal(true);
    onModalChange?.(true);
  };

  const handleTradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(false);
    onModalChange?.(false);
    onTrade(product);
  };

  const getImageUrl = () => {
    return product.image_url || 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&h=300&fit=crop';
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
              <h3 className="font-bold text-gray-900">{product.code}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                product.grade === 'premium' ? 'bg-red-100 text-yellow-800' :
                product.grade === 'standard' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {product.grade}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                product.harvest_status === 'harvested'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {product.harvest_status === 'harvested' ? 'Sudah Panen' : 'Belum Panen'}
              </span>
            </div>
            <p className="text-sm text-gray-600">{product.name}</p>
          </div>

          <img
            src={getImageUrl()}
            alt={product.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              Rp {product.current_price.toLocaleString('id-ID')}
              <span className="text-sm font-normal text-gray-500">/unit</span>
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {isPositive ? '+' : ''}{product.price_change_percent_24h.toFixed(2)}%
              <span className="text-gray-500">
                ({isPositive ? '+' : ''}Rp {product.price_change_24h.toLocaleString('id-ID')})
              </span>
            </div>
          </div>

          <div className="flex gap-4 text-sm">
            <div>
              <div className="text-gray-500">Unit Tersedia</div>
              <div className={`font-semibold ${
                product.available_units > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {product.available_units.toLocaleString('id-ID')} unit
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onTrade(product);
            }}
            disabled={product.available_units === 0}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
          >
            {product.available_units === 0 ? 'Stok Habis' : 'Gabung Sekarang'}
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
                alt={product.name}
                className="w-full h-full object-cover rounded-t-2xl"
              />
            </div>

            <div className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">{product.code}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    product.grade === 'premium' ? 'bg-yellow-100 text-yellow-800' :
                    product.grade === 'standard' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {product.grade}
                  </span>
                  {product.is_active && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-xl text-gray-600 font-medium">{product.name}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 shadow-sm">
                  <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                    Informasi Harga
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-green-600 mb-2 font-semibold uppercase tracking-wide">Harga Saat Ini</div>
                      <div className="text-3xl font-bold text-gray-900">
                        Rp {product.current_price.toLocaleString('id-ID')}
                        <span className="text-base font-normal text-gray-500">/unit</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 text-sm font-semibold ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {isPositive ? '+' : ''}{product.price_change_percent_24h.toFixed(2)}%
                      </div>
                      <span className="text-xs text-gray-500">
                        ({isPositive ? '+' : ''}Rp {product.price_change_24h.toLocaleString('id-ID')})
                      </span>
                    </div>
                    <div className="border-t border-green-200 pt-4 mt-4">
                      <div className="text-xs text-green-600 mb-2 font-semibold uppercase tracking-wide">Harga Jual per Kg</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        Rp {product.selling_price_per_kg.toLocaleString('id-ID')}
                        <span className="text-base font-normal text-gray-500">/kg</span>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${
                        product.selling_price_change_percent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {product.selling_price_change_percent >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {product.selling_price_change_percent >= 0 ? '+' : ''}{product.selling_price_change_percent.toFixed(2)}%
                        <span className="text-gray-500 ml-1">dari kemarin</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                    Ketersediaan Unit
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-blue-600 mb-2 font-semibold uppercase tracking-wide">Unit Tersedia untuk Dibeli</div>
                      <div className={`text-3xl font-bold ${
                        product.available_units > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {product.available_units.toLocaleString('id-ID')} <span className="text-base font-normal text-gray-500">unit</span>
                      </div>
                      {product.available_units === 0 && (
                        <div className="mt-2 px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full inline-block">
                          Stok Habis
                        </div>
                      )}
                    </div>
                    <div className="border-t border-blue-200 pt-4">
                      <div className="text-xs text-blue-600 mb-2 font-semibold uppercase tracking-wide">Total Volume Produk</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {product.total_volume.toLocaleString('id-ID')} <span className="text-base font-normal text-gray-500">unit</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 shadow-sm">
                  <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                    Informasi Lahan
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-amber-600 mb-2 font-semibold uppercase tracking-wide">Luas Area</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {product.area_size.toLocaleString('id-ID')} <span className="text-base font-normal text-gray-500">m²</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-amber-600 mb-2 font-semibold uppercase tracking-wide">Populasi Tanaman</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {product.plant_population.toLocaleString('id-ID')} 
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-amber-600 mb-2 font-semibold uppercase tracking-wide">Modal per Tanaman</div>
                      <div className="text-xl font-medium text-gray-900">
                        Rp {product.cost_per_plant.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-amber-600 mb-2 font-semibold uppercase tracking-wide">Modal per Area</div>
                      <div className="text-xl font-medium text-gray-900">
                        Rp {product.cost_per_area.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-100 shadow-sm">
                  <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <div className="w-1 h-4 bg-teal-500 rounded-full"></div>
                    Informasi Panen
                  </h3>
                  {product.harvest_status === 'harvested' ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-teal-600 mb-2 font-semibold uppercase tracking-wide">Umur Tanaman</div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {product.age_days} <span className="text-base font-normal text-gray-500">hari</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-teal-600 mb-2 font-semibold uppercase tracking-wide">Berapa Kali Panen</div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {product.harvest_count}x
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-teal-600 mb-2 font-semibold uppercase tracking-wide">Kuantitas Dipanen</div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {product.harvest_kg.toLocaleString('id-ID')} <span className="text-base font-normal text-gray-500">kg</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-teal-600 mb-2 font-semibold uppercase tracking-wide">Harga Rata-Rata</div>
                        <div className="text-2xl font-semibold text-gray-900">
                          Rp {product.selling_price_per_kg.toLocaleString('id-ID')}
                          <span className="text-base font-normal text-gray-500">/kg</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-teal-600 mb-2 font-semibold uppercase tracking-wide">Total Pendapatan</div>
                        <div className="text-2xl font-bold text-gray-900">
                          Rp {product.total_revenue.toLocaleString('id-ID')}
                        </div>
                        {product.selling_price_change_percent !== 0 && (
                          <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${
                            product.selling_price_change_percent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {product.selling_price_change_percent >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {product.selling_price_change_percent >= 0 ? '+' : ''}{product.selling_price_change_percent.toFixed(2)}%
                            <span className="text-gray-500 ml-1">vs yesterday</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[150px]">
                      <div className="text-center">
                        <div className="text-gray-400 text-xl font-bold">Belum Panen</div>
                        <div className="text-xs text-gray-400 mt-2">
                          Status: {
                            product.harvest_status === 'ready' ? 'Siap Panen' :
                            product.harvest_status === 'growing' ? 'Dalam Pertumbuhan' :
                            'Baru Ditanam'
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-100 shadow-sm">
                  <h3 className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-5 flex items-center gap-2">
                    <div className="w-1 h-4 bg-violet-500 rounded-full"></div>
                    Informasi Lokasi & Kategori
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-violet-600 mb-2 font-semibold uppercase tracking-wide">Lokasi</div>
                      <div className="text-2xl font-semibold text-gray-900">
                        {product.location || 'Tidak tersedia'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-violet-600 mb-2 font-semibold uppercase tracking-wide">Kategori</div>
                      <div className="text-lg font-medium text-gray-900 capitalize">
                        {product.category.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-violet-600 mb-2 font-semibold uppercase tracking-wide">Grade</div>
                      <div className="text-lg font-medium text-gray-900 capitalize">
                        {product.grade}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {product.description && (
                <div className="mb-8 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="w-1 h-4 bg-slate-500 rounded-full"></div>
                    Deskripsi Produk
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-base font-medium">
                    {product.description}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleTradeClick}
                  disabled={product.available_units === 0}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                >
                  {product.available_units === 0 ? 'Stok Habis' : 'Gabung Sekarang'}
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
