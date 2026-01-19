
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, DollarSign, Briefcase, ChevronRight } from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const data = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
];

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl lg:text-2xl font-bold">Welcome, Alex</h1>
        <p className="text-slate-500 text-xs lg:text-sm">Impact 24x7 Logistics Overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {[
          { id: 'pipeline', label: 'Open Deals', value: '$124.5k', icon: <TrendingUp />, color: 'bg-blue-50 text-blue-600' },
          { id: 'projects', label: 'Active', value: '12', icon: <Briefcase />, color: 'bg-indigo-50 text-indigo-600' },
          { id: 'invoices', label: 'Unpaid', value: '$3.4k', icon: <DollarSign />, color: 'bg-emerald-50 text-emerald-600' },
          { id: 'inbox', label: 'Inbox', value: '24', icon: <Users />, color: 'bg-purple-50 text-purple-600' },
        ].map((stat, i) => (
          <button 
            key={i} 
            onClick={() => onNavigate(stat.id)}
            className="bg-white p-3 lg:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all text-left"
          >
            <div className="flex items-center justify-between mb-2 lg:mb-4">
              {/* Fix: Explicitly type the icon as ReactElement with a className prop to satisfy cloneElement type checking */}
              <div className={`p-1.5 lg:p-2 rounded-lg ${stat.color}`}>{React.cloneElement(stat.icon as React.ReactElement<{ className: string }>, { className: 'w-4 h-4 lg:w-5 lg:h-5' })}</div>
              <span className="text-[9px] lg:text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+12%</span>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] lg:text-sm font-medium uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-base lg:text-2xl font-bold mt-0.5">{stat.value}</h3>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 lg:p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base lg:text-lg font-bold mb-6">Revenue Growth</h3>
          <div className="h-48 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} width={35} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-base lg:text-lg font-bold mb-4 lg:mb-6">Recent Activity</h3>
          <div className="space-y-4 lg:space-y-6 flex-1">
            {[
              { id: 'pipeline', text: 'Proposal: Global Logistics', time: '2m ago', icon: '📝' },
              { id: 'crm', text: 'Lead: Freight Forwarders', time: '1h ago', icon: '⚡' },
              { id: 'invoices', text: 'INV-012 Paid', time: '3h ago', icon: '✅' },
              { id: 'projects', text: 'Kickoff: SwiftWare', time: 'Yesterday', icon: '🚀' },
            ].map((activity, i) => (
              <div 
                key={i} 
                onClick={() => onNavigate(activity.id)}
                className="flex gap-3 lg:gap-4 items-center group cursor-pointer hover:bg-slate-50 p-1 -m-1 rounded-lg transition-all"
              >
                <span className="text-lg lg:text-xl shrink-0 group-hover:scale-110 transition-transform">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs lg:text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{activity.text}</p>
                  <p className="text-[10px] lg:text-xs text-slate-400">{activity.time}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-300" />
              </div>
            ))}
          </div>
          <button 
            onClick={() => onNavigate('dashboard')} // Conceptually shows all dashboard activity
            className="w-full mt-6 py-2 text-xs lg:text-sm font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg transition-colors uppercase tracking-widest"
          >
            View All
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
