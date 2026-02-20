import { useState } from 'react';
import { ArrowLeft, ChevronDown, ExternalLink, FileText, Calendar, User, BarChart3, CheckCircle, AlertCircle, Archive, BookOpen, Code, GitBranch } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  problemPreview: string;
  problemDescription: string;
  conceptualRedefinition: string;
  theoreticalReferences: {
    title: string;
    url: string;
  }[];
  technicalProtocol: {
    steps: string[];
    flowDiagram?: string;
    codeExample?: string;
  };
}

interface ProtocolDetail {
  id: string;
  name: string;
  description: string;
  proposedBy: string;
  dateImplemented: string;
  viscosityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  articleCount: number;
  status: 'active' | 'revision' | 'archived';
  summary: {
    purpose: string;
    scope: string;
  };
  articles: Article[];
}

const dummyProtocol: ProtocolDetail = {
  id: '1',
  name: 'Protocol Alpha - Dividend Distribution System',
  description: 'Protokol distribusi dividen otomatis berbasis kontribusi unit kepemilikan',
  proposedBy: 'Tim Teknis Platform',
  dateImplemented: '2025-01-15',
  viscosityLevel: 'HIGH',
  articleCount: 5,
  status: 'active',
  summary: {
    purpose: 'Mengotomasi dan menstandarisasi proses distribusi dividen kepada investor berdasarkan proporsi kepemilikan unit dalam produk pertanian. Protokol ini memastikan transparansi, akurasi, dan kecepatan dalam pembayaran dividen.',
    scope: 'Berlaku untuk seluruh transaksi penjualan produk pertanian yang terdaftar dalam sistem, mencakup perhitungan otomatis, notifikasi real-time, dan audit trail lengkap.'
  },
  articles: [
    {
      id: '1',
      title: 'Pasal 1: Mekanisme Perhitungan Dividen',
      problemPreview: 'Perhitungan dividen manual rawan kesalahan dan lambat',
      problemDescription: 'Sistem perhitungan dividen secara manual membutuhkan waktu lama dan rentan terhadap kesalahan manusia. Setiap transaksi penjualan memerlukan perhitungan ulang proporsi kepemilikan, yang bisa mengakibatkan keterlambatan pembayaran dan potensi sengketa.',
      conceptualRedefinition: 'Dividen = (Jumlah Unit Dimiliki / Total Unit Produk) × Revenue Penjualan. Sistem harus menghitung secara real-time berdasarkan snapshot kepemilikan saat transaksi terjadi.',
      theoreticalReferences: [
        {
          title: 'Distributed Ledger Technology for Financial Systems',
          url: 'https://example.com/dlt-finance'
        },
        {
          title: 'Automated Dividend Distribution Models',
          url: 'https://example.com/dividend-models'
        }
      ],
      technicalProtocol: {
        steps: [
          'Trigger: Order status berubah menjadi "completed"',
          'Ambil snapshot portfolio semua pemegang unit untuk produk terkait',
          'Hitung proporsi kepemilikan: (user_units / total_units)',
          'Hitung dividen per user: proporsi × revenue',
          'Insert record ke tabel user_harvest_distributions',
          'Update balance user secara atomik',
          'Kirim notifikasi ke semua penerima dividen',
          'Log transaksi ke audit trail'
        ],
        codeExample: `-- Trigger function untuk distribusi otomatis
CREATE OR REPLACE FUNCTION distribute_harvest_dividend()
RETURNS TRIGGER AS $$
BEGIN
  -- Hitung dan distribusikan dividen
  INSERT INTO user_harvest_distributions (...)
  SELECT
    NEW.product_id,
    p.user_id,
    (p.units::numeric / total.sum_units) * NEW.revenue as dividend_amount,
    NOW()
  FROM portfolio p
  CROSS JOIN (
    SELECT SUM(units) as sum_units
    FROM portfolio
    WHERE product_id = NEW.product_id
  ) total
  WHERE p.product_id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`
      }
    },
    {
      id: '2',
      title: 'Pasal 2: Validasi Transaksi Penjualan',
      problemPreview: 'Transaksi penjualan tanpa validasi dapat merusak integritas sistem',
      problemDescription: 'Transaksi penjualan yang tidak tervalidasi dengan baik dapat menyebabkan distribusi dividen yang salah, terutama jika ada penjualan ganda atau manipulasi data. Sistem perlu memastikan setiap transaksi valid sebelum memicu distribusi.',
      conceptualRedefinition: 'Setiap order harus melewati state machine yang ketat: pending → validated → completed. Validasi mencakup pengecekan ketersediaan unit, verifikasi harga, dan konfirmasi pembayaran.',
      theoreticalReferences: [
        {
          title: 'State Machine Patterns in Financial Systems',
          url: 'https://example.com/state-machine'
        },
        {
          title: 'Transaction Validation in Distributed Systems',
          url: 'https://example.com/tx-validation'
        }
      ],
      technicalProtocol: {
        steps: [
          'Order dibuat dengan status "pending"',
          'Validasi ketersediaan unit dalam portfolio seller',
          'Lock unit untuk mencegah double-spending',
          'Verifikasi harga sesuai dengan harga produk aktual',
          'Tunggu konfirmasi pembayaran dari buyer',
          'Jika valid, ubah status menjadi "completed"',
          'Jika gagal, rollback dan kembalikan unit ke seller',
          'Log semua perubahan status ke audit log'
        ],
        codeExample: `-- Constraint untuk mencegah race condition
ALTER TABLE orders
ADD CONSTRAINT check_order_valid
CHECK (
  (order_type = 'buy' AND quantity <= available_units) OR
  (order_type = 'sell' AND quantity <= seller_portfolio_units)
);

-- Function untuk validasi order
CREATE FUNCTION validate_order_before_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    -- Validasi portfolio seller
    IF NOT EXISTS (
      SELECT 1 FROM portfolio
      WHERE user_id = NEW.seller_id
        AND product_id = NEW.product_id
        AND units >= NEW.quantity
    ) THEN
      RAISE EXCEPTION 'Insufficient units in seller portfolio';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`
      }
    },
    {
      id: '3',
      title: 'Pasal 3: Audit Trail dan Transparansi',
      problemPreview: 'Kurangnya jejak audit menyulitkan investigasi masalah',
      problemDescription: 'Sistem yang tidak memiliki audit trail lengkap akan kesulitan melacak asal-usul masalah saat terjadi sengketa atau anomali. Setiap perubahan balance dan distribusi dividen harus terekam dengan detail lengkap.',
      conceptualRedefinition: 'Setiap perubahan finansial harus immutable dan traceable. Gunakan event sourcing pattern untuk merekam setiap state change sebagai event yang tidak dapat diubah.',
      theoreticalReferences: [
        {
          title: 'Event Sourcing for Financial Applications',
          url: 'https://example.com/event-sourcing'
        },
        {
          title: 'Immutable Audit Logs in Distributed Systems',
          url: 'https://example.com/audit-logs'
        }
      ],
      technicalProtocol: {
        steps: [
          'Setiap distribusi dividen terekam di user_harvest_distributions',
          'Setiap perubahan balance terekam di balance_snapshots',
          'Setiap order completion terekam dengan timestamp',
          'Log mencakup: actor, action, timestamp, old_value, new_value',
          'Implementasi RLS untuk membatasi akses log',
          'Buat view agregasi untuk dashboard audit',
          'Realtime subscription untuk monitoring anomali',
          'Backup log secara berkala ke cold storage'
        ],
        codeExample: `-- Tabel audit log
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  target_user_id UUID REFERENCES profiles(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger untuk log otomatis
CREATE TRIGGER log_balance_changes
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
EXECUTE FUNCTION log_balance_change();`
      }
    },
    {
      id: '4',
      title: 'Pasal 4: Notifikasi Real-time',
      problemPreview: 'User tidak mengetahui saat menerima dividen',
      problemDescription: 'Tanpa notifikasi real-time, user harus secara manual mengecek balance mereka untuk mengetahui apakah mereka telah menerima dividen. Ini mengurangi transparansi dan kepercayaan user terhadap sistem.',
      conceptualRedefinition: 'Setiap event finansial yang mempengaruhi user harus menghasilkan notifikasi atomik yang terkirim bersamaan dengan transaksi. Notifikasi bukan afterthought, tapi bagian integral dari transaksi.',
      theoreticalReferences: [
        {
          title: 'Event-Driven Notification Systems',
          url: 'https://example.com/event-notifications'
        },
        {
          title: 'Real-time Communication in FinTech',
          url: 'https://example.com/realtime-fintech'
        }
      ],
      technicalProtocol: {
        steps: [
          'Trigger notifikasi saat dividen didistribusikan',
          'Format notifikasi: "Anda menerima Rp X dari penjualan [Produk]"',
          'Include link ke detail transaksi',
          'Gunakan Supabase Realtime untuk push notification',
          'Fallback ke in-app notification jika realtime gagal',
          'Mark notification sebagai unread secara default',
          'Implementasi notification batching untuk volume tinggi',
          'Rate limiting untuk mencegah spam'
        ],
        codeExample: `-- Trigger untuk notifikasi dividen
CREATE TRIGGER notify_dividend_distribution
AFTER INSERT ON user_harvest_distributions
FOR EACH ROW
EXECUTE FUNCTION create_dividend_notification();

-- Function notifikasi
CREATE FUNCTION create_dividend_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (
    NEW.user_id,
    'dividend_received',
    'Dividen Diterima',
    format('Anda menerima %s dari penjualan produk',
           format_rupiah(NEW.amount))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`
      }
    },
    {
      id: '5',
      title: 'Pasal 5: Error Handling dan Recovery',
      problemPreview: 'Sistem crash saat distribusi dapat menyebabkan inkonsistensi',
      problemDescription: 'Jika sistem crash di tengah proses distribusi dividen, bisa terjadi situasi di mana sebagian user sudah menerima dividen sementara yang lain belum. Ini harus dicegah dengan mekanisme atomic transaction dan idempotency.',
      conceptualRedefinition: 'Distribusi dividen harus bersifat atomic (all-or-nothing) dan idempotent (dapat dijalankan ulang tanpa efek ganda). Gunakan database transaction dan unique constraint untuk menjamin properti ini.',
      theoreticalReferences: [
        {
          title: 'ACID Properties in Distributed Systems',
          url: 'https://example.com/acid-properties'
        },
        {
          title: 'Idempotent Operations in Financial Systems',
          url: 'https://example.com/idempotent-ops'
        }
      ],
      technicalProtocol: {
        steps: [
          'Wrap seluruh distribusi dalam database transaction',
          'Gunakan unique constraint pada (product_id, harvest_id, user_id)',
          'Implementasi retry logic dengan exponential backoff',
          'Log setiap attempt ke error log table',
          'Alert admin jika retry gagal lebih dari 3x',
          'Implementasi dead letter queue untuk failed transactions',
          'Manual review untuk transaksi yang stuck',
          'Periodic reconciliation job untuk detect inconsistency'
        ],
        codeExample: `-- Unique constraint untuk idempotency
ALTER TABLE user_harvest_distributions
ADD CONSTRAINT unique_distribution_per_user_harvest
UNIQUE (user_id, product_id, harvest_id);

-- Wrapper function dengan error handling
CREATE FUNCTION safe_distribute_dividend(
  p_product_id UUID,
  p_revenue NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  BEGIN
    -- Distribusi dalam transaction
    PERFORM distribute_harvest_dividend(p_product_id, p_revenue);
    v_result := jsonb_build_object('success', true);
  EXCEPTION WHEN OTHERS THEN
    -- Log error
    INSERT INTO error_log (error_message, context)
    VALUES (SQLERRM, jsonb_build_object(
      'product_id', p_product_id,
      'revenue', p_revenue
    ));
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;`
      }
    }
  ]
};

