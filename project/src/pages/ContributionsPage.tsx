import { Trophy, CheckCircle2, Clock, Award, Calendar, Target, Users, Wallet, CreditCard } from 'lucide-react';
import type { Task } from './TasksPage';

interface CompletedTask {
  id: string;
  title: string;
  description: string;
  reward: number;
  category: 'validation' | 'governance' | 'competition';
  icon: React.ReactNode;
  completedAt: string;
  status: 'completed' | 'in-progress';
}

const DUMMY_COMPLETED_TASKS: CompletedTask[] = [
  {
    id: '1',
    title: 'Validasi Protokol',
    description: 'Review dan validasi protokol yang diajukan user lain.',
    reward: 50,
    category: 'validation',
    icon: <CheckCircle2 className="w-5 h-5" />,
    completedAt: '2024-02-15',
    status: 'completed'
  },
  {
    id: '2',
    title: 'Legitimasi Protokol',
    description: 'Memberikan persetujuan akhir pada protokol terverifikasi.',
    reward: 80,
    category: 'governance',
    icon: <CheckCircle2 className="w-5 h-5" />,
    completedAt: '2024-02-10',
    status: 'completed'
  },
  {
    id: '3',
    title: 'Arbitrasi',
    description: 'Menyelesaikan konflik atau sengketa antar pihak.',
    reward: 120,
    category: 'governance',
    icon: <Clock className="w-5 h-5" />,
    completedAt: '2024-02-17',
    status: 'in-progress'
  }
];

interface ContributionsPageProps {
  tasks?: Task[];
}

export function ContributionsPage({ tasks }: ContributionsPageProps) {
  const userPoints = 450;
  const totalSystemPoints = 125000;
  const totalProjectCapital = 2500000000;
  const userCapitalLimit = 50000000;

  const inProgressTasks = tasks?.filter(t => t.status === 'in-progress') || [];
  const completedTasks = DUMMY_COMPLETED_TASKS.filter(t => t.status === 'completed');
  const totalTasksCompleted = completedTasks.length;
  const totalRewardEarned = completedTasks.reduce((sum, task) => sum + task.reward, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kontribusi Saya</h1>
        <p className="text-gray-600">Lihat semua kontribusi dan progress Anda.</p>
      </div>

      {/* System Stats Card */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-xl p-4 mb-6 shadow-md">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* User Points */}
          <div className="flex items-center gap-2">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <Trophy className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <p className="text-green-100 text-[10px] font-medium">Poin Saya</p>
              <p className="text-white text-lg font-bold">{userPoints.toLocaleString()}</p>
            </div>
          </div>

          {/* Total System Points */}
          <div className="flex items-center gap-2">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <Users className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <p className="text-green-100 text-[10px] font-medium">Total Poin Sistem</p>
              <p className="text-white text-lg font-bold">{totalSystemPoints.toLocaleString()}</p>
            </div>
          </div>

          {/* Total Project Capital */}
          <div className="flex items-center gap-2">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <Wallet className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <p className="text-green-100 text-[10px] font-medium">Kapital Proyek</p>
              <p className="text-white text-sm font-bold">{formatCurrency(totalProjectCapital)}</p>
            </div>
          </div>

          {/* User Capital Limit */}
          <div className="flex items-center gap-2">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <CreditCard className="w-4 h-4 text-orange-300" />
            </div>
            <div>
              <p className="text-green-100 text-[10px] font-medium">Limit Kapital Saya</p>
              <p className="text-white text-sm font-bold">{formatCurrency(userCapitalLimit)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Single Row Compact */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-3 divide-x divide-gray-200">
          {/* Total Completed */}
          <div className="px-2 md:px-4 first:pl-0">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="bg-green-100 rounded-md p-1 md:p-1.5">
                <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
              </div>
              <p className="text-gray-600 text-[10px] md:text-xs font-medium text-center md:text-left">Total Diselesaikan</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{totalTasksCompleted}</p>
              <p className="text-gray-500 text-[9px] md:text-xs">Task completed</p>
            </div>
          </div>

          {/* Total Reward */}
          <div className="px-2 md:px-4">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="bg-yellow-100 rounded-md p-1 md:p-1.5">
                <Award className="w-3 h-3 md:w-4 md:h-4 text-yellow-600" />
              </div>
              <p className="text-gray-600 text-[10px] md:text-xs font-medium text-center md:text-left">Total Reward</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{totalRewardEarned}</p>
              <p className="text-gray-500 text-[9px] md:text-xs">Poin earned</p>
            </div>
          </div>

          {/* In Progress */}
          <div className="px-2 md:px-4 last:pr-0">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="bg-blue-100 rounded-md p-1 md:p-1.5">
                <Clock className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
              </div>
              <p className="text-gray-600 text-[10px] md:text-xs font-medium text-center md:text-left">Sedang Dikerjakan</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{inProgressTasks.length}</p>
              <p className="text-gray-500 text-[9px] md:text-xs">Task aktif</p>
            </div>
          </div>
        </div>
      </div>

      {/* In Progress Tasks */}
      {inProgressTasks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Sedang Dikerjakan</h2>
          </div>
          <div className="space-y-4">
            {inProgressTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-blue-100 rounded-lg p-3 text-blue-600">
                      {task.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{task.title}</h3>
                      <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-gray-600">
                          <Target className="w-4 h-4" />
                          {task.category === 'validation' && 'Validasi'}
                          {task.category === 'governance' && 'Governance'}
                          {task.category === 'competition' && 'Kompetisi'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Award className="w-5 h-5 text-yellow-500" />
                    <span className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                      +{task.reward}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">Riwayat Kontribusi</h2>
        </div>

        {completedTasks.length > 0 ? (
          <div className="space-y-4">
            {completedTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="bg-green-100 rounded-lg p-3 text-green-600">
                      {task.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selesai
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(task.completedAt).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-gray-600">
                          <Target className="w-4 h-4" />
                          {task.category === 'validation' && 'Validasi'}
                          {task.category === 'governance' && 'Governance'}
                          {task.category === 'competition' && 'Kompetisi'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Award className="w-5 h-5 text-yellow-500" />
                    <span className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                      +{task.reward}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Belum ada kontribusi yang diselesaikan</p>
            <p className="text-gray-400 text-sm mt-1">Ambil task untuk mulai berkontribusi</p>
          </div>
        )}
      </div>
    </div>
  );
}
