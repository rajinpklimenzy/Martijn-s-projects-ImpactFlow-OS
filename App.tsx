
import React, { useState, useEffect, useRef } from 'react';
import { NAV_ITEMS, MOCK_USERS, MOCK_NOTIFICATIONS } from './constants.tsx';
import Dashboard from './components/Dashboard.tsx';
import Inbox from './components/Inbox.tsx';
import CRM from './components/CRM.tsx';
import Pipeline from './components/Pipeline.tsx';
import Projects from './components/Projects.tsx';
import Tasks from './components/Tasks.tsx';
import Invoicing from './components/Invoicing.tsx';
import Automations from './components/Automations.tsx';
import UserManagement from './components/UserManagement.tsx';
import Settings from './components/Settings.tsx';
import Schedule from './components/Schedule.tsx';
import AuthGate from './components/AuthGate.tsx';
import NotificationsDropdown from './components/NotificationsDropdown.tsx';
import QuickCreateModal from './components/QuickCreateModal.tsx';
import { Search, Bell, Menu, X, Settings as SettingsIcon, LogOut, Plus, LayoutGrid, Users, CheckSquare, FolderKanban } from 'lucide-react';
import { Notification } from './types.ts';
import { apiLogout } from './utils/api.ts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  
  // Create Modal States
  const [createModalConfig, setCreateModalConfig] = useState<{ isOpen: boolean; type: 'deal' | 'project' | 'task' | 'invoice' | 'company' | 'contact' }>({
    isOpen: false,
    type: 'deal'
  });

  // Notification States
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const notificationRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    apiLogout();
    window.location.reload();
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const openCreateModal = (type: 'deal' | 'project' | 'task' | 'invoice' | 'company' | 'contact') => {
    setCreateModalConfig({ isOpen: true, type });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={setActiveTab} />;
      case 'schedule': return <Schedule />;
      case 'inbox': return <Inbox />;
      case 'crm': return <CRM onNavigate={setActiveTab} onAddCompany={() => openCreateModal('company')} onAddContact={() => openCreateModal('contact')} externalSearchQuery={globalSearchQuery} />;
      case 'pipeline': return <Pipeline onNavigate={setActiveTab} onNewDeal={() => openCreateModal('deal')} />;
      case 'projects': return <Projects onNavigate={setActiveTab} onCreateProject={() => openCreateModal('project')} />;
      case 'tasks': return <Tasks onCreateTask={() => openCreateModal('task')} />;
      case 'invoices': return <Invoicing onCreateInvoice={() => openCreateModal('invoice')} />;
      case 'automation': return <Automations />;
      case 'users': return <UserManagement />;
      case 'settings': return <Settings />;
      default: return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setGlobalSearchQuery(''); 
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
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
            
            <button 
              onClick={handleLogout}
              className="mt-4 w-full flex items-center gap-3 px-3 py-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-all group text-left"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden w-full">
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
                  <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-indigo-600' : 'text-slate-600'}`} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
                      <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-500 text-white text-[10px] font-bold border-2 border-white">
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
        </main>

        {createModalConfig.isOpen && (
          <QuickCreateModal 
            type={createModalConfig.type} 
            onClose={() => setCreateModalConfig({ ...createModalConfig, isOpen: false })} 
          />
        )}
      </div>
    </AuthGate>
  );
};

export default App;
