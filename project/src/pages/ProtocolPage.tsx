import { useState, useEffect } from 'react';
import { Search, Plus, FileText, Shield, GitBranch, Activity, CheckCircle, Briefcase, Settings, Building, ArrowLeft, Calendar, Users, Target } from 'lucide-react';

interface Protocol {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  fullDescription: string;
  objectives: string[];
  scope: string;
  participants: string;
  implementation: string;
  benefits: string[];
}

interface ProtocolPageProps {
  onMenuChange?: (isOpen: boolean) => void;
  onProtocolDetailChange?: (isOpen: boolean) => void;
  onViewDetail?: () => void;
}

const protocols: Protocol[] = [
  {
    id: '1',
    name: 'Protocol Alpha',
    description: 'Optimasi distribusi hasil pertanian',
    icon: <GitBranch className="w-5 h-5" />,
    fullDescription: 'Protocol Alpha adalah sistem distribusi hasil pertanian yang dirancang untuk mengoptimalkan pembagian keuntungan berdasarkan kontribusi masing-masing pihak. Sistem ini memastikan transparansi dan keadilan dalam distribusi dividen kepada investor dan petani.',
    objectives: [
      'Menciptakan sistem distribusi yang adil dan transparan',
      'Mengotomasi perhitungan dividen berdasarkan kepemilikan unit',
      'Memastikan pembayaran tepat waktu kepada semua pihak',
      'Meminimalkan sengketa dalam pembagian hasil'
    ],
    scope: 'Berlaku untuk semua produk pertanian yang terdaftar dalam sistem, termasuk cabai, tomat, dan komoditas lainnya.',
    participants: 'Investor, Petani, Admin Platform, Pembeli',
    implementation: 'Q1 2025',
    benefits: [
      'Pembagian hasil yang lebih cepat dan akurat',
      'Transparansi penuh dalam perhitungan dividen',
      'Mengurangi biaya administrasi distribusi',
      'Meningkatkan kepercayaan investor'
    ]
  },
  {
    id: '2',
    name: 'Protocol Beta',
    description: 'Manajemen risiko produksi',
    icon: <Shield className="w-5 h-5" />,
    fullDescription: 'Protocol Beta mengatur sistem manajemen risiko dalam produksi pertanian untuk melindungi investor dari kerugian akibat gagal panen, cuaca ekstrem, atau faktor-faktor di luar kendali. Protokol ini menetapkan mekanisme asuransi dan kompensasi.',
    objectives: [
      'Melindungi investasi dari risiko gagal panen',
      'Menetapkan standar mitigasi risiko',
      'Menciptakan dana cadangan untuk kompensasi',
      'Membangun sistem peringatan dini risiko'
    ],
    scope: 'Mencakup risiko cuaca, hama, penyakit tanaman, dan fluktuasi harga pasar.',
    participants: 'Investor, Petani, Ahli Agronomi, Perusahaan Asuransi',
    implementation: 'Q2 2025',
    benefits: [
      'Investasi lebih aman dan terlindungi',
      'Kompensasi jelas jika terjadi kerugian',
      'Meningkatkan kepercayaan investor',
      'Stabilitas pendapatan petani'
    ]
  },
  {
    id: '3',
    name: 'Protocol Gamma',
    description: 'Integrasi supply chain',
    icon: <Activity className="w-5 h-5" />,
    fullDescription: 'Protocol Gamma mengintegrasikan seluruh rantai pasok dari petani hingga konsumen akhir. Sistem ini memastikan efisiensi logistik, transparansi pergerakan produk, dan kualitas terjaga sepanjang rantai distribusi.',
    objectives: [
      'Menghubungkan semua pihak dalam supply chain',
      'Meningkatkan efisiensi distribusi produk',
      'Memastikan kualitas produk terjaga',
      'Mengurangi pemborosan dan kerugian'
    ],
    scope: 'Meliputi pengadaan, penyimpanan, transportasi, hingga distribusi ke konsumen.',
    participants: 'Petani, Gudang, Distributor, Retailer, Konsumen',
    implementation: 'Q3 2025',
    benefits: [
      'Distribusi lebih cepat dan efisien',
      'Kualitas produk lebih terjaga',
      'Harga lebih kompetitif',
      'Tracking real-time pergerakan produk'
    ]
  },
  {
    id: '4',
    name: 'Protocol Delta',
    description: 'Otomasi monitoring lahan',
    icon: <CheckCircle className="w-5 h-5" />,
    fullDescription: 'Protocol Delta mengimplementasikan sistem monitoring otomatis untuk lahan pertanian menggunakan sensor IoT dan analitik data. Sistem ini membantu petani dan investor memantau kondisi tanaman secara real-time.',
    objectives: [
      'Monitoring kondisi lahan secara real-time',
      'Deteksi dini masalah pada tanaman',
      'Optimasi penggunaan sumber daya',
      'Peningkatan produktivitas melalui data'
    ],
    scope: 'Monitoring kelembaban tanah, suhu, pH, nutrisi, dan pertumbuhan tanaman.',
    participants: 'Petani, Investor, Teknisi IoT, Data Analyst',
    implementation: 'Q4 2025',
    benefits: [
      'Pengambilan keputusan berbasis data',
      'Efisiensi penggunaan air dan pupuk',
      'Deteksi dini penyakit tanaman',
      'Transparansi kondisi lahan untuk investor'
    ]
  },
  {
    id: '5',
    name: 'Protocol Epsilon',
    description: 'Sistem validasi kualitas',
    icon: <FileText className="w-5 h-5" />,
    fullDescription: 'Protocol Epsilon menetapkan standar kualitas produk pertanian dan prosedur validasi yang ketat. Setiap produk harus melewati serangkaian pemeriksaan sebelum dapat dijual di platform.',
    objectives: [
      'Menetapkan standar kualitas yang konsisten',
      'Memastikan produk memenuhi kriteria pasar',
      'Melindungi reputasi platform',
      'Meningkatkan kepuasan pembeli'
    ],
    scope: 'Validasi visual, ukuran, kesegaran, bebas pestisida, dan sertifikasi organik.',
    participants: 'Quality Inspector, Petani, Lab Testing, Admin Platform',
    implementation: 'Q1 2025',
    benefits: [
      'Kualitas produk terjamin',
      'Harga jual lebih tinggi',
      'Kepercayaan pembeli meningkat',
      'Branding produk lebih kuat'
    ]
  }
];

