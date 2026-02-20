import { ArrowLeft, Award, CheckCircle, Clock, MapPin, Calendar, Star, TrendingUp, MessageCircle, Briefcase, CheckSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

type ProjectTabType = 'ongoing' | 'completed';

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

interface ProfileData {
  id: string;
  name: string;
  avatar: string;
  role?: string;
  specialty?: string;
  contributions?: number;
  projects?: number;
  joinedDate?: string;
  revenue?: string;
  status: 'active' | 'inactive';
  projectList?: Project[];
  type: 'contributor' | 'cocreator';
}

interface ProfileDetailPageProps {
  onBack: () => void;
}

export function ProfileDetailPage({ onBack }: ProfileDetailPageProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeProjectTab, setActiveProjectTab] = useState<ProjectTabType>('ongoing');

  useEffect(() => {
    const storedProfile = sessionStorage.getItem('selectedProfile');
    if (storedProfile) {
      setProfile(JSON.parse(storedProfile));
    }
  }, []);

  if (!profile) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const isContributor = profile.type === 'contributor';
  const completedProjects = profile.projectList?.filter(p => p.status === 'completed') || [];
  const ongoingProjects = profile.projectList?.filter(p => p.status === 'ongoing') || [];

  return (
    <div className="min-h-[calc(100vh-8rem)] pb-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Kembali ke Koneksi</span>
      </button>

      <div className={`rounded-xl shadow-sm border overflow-hidden mb-6 ${
        isContributor
          ? 'bg-gradient-to-r from-green-500 to-green-600'
          : 'bg-gradient-to-r from-amber-500 to-amber-600'
      }`}>
        <div className="p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
              {profile.status === 'active' && (
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-400 border-4 border-white rounded-full"></div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{profile.name}</h1>
              <p className="text-lg mb-4 opacity-90">
                {isContributor ? profile.role : profile.specialty}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                {isContributor ? (
                  <>
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg">
                      <Award className="w-5 h-5" />
                      <span className="font-semibold">{profile.contributions} Kontribusi</span>
                    </div>
                    {profile.joinedDate && (
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg">
                        <Calendar className="w-5 h-5" />
                        <span>Bergabung {new Date(profile.joinedDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg">
                      <Star className="w-5 h-5" />
                      <span className="font-semibold">{profile.projects} Proyek</span>
                    </div>
                    {profile.revenue && (
                      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg">
                        <TrendingUp className="w-5 h-5" />
                        <span className="font-semibold">{profile.revenue}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <button className="self-start md:self-center flex items-center gap-2 bg-white text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg font-semibold transition shadow-md">
              <MessageCircle className="w-5 h-5" />
              <span>Kirim Pesan</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isContributor ? 'Riwayat Kontribusi' : 'Riwayat Proyek'}
          </h2>
          <p className="text-gray-600">
            {isContributor
              ? 'Task yang telah diselesaikan oleh kontributor'
              : 'Proyek yang sedang berjalan dan yang telah selesai'
            }
          </p>
        </div>

        {!isContributor && (
          <div className="border-b border-gray-200 mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveProjectTab('ongoing')}
                className={`flex-1 px-4 py-3 font-semibold text-sm transition-all ${
                  activeProjectTab === 'ongoing'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Proyek Berjalan</span>
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {ongoingProjects.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveProjectTab('completed')}
                className={`flex-1 px-4 py-3 font-semibold text-sm transition-all ${
                  activeProjectTab === 'completed'
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Proyek Selesai</span>
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {completedProjects.length}
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {isContributor ? (
          <>
            {ongoingProjects.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900">Sedang Berjalan</h3>
                </div>
                <div className="space-y-3">
                  {ongoingProjects.map((project) => (
                    <div
                      key={project.id}
                      className="border border-blue-200 bg-blue-50 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-2">{project.name}</h4>
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            Sedang Berjalan
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
                        <div className="flex items-start gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{project.location}</span>
                        </div>
                        <div className="flex items-start gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>
                            Mulai: {new Date(project.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="text-sm">
                          <span className="text-gray-600">Kontribusi: </span>
                          <span className="font-medium text-gray-900">{project.contribution}</span>
                        </div>
                        {project.revenue && (
                          <div className="text-sm mt-1">
                            <span className="text-gray-600">Revenue: </span>
                            <span className="font-semibold text-green-600">{project.revenue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedProjects.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-xl font-bold text-gray-900">Selesai</h3>
                </div>
                <div className="space-y-3">
                  {completedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-2">{project.name}</h4>
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Selesai
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
                        <div className="flex items-start gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{project.location}</span>
                        </div>
                        <div className="flex items-start gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>
                            {new Date(project.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {project.endDate && (
                              <>
                                {' - '}
                                {new Date(project.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-sm">
                          <span className="text-gray-600">Kontribusi: </span>
                          <span className="font-medium text-gray-900">{project.contribution}</span>
                        </div>
                        {project.revenue && (
                          <div className="text-sm mt-1">
                            <span className="text-gray-600">Revenue: </span>
                            <span className="font-semibold text-green-600">{project.revenue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {activeProjectTab === 'ongoing' ? (
              ongoingProjects.length > 0 ? (
                <div className="space-y-3">
                  {ongoingProjects.map((project) => (
                    <div
                      key={project.id}
                      className="border border-blue-200 bg-blue-50 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-2">{project.name}</h4>
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            Sedang Berjalan
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
                        <div className="flex items-start gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{project.location}</span>
                        </div>
                        <div className="flex items-start gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>
                            Mulai: {new Date(project.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="text-sm">
                          <span className="text-gray-600">Peran: </span>
                          <span className="font-medium text-gray-900">{project.contribution}</span>
                        </div>
                        {project.revenue && (
                          <div className="text-sm mt-1">
                            <span className="text-gray-600">Revenue (Estimasi): </span>
                            <span className="font-semibold text-green-600">{project.revenue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <Clock className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">Tidak ada proyek yang sedang berjalan</p>
                  <p className="text-gray-400 text-sm mt-1">Proyek akan muncul di sini saat dimulai</p>
                </div>
              )
            ) : (
              completedProjects.length > 0 ? (
                <div className="space-y-3">
                  {completedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-2">{project.name}</h4>
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Selesai
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
                        <div className="flex items-start gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{project.location}</span>
                        </div>
                        <div className="flex items-start gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>
                            {new Date(project.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {project.endDate && (
                              <>
                                {' - '}
                                {new Date(project.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-sm">
                          <span className="text-gray-600">Peran: </span>
                          <span className="font-medium text-gray-900">{project.contribution}</span>
                        </div>
                        {project.revenue && (
                          <div className="text-sm mt-1">
                            <span className="text-gray-600">Revenue: </span>
                            <span className="font-semibold text-green-600">{project.revenue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">Belum ada proyek yang diselesaikan</p>
                  <p className="text-gray-400 text-sm mt-1">Proyek yang telah selesai akan muncul di sini</p>
                </div>
              )
            )}
          </>
        )}

        {isContributor && completedProjects.length === 0 && ongoingProjects.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Award className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">Belum ada riwayat kontribusi</p>
            <p className="text-gray-400 text-sm mt-1">Task yang diselesaikan akan muncul di sini</p>
          </div>
        )}
      </div>
    </div>
  );
}
