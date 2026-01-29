
import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, MessageSquare, CheckSquare, AlertTriangle, Bell, Shield, Check, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Notification } from '../types';
import { apiGetNotifications, apiMarkNotificationAsRead, apiMarkAllNotificationsAsRead } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface NotificationsProps {
  currentUser?: any;
  onNavigate?: (tab: string) => void;
}

const ITEMS_PER_PAGE = 20;

const Notifications: React.FC<NotificationsProps> = ({ currentUser, onNavigate }) => {
  const { showSuccess, showError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadNotifications = useCallback(async (showLoading = false) => {
    try {
      const storedUser = currentUser || JSON.parse(localStorage.getItem('user_data') || 'null');
      if (!storedUser?.id) return;
      
      if (showLoading) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      // Fetch a large number of notifications (500) to support pagination
      const res = await apiGetNotifications(storedUser.id, 500);
      const data = res?.data || res || [];
      
      const mapped: Notification[] = (Array.isArray(data) ? data : []).map((n: any) => {
        // Format timestamp
        let timestamp = 'Just now';
        if (n.createdAt) {
          const date = new Date(n.createdAt);
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);
          
          if (diffMins < 1) timestamp = 'Just now';
          else if (diffMins < 60) timestamp = `${diffMins}m ago`;
          else if (diffHours < 24) timestamp = `${diffHours}h ago`;
          else if (diffDays < 7) timestamp = `${diffDays}d ago`;
          else timestamp = date.toLocaleDateString();
        }
        
        return {
          id: n.id,
          userId: n.userId,
          type: n.type || 'system',
          title: n.title,
          message: n.message,
          timestamp,
          read: !!n.read,
          link: n.link || undefined,
        };
      });
      
      setNotifications(mapped);
      setTotalCount(mapped.length);
      setTotalPages(Math.ceil(mapped.length / ITEMS_PER_PAGE));
      
    } catch (err: any) {
      console.error('[NOTIFICATIONS] Failed to load notifications', err);
      showError(err.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser, showError]);

  useEffect(() => {
    loadNotifications(false);
  }, [loadNotifications]);

  // Listen for custom event to refresh notifications immediately
  useEffect(() => {
    const handleNotificationRefresh = () => {
      loadNotifications(true);
    };
    window.addEventListener('refresh-notifications', handleNotificationRefresh);
    return () => {
      window.removeEventListener('refresh-notifications', handleNotificationRefresh);
    };
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const storedUser = currentUser || JSON.parse(localStorage.getItem('user_data') || 'null');
      if (!storedUser?.id) return;
      
      await apiMarkNotificationAsRead(id, storedUser.id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      window.dispatchEvent(new Event('refresh-notifications'));
    } catch (err: any) {
      console.error('[NOTIFICATIONS] Failed to mark as read', err);
      showError(err.message || 'Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const storedUser = currentUser || JSON.parse(localStorage.getItem('user_data') || 'null');
      if (!storedUser?.id) return;
      
      await apiMarkAllNotificationsAsRead(storedUser.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      showSuccess('All notifications marked as read');
      window.dispatchEvent(new Event('refresh-notifications'));
    } catch (err: any) {
      console.error('[NOTIFICATIONS] Failed to mark all as read', err);
      showError(err.message || 'Failed to mark all notifications as read');
    }
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'lead': return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'deal': return <MessageSquare className="w-5 h-5 text-indigo-500" />;
      case 'task': return <CheckSquare className="w-5 h-5 text-emerald-500" />;
      case 'payment': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Shield className="w-5 h-5 text-slate-400" />;
    }
  };

  const getBg = (type: Notification['type']) => {
    switch (type) {
      case 'lead': return 'bg-blue-50';
      case 'deal': return 'bg-indigo-50';
      case 'task': return 'bg-emerald-50';
      case 'payment': return 'bg-red-50';
      default: return 'bg-slate-50';
    }
  };

  const handleNotificationClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.link) {
      // Handle link navigation - links are in format /?tab=pipeline&deal=123
      if (n.link.startsWith('/?tab=')) {
        const url = new URL(n.link, window.location.origin);
        const tabParam = url.searchParams.get('tab');
        if (tabParam && onNavigate) {
          onNavigate(tabParam);
        } else {
          window.location.href = n.link;
        }
      } else if (n.link.startsWith('/')) {
        window.location.href = n.link;
      } else {
        // Fallback: treat as relative path
        window.location.href = n.link;
      }
    }
  };

  // Pagination calculations
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedNotifications = notifications.slice(startIndex, endIndex);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Bell className="w-6 h-6 text-indigo-600" />
            Notifications
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadNotifications(true)}
            disabled={isRefreshing}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center">
          <Check className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">All caught up!</h3>
          <p className="text-sm text-slate-500">No notifications at this time.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {paginatedNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-6 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer group ${!n.read ? 'bg-indigo-50/30' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${getBg(n.type)}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4 mb-1">
                      <p className={`text-sm font-semibold ${n.read ? 'text-slate-600' : 'text-slate-900 font-bold'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400 font-medium">{n.timestamp}</span>
                        {!n.read && (
                          <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm ${n.read ? 'text-slate-400' : 'text-slate-600'}`}>{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4">
              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(endIndex, notifications.length)}</span> of{' '}
                <span className="font-semibold">{notifications.length}</span> notifications
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="px-2 text-slate-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Notifications;
