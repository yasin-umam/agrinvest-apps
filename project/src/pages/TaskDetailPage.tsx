import { CheckCircle2, Clock, Users, Target, Award, ArrowLeft, Star } from 'lucide-react';
import type { Task } from './TasksPage';

interface TaskDetailPageProps {
  task: Task;
  onBack: () => void;
  onTaskAction: (taskId: string) => void;
}

export function TaskDetailPage({ task, onBack, onTaskAction }: TaskDetailPageProps) {
  return (
    <div className="min-h-[calc(100vh-8rem)] pb-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Kembali ke Daftar Task</span>
      </button>

      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-8 text-white mb-8 shadow-lg">
        <div className="flex items-start gap-6 mb-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            {task.icon}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
            <p className="text-green-100 text-lg">{task.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{task.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span className="font-medium">{task.participants} partisipan aktif</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-300" />
            <span className="font-bold text-lg">+{task.reward} poin reward</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Requirements Section */}
          {task.requirements && task.requirements.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 rounded-lg p-2">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Persyaratan</h2>
              </div>
              <div className="bg-gray-50 rounded-lg p-5">
                <ul className="space-y-3">
                  {task.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700 text-base">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Instructions Section */}
          {task.instructions && task.instructions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 rounded-lg p-2">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Langkah-langkah</h2>
              </div>
              <div className="space-y-4">
                {task.instructions.map((instruction, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-green-300 transition"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 font-bold text-base rounded-full flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 text-base leading-relaxed pt-1">{instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-24">
            {/* Category Badge */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Kategori</p>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
                <Star className="w-4 h-4" />
                {task.category === 'validation' && 'Validasi'}
                {task.category === 'governance' && 'Governance'}
                {task.category === 'competition' && 'Kompetisi'}
              </span>
            </div>

            {/* Reward Box */}
            <div className="mb-6 p-5 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-6 h-6 text-yellow-600" />
                <p className="text-sm font-medium text-gray-700">Total Reward</p>
              </div>
              <p className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                +{task.reward}
              </p>
              <p className="text-sm text-gray-600 mt-1">poin</p>
            </div>

            {/* Status */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Status</p>
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  task.status === 'available'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {task.status === 'available' ? 'Tersedia' : 'Sedang Dikerjakan'}
              </span>
            </div>

            {/* Action Button */}
            <button
              onClick={() => onTaskAction(task.id)}
              className={`w-full px-6 py-4 rounded-xl font-bold text-base transition-all shadow-md hover:shadow-lg ${
                task.status === 'available'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100'
              }`}
            >
              {task.status === 'available' ? 'Ambil Tugas Ini' : 'Sedang Dikerjakan'}
            </button>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Durasi</span>
                <span className="font-semibold text-gray-900">{task.duration}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Partisipan</span>
                <span className="font-semibold text-gray-900">{task.participants} orang</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