interface ProtocolDetailPageProps {
  onBack: () => void;
}

export function ProtocolDetailPage({ onBack }: ProtocolDetailPageProps) {
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const protocol = dummyProtocol;

  const getViscosityColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-700 border-green-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getViscosityWidth = (level: string) => {
    switch (level) {
      case 'LOW': return 'w-1/4';
      case 'MEDIUM': return 'w-2/4';
      case 'HIGH': return 'w-3/4';
      case 'CRITICAL': return 'w-full';
      default: return 'w-1/4';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300';
      case 'revision': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'archived': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'revision': return <AlertCircle className="w-4 h-4" />;
      case 'archived': return <Archive className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Kembali ke Protokol</span>
        </button>

        {/* Header Identitas Protokol */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6">
          {/* Title Section */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-8 text-white">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <FileText className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{protocol.name}</h1>
                <p className="text-green-50 text-lg">{protocol.description}</p>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gray-50">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <User className="w-4 h-4" />
                <span className="font-medium">Pihak Pengaju</span>
              </div>
              <p className="text-gray-900 font-semibold">{protocol.proposedBy}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Tanggal Diterapkan</span>
              </div>
              <p className="text-gray-900 font-semibold">
                {new Date(protocol.dateImplemented).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <BarChart3 className="w-4 h-4" />
                <span className="font-medium">Tingkat Viskositas</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${getViscosityWidth(protocol.viscosityLevel)} ${protocol.viscosityLevel === 'LOW' ? 'bg-green-500' : protocol.viscosityLevel === 'MEDIUM' ? 'bg-yellow-500' : protocol.viscosityLevel === 'HIGH' ? 'bg-orange-500' : 'bg-red-500'} transition-all`}></div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-md border ${getViscosityColor(protocol.viscosityLevel)}`}>
                  {protocol.viscosityLevel}
                </span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <BookOpen className="w-4 h-4" />
                <span className="font-medium">Jumlah Pasal</span>
              </div>
              <p className="text-gray-900 font-semibold text-2xl">{protocol.articleCount}</p>
            </div>
          </div>
        </div>

        {/* Section Ringkasan */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900">Ringkasan Protokol</h2>
            </div>
            <div className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border ${getStatusColor(protocol.status)}`}>
              {getStatusIcon(protocol.status)}
              <span className="capitalize">{protocol.status === 'active' ? 'Aktif' : protocol.status === 'revision' ? 'Revisi' : 'Arsip'}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">Tujuan</h3>
              <p className="text-gray-700 leading-relaxed">{protocol.summary.purpose}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">Ruang Lingkup</h3>
              <p className="text-gray-700 leading-relaxed">{protocol.summary.scope}</p>
            </div>
          </div>
        </div>

        {/* Daftar Pasal / Problem */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="bg-green-50 border-b border-green-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">Daftar Pasal</h2>
            <p className="text-gray-600 text-sm mt-1">Klik untuk melihat detail lengkap setiap pasal</p>
          </div>

          <div className="divide-y divide-gray-200">
            {protocol.articles.map((article, index) => (
              <div key={article.id} className="transition-all">
                {/* Article Header */}
                <button
                  onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}
                  className="w-full px-6 py-5 flex items-center gap-4 hover:bg-green-50 transition-colors text-left group"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-700 font-bold group-hover:bg-green-200 transition-colors">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-green-700 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-600">{article.problemPreview}</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${expandedArticle === article.id ? 'rotate-180' : ''}`} />
                </button>

                {/* Article Detail (Expanded) */}
                {expandedArticle === article.id && (
                  <div className="px-6 py-6 bg-green-50 border-t border-green-200 animate-in slide-in-from-top-2 duration-300">
                    {/* Problem Description */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Deskripsi Problem
                      </h4>
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-700 leading-relaxed">{article.problemDescription}</p>
                      </div>
                    </div>

                    {/* Conceptual Redefinition */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        Redefinisi Konseptual
                      </h4>
                      <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                        <p className="text-gray-800 leading-relaxed font-medium">{article.conceptualRedefinition}</p>
                      </div>
                    </div>

                    {/* Theoretical References */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Referensi Teori
                      </h4>
                      <div className="space-y-2">
                        {article.theoreticalReferences.map((ref, idx) => (
                          <a
                            key={idx}
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 hover:border-green-400 hover:bg-green-50 transition-all group"
                          >
                            <ExternalLink className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-gray-700 group-hover:text-green-700 font-medium">{ref.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Technical Protocol */}
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        Protokol Teknis Penyelesaian
                      </h4>

                      {/* Steps */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                        <h5 className="text-sm font-semibold text-gray-700 mb-3">Langkah Sistematis:</h5>
                        <ol className="space-y-2">
                          {article.technicalProtocol.steps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                                {idx + 1}
                              </span>
                              <span className="text-gray-700 leading-relaxed pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Code Example */}
                      {article.technicalProtocol.codeExample && (
                        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto">
                          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-700">
                            <Code className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">Contoh Implementasi</span>
                          </div>
                          <pre className="text-sm text-gray-100 font-mono leading-relaxed">
                            <code>{article.technicalProtocol.codeExample}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
