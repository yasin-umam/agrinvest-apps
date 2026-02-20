import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { MarketPage } from './pages/MarketPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminPage } from './pages/AdminPage';
import { AccountPage } from './pages/AccountPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { ProtocolPage } from './pages/ProtocolPage';
import { TasksPage, DUMMY_TASKS, type Task } from './pages/TasksPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { ContributionsPage } from './pages/ContributionsPage';
import { ProfileDetailPage } from './pages/ProfileDetailPage';
import { ProtocolDetailPage } from './pages/ProtocolDetailPage';
import { Header } from './components/dashboard/Header';
import BottomNav from './components/dashboard/BottomNav';

type Page = 'market' | 'portfolio' | 'transactions' | 'notifications' | 'admin' | 'account' | 'connections' | 'protocol' | 'protocol-detail' | 'tasks' | 'task-detail' | 'contributions' | 'profile-detail' | 'dashboard';

function Dashboard() {
  const { profile } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isProtocolMenuOpen, setIsProtocolMenuOpen] = useState(false);
  const [isProtocolDetailOpen, setIsProtocolDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>(DUMMY_TASKS);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setShowBottomNav(true);
      } else if (currentScrollY > lastScrollY) {
        setShowBottomNav(false);
      } else if (currentScrollY < lastScrollY) {
        setShowBottomNav(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  if (!profile) return null;

  const handleBottomNavNavigate = (page: string) => {
    setCurrentPage(page as Page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setCurrentPage('task-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTaskAction = (taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === 'available' ? 'in-progress' : 'available',
            }
          : task
      )
    );
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({
        ...selectedTask,
        status: selectedTask.status === 'available' ? 'in-progress' : 'available',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={setCurrentPage}
        currentPage={currentPage}
        onSearchToggle={() => setShowMobileSearch(!showMobileSearch)}
        showMobileSearch={showMobileSearch}
        onSidebarToggle={setIsSidebarOpen}
        onBalanceModalChange={setIsBalanceModalOpen}
      />
      {currentPage === 'account' ? (
        <AccountPage onBack={() => setCurrentPage('dashboard')} />
      ) : currentPage === 'portfolio' || currentPage === 'transactions' || currentPage === 'notifications' || currentPage === 'admin' ? (
        <main className="pt-16 pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {currentPage === 'portfolio' && <PortfolioPage onBack={() => setCurrentPage('dashboard')} />}
            {currentPage === 'transactions' && <TransactionsPage onBack={() => setCurrentPage('dashboard')} />}
            {currentPage === 'notifications' && <NotificationsPage onBack={() => setCurrentPage('dashboard')} />}
            {currentPage === 'admin' && profile.role === 'admin' && <AdminPage onBack={() => setCurrentPage('dashboard')} />}
          </div>
        </main>
      ) : currentPage === 'dashboard' || currentPage === 'connections' || currentPage === 'protocol' || currentPage === 'protocol-detail' || currentPage === 'tasks' || currentPage === 'task-detail' || currentPage === 'contributions' || currentPage === 'profile-detail' ? (
        <main className="pt-16 pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {currentPage === 'dashboard' && <MarketPage showMobileSearch={showMobileSearch} onModalChange={setIsMarketModalOpen} />}
            {currentPage === 'connections' && <ConnectionsPage onViewProfile={() => setCurrentPage('profile-detail')} />}
            {currentPage === 'profile-detail' && <ProfileDetailPage onBack={() => setCurrentPage('connections')} />}
            {currentPage === 'protocol' && <ProtocolPage onMenuChange={setIsProtocolMenuOpen} onProtocolDetailChange={setIsProtocolDetailOpen} onViewDetail={() => setCurrentPage('protocol-detail')} />}
            {currentPage === 'protocol-detail' && <ProtocolDetailPage onBack={() => setCurrentPage('protocol')} />}
            {currentPage === 'tasks' && <TasksPage onTaskSelect={handleTaskSelect} tasks={tasks} onTaskAction={handleTaskAction} />}
            {currentPage === 'task-detail' && selectedTask && (
              <TaskDetailPage
                task={selectedTask}
                onBack={() => setCurrentPage('tasks')}
                onTaskAction={handleTaskAction}
              />
            )}
            {currentPage === 'contributions' && <ContributionsPage tasks={tasks} />}
          </div>
        </main>
      ) : (
        <main className="pt-28 md:pt-16 pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {currentPage === 'market' && <MarketPage showMobileSearch={showMobileSearch} onModalChange={setIsMarketModalOpen} />}
          </div>
        </main>
      )}
      <BottomNav
        currentPage={currentPage}
        onNavigate={handleBottomNavNavigate}
        isVisible={showBottomNav && !isSidebarOpen && currentPage !== 'notifications' && currentPage !== 'account' && currentPage !== 'admin' && currentPage !== 'portfolio' && currentPage !== 'transactions' && currentPage !== 'task-detail' && currentPage !== 'profile-detail' && currentPage !== 'protocol-detail' && !isMarketModalOpen && !isBalanceModalOpen && !isProtocolMenuOpen && !isProtocolDetailOpen}
      />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
