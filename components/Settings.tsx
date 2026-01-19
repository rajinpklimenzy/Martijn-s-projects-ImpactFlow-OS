
import React, { useState } from 'react';
import { 
  Bell, Mail, Smartphone, Shield, User, Save, Globe, 
  Link2, Calendar, RefreshCw, X, Plus, Trash2, Check,
  Mail as MailIcon, Layers, AlertCircle, ArrowRight
} from 'lucide-react';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'connections'>('profile');
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isSyncing, setIsSyncing] = useState(false);
  const [excludedDomains, setExcludedDomains] = useState(['internal.impact247.com', 'hr-updates.org']);
  const [newDomain, setNewDomain] = useState('');

  const togglePref = (id: string, type: 'inApp' | 'email') => {
    setPreferences(prev => prev.map(p => p.id === id ? { ...p, [type]: !p[type] } : p));
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const addDomain = () => {
    if (newDomain && !excludedDomains.includes(newDomain)) {
      setExcludedDomains([...excludedDomains, newDomain.toLowerCase()]);
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    setExcludedDomains(excludedDomains.filter(d => d !== domain));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-slate-500 text-sm">Manage your personal account and workspace preferences</p>
        </div>
        <button className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <aside className="w-full lg:w-64 space-y-1">
          {[
            { id: 'profile', label: 'Profile Settings', icon: <User className="w-4 h-4" /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
            { id: 'connections', label: 'Connections & Workspace', icon: <Link2 className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && (
            <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-left">
              <div className="flex items-center gap-6 pb-6 border-b border-slate-100 text-left">
                <img src="https://picsum.photos/seed/u1/100/100" className="w-20 h-20 rounded-2xl shadow-md border-2 border-white" />
                <div className="text-left">
                  <h3 className="font-bold text-lg text-slate-900">Alex Rivera</h3>
                  <p className="text-slate-500 text-sm mb-3">Administrator at Impact 24x7</p>
                  <button className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-widest">
                    Change Avatar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input type="text" defaultValue="Alex Rivera" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                  <input type="email" defaultValue="alex@impact247.com" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900">Notification Preferences</h3>
                <p className="text-slate-500 text-sm">Control how and when you receive alerts from ImpactFlow OS.</p>
              </div>
              <div className="divide-y divide-slate-100 text-left">
                {preferences.map(pref => (
                  <div key={pref.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="text-left">
                      <p className="font-bold text-slate-900">{pref.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{pref.description}</p>
                    </div>
                    <div className="flex gap-8">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={pref.inApp} onChange={() => togglePref(pref.id, 'inApp')} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all" />
                        <div className="flex items-center gap-2">
                          <Smartphone className={`w-3.5 h-3.5 ${pref.inApp ? 'text-indigo-600' : 'text-slate-300'}`} />
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">In-App</span>
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {/* Google Workspace & Outlook Section */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900">Workspace Integrations</h3>
                  <p className="text-xs text-slate-500 mt-1">Connect your mail and calendar services for full sync.</p>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Google Card */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm">
                        <Globe className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">Google Workspace</h4>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Connected</span>
                        </div>
                        <p className="text-xs text-slate-500">alex@impact247.com • Email & Calendar Sync</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <button 
                        onClick={handleSync}
                        className="p-2 hover:bg-white rounded-lg text-slate-400 border border-transparent hover:border-slate-200 transition-all"
                       >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
                       </button>
                       <button className="text-xs font-bold text-red-500 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors">Disconnect</button>
                    </div>
                  </div>

                  {/* Outlook Card */}
                  <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl border-dashed">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm opacity-50">
                        <Layers className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">Microsoft Outlook</h4>
                        <p className="text-xs text-slate-400">Connect your Office 365 or Outlook account.</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                      Connect
                    </button>
                  </div>
                </div>
              </div>

              {/* Email Sync Filtering */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-slate-900">Email Sync Filter</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Emails from these domains will never be imported into ImpactFlow OS.</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="e.g. competitors.com or internal.com" 
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                      />
                    </div>
                    <button 
                      onClick={addDomain}
                      className="px-4 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Exclude
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Excluded Domains</p>
                    <div className="flex flex-wrap gap-2">
                      {excludedDomains.map(domain => (
                        <div key={domain} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg group hover:border-red-200 hover:bg-red-50 transition-all">
                          <span className="text-sm font-medium text-slate-700 group-hover:text-red-700">{domain}</span>
                          <button 
                            onClick={() => removeDomain(domain)}
                            className="p-1 hover:bg-white rounded text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {excludedDomains.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No domains excluded yet. All emails will be synced.</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                    {/* Fixed: AlertCircle is now imported */}
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Privacy Note:</strong> Domain exclusion applies to the <strong>Shared Inbox</strong> and <strong>Timeline</strong> sync. Historical emails already synced will remain unless manually deleted.
                    </p>
                  </div>
                </div>
              </div>

              {/* Automation Hint */}
              <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
                <div className="relative z-10">
                  <div className="p-3 bg-white/10 rounded-2xl w-fit mb-6">
                    <RefreshCw className="w-6 h-6 text-indigo-300" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Automated Data Enrichment</h3>
                  <p className="text-indigo-200 text-sm mb-8 max-w-sm leading-relaxed">Connected workspaces allow ImpactFlow to automatically suggest LinkedIn profiles and company data based on incoming email metadata.</p>
                  <button className="px-6 py-3 bg-white text-indigo-900 text-xs font-bold rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest flex items-center gap-2">
                    {/* Fixed: ArrowRight is now imported */}
                    Explore Intelligence <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
