import { useState } from 'react';
import { Users, UserPlus, Star, Search, MessageCircle, UserMinus, Award, TrendingUp } from 'lucide-react';

type TabType = 'contributors' | 'cocreators';

interface Project {
  id: string;
  name: string;
  status: 'completed' | 'ongoing' | 'cancelled';
  location: string;
  startDate: string;
  endDate?: string;
  contribution: string;
  revenue?: string;
}

interface Contributor {
  id: string;
  name: string;
  avatar: string;
  role: string;
  contributions: number;
  joinedDate: string;
  status: 'active' | 'inactive';
  projects?: Project[];
}

interface CoCreator {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  projects: number;
  revenue: string;
  status: 'active' | 'inactive';
  projectList?: Project[];
}

const dummyContributors: Contributor[] = [
  {
    id: '1',
    name: 'Budi Santoso',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200',
    role: 'Ahli Pertanian',
    contributions: 45,
    joinedDate: '2024-01-15',
    status: 'active',
    projects: [
      {
        id: '1',
        name: 'Cabai Merah Keriting Premium Batch A',
        status: 'completed',
        location: 'Bogor, Jawa Barat',
        startDate: '2023-08-01',
        endDate: '2023-11-15',
        contribution: 'Konsultasi teknis penanaman',
        revenue: 'Rp 45.500.000'
      },
      {
        id: '2',
        name: 'Cabai Rawit Hijau Organik',
        status: 'completed',
        location: 'Cianjur, Jawa Barat',
        startDate: '2023-12-01',
        endDate: '2024-03-20',
        contribution: 'Supervisi pemupukan',
        revenue: 'Rp 32.800.000'
      },
      {
        id: '3',
        name: 'Cabai Merah Besar Grade A',
        status: 'completed',
        location: 'Bandung, Jawa Barat',
        startDate: '2024-01-10',
        endDate: '2024-04-25',
        contribution: 'Monitoring pertumbuhan',
        revenue: 'Rp 56.200.000'
      }
    ]
  },
  {
    id: '2',
    name: 'Siti Rahma',
    avatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=200',
    role: 'Spesialis Cabai',
    contributions: 32,
    joinedDate: '2024-02-20',
    status: 'active',
    projects: [
      {
        id: '4',
        name: 'Cabai Keriting Hybrid',
        status: 'completed',
        location: 'Garut, Jawa Barat',
        startDate: '2023-09-15',
        endDate: '2024-01-10',
        contribution: 'Analisis kualitas bibit',
        revenue: 'Rp 41.300.000'
      },
      {
        id: '5',
        name: 'Cabai Merah Premium Export',
        status: 'completed',
        location: 'Lembang, Jawa Barat',
        startDate: '2024-02-01',
        endDate: '2024-05-15',
        contribution: 'Quality assurance',
        revenue: 'Rp 68.900.000'
      }
    ]
  },
  {
    id: '3',
    name: 'Ahmad Yusuf',
    avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=200',
    role: 'Teknisi Lapangan',
    contributions: 28,
    joinedDate: '2024-01-30',
    status: 'active',
    projects: [
      {
        id: '6',
        name: 'Cabai Rawit Merah',
        status: 'completed',
        location: 'Sukabumi, Jawa Barat',
        startDate: '2023-10-01',
        endDate: '2024-01-20',
        contribution: 'Instalasi sistem irigasi',
        revenue: 'Rp 38.700.000'
      }
    ]
  },
  {
    id: '4',
    name: 'Dewi Lestari',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',
    role: 'Quality Control',
    contributions: 38,
    joinedDate: '2023-12-10',
    status: 'active',
    projects: [
      {
        id: '7',
        name: 'Cabai Merah Keriting A+',
        status: 'completed',
        location: 'Ciwidey, Jawa Barat',
        startDate: '2023-11-01',
        endDate: '2024-02-28',
        contribution: 'Inspeksi kualitas panen',
        revenue: 'Rp 52.400.000'
      },
      {
        id: '8',
        name: 'Cabai Hijau Premium',
        status: 'completed',
        location: 'Pangalengan, Jawa Barat',
        startDate: '2024-01-15',
        endDate: '2024-04-30',
        contribution: 'Quality control packaging',
        revenue: 'Rp 44.600.000'
      }
    ]
  },
  {
    id: '5',
    name: 'Rudi Hermawan',
    avatar: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=200',
    role: 'Koordinator Panen',
    contributions: 52,
    joinedDate: '2023-11-05',
    status: 'active',
    projects: [
      {
        id: '9',
        name: 'Cabai Merah Super',
        status: 'completed',
        location: 'Subang, Jawa Barat',
        startDate: '2023-07-01',
        endDate: '2023-10-30',
        contribution: 'Koordinasi tim panen',
        revenue: 'Rp 61.800.000'
      },
      {
        id: '10',
        name: 'Cabai Rawit Putih',
        status: 'completed',
        location: 'Purwakarta, Jawa Barat',
        startDate: '2023-11-15',
        endDate: '2024-02-25',
        contribution: 'Manajemen logistik panen',
        revenue: 'Rp 48.200.000'
      },
      {
        id: '11',
        name: 'Cabai Gendot Premium',
        status: 'completed',
        location: 'Tasikmalaya, Jawa Barat',
        startDate: '2024-03-01',
        endDate: '2024-06-15',
        contribution: 'Supervisi panen',
        revenue: 'Rp 55.300.000'
      }
    ]
  },
  {
    id: '6',
    name: 'Lina Wijaya',
    avatar: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=200',
    role: 'Analis Hasil',
    contributions: 19,
    joinedDate: '2024-03-01',
    status: 'inactive',
    projects: [
      {
        id: '12',
        name: 'Cabai Merah Standard',
        status: 'completed',
        location: 'Karawang, Jawa Barat',
        startDate: '2024-03-15',
        endDate: '2024-06-30',
        contribution: 'Analisis hasil produksi',
        revenue: 'Rp 36.900.000'
      }
    ]
  }
];

