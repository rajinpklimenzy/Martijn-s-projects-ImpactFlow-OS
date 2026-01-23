
import React, { useState } from 'react';
import { Mail, Sparkles, Send, MessageSquare, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext.tsx';
import { ImageWithFallback } from './common';

const Inbox: React.FC = () => {
  const { showSuccess } = useToast();
  const [isNotified, setIsNotified] = useState(false);

  const handleNotifyMe = () => {
    setIsNotified(true);
    showSuccess("Success! We'll notify you when the Shared Inbox is live.");
  };

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700 py-20 text-center">
      <div className="relative">
        <div className="w-24 h-24 bg-indigo-100 rounded-[32px] flex items-center justify-center text-indigo-600 mb-6 relative z-10">
          <Mail className="w-12 h-12" />
        </div>
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 animate-bounce shadow-sm">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="absolute -bottom-2 -left-4 w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 rotate-12">
          <Zap className="w-5 h-5" />
        </div>
      </div>

      <div className="max-w-md space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Shared Inbox <br/><span className="text-indigo-600">Coming Soon</span></h1>
        <p className="text-slate-500 font-medium leading-relaxed">
          We're building a unified communication hub for Impact 24x7. Collaborative email, internal threads, and AI-powered sorting are on the horizon.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl px-6">
        {[
          { icon: <MessageSquare />, title: 'Internal Notes', desc: 'Discuss emails with teammates' },
          { icon: <Zap />, title: 'AI Drafting', desc: 'Generate response templates' },
          { icon: <Send />, title: 'Unified View', desc: 'One inbox for all team mail' },
        ].map((feature, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-left group hover:border-indigo-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors mb-4">
              {/* Fix: Cast the icon to React.ReactElement<any> so React.cloneElement can accept the className prop. */}
              {React.cloneElement(feature.icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
            </div>
            <h3 className="font-bold text-slate-900 text-sm">{feature.title}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{feature.desc}</p>
          </div>
        ))}
      </div>

      <button 
        onClick={handleNotifyMe}
        disabled={isNotified}
        className={`px-8 py-4 font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-3 ${
          isNotified 
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-default' 
            : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        {isNotified ? (
          <>
            <CheckCircle2 className="w-5 h-5" />
            Notification Set
          </>
        ) : (
          <>
            Notify Me When Ready 
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <div className="flex items-center gap-6 pt-10">
        <div className="flex -space-x-3">
          {[1,2,3,4].map(i => (
            <ImageWithFallback
              key={i}
              src={undefined}
              alt={`Teammate ${i}`}
              fallbackText={`User ${i}`}
              className="w-10 h-10 border-4 border-slate-50 object-cover"
              isAvatar={true}
            />
          ))}
          <div className="w-10 h-10 rounded-full bg-indigo-600 border-4 border-slate-50 flex items-center justify-center text-white text-[10px] font-black">
            +8
          </div>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Already in Beta testing</p>
      </div>
    </div>
  );
};

export default Inbox;
