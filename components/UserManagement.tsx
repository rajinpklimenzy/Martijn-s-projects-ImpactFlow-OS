
import React from 'react';
import { MOCK_USERS } from '../constants.tsx';
import { UserPlus, Mail, ShieldCheck, MoreVertical, Search, ChevronRight } from 'lucide-react';

const UserManagement: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-slate-500 text-sm font-medium">Control workspace access and staff roles</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Find teammate..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Seats: </span>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">12 / 20</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {MOCK_USERS.map(user => (
            <div key={user.id} className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <img src={user.avatar} className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm object-cover" />
                  {user.active && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {user.name}
                    {user.role === 'Admin' && <ShieldCheck className="w-4 h-4 text-indigo-600" />}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" /> {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Permission Tier</p>
                  <p className={`text-xs font-bold mt-0.5 ${user.role === 'Admin' ? 'text-indigo-600' : 'text-slate-700'}`}>{user.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm">Manage</button>
                  <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><MoreVertical className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
