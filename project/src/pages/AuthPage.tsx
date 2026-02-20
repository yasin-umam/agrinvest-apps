import { useState } from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { TrendingUp } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex gap-8 items-center">
        <div className="hidden lg:flex flex-1 flex-col justify-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl">
              <TrendingUp className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">ChiliTrade</h1>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Trading Komoditas
            <br />
            Agrikultur dengan
            <br />
            <span className="text-green-600">Percaya Diri</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Bergabunglah dengan platform terdepan di Indonesia untuk trading cabai.
            Data pasar real-time, transaksi aman, dan manajemen portofolio lengkap.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="text-2xl font-bold text-green-600 mb-1">10,000+</div>
              <div className="text-sm text-gray-600">Trader Aktif</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="text-2xl font-bold text-green-600 mb-1">50+ Tons</div>
              <div className="text-sm text-gray-600">Volume Harian</div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          {isLogin ? (
            <LoginForm onToggleForm={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onToggleForm={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
