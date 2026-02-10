
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, DollarSign, Briefcase, ChevronRight,
  Star, CheckSquare, ArrowRight, Activity, Mail, X, Globe, GripVertical, Save,
  Maximize2, Minimize2, Square, MessageSquare
} from 'lucide-react';
import { MOCK_USERS } from '../constants.tsx';
import { ImageWithFallback } from './common.tsx';
import { apiGetDeals, apiGetProjects, apiGetTasks, apiGetInvoices, apiGetSharedInboxEmails, apiGetProject, apiGetUsers, apiGetRevenueVelocity, apiGetDashboardLayout, apiUpdateDashboardLayout, apiGetSatisfactionStats } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { CURRENCIES, DEFAULT_CURRENCY, getCurrencySymbol, formatCurrency, getCurrencyByCode } from '../utils/currency';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

// Widget size types
type WidgetSize = 'small' | 'medium' | 'large';

interface WidgetConfig {
  id: string;
  order: number;
  size?: WidgetSize;
}

// Default widget layout
const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'stat-pipeline', order: 0, size: 'medium' },
  { id: 'stat-projects', order: 1, size: 'medium' },
  { id: 'stat-invoices', order: 2, size: 'medium' },
  { id: 'stat-tasks', order: 3, size: 'medium' },
  { id: 'revenue-chart', order: 4, size: 'large' },
  { id: 'inbox-card', order: 5, size: 'medium' },
  { id: 'tasks-card', order: 6, size: 'medium' },
  { id: 'nps-average', order: 7, size: 'medium' },
  { id: 'nps-needing-attention', order: 8, size: 'medium' },
  { id: 'nps-recent-feedback', order: 9, size: 'medium' },
  { id: 'nps-awaiting-feedback', order: 10, size: 'medium' }
];

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { showError, showSuccess } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    openPipeline: 0,
    activeProjects: 0,
    unpaidInvoices: 0,
    actionableMail: 0
  });
  const [tasksDueToday, setTasksDueToday] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7D' | '1M' | '1Y'>('1M');
  const [revenueData, setRevenueData] = useState<Array<{ name: string; value: number }>>([]);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(false);
  
  // Currency totals state
  const [pipelineTotalsByCurrency, setPipelineTotalsByCurrency] = useState<Record<string, number>>({});
  const [invoiceTotalsByCurrency, setInvoiceTotalsByCurrency] = useState<Record<string, number>>({});
  const [mostUsedCurrency, setMostUsedCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [isCurrencyPopupOpen, setIsCurrencyPopupOpen] = useState(false);

  // Drag and drop state
  const [widgetLayout, setWidgetLayout] = useState<WidgetConfig[]>(DEFAULT_LAYOUT);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [resizingWidget, setResizingWidget] = useState<string | null>(null);
  const dragCounter = useRef(0);

  // Client satisfaction / NPS stats for dashboard widgets
  const [satisfactionStats, setSatisfactionStats] = useState<{
    averageNps: number | null;
    totalResponses: number;
    companiesNeedingAttention: Array<{ companyId: string; companyName: string; npsScore: number; accountManagerId?: string }>;
    recentFeedback: Array<{ companyId: string; companyName: string; npsScore: number; feedback: string; date: string }>;
    awaitingFeedback: Array<{ companyId: string; companyName: string; daysElapsed: number }>;
  } | null>(null);
  const [isLoadingSatisfactionStats, setIsLoadingSatisfactionStats] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
    setCurrentUser(userData);
    
    // Load user's saved layout
    if (userData?.id) {
      loadDashboardLayout(userData.id);
    }
  }, []);

  const loadDashboardLayout = async (userId: string) => {
    try {
      const response = await apiGetDashboardLayout(userId);
      if (response?.data && Array.isArray(response.data)) {
        // Migrate old stats-grid to individual stat cards
        const migratedLayout = response.data.flatMap((widget: any) => {
          if (widget.id === 'stats-grid') {
            // Replace stats-grid with 4 individual stat cards
            return [
              { id: 'stat-pipeline', order: widget.order, size: widget.size || 'medium' },
              { id: 'stat-projects', order: widget.order + 0.1, size: widget.size || 'medium' },
              { id: 'stat-invoices', order: widget.order + 0.2, size: widget.size || 'medium' },
              { id: 'stat-tasks', order: widget.order + 0.3, size: widget.size || 'medium' }
            ];
          }
          // Adjust order for widgets that come after stats-grid
          if (widget.order > 0) {
            return [{ ...widget, order: widget.order + 3, size: widget.size || 'medium' }]; // Add 3 to account for the 3 new stat cards
          }
          return [{ ...widget, size: widget.size || 'medium' }];
        });
        
        // Deduplicate widgets by id (keep the first occurrence)
        const seen = new Set<string>();
        const deduplicatedLayout = migratedLayout.filter(widget => {
          if (seen.has(widget.id)) {
            console.warn(`[DASHBOARD] Duplicate widget found: ${widget.id}, removing duplicate`);
            return false;
          }
          seen.add(widget.id);
          return true;
        });
        
        setWidgetLayout(deduplicatedLayout);
      }
    } catch (err) {
      console.log('[DASHBOARD] Using default layout');
      // Use default layout if none saved
    }
  };

  const saveDashboardLayout = async () => {
    if (!currentUser?.id) return;
    
    setIsSavingLayout(true);
    try {
      await apiUpdateDashboardLayout(currentUser.id, widgetLayout);
      showSuccess('Dashboard layout saved');
      setIsEditMode(false);
    } catch (err) {
      showError('Failed to save layout');
    } finally {
      setIsSavingLayout(false);
    }
  };

  const resetLayout = () => {
    setWidgetLayout(DEFAULT_LAYOUT);
  };

  const handleResizeWidget = (widgetId: string, newSize: WidgetSize) => {
    setWidgetLayout(prev => 
      prev.map(widget => 
        widget.id === widgetId ? { ...widget, size: newSize } : widget
      )
    );
  };

  const getSizeClasses = (size: WidgetSize = 'medium', widgetId: string) => {
    const isStatCard = widgetId.startsWith('stat-');
    
    if (isStatCard) {
      // Stat cards are always in a grid, size doesn't affect them
      return '';
    }
    
    switch (size) {
      case 'small':
        return 'lg:col-span-1';
      case 'medium':
        return 'lg:col-span-2';
      case 'large':
        return 'lg:col-span-3';
      default:
        return 'lg:col-span-2';
    }
  };

  const getColumnSpan = (size: WidgetSize = 'medium', widgetId: string): number => {
    const isStatCard = widgetId.startsWith('stat-');
    if (isStatCard) return 0; // Stat cards handled separately
    
    switch (size) {
      case 'small':
        return 1;
      case 'medium':
        return 2;
      case 'large':
        return 3;
      default:
        return 2;
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    if (!isEditMode) return;
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', widgetId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode || !draggedWidget) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    if (!isEditMode || !draggedWidget || draggedWidget === targetWidgetId) return;
    
    e.preventDefault();
    
    const newLayout = [...widgetLayout];
    const draggedIndex = newLayout.findIndex(w => w.id === draggedWidget);
    const targetIndex = newLayout.findIndex(w => w.id === targetWidgetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Swap positions
      const draggedItem = newLayout[draggedIndex];
      newLayout.splice(draggedIndex, 1);
      newLayout.splice(targetIndex, 0, draggedItem);
      
      // Update order values
      newLayout.forEach((widget, index) => {
        widget.order = index;
      });
      
      setWidgetLayout(newLayout);
    }
    
    setDraggedWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const userId = JSON.parse(localStorage.getItem('user_data') || '{}').id;
        if (!userId) {
          setIsLoading(false);
          return;
        }
        
        const [dealsRes, projectsRes, tasksRes, invoicesRes, inboxRes, usersRes] = await Promise.all([
          apiGetDeals(userId).catch(() => ({ data: [] })),
          apiGetProjects(userId).catch(() => ({ data: [] })),
          apiGetTasks(userId).catch(() => ({ data: [] })),
          apiGetInvoices(userId).catch(() => ({ data: [] })),
          apiGetSharedInboxEmails(userId).catch(() => ({ data: [] })),
          apiGetUsers().catch(() => ({ data: [] }))
        ]);

        const deals = dealsRes?.data || dealsRes || [];
        const projects = projectsRes?.data || projectsRes || [];
        const tasks = tasksRes?.data || tasksRes || [];
        const invoices = invoicesRes?.data || invoicesRes || [];
        const inboxEmails = inboxRes?.data || inboxRes || [];
        const usersData = usersRes?.data || usersRes || [];

        const openDeals = Array.isArray(deals) 
          ? deals.filter((d: any) => d.stage !== 'Won' && d.stage !== 'Lost')
          : [];
        
        // Calculate pipeline totals by currency
        const pipelineByCurrency: Record<string, number> = {};
        const currencyCounts: Record<string, number> = {};
        
        openDeals.forEach((deal: any) => {
          const currency = deal.currency || DEFAULT_CURRENCY;
          const value = deal.value || 0;
          pipelineByCurrency[currency] = (pipelineByCurrency[currency] || 0) + value;
          currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
        });

        const activeProjects = Array.isArray(projects) 
          ? projects.filter((p: any) => p.status !== 'Completed' && p.status !== 'Cancelled').length 
          : 0;

        // Calculate invoice totals by currency
        const unpaidInvoicesList = Array.isArray(invoices) 
          ? invoices.filter((inv: any) => inv.status !== 'Paid')
          : [];
        
        const invoicesByCurrency: Record<string, number> = {};
        
        unpaidInvoicesList.forEach((inv: any) => {
          const currency = inv.currency || DEFAULT_CURRENCY;
          const amount = inv.amount || 0;
          invoicesByCurrency[currency] = (invoicesByCurrency[currency] || 0) + amount;
          currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
        });
        
        // Find most used currency (by count of deals/invoices)
        let maxCount = 0;
        let mostUsed = DEFAULT_CURRENCY;
        Object.keys(currencyCounts).forEach(currency => {
          if (currencyCounts[currency] > maxCount) {
            maxCount = currencyCounts[currency];
            mostUsed = currency;
          }
        });
        
        // Set currency totals and most used currency
        setPipelineTotalsByCurrency(pipelineByCurrency);
        setInvoiceTotalsByCurrency(invoicesByCurrency);
        setMostUsedCurrency(mostUsed);
        
        // Calculate totals for display (using most used currency)
        const openPipelineValue = pipelineByCurrency[mostUsed] || 0;
        const unpaidInvoices = invoicesByCurrency[mostUsed] || 0;

        // Forced to 0 for now as Shared Inbox is in development/beta
        const actionableMailCount = 0; 

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tasksToday = Array.isArray(tasks) 
          ? tasks.filter((task: any) => {
              if (!task.dueDate) return false;
              const dueDate = new Date(task.dueDate);
              dueDate.setHours(0, 0, 0, 0);
              return dueDate.getTime() === today.getTime() && task.status !== 'Done';
            })
          : [];

        const tasksWithProjects = await Promise.all(
          tasksToday.slice(0, 2).map(async (task: any) => {
            if (task.projectId) {
              try {
                const projectRes = await apiGetProject(task.projectId);
                return { ...task, projectTitle: projectRes?.data?.title || 'Software' };
              } catch {
                return { ...task, projectTitle: 'Software' };
              }
            }
            return { ...task, projectTitle: 'Software' };
          })
        );

        setStats({
          openPipeline: openPipelineValue,
          activeProjects,
          unpaidInvoices,
          actionableMail: actionableMailCount
        });
        setTasksDueToday(tasksWithProjects);
        setUsers(usersData.slice(0, 3));
      } catch (err) {
        console.error('[DASHBOARD] Failed to fetch data:', err);
        showError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [showError]);

  useEffect(() => {
    const fetchRevenueData = async () => {
      setIsLoadingRevenue(true);
      try {
        const userId = JSON.parse(localStorage.getItem('user_data') || '{}').id;
        if (!userId) {
          setIsLoadingRevenue(false);
          return;
        }

        const response = await apiGetRevenueVelocity(userId, timeframe);
        const data = response?.data || response || [];
        setRevenueData(Array.isArray(data) ? data : []);
      } catch (err) {
        setRevenueData([]);
      } finally {
        setIsLoadingRevenue(false);
      }
    };

    fetchRevenueData();
  }, [timeframe]);

  useEffect(() => {
    const fetchSatisfactionStats = async () => {
      setIsLoadingSatisfactionStats(true);
      try {
        const response = await apiGetSatisfactionStats();
        const data = response?.data;
        if (data) {
          setSatisfactionStats({
            averageNps: data.averageNps ?? null,
            totalResponses: data.totalResponses ?? 0,
            companiesNeedingAttention: data.companiesNeedingAttention ?? [],
            recentFeedback: data.recentFeedback ?? [],
            awaitingFeedback: data.awaitingFeedback ?? []
          });
        }
      } catch {
        setSatisfactionStats(null);
      } finally {
        setIsLoadingSatisfactionStats(false);
      }
    };
    fetchSatisfactionStats();
  }, []);

  const formatCurrencyDisplay = (value: number, currencyCode: string = mostUsedCurrency) => {
    const symbol = getCurrencySymbol(currencyCode);
    if (value >= 1000) {
      return `${symbol}${(value / 1000).toFixed(1)}k`;
    }
    return `${symbol}${value.toLocaleString()}`;
  };

  // Render individual widgets
  const renderWidget = (widgetId: string, widgetSize?: WidgetSize) => {
    const isDragging = draggedWidget === widgetId;
    const widget = widgetLayout.find(w => w.id === widgetId);
    const size = widgetSize || widget?.size || 'medium';
    
    const commonProps = {
      draggable: isEditMode,
      onDragStart: (e: React.DragEvent) => handleDragStart(e, widgetId),
      onDragOver: handleDragOver,
      onDrop: (e: React.DragEvent) => handleDrop(e, widgetId),
      onDragEnd: handleDragEnd,
      className: `transition-all ${isDragging ? 'opacity-50 scale-95' : ''} ${isEditMode ? 'cursor-move' : ''}`
    };

    const renderSizeControls = () => {
      if (!isEditMode) return null;
      
      const sizes: { value: WidgetSize; icon: React.ReactNode; label: string }[] = [
        { value: 'small', icon: <Minimize2 className="w-3 h-3" />, label: 'Small' },
        { value: 'medium', icon: <Square className="w-3 h-3" />, label: 'Medium' },
        { value: 'large', icon: <Maximize2 className="w-3 h-3" />, label: 'Large' }
      ];

      return (
        <div className="flex items-center gap-1 mb-3 bg-slate-50 rounded-lg p-1 border border-slate-200">
          {sizes.map(({ value, icon, label }) => (
            <button
              key={value}
              onClick={(e) => {
                e.stopPropagation();
                handleResizeWidget(widgetId, value);
              }}
              onMouseEnter={() => setResizingWidget(widgetId)}
              onMouseLeave={() => setResizingWidget(null)}
              className={`p-1.5 rounded transition-all ${
                size === value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>
      );
    };

    switch (widgetId) {
      case 'stat-pipeline':
        return (
          <div key={widgetId} {...commonProps}>
            {isEditMode && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Open Pipeline</span>
                </div>
              </div>
            )}
            <button
              onClick={() => onNavigate('pipeline')}
              className="bg-white p-4 lg:p-7 rounded-[24px] lg:rounded-[28px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-indigo-300 transition-all text-left group active:scale-[0.98] w-full"
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div className="p-2 rounded-lg lg:p-2.5 lg:rounded-xl text-blue-600 bg-blue-50/50 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />
                </div>
                <span className="text-[9px] lg:text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12%</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <p className="text-slate-400 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] lg:tracking-[0.15em]">Open Pipeline</p>
                  <h3 className="text-lg lg:text-2xl font-black text-slate-900 mt-0.5 lg:mt-1">{formatCurrencyDisplay(stats.openPipeline, mostUsedCurrency)}</h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCurrencyPopupOpen(true);
                  }}
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all shadow-sm ml-3 flex-shrink-0"
                  title="View in other currencies"
                >
                  <Globe className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
              </div>
            </button>
          </div>
        );
      
      case 'stat-projects':
        return (
          <div key={widgetId} {...commonProps}>
            {isEditMode && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Active Projects</span>
                </div>
              </div>
            )}
            <button
              onClick={() => onNavigate('projects')}
              className="bg-white p-4 lg:p-7 rounded-[24px] lg:rounded-[28px] border border-indigo-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-indigo-300 transition-all text-left group active:scale-[0.98] w-full"
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div className="p-2 rounded-lg lg:p-2.5 lg:rounded-xl text-indigo-600 bg-indigo-50/50 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-4 h-4 lg:w-5 lg:h-5" />
                </div>
                <span className="text-[9px] lg:text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12%</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <p className="text-slate-400 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] lg:tracking-[0.15em]">Active Projects</p>
                  <h3 className="text-lg lg:text-2xl font-black text-slate-900 mt-0.5 lg:mt-1">{stats.activeProjects}</h3>
                </div>
              </div>
            </button>
          </div>
        );
      
      case 'stat-invoices':
        return (
          <div key={widgetId} {...commonProps}>
            {isEditMode && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Unpaid Invoices</span>
                </div>
              </div>
            )}
            <button
              onClick={() => onNavigate('invoices')}
              className="bg-white p-4 lg:p-7 rounded-[24px] lg:rounded-[28px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-indigo-300 transition-all text-left group active:scale-[0.98] w-full"
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div className="p-2 rounded-lg lg:p-2.5 lg:rounded-xl text-emerald-600 bg-emerald-50/50 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-4 h-4 lg:w-5 lg:h-5" />
                </div>
                <span className="text-[9px] lg:text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12%</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <p className="text-slate-400 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] lg:tracking-[0.15em]">Unpaid Invoices</p>
                  <h3 className="text-lg lg:text-2xl font-black text-slate-900 mt-0.5 lg:mt-1">{formatCurrencyDisplay(stats.unpaidInvoices, mostUsedCurrency)}</h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCurrencyPopupOpen(true);
                  }}
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all shadow-sm ml-3 flex-shrink-0"
                  title="View in other currencies"
                >
                  <Globe className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
              </div>
            </button>
          </div>
        );
      
      case 'stat-tasks':
        return (
          <div key={widgetId} {...commonProps}>
            {isEditMode && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Tasks Due Today</span>
                </div>
              </div>
            )}
            <button
              onClick={() => onNavigate('tasks')}
              className="bg-white p-4 lg:p-7 rounded-[24px] lg:rounded-[28px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-indigo-300 transition-all text-left group active:scale-[0.98] w-full"
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div className="p-2 rounded-lg lg:p-2.5 lg:rounded-xl text-purple-600 bg-purple-50/50 group-hover:scale-110 transition-transform">
                  <CheckSquare className="w-4 h-4 lg:w-5 lg:h-5" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <p className="text-slate-400 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] lg:tracking-[0.15em]">Tasks Due Today</p>
                  <h3 className="text-lg lg:text-2xl font-black text-slate-900 mt-0.5 lg:mt-1">{tasksDueToday.length}</h3>
                </div>
              </div>
            </button>
          </div>
        );

      case 'revenue-chart':
        return (
          <div key={widgetId} {...commonProps}>
            {isEditMode && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Revenue Chart</span>
                </div>
                {renderSizeControls()}
              </div>
            )}
            <div className="bg-white p-5 lg:p-8 rounded-[24px] lg:rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 lg:mb-10 gap-4">
                <div>
                  <h3 className="text-lg lg:text-xl font-black text-slate-900">Revenue Velocity</h3>
                  <p className="text-slate-400 text-[10px] lg:text-xs font-medium mt-0.5 lg:mt-1">Digital transformation revenue flow</p>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 w-full sm:w-auto">
                  {(['7D', '1M', '1Y'] as const).map(f => (
                    <button 
                      key={f}
                      onClick={() => setTimeframe(f)}
                      className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${f === timeframe ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-60 lg:h-72 w-full relative">
                {isLoadingRevenue ? (
                  <div className="h-full flex items-center justify-center">
                    <Activity className="w-10 h-10 text-slate-300 animate-pulse" />
                  </div>
                ) : revenueData.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-medium">No revenue data available</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} 
                      width={40}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '10px' }}
                      itemStyle={{ fontWeight: 'bold', fontSize: '12px', color: '#4f46e5' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#4f46e5"
                      fillOpacity={1}
                      fill="url(#colorValue)"
                      strokeWidth={3}
                      animationDuration={1500}
                    />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        );

      case 'inbox-card':
        return (
          <div key={widgetId} {...commonProps}>
            {isEditMode && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Inbox Card</span>
                </div>
                {renderSizeControls()}
              </div>
            )}
            <div
              onClick={() => !isEditMode && onNavigate('inbox')}
              className={`bg-[#312E81] rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 text-white relative overflow-hidden group ${!isEditMode ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''} transition-all shadow-xl shadow-indigo-100/50`}
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6 lg:mb-10">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-all">
                    <Star className="w-4 h-4 lg:w-5 lg:h-5" />
                  </div>
                  {!isEditMode && (
                    <button className="text-white/40 group-hover:text-white transition-colors">
                      <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                  )}
                </div>

                <h3 className="text-xl lg:text-2xl font-black mb-2 lg:mb-3">Check Inbox</h3>
                <p className="text-indigo-200 text-[10px] lg:text-xs font-medium leading-relaxed opacity-80 max-w-[200px]">
                  You have {stats.actionableMail} actionable items that need attention.
                </p>

                <div className="mt-6 lg:mt-8 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {users.map((u, idx) => (
                      <ImageWithFallback
                        key={u.id || idx}
                        src={u.avatar}
                        isAvatar={true}
                        fallbackText={u.name || u.email || 'U'}
                        className="w-7 h-7 lg:w-9 lg:h-9 border-2 border-[#312E81] shadow-lg"
                      />
                    ))}
                    <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-full bg-indigo-500 border-2 border-[#312E81] flex items-center justify-center text-[9px] font-black shadow-lg">
                      +1
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4 pointer-events-none">
                <Users className="w-32 h-32 lg:w-48 lg:h-48" />
              </div>
            </div>
          </div>
        );

      case 'tasks-card':
        return (
          <div key={widgetId} {...commonProps}>
            {isEditMode && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Tasks Due Today</span>
                </div>
                {renderSizeControls()}
              </div>
            )}
            <div className="bg-white rounded-[24px] lg:rounded-[32px] border border-slate-100 p-6 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center mb-6 lg:mb-8">
                <h4 className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Tasks Due Today</h4>
                <CheckSquare className="w-4 h-4 text-indigo-400" />
              </div>

              <div className="space-y-4 lg:space-y-6">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-4 bg-slate-50 rounded animate-pulse" />
                    ))}
                  </div>
                ) : tasksDueToday.length > 0 ? (
                  tasksDueToday.slice(0, 2).map(task => (
                    <div key={task.id} className="flex gap-4 group cursor-pointer">
                      <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-amber-400 mt-1.5 shrink-0 shadow-sm" />
                      <div>
                        <h5 className="text-xs lg:text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{task.title}</h5>
                        <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase mt-0.5">{task.projectTitle || 'Software'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No tasks due today</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => !isEditMode && onNavigate('tasks')}
                disabled={isEditMode}
                className="w-full mt-8 lg:mt-10 py-3 bg-slate-50 text-indigo-600 text-[10px] font-black rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 group border border-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View All Tasks
              </button>
            </div>
          </div>
        );

      case 'nps-average': {
        const nps = satisfactionStats?.averageNps ?? null;
        const npsColor = nps === null ? 'text-slate-400' : nps >= 9 ? 'text-green-600' : nps >= 7 ? 'text-amber-600' : 'text-red-600';
        const npsBg = nps === null ? 'bg-slate-50' : nps >= 9 ? 'bg-green-50' : nps >= 7 ? 'bg-amber-50' : 'bg-red-50';
        return (
          <div key={widgetId} {...commonProps}>
            {isEditMode && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Average NPS Score</span>
                </div>
                {renderSizeControls()}
              </div>
            )}
            <button
              onClick={() => !isEditMode && onNavigate('satisfaction')}
              disabled={isEditMode}
              className="bg-white p-4 lg:p-7 rounded-[24px] lg:rounded-[28px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-indigo-300 transition-all text-left group active:scale-[0.98] w-full disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div className={`p-2 rounded-lg lg:p-2.5 lg:rounded-xl ${npsBg} ${npsColor}`}>
                  <Star className="w-4 h-4 lg:w-5 lg:h-5" />
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em]">Average NPS Score</p>
                {isLoadingSatisfactionStats ? (
                  <div className="h-8 w-16 bg-slate-100 rounded mt-1 animate-pulse" />
                ) : (
                  <h3 className={`text-2xl lg:text-3xl font-black mt-0.5 lg:mt-1 ${npsColor}`}>
                    {nps !== null ? nps.toFixed(1) : '—'}
                  </h3>
                )}
              </div>
            </button>
          </div>
        );
      }

      case 'nps-needing-attention': {
        const list = satisfactionStats?.companiesNeedingAttention ?? [];
        return (
          <div key={widgetId} {...commonProps}>
            {isEditMode && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Companies Needing Attention</span>
                </div>
                {renderSizeControls()}
              </div>
            )}
            <div className="bg-white rounded-[24px] lg:rounded-[32px] border border-slate-100 p-6 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center mb-4 lg:mb-6">
                <h4 className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Detractors (0–6)</h4>
                <Star className="w-4 h-4 text-red-400" />
              </div>
              <div className="space-y-3">
                {isLoadingSatisfactionStats ? (
                  [1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-50 rounded animate-pulse" />)
                ) : list.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-medium">No detractors</p>
                ) : (
                  list.map((item: any) => {
                    const amName = item.accountManagerId && users?.length ? (users.find((u: any) => u.id === item.accountManagerId)?.name) : null;
                    return (
                      <button
                        key={item.companyId}
                        onClick={() => !isEditMode && onNavigate('satisfaction')}
                        disabled={isEditMode}
                        className="w-full flex flex-col gap-0.5 p-2 rounded-lg hover:bg-slate-50 text-left disabled:pointer-events-none"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs lg:text-sm font-semibold text-slate-900 truncate">{item.companyName}</span>
                          <span className="text-xs font-bold text-red-600 shrink-0">{item.npsScore}</span>
                        </div>
                        {amName ? <span className="text-[10px] text-slate-500 truncate">AM: {amName}</span> : null}
                      </button>
                    );
                  })
                )}
              </div>
              <button
                onClick={() => !isEditMode && onNavigate('satisfaction')}
                disabled={isEditMode}
                className="w-full mt-4 py-2.5 bg-slate-50 text-indigo-600 text-[10px] font-black rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest"
              >
                View Client Satisfaction
              </button>
            </div>
          </div>
        );
      }

      case 'nps-recent-feedback': {
        const list = satisfactionStats?.recentFeedback ?? [];
        return (
          <div key={widgetId} {...commonProps}>
            {isEditMode && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Recent Feedback</span>
                </div>
                {renderSizeControls()}
              </div>
            )}
            <div className="bg-white rounded-[24px] lg:rounded-[32px] border border-slate-100 p-6 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center mb-4 lg:mb-6">
                <h4 className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Latest 5 responses</h4>
                <MessageSquare className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="space-y-4">
                {isLoadingSatisfactionStats ? (
                  [1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-50 rounded animate-pulse" />)
                ) : list.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-medium">No feedback yet</p>
                ) : (
                  list.map((item: any, idx: number) => (
                    <div key={idx} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-900">{item.companyName}</span>
                        <span className={`text-xs font-bold shrink-0 ${item.npsScore >= 9 ? 'text-green-600' : item.npsScore >= 7 ? 'text-amber-600' : 'text-red-600'}`}>{item.npsScore}</span>
                      </div>
                      {item.feedback ? <p className="text-[10px] text-slate-500 line-clamp-2">{item.feedback}</p> : null}
                      <p className="text-[9px] text-slate-400 mt-0.5">{item.date ? new Date(item.date).toLocaleDateString() : ''}</p>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => !isEditMode && onNavigate('satisfaction')}
                disabled={isEditMode}
                className="w-full mt-4 py-2.5 bg-slate-50 text-indigo-600 text-[10px] font-black rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest"
              >
                View Client Satisfaction
              </button>
            </div>
          </div>
        );
      }

      case 'nps-awaiting-feedback': {
        const list = satisfactionStats?.awaitingFeedback ?? [];
        return (
          <div key={widgetId} {...commonProps}>
            {isEditMode && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GripVertical className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Awaiting Feedback</span>
                </div>
                {renderSizeControls()}
              </div>
            )}
            <div className="bg-white rounded-[24px] lg:rounded-[32px] border border-slate-100 p-6 lg:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center mb-4 lg:mb-6">
                <h4 className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Survey sent, no response yet</h4>
                <Mail className="w-4 h-4 text-amber-400" />
              </div>
              <div className="space-y-3">
                {isLoadingSatisfactionStats ? (
                  [1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-50 rounded animate-pulse" />)
                ) : list.length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-medium">None</p>
                ) : (
                  list.map((item: any) => (
                    <button
                      key={item.companyId}
                      onClick={() => !isEditMode && onNavigate('satisfaction')}
                      disabled={isEditMode}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 text-left disabled:pointer-events-none"
                    >
                      <span className="text-xs lg:text-sm font-semibold text-slate-900 truncate">{item.companyName}</span>
                      <span className="text-xs font-bold text-slate-500 shrink-0">{item.daysElapsed}d ago</span>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => !isEditMode && onNavigate('satisfaction')}
                disabled={isEditMode}
                className="w-full mt-4 py-2.5 bg-slate-50 text-indigo-600 text-[10px] font-black rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest"
              >
                View Client Satisfaction
              </button>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const userName = currentUser?.name?.split(' ')[0] || 'Alex';
  const userAvatar = currentUser?.avatar || currentUser?.photoURL || '';
  const userIdentity = currentUser?.name || currentUser?.email || 'Impact Member';

  // Sort widgets by order
  const sortedWidgets = [...widgetLayout].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <ImageWithFallback
            src={userAvatar}
            alt={userIdentity}
            fallbackText={userIdentity}
            isAvatar={true}
            className="w-10 h-10 rounded-full border border-slate-200 shadow-sm"
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Welcome, {userName}</h1>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs lg:text-sm font-medium">Logistics digitalization hub</span>
            </div>
          </div>
        </div>
        
        {/* Customize Dashboard Button */}
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={resetLayout}
                className="px-4 py-2 border-2 border-slate-200 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-50 transition-all uppercase tracking-wider"
              >
                Reset
              </button>
              <button
                onClick={saveDashboardLayout}
                disabled={isSavingLayout}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 shadow-lg"
              >
                {isSavingLayout ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Layout
                  </>
                )}
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                className="px-4 py-2 border-2 border-slate-200 text-slate-600 text-xs font-black rounded-xl hover:bg-slate-50 transition-all uppercase tracking-wider"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditMode(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg"
            >
              <GripVertical className="w-4 h-4" />
              Customize Dashboard
            </button>
          )}
        </div>
      </div>

      {isEditMode && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <GripVertical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 mb-1">Customize Your Dashboard</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Drag and drop the cards below to rearrange them. Use the size controls to resize widgets (small, medium, large). Your layout will be saved to your account and synced across all devices.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Customizable Widget Layout */}
      <div className="space-y-6 lg:space-y-8">
        {sortedWidgets.map((widget, index) => {
          const content = renderWidget(widget.id, widget.size);
          const isStatCard = widget.id.startsWith('stat-');
          
          // Group consecutive stat cards in a grid
          if (isStatCard) {
            // Check if this is the first stat card in a sequence
            const prevWidget = sortedWidgets[index - 1];
            const isPrevStatCard = prevWidget && prevWidget.id.startsWith('stat-');
            
            if (!isPrevStatCard) {
              // Find all consecutive stat cards starting from this one
              const statCards = [];
              for (let i = index; i < sortedWidgets.length; i++) {
                if (sortedWidgets[i].id.startsWith('stat-')) {
                  statCards.push(sortedWidgets[i]);
                } else {
                  break;
                }
              }
              
              // Render all stat cards in a grid
              return (
                <div key={`stat-cards-group-${index}`} className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                  {statCards.map(statWidget => renderWidget(statWidget.id, statWidget.size))}
                </div>
              );
            } else {
              // Skip this stat card as it's already rendered in the group
              return null;
            }
          }
          
          // Handle revenue-chart with inbox/tasks in a grid for larger screens
          if (widget.id === 'revenue-chart') {
            const nextWidget = sortedWidgets[index + 1];
            const nextNextWidget = sortedWidgets[index + 2];
            const revenueSize = widget.size || 'large';
            
            // Check if next two widgets are inbox and tasks
            if (nextWidget && nextNextWidget && 
                ((nextWidget.id === 'inbox-card' && nextNextWidget.id === 'tasks-card') ||
                 (nextWidget.id === 'tasks-card' && nextNextWidget.id === 'inbox-card'))) {
              // Only use the special grid layout if revenue-chart is large
              if (revenueSize === 'large') {
                return (
                  <div key="revenue-with-sidebar" className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    <div className="lg:col-span-2">
                      {content}
                    </div>
                    <div className="space-y-6 lg:space-y-8">
                      {renderWidget(nextWidget.id, nextWidget.size)}
                      {renderWidget(nextNextWidget.id, nextNextWidget.size)}
                    </div>
                  </div>
                );
              }
            }
          }
          
          // Skip widgets that were already rendered as part of the revenue-chart grid
          const prevWidget = sortedWidgets[index - 1];
          const prevPrevWidget = sortedWidgets[index - 2];
          
          // If previous widget is revenue-chart and current widget is inbox-card or tasks-card,
          // check if it was already rendered in the grid
          if (prevWidget?.id === 'revenue-chart' && 
              (widget.id === 'inbox-card' || widget.id === 'tasks-card')) {
            const revenueSize = prevWidget.size || 'large';
            const nextWidget = sortedWidgets[index + 1];
            // If both inbox-card and tasks-card are next to revenue-chart and revenue-chart is large, skip them (already rendered in grid)
            if (revenueSize === 'large' && nextWidget && 
                ((widget.id === 'inbox-card' && nextWidget.id === 'tasks-card') ||
                 (widget.id === 'tasks-card' && nextWidget.id === 'inbox-card'))) {
              return null;
            }
          }
          
          // Also skip if this is the second widget after revenue-chart (tasks-card after inbox-card or vice versa)
          if (prevPrevWidget?.id === 'revenue-chart' && 
              (widget.id === 'inbox-card' || widget.id === 'tasks-card')) {
            const revenueSize = prevPrevWidget.size || 'large';
            if (revenueSize === 'large') {
              return null;
            }
          }
          
          // Render widget with size-based grid
          const sizeClasses = getSizeClasses(widget.size || 'medium', widget.id);
          
          if (sizeClasses) {
            return (
              <div key={widget.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className={sizeClasses}>
                  {content}
                </div>
              </div>
            );
          }
          
          return (
            <div key={widget.id}>
              {content}
            </div>
          );
        })}
      </div>

      {/* Currency Totals Popup */}
      {isCurrencyPopupOpen && (
        <div className="fixed inset-0 z-[120] overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300" 
            onClick={() => setIsCurrencyPopupOpen(false)} 
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-300 flex flex-col">
              {/* Header */}
              <div className="p-6 lg:p-8 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Currency Totals</h2>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">View totals in different currencies</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCurrencyPopupOpen(false)}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
                <div className="space-y-8">
                  {/* Pipeline Totals */}
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Open Pipeline
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.keys(pipelineTotalsByCurrency).length > 0 ? (
                        (Object.entries(pipelineTotalsByCurrency) as [string, number][])
                          .sort((a, b) => b[1] - a[1]) // Sort by amount descending
                          .map(([currency, totalAmount]) => {
                            const currencyInfo = getCurrencyByCode(currency);
                            const isMostUsed = currency === mostUsedCurrency;
                            return (
                              <div
                                key={currency}
                                className={`p-5 rounded-2xl border-2 ${
                                  isMostUsed 
                                    ? 'bg-indigo-50 border-indigo-300 shadow-md' 
                                    : 'bg-slate-50 border-slate-200'
                                } transition-all hover:shadow-lg`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-black text-slate-900">
                                      {currencyInfo?.symbol || currency}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500 uppercase">
                                      {currency}
                                    </span>
                                    {isMostUsed && (
                                      <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-full">
                                        Most Used
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-2xl font-black text-slate-900">
                                  {formatCurrency(totalAmount, currency)}
                                </p>
                                <p className="text-xs text-slate-400 font-medium mt-1">
                                  {currencyInfo?.name || currency}
                                </p>
                              </div>
                            );
                          })
                      ) : (
                        <div className="col-span-2 p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                          <p className="text-slate-400 font-medium">No pipeline data available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invoice Totals */}
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Unpaid Invoices
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.keys(invoiceTotalsByCurrency).length > 0 ? (
                        (Object.entries(invoiceTotalsByCurrency) as [string, number][])
                          .sort((a, b) => b[1] - a[1]) // Sort by amount descending
                          .map(([currency, totalAmount]) => {
                            const currencyInfo = getCurrencyByCode(currency);
                            const isMostUsed = currency === mostUsedCurrency;
                            return (
                              <div
                                key={currency}
                                className={`p-5 rounded-2xl border-2 ${
                                  isMostUsed 
                                    ? 'bg-indigo-50 border-indigo-300 shadow-md' 
                                    : 'bg-slate-50 border-slate-200'
                                } transition-all hover:shadow-lg`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-black text-slate-900">
                                      {currencyInfo?.symbol || currency}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500 uppercase">
                                      {currency}
                                    </span>
                                    {isMostUsed && (
                                      <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-full">
                                        Most Used
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-2xl font-black text-slate-900">
                                  {formatCurrency(totalAmount, currency)}
                                </p>
                                <p className="text-xs text-slate-400 font-medium mt-1">
                                  {currencyInfo?.name || currency}
                                </p>
                              </div>
                            );
                          })
                      ) : (
                        <div className="col-span-2 p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                          <p className="text-slate-400 font-medium">No invoice data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 lg:p-8 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => setIsCurrencyPopupOpen(false)}
                  className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
