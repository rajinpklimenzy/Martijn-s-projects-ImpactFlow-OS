
import React, { useState } from 'react';
import { Share2, CheckCircle2, Circle, ArrowRight, ShieldCheck, Globe, CreditCard, Mail, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '../contexts/ToastContext.tsx';

const Integrations: React.FC = () => {
  const { showSuccess } = useToast();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);

  const handleConnect = (id: string) => {
    setConnecting(id);
    setTimeout(() => {
      setConnected(prev => [...prev, id]);
      setConnecting(null);
      showSuccess(`${id.charAt(0).toUpperCase() + id.slice(1)} connected successfully!`);
    }, 1500);
  };

  const integrations = [
    {
      id: 'google',
      name: 'Google Workspace',
      description: 'Sync your Gmail, Calendar, and Drive to streamline communication and scheduling.',
      icon: <Mail className="w-8 h-8 text-blue-500" />,
      color: 'bg-blue-50',
      status: 'Communication & Scheduling',
      isComingSoon: true
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Automate invoice payments and financial reporting with the world\'s leading payment platform.',
      icon: <CreditCard className="w-8 h-8 text-indigo-500" />,
      color: 'bg-indigo-50',
      status: 'Payment Processing',
      isComingSoon: true
    },
    {
      id: 'zoho',
      name: 'Zoho Books',
      description: 'Bi-directional sync of contacts, invoices, and accounting data with your Zoho workspace.',
      icon: <Globe className="w-8 h-8 text-emerald-500" />,
      color: 'bg-emerald-50',
      status: 'Accounting & Finance',
      isComingSoon: true
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-slate-500 text-sm font-medium">Connect your favorite tools to the ImpactFlow OS .</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-100">
          <ShieldCheck className="w-4 h-4" /> Secure Enterprise Sync
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {integrations.map((app) => {
          const isConnected = connected.includes(app.id);
          const isConnecting = connecting === app.id;

          return (
            <div key={app.id} className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col h-full hover:border-indigo-300 transition-all group relative overflow-hidden">
              {app.isComingSoon && (
                <div className="absolute top-4 right-4 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3 h-3" /> Coming Soon
                </div>
              )}
              
              <div className="flex justify-between items-start mb-8">
                <div className={`w-16 h-16 ${app.color} rounded-[20px] flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  {app.icon}
                </div>
                {isConnected ? (
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Active
                  </div>
                ) : (
                  <div className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-tighter">
                    {app.isComingSoon ? 'In Development' : 'Disconnected'}
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">{app.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">{app.status}</p>
              <p className="text-sm text-slate-500 leading-relaxed flex-1 mb-8">
                {app.description}
              </p>

              <div className="pt-6 border-t border-slate-50 space-y-3">
                <button
                  onClick={() => !isConnected && !app.isComingSoon && handleConnect(app.id)}
                  disabled={isConnecting || isConnected || app.isComingSoon}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    isConnected 
                      ? 'bg-slate-50 text-slate-400 cursor-default' 
                      : app.isComingSoon
                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98]'
                  }`}
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isConnected ? (
                    <>Connected <CheckCircle2 className="w-4 h-4" /></>
                  ) : app.isComingSoon ? (
                    <>Development in Progress</>
                  ) : (
                    <>Connect {app.name} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
                <button className="w-full py-2.5 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  View API Docs <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900 rounded-[40px] p-12 text-white relative overflow-hidden group shadow-2xl">
        <div className="relative z-10 max-w-2xl text-left">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md">
            <Share2 className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-4xl font-black mb-4 tracking-tight leading-tight">Request Custom <br/><span className="text-indigo-400">Webhooks & API Sync</span></h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-10 opacity-80">
            Need to connect your specialized logistics software or internal ERP? Our engineering team builds custom bridges for Impact Enterprise clients.
          </p>
          <button className="px-10 py-5 bg-white text-slate-900 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 shadow-xl">
            Contact Integration Team
          </button>
        </div>
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 translate-x-1/4 pointer-events-none">
          <Share2 className="w-full h-full text-indigo-600" />
        </div>
      </div>
    </div>
  );
};

export default Integrations;
