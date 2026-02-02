import React, { useState, useRef, useEffect } from 'react';
import { Mail, ShieldCheck, ArrowRight, Loader2, Building2, User as UserIcon, Key, AlertCircle, HelpCircle } from 'lucide-react';
import { apiRequestCode, apiVerify } from '../utils/api.ts';

interface AuthProps {
  onLogin: (data: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'initial' | 'verify'>('initial');
  const [email, setEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiRequestCode({ email });
      
      // Handle responses from the simulator (returned as object with status)
      if (res?.status === 404) {
        throw new Error(res.message);
      }
      
      setError(null);
      setCodeDigits(['', '', '', '', '', '']);
      setStep('verify');
    } catch (err: any) {
      console.error('[AUTH UI] Error caught:', err);
      // Prioritize the exact string requested if the error contains it or if it's a 404
      if (err.message && (err.message.includes('Account not found') || err.status === 404)) {
        setError('Account not found - contact your Administrator');
      } else {
        setError(err.message || "Failed to send code. Please check your internet connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const verificationCode = codeDigits.join('');
    if (verificationCode.length !== 6) return;

    if (!/^\d{6}$/.test(verificationCode)) {
      setError('OTP must contain only numbers');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiVerify({ email, verificationCode });
      if (data.token && data.user) {
        onLogin(data);
      } else {
        throw new Error('Invalid response from server.');
      }
    } catch (err: any) {
      console.error('[AUTH] Verification error:', err);
      
      // Check for specific error codes
      if (err.message?.includes('User not registered') || err.message?.includes('USER_NOT_REGISTERED')) {
        setError('Account not found - contact your Administrator');
      } else if (err.message?.includes('Account not found')) {
        setError('Account not found - contact your Administrator');
      } else {
        setError(err.message || "Invalid or expired code.");
      }
      
      setCodeDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...codeDigits];
    newDigits[index] = value;
    setCodeDigits(newDigits);
    
    if (error) setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newDigits.every(d => d !== '')) {
      setTimeout(() => handleVerifyCode(), 100);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      const newDigits = [...codeDigits];
      if (codeDigits[index]) {
        newDigits[index] = '';
      } else if (index > 0) {
        newDigits[index - 1] = '';
        inputRefs.current[index - 1]?.focus();
      }
      setCodeDigits(newDigits);
      if (error) setError(null);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleVerifyCode();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...codeDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setCodeDigits(newDigits);
    if (error) setError(null);
    const nextEmptyIndex = newDigits.findIndex(d => d === '');
    inputRefs.current[nextEmptyIndex === -1 ? 5 : nextEmptyIndex]?.focus();
    if (pastedData.length === 6) setTimeout(() => handleVerifyCode(), 100);
  };

  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else {
      setCodeDigits(['', '', '', '', '', '']);
    }
  }, [step]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'initial') handleSendCode();
    else handleVerifyCode();
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
              <div className="p-4 rounded-2xl text-xs font-bold bg-red-500/10 border border-red-500/50 text-red-400 flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  {error}
                  {error.includes('Administrator') && (
                    <p className="text-[10px] mt-1 font-medium opacity-70">New accounts must be provisioned by IT before sign-in.</p>
                  )}
                </div>
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
              <div className="space-y-4 text-center">
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-2">Code sent to</p>
                  <p className="text-sm font-semibold text-white">{email}</p>
                </div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-6">Enter Verification Code</label>
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  {codeDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      onPaste={index === 0 ? handleCodePaste : undefined}
                      className="w-12 h-14 md:w-14 md:h-16 bg-white/5 border-2 border-white/10 rounded-xl text-white text-center text-2xl md:text-3xl font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-center"
                      autoComplete="off"
                      disabled={loading}
                    />
                  ))}
                </div>
                <div className="flex flex-col items-center gap-2 mt-6">
                  <button 
                    type="button"
                    onClick={async () => {
                      setError(null);
                      setCodeDigits(['', '', '', '', '', '']);
                      setLoading(true);
                      try {
                        await apiRequestCode({ email });
                        setError(null);
                        setTimeout(() => inputRefs.current[0]?.focus(), 100);
                      } catch (err: any) {
                        setError(err.message || "Failed to send new code.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="text-xs font-bold text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Request New Code'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setStep('initial');
                      setCodeDigits(['', '', '', '', '', '']);
                      setError(null);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            )}

            <button 
              disabled={loading || (step === 'verify' && codeDigits.some(d => d === ''))}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
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

          <div className="mt-12 pt-8 border-t border-white/5 text-center flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-4">
              <Building2 className="w-5 h-5 text-slate-700" />
              <div className="w-1 h-1 bg-slate-800 rounded-full" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">Impact 24x7 Enterprise</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium max-w-[250px] space-y-1">
              <p>Access restricted to authorized personnel.</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <a
                  href="/help"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/help');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-indigo-500 hover:underline"
                >
                  Help
                </a>
                <span className="text-slate-600">•</span>
                <a
                  href="/privacy-policy"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/privacy-policy');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-indigo-500 hover:underline"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