const dummyCoCreators: CoCreator[] = [
  {
    id: '1',
    name: 'Agro Sejahtera Farm',
    avatar: 'https://images.pexels.com/photos/1595104/pexels-photo-1595104.jpeg?auto=compress&cs=tinysrgb&w=200',
    specialty: 'Cabai Premium',
    projects: 5,
    revenue: 'Rp 125.000.000',
    status: 'active',
    projectList: [
      {
        id: '13',
        name: 'Cabai Merah Keriting Export Quality',
        status: 'ongoing',
        location: 'Cianjur, Jawa Barat',
        startDate: '2024-10-15',
        contribution: 'Pengelolaan lahan & penanaman',
        revenue: 'Est. Rp 85.000.000'
      },
      {
        id: '14',
        name: 'Cabai Rawit Super Pedas',
        status: 'ongoing',
        location: 'Garut, Jawa Barat',
        startDate: '2024-11-01',
        contribution: 'Produksi & quality control',
        revenue: 'Est. Rp 72.500.000'
      },
      {
        id: '13a',
        name: 'Cabai Merah Batch Januari 2024',
        status: 'completed',
        location: 'Bogor, Jawa Barat',
        startDate: '2024-01-10',
        endDate: '2024-04-25',
        contribution: 'Pengelolaan lahan & penanaman',
        revenue: 'Rp 78.500.000'
      },
      {
        id: '13b',
        name: 'Cabai Keriting Premium Grade A',
        status: 'completed',
        location: 'Bandung, Jawa Barat',
        startDate: '2024-05-01',
        endDate: '2024-08-15',
        contribution: 'Penanaman & pemeliharaan',
        revenue: 'Rp 92.300.000'
      }
    ]
  },
  {
    id: '2',
    name: 'PT Tani Makmur',
    avatar: 'https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=200',
    specialty: 'Distribusi & Logistik',
    projects: 8,
    revenue: 'Rp 89.500.000',
    status: 'active',
    projectList: [
      {
        id: '16',
        name: 'Cabai Merah Besar Premium',
        status: 'ongoing',
        location: 'Bandung, Jawa Barat',
        startDate: '2024-09-20',
        contribution: 'Logistik & distribusi',
        revenue: 'Est. Rp 68.300.000'
      },
      {
        id: '17',
        name: 'Cabai Keriting Grade A',
        status: 'ongoing',
        location: 'Tasikmalaya, Jawa Barat',
        startDate: '2024-10-05',
        contribution: 'Supply chain management',
        revenue: 'Est. Rp 54.800.000'
      },
      {
        id: '16a',
        name: 'Cabai Merah Batch Q1 2024',
        status: 'completed',
        location: 'Jakarta, Jawa Barat',
        startDate: '2024-01-15',
        endDate: '2024-04-30',
        contribution: 'Distribusi nasional',
        revenue: 'Rp 65.200.000'
      },
      {
        id: '16b',
        name: 'Cabai Premium Export USA',
        status: 'completed',
        location: 'Bogor, Jawa Barat',
        startDate: '2024-03-01',
        endDate: '2024-06-20',
        contribution: 'Logistik ekspor',
        revenue: 'Rp 124.800.000'
      },
      {
        id: '16c',
        name: 'Cabai Rawit Super Pedas',
        status: 'completed',
        location: 'Cianjur, Jawa Barat',
        startDate: '2024-06-10',
        endDate: '2024-09-15',
        contribution: 'Supply chain management',
        revenue: 'Rp 58.400.000'
      }
    ]
  },
  {
    id: '3',
    name: 'Kebun Hijau Indonesia',
    avatar: 'https://images.pexels.com/photos/1459339/pexels-photo-1459339.jpeg?auto=compress&cs=tinysrgb&w=200',
    specialty: 'Organic Farming',
    projects: 3,
    revenue: 'Rp 64.200.000',
    status: 'active',
    projectList: [
      {
        id: '20',
        name: 'Cabai Organik Merah',
        status: 'ongoing',
        location: 'Ciwidey, Jawa Barat',
        startDate: '2024-10-10',
        contribution: 'Pertanian organik bersertifikat',
        revenue: 'Est. Rp 76.500.000'
      },
      {
        id: '21',
        name: 'Cabai Rawit Organik Premium',
        status: 'ongoing',
        location: 'Pangalengan, Jawa Barat',
        startDate: '2024-11-25',
        contribution: 'Organic farming & sertifikasi',
        revenue: 'Est. Rp 58.900.000'
      }
    ]
  },
  {
    id: '4',
    name: 'Mitra Tani Sukses',
    avatar: 'https://images.pexels.com/photos/1105019/pexels-photo-1105019.jpeg?auto=compress&cs=tinysrgb&w=200',
    specialty: 'Pemasaran Digital',
    projects: 6,
    revenue: 'Rp 95.800.000',
    status: 'active',
    projectList: [
      {
        id: '22',
        name: 'Cabai Keriting Premium Digital',
        status: 'ongoing',
        location: 'Jakarta & Jawa Barat',
        startDate: '2024-09-15',
        contribution: 'Digital marketing & e-commerce',
        revenue: 'Est. Rp 82.400.000'
      },
      {
        id: '23',
        name: 'Cabai Merah Super Online',
        status: 'ongoing',
        location: 'Multi-location',
        startDate: '2024-10-20',
        contribution: 'Platform penjualan online',
        revenue: 'Est. Rp 91.200.000'
      },
      {
        id: '24',
        name: 'Cabai Premium Marketplace',
        status: 'ongoing',
        location: 'Jabodetabek',
        startDate: '2024-11-10',
        contribution: 'Integrasi marketplace',
        revenue: 'Est. Rp 73.600.000'
      }
    ]
  }
];

