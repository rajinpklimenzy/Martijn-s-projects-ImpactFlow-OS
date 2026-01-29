
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NAV_ITEMS } from './constants.tsx';
import Dashboard from './components/Dashboard.tsx';
import CRM from './components/CRM.tsx';
import Pipeline from './components/Pipeline.tsx';
import Projects from './components/Projects.tsx';
import Tasks from './components/Tasks.tsx';
import Invoicing from './components/Invoicing.tsx';
import UserManagement from './components/UserManagement.tsx';
import Settings from './components/Settings.tsx';
import DataHygiene from './components/DataHygiene.tsx';
import Schedule from './components/Schedule.tsx';
import Integrations from './components/Integrations.tsx';
import Roadmap from './components/Roadmap.tsx';
import Expenses from './components/Expenses.tsx';
import AuthGate from './components/AuthGate.tsx';
import NotificationsDropdown from './components/NotificationsDropdown.tsx';
import QuickCreateModal from './components/QuickCreateModal.tsx';
import EventModal from './components/EventModal.tsx';
import BugReportWidget from './components/BugReportWidget.tsx';
import { Search, Bell, Menu, X, Settings as SettingsIcon, LogOut, Plus, ShieldCheck } from 'lucide-react';
import { Notification, CalendarEvent } from './types.ts';
import { apiLogout, apiGetNotifications, apiMarkNotificationAsRead, apiMarkAllNotificationsAsRead } from './utils/api.ts';
import { ToastProvider } from './contexts/ToastContext.tsx';
import { QueryProvider } from './contexts/QueryProvider.tsx';

