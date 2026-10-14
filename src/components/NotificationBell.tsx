'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, AlertCircle } from 'lucide-react';

interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 minutes for new alerts
    const interval = setInterval(fetchNotifications, 1800000); // 30 minutes
    return () => clearInterval(interval);
  }, []);

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifications((prev) => {
          const updated = prev.filter((n) => n.id !== id);
          setUnreadCount(updated.filter((n) => !n.isRead).length);
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 text-gray-700 focus:outline-none"
        aria-label="View notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full min-w-4.5 text-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">No notifications yet.</p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 text-xs flex justify-between items-start gap-2 ${
                    !item.isRead ? 'bg-blue-50/50' : 'bg-white'
                  }`}
                >
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-800 font-medium">{item.message}</p>
                      <span className="text-gray-400 text-[10px]">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteNotification(item.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}