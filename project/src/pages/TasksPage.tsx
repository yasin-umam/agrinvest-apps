import { useState } from 'react';
import { CheckCircle2, Shield, Scale, Lightbulb, Award } from 'lucide-react';

export type TaskCategory = 'all' | 'validation' | 'governance' | 'competition';
export type TaskStatus = 'available' | 'in-progress';

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  category: 'validation' | 'governance' | 'competition';
  icon: React.ReactNode;
  status: TaskStatus;
  requirements?: string[];
  instructions?: string[];
  duration?: string;
  participants?: number;
}

export const DUMMY_TASKS: Task[] = [
  {
    id: '1',
    title: 'Validasi Protokol',
    description: 'Review dan validasi protokol yang diajukan user lain.',
    reward: 50,
    category: 'validation',
    icon: <CheckCircle2 className="w-6 h-6" />,
    status: 'available',
    requirements: [
      'Memiliki minimal Level 3',
      'Telah menyelesaikan minimal 5 task sebelumnya',
      'Memahami standar protokol pertanian'
    ],
    instructions: [
      'Baca protokol yang diajukan dengan teliti',
      'Periksa kelengkapan dokumen dan data pendukung',
      'Verifikasi kesesuaian dengan standar yang berlaku',
      'Berikan feedback konstruktif jika ada yang perlu diperbaiki',
      'Submit hasil validasi Anda'
    ],
    duration: '2-3 hari',
    participants: 24
  },
  {
    id: '2',
    title: 'Legitimasi Protokol',
    description: 'Memberikan persetujuan akhir pada protokol terverifikasi.',
    reward: 80,
    category: 'governance',
    icon: <Shield className="w-6 h-6" />,
    status: 'available',
    requirements: [
      'Memiliki Level 5 atau lebih tinggi',
      'Status akun terverifikasi',
      'Pengalaman governance minimal 3 bulan'
    ],
    instructions: [
      'Review protokol yang sudah divalidasi',
      'Periksa track record pengaju protokol',
      'Evaluasi impact jangka panjang',
      'Diskusikan dengan governance council jika diperlukan',
      'Berikan keputusan approve atau reject dengan alasan yang jelas'
    ],
    duration: '3-5 hari',
    participants: 12
  },
  {
    id: '3',
    title: 'Arbitrasi',
    description: 'Menyelesaikan konflik atau sengketa antar pihak.',
    reward: 120,
    category: 'governance',
    icon: <Scale className="w-6 h-6" />,
    status: 'available',
    requirements: [
      'Level minimal 7',
      'Sertifikasi mediator (jika ada)',
      'Reputasi skor minimal 85/100',
      'Tidak ada konflik kepentingan dengan pihak terkait'
    ],
    instructions: [
      'Pelajari detail kasus dan bukti dari semua pihak',
      'Jadwalkan mediasi dengan pihak yang bersengketa',
      'Dengarkan argumen dari semua pihak secara netral',
      'Cari solusi win-win yang adil',
      'Dokumentasikan keputusan arbitrasi secara tertulis',
      'Follow up implementasi keputusan'
    ],
    duration: '5-7 hari',
    participants: 8
  },
  {
    id: '4',
    title: 'Sayembara Solving Problem',
    description: 'Mengajukan solusi untuk masalah terbuka di sistem.',
    reward: 150,
    category: 'competition',
    icon: <Lightbulb className="w-6 h-6" />,
    status: 'available',
    requirements: [
      'Terbuka untuk semua level',
      'Solusi harus original dan belum pernah diajukan',
      'Memiliki feasibility study yang jelas'
    ],
    instructions: [
      'Pahami masalah yang perlu diselesaikan',
      'Riset solusi yang sudah ada (jika ada)',
      'Design solusi inovatif dengan pendekatan baru',
      'Buat proposal lengkap dengan estimasi biaya dan timeline',
      'Presentasikan solusi Anda kepada komunitas',
      'Voting akan dilakukan oleh komunitas selama 7 hari'
    ],
    duration: 'Hingga deadline sayembara',
    participants: 45
  },
];

interface TasksPageProps {
  onTaskSelect?: (task: Task) => void;
  tasks?: Task[];
  onTaskAction?: (taskId: string) => void;
}

export function TasksPage({ onTaskSelect, tasks: externalTasks, onTaskAction }: TasksPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('all');
  const [internalTasks, setInternalTasks] = useState<Task[]>(DUMMY_TASKS);

  const tasks = externalTasks || internalTasks;

  const filteredTasks = tasks.filter(
    (task) => selectedCategory === 'all' || task.category === selectedCategory
  );

  const handleTaskAction = (taskId: string) => {
    if (onTaskAction) {
      onTaskAction(taskId);
    } else {
      setInternalTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: task.status === 'available' ? 'in-progress' : 'available',
              }
            : task
        )
      );
    }
  };

  const categories = [
    { id: 'all', label: 'Semua', count: tasks.length },
    { id: 'validation', label: 'Validasi', count: tasks.filter((t) => t.category === 'validation').length },
    { id: 'governance', label: 'Governance', count: tasks.filter((t) => t.category === 'governance').length },
    { id: 'competition', label: 'Kompetisi', count: tasks.filter((t) => t.category === 'competition').length },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Task & Misi</h1>
        <p className="text-gray-600">Selesaikan tugas untuk mendapatkan poin.</p>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id as TaskCategory)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              selectedCategory === category.id
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {category.label}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                selectedCategory === category.id
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {category.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onTaskSelect?.(task)}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl hover:border-green-300 transition-all duration-300 group cursor-pointer"
          >
            {/* Task Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-green-600 group-hover:from-green-100 group-hover:to-green-200 transition-colors">
                  {task.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
                    {task.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {task.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Task Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  +{task.reward}
                </span>
                <span className="text-gray-500 text-sm font-medium">poin</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTaskAction(task.id);
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  task.status === 'available'
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                {task.status === 'available' ? 'Ambil Tugas' : 'Sedang Dikerjakan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <CheckCircle2 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Tidak ada tugas di kategori ini</p>
        </div>
      )}
    </div>
  );
}
