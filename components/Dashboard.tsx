
import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, DollarSign, Briefcase, ChevronRight,
  Star, CheckSquare, ArrowRight, Activity, Mail
} from 'lucide-react';
import { MOCK_USERS } from '../constants.tsx';
import { ImageWithFallback } from './common.tsx';
import { apiGetDeals, apiGetProjects, apiGetTasks, apiGetInvoices, apiGetSharedInboxEmails, apiGetProject, apiGetUsers, apiGetRevenueVelocity } from '../utils/api';
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
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7D' | '1M' | '1Y'>('1M');
  const [revenueData, setRevenueData] = useState<Array<{ name: string; value: number }>>([]);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(false);

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
        const openPipelineValue = openDeals.reduce((sum: number, deal: any) => sum + (deal.value || 0), 0);

        const activeProjects = Array.isArray(projects) 
          ? projects.filter((p: any) => p.status !== 'Completed' && p.status !== 'Cancelled').length 
          : 0;

        const unpaidInvoices = Array.isArray(invoices) 
          ? invoices.filter((inv: any) => inv.status !== 'Paid').reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
          : 0;

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

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toLocaleString()}`;
  };

  const userName = currentUser?.name?.split(' ')[0] || 'Alex';
  const userAvatar = currentUser?.avatar || currentUser?.photoURL || '';
  const userIdentity = currentUser?.name || currentUser?.email || 'Impact Member';

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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        {[
          { id: 'pipeline', label: 'Open Pipeline', value: formatCurrency(stats.openPipeline), icon: <TrendingUp />, color: 'text-blue-600 bg-blue-50/50' },
          { id: 'projects', label: 'Active Projects', value: stats.activeProjects.toString(), icon: <Briefcase />, color: 'text-indigo-600 bg-indigo-50/50', border: 'border-indigo-200' },
          { id: 'invoices', label: 'Unpaid Invoices', value: formatCurrency(stats.unpaidInvoices), icon: <DollarSign />, color: 'text-emerald-600 bg-emerald-50/50' },
          { id: 'tasks', label: 'Tasks Due Today', value: tasksDueToday.length.toString(), icon: <CheckSquare />, color: 'text-purple-600 bg-purple-50/50' },
        ].map((stat, i) => (
          <button
            key={i}
            onClick={() => {
              if (stat.id === 'tasks') {
                onNavigate('tasks');
              } else {
                onNavigate(stat.id);
              }
            }}
            className={`bg-white p-4 lg:p-7 rounded-[24px] lg:rounded-[28px] border ${stat.border || 'border-slate-100'} shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-indigo-300 transition-all text-left group active:scale-[0.98]`}
          >
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <div className={`p-2 rounded-lg lg:p-2.5 lg:rounded-xl ${stat.color} group-hover:scale-110 transition-transform`}>
                {React.cloneElement(stat.icon as React.ReactElement<any>, { className: 'w-4 h-4 lg:w-5 lg:h-5' })}
              </div>
              {stat.id !== 'tasks' && <span className="text-[9px] lg:text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12%</span>}
            </div>
            <div>
              <p className="text-slate-400 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.1em] lg:tracking-[0.15em]">{stat.label}</p>
              <h3 className="text-lg lg:text-2xl font-black text-slate-900 mt-0.5 lg:mt-1">{stat.value}</h3>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 bg-white p-5 lg:p-8 rounded-[24px] lg:rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
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

        <div className="space-y-6 lg:space-y-8">
          <div
            onClick={() => onNavigate('inbox')}
            className="bg-[#312E81] rounded-[24px] lg:rounded-[32px] p-6 lg:p-8 text-white relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-indigo-100/50"
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6 lg:mb-10">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-all">
                  <Star className="w-4 h-4 lg:w-5 lg:h-5" />
                </div>
                <button className="text-white/40 group-hover:text-white transition-colors">
                  <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
                </button>
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
              onClick={() => onNavigate('tasks')}
              className="w-full mt-8 lg:mt-10 py-3 bg-slate-50 text-indigo-600 text-[10px] font-black rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 group border border-slate-100"
            >
              View All Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
