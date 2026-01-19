
import React, { useState } from 'react';
import { MOCK_USERS } from '../constants';
import { UserPlus, Mail, Shield, ShieldAlert, ShieldCheck, MoreVertical, Search, CheckCircle2, ChevronRight } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users] = useState(MOCK_USERS);

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'Admin': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'Manager': return <ShieldCheck className="w-4 h-4 text-indigo-500" />;
      default: return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleUserClick = (id: string) => {
    console.log(`Managing user: ${id}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-slate-500 text-sm">Manage team access and permissions at Impact 24x7</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md">
          <UserPlus className="w-4 h-4" />
          Invite Team Member
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter by name or email..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-80 outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> {users.length} Active Users</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr 
                  key={user.id} 
                  onClick={() => handleUserClick(user.id)}
                  className="hover:bg-slate-50 transition-colors group cursor-pointer active:bg-indigo-50/30"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} className="w-10 h-10 rounded-full border border-slate-200 shadow-sm group-hover:border-indigo-200 transition-colors" />
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <span className="text-xs font-semibold text-slate-700">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.active ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">Today, 10:24 AM</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button onClick={(e) => e.stopPropagation()} className="p-2 hover:bg-white rounded-lg text-slate-400 transition-colors shadow-sm lg:opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-slate-900 rounded-xl p-8 text-white relative overflow-hidden group cursor-pointer active:scale-[0.99] transition-all">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Security & Access Audit</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm">Review your team's login history, IP access logs, and permission changes to maintain high security standards.</p>
            <button className="px-6 py-2.5 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition-all shadow-lg group-hover:scale-105 transform">
              Run Audit Log
            </button>
          </div>
          <ShieldAlert className="absolute -right-12 -bottom-12 w-48 h-48 text-slate-800 opacity-20 group-hover:scale-110 transition-transform duration-500" />
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
