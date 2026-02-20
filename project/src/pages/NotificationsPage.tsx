import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Check, BellOff, ArrowLeft } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { formatRupiah } from '../lib/formatters';

type Notification = Database['public']['Tables']['notifications']['Row'];

interface NotificationsPageProps {
  isFullScreen?: boolean;
  onBack?: () => void;
}

export function NotificationsPage({ isFullScreen = false, onBack }: NotificationsPageProps) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();

    const markAllAsReadOnOpen = async () => {
      if (!profile) return;

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
    };

    markAllAsReadOnOpen();

    const channel = supabase
      .channel('notifications-page-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile?.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!profile) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 px-4 ${isFullScreen ? 'md:hidden fixed inset-0 top-0 bg-gray-50 z-40 p-4 overflow-y-auto' : ''}`}>
      {onBack && (
        <button
          onClick={onBack}
          className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:border-green-500 hover:-translate-y-px mb-6 md:hidden"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BellOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
          <p className="text-gray-600">You're all caught up</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl border p-4 transition hover:shadow-md ${
                notification.is_read ? 'border-gray-200' : 'border-green-200 bg-green-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${
                  notification.type === 'trade'
                    ? 'bg-green-100'
                    : notification.type === 'price_alert'
                    ? 'bg-yellow-100'
                    : notification.type === 'harvest' || notification.type === 'system'
                    ? 'bg-emerald-100'
                    : 'bg-blue-100'
                }`}>
                  <Bell className={`w-5 h-5 ${
                    notification.type === 'trade'
                      ? 'text-green-600'
                      : notification.type === 'price_alert'
                      ? 'text-yellow-600'
                      : notification.type === 'harvest' || notification.type === 'system'
                      ? 'text-emerald-600'
                      : 'text-blue-600'
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {new Date(notification.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{notification.message}</p>

                  {notification.metadata && (notification.metadata as any).type === 'harvest_dividend' && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-600">Dividen Anda</p>
                          <p className="font-bold text-green-700 text-base">
                            Rp {formatRupiah((notification.metadata as any).dividend_amount || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Unit Dimiliki</p>
                          <p className="font-bold text-gray-900">
                            {(notification.metadata as any).units_owned} unit ({((notification.metadata as any).ownership_percentage || 0).toFixed(2)}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Panen</p>
                          <p className="font-semibold text-gray-700">
                            {(notification.metadata as any).harvest_kg} kg
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Revenue</p>
                          <p className="font-semibold text-gray-700">
                            Rp {formatRupiah((notification.metadata as any).total_revenue || 0)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 italic">
                        {(notification.metadata as any).product_name}
                      </p>
                    </div>
                  )}

                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-sm text-green-600 hover:text-green-700 font-medium mt-2"
                    >
                      tandai sudah dibaca
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