interface ConnectionsPageProps {
  onViewProfile?: () => void;
}

export function ConnectionsPage({ onViewProfile }: ConnectionsPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('contributors');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContributors = dummyContributors.filter(contributor =>
    contributor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contributor.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCoCreators = dummyCoCreators.filter(coCreator =>
    coCreator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coCreator.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewContributor = (contributor: Contributor) => {
    sessionStorage.setItem('selectedProfile', JSON.stringify({
      ...contributor,
      projectList: contributor.projects,
      type: 'contributor'
    }));
    onViewProfile?.();
  };

  const handleViewCoCreator = (coCreator: CoCreator) => {
    sessionStorage.setItem('selectedProfile', JSON.stringify({
      ...coCreator,
      type: 'cocreator'
    }));
    onViewProfile?.();
  };

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Koneksi</h1>
        </div>
        <p className="text-gray-600">Kelola jaringan kontributor dan co-creator Anda</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('contributors')}
              className={`flex-1 px-6 py-4 font-semibold text-sm md:text-base transition-all ${
                activeTab === 'contributors'
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5" />
                <span>Kontributor</span>
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {dummyContributors.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('cocreators')}
              className={`flex-1 px-6 py-4 font-semibold text-sm md:text-base transition-all ${
                activeTab === 'cocreators'
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Star className="w-5 h-5" />
                <span>Co-Creator</span>
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {dummyCoCreators.length}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Cari ${activeTab === 'contributors' ? 'kontributor' : 'co-creator'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              />
            </div>
          </div>

          {activeTab === 'contributors' ? (
            <div className="space-y-3">
              {filteredContributors.length > 0 ? (
                filteredContributors.map((contributor) => (
                  <div
                    key={contributor.id}
                    onClick={() => handleViewContributor(contributor)}
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all hover:border-green-300 cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={contributor.avatar}
                        alt={contributor.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
                      {contributor.status === 'active' && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base truncate">
                        {contributor.name}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">{contributor.role}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          {contributor.contributions} kontribusi
                        </span>
                        <span>Bergabung {new Date(contributor.joinedDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <UserMinus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600">Tidak ada kontributor yang ditemukan</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCoCreators.length > 0 ? (
                filteredCoCreators.map((coCreator) => (
                  <div
                    key={coCreator.id}
                    onClick={() => handleViewCoCreator(coCreator)}
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all hover:border-amber-300 cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={coCreator.avatar}
                        alt={coCreator.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
                      {coCreator.status === 'active' && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base truncate">
                        {coCreator.name}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">{coCreator.specialty}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5" />
                          {coCreator.projects} proyek
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {coCreator.revenue}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <UserMinus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600">Tidak ada co-creator yang ditemukan</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-green-500 p-2 rounded-lg">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-green-900">{dummyContributors.length}</span>
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">Total Kontributor</h4>
          <p className="text-sm text-gray-700">
            Orang yang membantu mengembangkan proyek Anda
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Star className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-amber-900">{dummyCoCreators.length}</span>
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">Total Co-Creator</h4>
          <p className="text-sm text-gray-700">
            Mitra yang bekerja sama dalam proyek
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-green-500 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-green-900">{dummyContributors.filter(c => c.status === 'active').length + dummyCoCreators.filter(c => c.status === 'active').length}</span>
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">Status Aktif</h4>
          <p className="text-sm text-gray-700">
            Koneksi yang sedang aktif berkolaborasi
          </p>
        </div>
      </div>
    </div>
  );
}