const App: React.FC = () => {
  // Initialize activeTab from localStorage or default to 'dashboard'
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab || 'dashboard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  
  const [createModalConfig, setCreateModalConfig] = useState<{ 
    isOpen: boolean; 
    type: 'deal' | 'project' | 'task' | 'invoice' | 'company' | 'contact';
    stage?: string;
  }>({
    isOpen: false,
    type: 'deal'
  });

  const [eventModal, setEventModal] = useState<{ isOpen: boolean; event: CalendarEvent | null; selectedDate?: Date }>({
    isOpen: false,
    event: null
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRefreshingNotifications, setIsRefreshingNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const notificationRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async (showLoading = false) => {
    try {
      const storedUser = currentUser || JSON.parse(localStorage.getItem('user_data') || 'null');
      if (!storedUser?.id) return;
      
      if (showLoading) {
        setIsRefreshingNotifications(true);
      }
      
      const res = await apiGetNotifications(storedUser.id, 20);
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
    } catch (err) {
      console.error('[NOTIFICATIONS] Failed to load notifications', err);
    } finally {
      if (showLoading) {
        setIsRefreshingNotifications(false);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    loadNotifications();
    
    // Refresh notifications every 10 seconds for quick updates
    const interval = setInterval(() => {
      loadNotifications(false); // Silent refresh in background
    }, 10000);
    
    // Listen for custom event to refresh notifications immediately
    const handleNotificationRefresh = () => {
      loadNotifications(true); // Show loading indicator
    };
    
    window.addEventListener('refresh-notifications', handleNotificationRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-notifications', handleNotificationRefresh);
    };
  }, [loadNotifications]);

  // Refresh when notification dropdown opens
  useEffect(() => {
    if (isNotificationsOpen) {
      loadNotifications(true);
    }
  }, [isNotificationsOpen, loadNotifications]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Check URL params first (for direct links/sharing), then use localStorage (already initialized in useState)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const validTabs = ['dashboard', 'schedule', 'crm', 'pipeline', 'projects', 'tasks', 'invoices', 'roadmap', 'users', 'settings', 'integrations'];
    
    if (tabParam && validTabs.includes(tabParam)) {
      // URL param takes priority (for direct links)
      setActiveTab(tabParam);
      localStorage.setItem('activeTab', tabParam);
      // Clean up URL param after reading
      urlParams.delete('tab');
      const newUrl = urlParams.toString() 
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    // If no URL param, useState initialization already handled localStorage, so we're good
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await apiLogout();
    window.location.reload();
  };

  const markAsRead = async (id: string) => {
    const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || 'null')?.id;
    if (!userId) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await apiMarkNotificationAsRead(id, userId);
    } catch (err) {}
  };

  const markAllAsRead = async () => {
    const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || 'null')?.id;
    if (!userId) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await apiMarkAllNotificationsAsRead(userId);
    } catch (err) {}
  };

  const openCreateModal = (type: 'deal' | 'project' | 'task' | 'invoice' | 'company' | 'contact', stage?: string) => {
    setCreateModalConfig({ isOpen: true, type, stage: stage || undefined });
  };

  const openEventModal = (event?: CalendarEvent | null, selectedDate?: Date) => {
    setEventModal({ isOpen: true, event: event || null, selectedDate });
  };

  const closeEventModal = () => {
    setEventModal({ isOpen: false, event: null });
  };

  const handleEventSuccess = () => {
    if (activeTab === 'schedule') {
      window.dispatchEvent(new CustomEvent('refresh-schedule'));
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'schedule': return <Schedule currentUser={currentUser} onNavigate={setActiveTab} onNewEvent={() => openEventModal()} />;
      case 'crm': return <CRM onNavigate={setActiveTab} onAddCompany={() => openCreateModal('company')} onAddContact={() => openCreateModal('contact')} externalSearchQuery={globalSearchQuery} />;
      case 'pipeline': return <Pipeline onNavigate={setActiveTab} onNewDeal={(stage?: string) => openCreateModal('deal', stage)} currentUser={currentUser} />;
      case 'projects': return <Projects onNavigate={setActiveTab} onCreateProject={() => openCreateModal('project')} currentUser={currentUser} />;
      case 'tasks': return <Tasks onCreateTask={() => openCreateModal('task')} currentUser={currentUser} />;
      case 'invoices': return <Invoicing onCreateInvoice={() => openCreateModal('invoice')} currentUser={currentUser} />;
      case 'expenses': return <Expenses currentUser={currentUser} />;
      case 'roadmap': return <Roadmap currentUser={currentUser} onNavigate={setActiveTab} />;
      case 'users': return <UserManagement />;
      case 'settings': return <Settings currentUser={currentUser} onUserUpdate={setCurrentUser} />;
      case 'data-hygiene': return <DataHygiene currentUser={currentUser} />;
      case 'integrations': return <Integrations />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    localStorage.setItem('activeTab', id);
    setGlobalSearchQuery(''); 
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
    <QueryProvider>
      <ToastProvider>
        <AuthGate onUserLoaded={setCurrentUser}>
      <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
        {isMobile && isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-white border-r border-slate-200 transition-all duration-300 
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'} 
          flex flex-col overflow-hidden
        `}>
          <div className="p-6 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-indigo-100 shadow-lg">I</div>
              {isSidebarOpen && <span className="font-bold text-lg tracking-tight">ImpactFlow</span>}
            </div>
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            )}
          </div>
          
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="shrink-0">{item.icon}</div>
                {isSidebarOpen && <span className="font-medium whitespace-nowrap">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200 shrink-0">
            <button 
              onClick={() => handleTabChange('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
              {isSidebarOpen && <span className="font-medium">Settings</span>}
            </button>
            {currentUser?.role === 'Admin' && (
              <button 
                onClick={() => handleTabChange('data-hygiene')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                  activeTab === 'data-hygiene' 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                {isSidebarOpen && <span className="font-medium">Data Hygiene</span>}
              </button>
            )}
            
            <button 
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="mt-4 w-full flex items-center gap-3 px-3 py-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-all group text-left"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden w-full relative">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 relative">
            <div className="flex items-center gap-2 lg:gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              <div className="relative group hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                <input 
                  type="text" 
                  placeholder="Search Current View..." 
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm w-40 lg:w-80 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`relative p-2 hover:bg-slate-100 rounded-lg transition-colors ${isNotificationsOpen ? 'bg-slate-100' : ''}`}
                >
                  <Bell className={`w-5 h-5 transition-colors ${unreadCount > 0 ? 'text-indigo-600' : 'text-slate-600'} ${isRefreshingNotifications ? 'animate-pulse' : ''}`} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
                      <span className={`relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-500 text-white text-[10px] font-bold border-2 border-white ${isRefreshingNotifications ? 'animate-pulse' : ''}`}>
                        {unreadCount}
                      </span>
                    </span>
                  )}
                </button>
                {isNotificationsOpen && (
                  <NotificationsDropdown 
                    notifications={notifications}
                    onMarkAsRead={markAsRead}
                    onMarkAllAsRead={markAllAsRead}
                    onRefresh={() => loadNotifications(true)}
                    isRefreshing={isRefreshingNotifications}
                    onClose={() => setIsNotificationsOpen(false)}
                  />
                )}
              </div>
              
              <button 
                onClick={() => openCreateModal('deal')}
                className="px-3 lg:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Quick Create</span>
              </button>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20 lg:pb-8">
            <div className="max-w-7xl mx-auto h-full">
              {renderContent()}
            </div>
          </section>

          {/* Persistent Feedback Widget */}
          <BugReportWidget currentUser={currentUser} />
        </main>

        {createModalConfig.isOpen && (
          <QuickCreateModal 
            type={createModalConfig.type}
            stage={createModalConfig.stage}
            onClose={() => setCreateModalConfig(prev => ({ ...prev, isOpen: false }))} 
            onSuccess={() => {
              if (createModalConfig.type === 'contact' || createModalConfig.type === 'company') {
                window.dispatchEvent(new Event('refresh-crm'));
              }
              if (createModalConfig.type === 'deal') {
                window.dispatchEvent(new Event('refresh-pipeline'));
              }
              if (createModalConfig.type === 'project') {
                window.dispatchEvent(new Event('refresh-projects'));
              }
              if (createModalConfig.type === 'task') {
                window.dispatchEvent(new Event('refresh-tasks'));
              } else if (createModalConfig.type === 'invoice') {
                window.dispatchEvent(new Event('refresh-invoices'));
              }
            }}
          />
        )}

        {eventModal.isOpen && (
          <EventModal
            event={eventModal.event}
            selectedDate={eventModal.selectedDate}
            onClose={closeEventModal}
            onSuccess={handleEventSuccess}
          />
        )}

        {isLogoutConfirmOpen && (
          <div className="fixed inset-0 z-[90] overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300"
              onClick={() => setIsLogoutConfirmOpen(false)}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Confirm Logout</h3>
                  </div>
                  <button
                    onClick={() => setIsLogoutConfirmOpen(false)}
                    className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-600">
                    Are you sure you want to logout from your ImpactFlow workspace?
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsLogoutConfirmOpen(false)}
                      className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex-[2] py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
        </AuthGate>
      </ToastProvider>
    </QueryProvider>
  );
};

export default App;
