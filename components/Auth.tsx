
import React, { useState } from 'react';
import { Mail, ShieldCheck, ArrowRight, Loader2, Building2, User as UserIcon, Key, AlertCircle } from 'lucide-react';
import { apiRequestCode, apiVerify } from '../utils/api.ts';

interface AuthProps {
  onLogin: (data: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'initial' | 'verify'>('initial');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiRequestCode({ email });
      setStep('verify');
    } catch (err: any) {
      setError(err.message || "Failed to send code. Verify your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiVerify({ email, verificationCode });
      onLogin(data);
    } catch (err: any) {
      setError(err.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'initial') {
      handleSendCode();
    } else {
      handleVerifyCode();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-indigo-900/40 mb-6">I</div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ImpactFlow OS</h1>
            <p className="text-slate-400 text-sm mt-2">Team Access Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/50 text-red-400 flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {step === 'initial' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Professional Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="email" 
                    required 
                    placeholder="alex@impact247.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
              </div>
            )}

            {step === 'verify' && (
              <div className="space-y-2 text-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Enter Verification Code</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    required 
                    maxLength={6}
                    placeholder="••••••"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white text-center text-xl tracking-[0.5em] font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => setStep('initial')}
                  className="mt-4 text-xs font-bold text-slate-500 hover:text-indigo-400"
                >
                  Request code for a different email
                </button>
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {step === 'initial' ? 'Request Access Code' : 'Secure Login'} 
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-4">
              <Building2 className="w-5 h-5 text-slate-700" />
              <div className="w-1 h-1 bg-slate-800 rounded-full" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">Impact 24x7 Enterprise</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
