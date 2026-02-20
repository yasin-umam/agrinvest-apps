import { Home, Users, FileText, CheckSquare, Heart } from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isVisible: boolean;
}

export default function BottomNav({
  currentPage,
  onNavigate,
  isVisible,
}: BottomNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'connections', label: 'Koneksi', icon: Users },
    { id: 'protocol', label: 'Protokol', icon: FileText },
    { id: 'tasks', label: 'Task', icon: CheckSquare },
    { id: 'contributions', label: 'Kontribusi', icon: Heart },
  ];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 safe-area-pb
      transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <nav className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors
                ${
                  isActive
                    ? 'text-green-600'
                    : 'text-gray-500 active:text-green-600'
                }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-105' : ''
                }`}
                strokeWidth={isActive ? 2.25 : 2}
              />
              <span
                className={`mt-0.5 text-[10px] leading-none ${
                  isActive ? 'font-semibold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
