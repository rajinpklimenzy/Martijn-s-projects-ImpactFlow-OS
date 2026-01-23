
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, DollarSign, Briefcase, ChevronRight,
  Star, CheckSquare, ArrowRight, Activity
} from 'lucide-react';
import { MOCK_TASKS, MOCK_USERS } from '../constants.tsx';
import { ImageWithFallback } from './common.tsx';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const data = [
  { name: '1', value: 4000 },
  { name: '5', value: 3000 },
  { name: '10', value: 5000 },
  { name: '15', value: 2780 },
  { name: '20', value: 1890 },
  { name: '25', value: 2390 },
  { name: '30', value: 3490 },
];

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome, Alex</h1>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm font-medium">Logistics digitalization hub</span>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider">
              System Normal
            </div>
          </div>
        </div>
        <button
          onClick={() => onNavigate('pipeline')}
          className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <TrendingUp className="w-4 h-4" />
          New Opportunity
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[
          { id: 'pipeline', label: 'Open Pipeline', value: '$124.5k', icon: <TrendingUp />, color: 'text-blue-600 bg-blue-50/50' },
          { id: 'projects', label: 'Active Projects', value: '12', icon: <Briefcase />, color: 'text-indigo-600 bg-indigo-50/50', border: 'border-indigo-200' },
          { id: 'invoices', label: 'Unpaid Invoices', value: '$3.4k', icon: <DollarSign />, color: 'text-emerald-600 bg-emerald-50/50' },
          { id: 'inbox', label: 'Actionable Mail', value: '4', icon: <Users />, color: 'text-purple-600 bg-purple-50/50' },
        ].map((stat, i) => (
          <button
            key={i}
            onClick={() => onNavigate(stat.id)}
            className={`bg-white p-5 lg:p-7 rounded-[28px] border ${stat.border || 'border-slate-100'} shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-indigo-300 transition-all text-left group active:scale-[0.98]`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className={`p-2.5 rounded-xl ${stat.color} group-hover:scale-110 transition-transform`}>
                {/* Fix: Using ReactElement<any> to allow 'className' property as standard ReactElement defaults to unknown */}
                {React.cloneElement(stat.icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12%</span>
            </div>
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900">Revenue Velocity</h3>
              <p className="text-slate-400 text-xs font-medium mt-1">Digital transformation revenue flow</p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
              {['7D', '1M', '1Y'].map(f => (
                <button key={f} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${f === '1M' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full relative">
            {/* Background Icon Decoration as seen in screenshot */}
            <div className="absolute right-0 top-0 opacity-[0.03] translate-x-1/4 -translate-y-1/4">
              <TrendingUp className="w-64 h-64 text-indigo-600" />
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} width={35} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px' }}
                  itemStyle={{ fontWeight: 'bold', color: '#4f46e5' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#4f46e5"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  strokeWidth={4}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Sidebar Widgets */}
        <div className="space-y-8">
          {/* Shared Inbox Card */}
          <div
            onClick={() => onNavigate('inbox')}
            className="bg-[#312E81] rounded-[32px] p-8 text-white relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-indigo-100/50"
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-all">
                  <Star className="w-5 h-5" />
                </div>
                <button className="text-white/40 group-hover:text-white transition-colors">
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>

              <h3 className="text-2xl font-black mb-3">Check Shared Inbox</h3>
              <p className="text-indigo-200 text-xs font-medium leading-relaxed opacity-80 max-w-[200px]">
                You have 4 unread high-priority inquiries that need assignment or conversion.
              </p>

              <div className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-3">
                  {MOCK_USERS.slice(0, 3).map((u, idx) => (
                    <ImageWithFallback
                      key={idx}
                      src={u.avatar}
                      isAvatar={true}
                      fallbackText={u.name}
                      className="w-9 h-9 rounded-full border-2 border-[#312E81] shadow-lg"
                    />
                  ))}
                  <div className="w-9 h-9 rounded-full bg-indigo-500 border-2 border-[#312E81] flex items-center justify-center text-[10px] font-black shadow-lg">
                    +1
                  </div>
                </div>
              </div>
            </div>
            {/* Background Decoration */}
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4 pointer-events-none">
              <Users className="w-48 h-48" />
            </div>
          </div>

          {/* Tasks Due Today Widget */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Tasks Due Today</h4>
              <CheckSquare className="w-4 h-4 text-indigo-400" />
            </div>

            <div className="space-y-6">
              {MOCK_TASKS.slice(0, 2).map(task => (
                <div key={task.id} className="flex gap-4 group cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0 shadow-sm" />
                  <div>
                    <h5 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</h5>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Project: Software</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('tasks')}
              className="w-full mt-10 py-3.5 bg-slate-50 text-indigo-600 text-[10px] font-black rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2 group border border-slate-100"
            >
              View Implementation Backlog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
