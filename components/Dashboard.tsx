
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Briefcase, FileText, Mail, Users,
  CheckSquare, ArrowRight, Star, Settings, Activity, LineChart
} from 'lucide-react';
import { apiGetDeals, apiGetProjects, apiGetTasks, apiGetInvoices, apiGetSharedInboxEmails, apiGetProject } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { showError } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    openPipeline: 0,
    activeProjects: 0,
    unpaidInvoices: 0,
    actionableMail: 0
  });
  const [tasksDueToday, setTasksDueToday] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7D' | '1M' | '1Y'>('1M');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
    setCurrentUser(userData);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
        const userId = JSON.parse(localStorage.getItem('user_data') || '{}').id;
        if (!userId) {
          setIsLoading(false);
          return;
        }
        
        // Fetch all data in parallel
        const [dealsRes, projectsRes, tasksRes, invoicesRes, inboxRes] = await Promise.all([
          apiGetDeals(userId).catch(() => ({ data: [] })),
          apiGetProjects(userId).catch(() => ({ data: [] })),
          apiGetTasks(userId).catch(() => ({ data: [] })),
          apiGetInvoices(userId).catch(() => ({ data: [] })),
          apiGetSharedInboxEmails(userId).catch(() => ({ data: [] }))
        ]);

        const deals = dealsRes?.data || dealsRes || [];
        const projects = projectsRes?.data || projectsRes || [];
        const tasks = tasksRes?.data || tasksRes || [];
        const invoices = invoicesRes?.data || invoicesRes || [];
        const inboxEmails = inboxRes?.data || inboxRes || [];

        // Calculate Open Pipeline value (sum of all non-Won/Lost deals)
        const openDeals = Array.isArray(deals) 
          ? deals.filter((d: any) => d.stage !== 'Won' && d.stage !== 'Lost')
          : [];
        const openPipelineValue = openDeals.reduce((sum: number, deal: any) => sum + (deal.value || 0), 0);

        // Calculate Active Projects
        const activeProjects = Array.isArray(projects) 
          ? projects.filter((p: any) => p.status !== 'Completed' && p.status !== 'Cancelled').length 
          : 0;

        // Calculate Unpaid Invoices
        const unpaidInvoices = Array.isArray(invoices) 
          ? invoices.filter((inv: any) => inv.status !== 'Paid').reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
          : 0;

        // Calculate Actionable Mail (unread high-priority emails)
        const actionableMail = Array.isArray(inboxEmails) 
          ? inboxEmails.filter((email: any) => !email.read).length 
          : 0;

        // Get tasks due today
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

        // Fetch project details for tasks
        const tasksWithProjects = await Promise.all(
          tasksToday.slice(0, 5).map(async (task: any) => {
            if (task.projectId) {
              try {
                const projectRes = await apiGetProject(task.projectId);
                return { ...task, projectTitle: projectRes?.data?.title || 'SOFTWARE' };
              } catch {
                return { ...task, projectTitle: 'SOFTWARE' };
              }
            }
            return task;
          })
        );

        setStats({
          openPipeline: openPipelineValue,
          activeProjects,
          unpaidInvoices,
          actionableMail
        });
        setTasksDueToday(tasksWithProjects);
    } catch (err) {
        console.error('[DASHBOARD] Failed to fetch data:', err);
        showError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

    fetchDashboardData();
  }, [showError]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toLocaleString()}`;
  };

  const userName = currentUser?.name?.split(' ')[0] || 'User';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Welcome Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {userName}</h1>
          <div className="flex items-center gap-3">
            <p className="text-slate-500 text-sm font-medium">Logistics digitalization hub</p>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-200">
              SYSTEM NORMAL
            </span>
          </div>
        </div>
        <button 
          onClick={() => onNavigate('pipeline')}
          className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
        >
          New Opportunity
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <LineChart className="w-6 h-6 text-indigo-600" />
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">OPEN PIPELINE</p>
          <p className="text-2xl font-bold text-slate-900 mb-1">{formatCurrency(stats.openPipeline)}</p>
          <p className="text-xs font-bold text-emerald-600">+12%</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Briefcase className="w-6 h-6 text-blue-600" />
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ACTIVE PROJECTS</p>
          <p className="text-2xl font-bold text-slate-900 mb-1">{stats.activeProjects}</p>
          <p className="text-xs font-bold text-emerald-600">+12%</p>
                </div>
                
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-6 h-6 text-amber-600" />
            <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">UNPAID INVOICES</p>
          <p className="text-2xl font-bold text-slate-900 mb-1">{formatCurrency(stats.unpaidInvoices)}</p>
          <p className="text-xs font-bold text-emerald-600">+12%</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-6 h-6 text-purple-600" />
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ACTIONABLE MAIL</p>
          <p className="text-2xl font-bold text-slate-900 mb-1">{stats.actionableMail}</p>
          <p className="text-xs font-bold text-emerald-600">+12%</p>
        </div>
      </div>

      {/* Revenue Velocity and Shared Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Velocity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
                <div>
              <h3 className="text-lg font-bold text-slate-900">Revenue Velocity</h3>
              <p className="text-xs text-slate-500 font-medium">Digital transformation revenue flow</p>
                        </div>
                      <div className="flex gap-2">
              {(['7D', '1M', '1Y'] as const).map((period) => (
                        <button 
                  key={period}
                  onClick={() => setTimeframe(period)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    timeframe === period
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {period}
                        </button>
              ))}
            </div>
          </div>
          {/* Placeholder for chart - you can add a chart library here */}
          <div className="h-48 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
            <div className="text-center">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">Revenue chart</p>
              <p className="text-xs text-slate-300 mt-1">Chart visualization coming soon</p>
            </div>
          </div>
        </div>

        {/* Check Shared Inbox */}
        <div 
          onClick={() => onNavigate('inbox')}
          className="bg-gradient-to-br from-indigo-700 to-purple-700 p-6 rounded-2xl shadow-xl relative overflow-hidden cursor-pointer hover:shadow-2xl transition-all group"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <Star className="w-6 h-6 text-yellow-300" />
              <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Check Shared Inbox</h3>
            <p className="text-indigo-100 text-sm mb-6">
              You have {stats.actionableMail} unread high-priority {stats.actionableMail === 1 ? 'inquiry' : 'inquiries'} that need assignment or conversion.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['AR', 'SO', 'MS'].map((initials, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full border-2 border-indigo-600 flex items-center justify-center text-xs font-bold text-white"
                  >
                    {initials}
                  </div>
                ))}
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full border-2 border-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  +1
                </div>
              </div>
            </div>
          </div>
          <Settings className="absolute -right-8 -bottom-8 w-32 h-32 text-white/10" />
        </div>
                  </div>

      {/* Tasks Due Today */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            TASKS DUE TODAY
          </h3>
          <button
            onClick={() => onNavigate('tasks')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1"
          >
            VIEW IMPLEMENTATION BACKLOG
            <ArrowRight className="w-3 h-3" />
                </button>
              </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse"></div>
            ))}
                </div>
        ) : tasksDueToday.length > 0 ? (
          <div className="space-y-3">
            {tasksDueToday.map((task) => (
              <div key={task.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{task.title}</p>
                    {task.projectTitle && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">PROJECT: {task.projectTitle}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">No tasks due today</p>
            <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default Dashboard;