export function ProtocolPage({ onMenuChange, onProtocolDetailChange, onViewDetail }: ProtocolPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    onMenuChange?.(showMenu);
  }, [showMenu, onMenuChange]);

  const filteredProtocols = protocols.filter(protocol =>
    protocol.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const menuItems = [
    {
      icon: <Briefcase className="w-5 h-5" />,
      title: 'Ajukan Usaha',
      description: 'Buat proposal usaha baru untuk dimasukkan ke dalam sistem.'
    },
    {
      icon: <Settings className="w-5 h-5" />,
      title: 'Protokol Teknis',
      description: 'Tambahkan standar operasional atau prosedur teknis.'
    },
    {
      icon: <Building className="w-5 h-5" />,
      title: 'Protokol Governance',
      description: 'Tambahkan aturan tata kelola dan kebijakan sistem.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-3 md:pt-6 pb-24">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Protokol</h1>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Cari protokol…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all text-gray-900 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Protocol Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProtocols.map((protocol) => (
          <div
            key={protocol.id}
            onClick={() => onViewDetail?.()}
            className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-green-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                {protocol.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
                  {protocol.name}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {protocol.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProtocols.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600">Tidak ada protokol yang ditemukan</p>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center z-40"
      >
        <Plus className={`w-6 h-6 transition-transform duration-300 ${showMenu ? 'rotate-45' : ''}`} />
      </button>

      {/* Overlay */}
      {showMenu && (
        <div
          onClick={() => setShowMenu(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        />
      )}

      {/* Popup Menu */}
      {showMenu && (
        <div className="fixed bottom-44 md:bottom-28 right-6 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border-2 border-gray-200 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setShowMenu(false);
                }}
                className="w-full flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
