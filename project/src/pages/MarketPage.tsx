import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MarketCard } from '../components/dashboard/MarketCard';
import { TradeModal } from '../components/dashboard/TradeModal';
import { RegionCard } from '../components/dashboard/RegionCard';
import { Search, Filter, Building2, ShieldAlert, Leaf } from 'lucide-react';
import type { Database } from '../lib/database.types';

type ChiliProduct = Database['public']['Tables']['chili_products']['Row'];

type Submenu = 'komoditas' | 'korporasi' | 'non-halal';

interface Region {
  id: string;
  code: string;
  name: string;
  description: string;
  corporationCount: number;
}

interface MarketPageProps {
  showMobileSearch?: boolean;
  onModalChange?: (isOpen: boolean) => void;
}

export function MarketPage({ showMobileSearch = false, onModalChange }: MarketPageProps) {
  const [products, setProducts] = useState<ChiliProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ChiliProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ChiliProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [activeSubmenu, setActiveSubmenu] = useState<Submenu>('komoditas');

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('chili_products')
      .select('*')
      .eq('is_active', true)
      .order('traded_volume_24h', { ascending: false });

    if (!error && data) {
      setProducts(data);
      setFilteredProducts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();

    const channel = supabase
      .channel('market-products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chili_products',
          filter: 'is_active=eq.true'
        },
        (payload) => {
          console.log('MarketPage: Realtime update received', payload);
          loadProducts();
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error('MarketPage: Subscription error:', error);
        }
        console.log('MarketPage: Subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let filtered = products.filter((p) => p.available_units > 0);

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  }, [searchQuery, categoryFilter, products]);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const korporasiRegions: Region[] = [
    {
      id: '1',
      code: 'GRSK',
      name: 'Kabupaten Gresik',
      description: 'Wilayah industri dengan fokus pada sektor agrikultur dan manufaktur',
      corporationCount: 12
    },
    {
      id: '2',
      code: 'SBY',
      name: 'Kota Surabaya',
      description: 'Pusat bisnis dan perdagangan Jawa Timur',
      corporationCount: 25
    },
    {
      id: '3',
      code: 'MLG',
      name: 'Kota Malang',
      description: 'Wilayah pertanian dan pariwisata dengan potensi agribisnis tinggi',
      corporationCount: 18
    }
  ];

  const nonHalalRegions: Region[] = [
    {
      id: '4',
      code: 'GRSK-NH',
      name: 'Kabupaten Gresik',
      description: 'Korporasi non-halal di wilayah Gresik',
      corporationCount: 5
    },
    {
      id: '5',
      code: 'SBY-NH',
      name: 'Kota Surabaya',
      description: 'Korporasi non-halal di wilayah Surabaya',
      corporationCount: 8
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat data pasar...</div>
      </div>
    );
  }

return (
  <div
    className={`space-y-6 transition-all duration-300 ${
      showMobileSearch ? "pt-16" : ""
    }`}
  >
    {showMobileSearch && (
      <div className="md:hidden fixed top-32 left-4 right-4 z-40 animate-slideDown">
        <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-green-500">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>
      </div>
    )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pasar</h1>
        <p className="text-gray-600">Harga komoditas agrikultur real-time</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveSubmenu('komoditas')}
          className={`flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeSubmenu === 'komoditas'
              ? 'bg-green-500 text-white shadow-lg md:scale-105'
              : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-green-500 hover:shadow-md'
          }`}
        >
          <Leaf className="w-4 h-4 md:w-5 md:h-5" />
          <span className="text-sm md:text-base">Komoditas</span>
        </button>
        <button
          onClick={() => setActiveSubmenu('korporasi')}
          className={`flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeSubmenu === 'korporasi'
              ? 'bg-green-500 text-white shadow-lg md:scale-105'
              : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-green-500 hover:shadow-md'
          }`}
        >
          <Building2 className="w-4 h-4 md:w-5 md:h-5" />
          <span className="text-sm md:text-base">Korporasi</span>
        </button>
        <button
          onClick={() => setActiveSubmenu('non-halal')}
          className={`flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
            activeSubmenu === 'non-halal'
              ? 'bg-green-500 text-white shadow-lg md:scale-105'
              : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-green-500 hover:shadow-md'
          }`}
        >
          <ShieldAlert className="w-4 h-4 md:w-5 md:h-5" />
          <span className="text-sm md:text-base">Non-shariah</span>
        </button>
      </div>

      {activeSubmenu === 'komoditas' && (
        <div className="hidden md:flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-48 pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {activeSubmenu === 'komoditas' ? (
        filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center min-h-[400px] flex items-center justify-center">
            <div>
              <p className="text-gray-500 text-lg mb-2">Tidak ada produk ditemukan</p>
              <p className="text-gray-400 text-sm">Coba kata kunci lain atau ubah filter kategori</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <MarketCard
                key={product.id}
                product={product}
                onTrade={setSelectedProduct}
                onModalChange={onModalChange}
              />
            ))}
          </div>
        )
      ) : activeSubmenu === 'korporasi' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {korporasiRegions.map((region) => (
            <RegionCard
              key={region.id}
              code={region.code}
              name={region.name}
              description={region.description}
              corporationCount={region.corporationCount}
              onClick={() => {
                alert(`Membuka detail korporasi untuk ${region.name}`);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nonHalalRegions.map((region) => (
            <RegionCard
              key={region.id}
              code={region.code}
              name={region.name}
              description={region.description}
              corporationCount={region.corporationCount}
              onClick={() => {
                alert(`Membuka detail korporasi non-halal untuk ${region.name}`);
              }}
            />
          ))}
        </div>
      )}

      {selectedProduct && (
        <TradeModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSuccess={loadProducts}
        />
      )}
    </div>
  );
}
