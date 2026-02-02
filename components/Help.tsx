import React from 'react';
import { ArrowLeft, HelpCircle, Mail } from 'lucide-react';

interface HelpProps {
  onBack: () => void;
}

const Help: React.FC<HelpProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-3xl mx-auto z-10 flex flex-col gap-6 animate-in fade-in duration-300">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
          className="self-start flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </a>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-10 shadow-2xl space-y-8">
          <div className="text-center border-b border-white/10 pb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Help & Support</h1>
            </div>
            <p className="text-slate-400 text-sm">ImpactFlow OS · Impact 24x7 Enterprise</p>
          </div>

          <div className="space-y-6 text-slate-300 text-sm">
            <div>
              <h2 className="text-white font-semibold text-base mb-3">How to get access</h2>
              <p className="leading-relaxed mb-3">
                ImpactFlow OS is restricted to authorized personnel. To gain access:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Enter your professional email address in the login portal</li>
                <li>Click &quot;Request Access Code&quot; to receive a one-time verification code</li>
                <li>Enter the 6-digit code sent to your email</li>
                <li>If your account has not been provisioned yet, contact your administrator or IT team</li>
              </ol>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3">I didn&apos;t receive the code</h2>
              <p className="leading-relaxed mb-3">
                If you haven&apos;t received your verification code:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Check your spam or junk folder</li>
                <li>Codes are valid for a limited time - request a new code if expired</li>
                <li>Click &quot;Request New Code&quot; on the verification screen</li>
                <li>Ensure your email is correctly provisioned in the system</li>
                <li>Contact your administrator if the problem persists</li>
              </ul>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3">Troubleshooting</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-white font-medium text-sm mb-2">Account not found</h3>
                  <p className="leading-relaxed">
                    If you see an &quot;Account not found&quot; error, your account may not have been provisioned yet.
                    Contact your organization&apos;s IT administrator to request access.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm mb-2">Code expired</h3>
                  <p className="leading-relaxed">
                    Verification codes expire after a set period for security. Simply request a new code
                    using the &quot;Request New Code&quot; button.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm mb-2">Invalid code</h3>
                  <p className="leading-relaxed">
                    Make sure you&apos;re entering the most recent code sent to your email. Each new code
                    request invalidates previous codes.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6">
              <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                Contact support
              </h2>
              <p className="leading-relaxed mb-3">
                For access issues, technical support, or account questions:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400">•</span>
                  <span>Contact your organization&apos;s IT administrator</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400">•</span>
                  <span>Email: <a href="mailto:support@impact247.com" className="text-indigo-400 hover:underline">support@impact247.com</a></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400">•</span>
                  <span>Include your email address and a description of the issue</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-center">
            <p className="text-[10px] text-slate-500 mb-4">
              © Impact 24x7 Enterprise. Access restricted to authorized personnel.
            </p>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onBack();
              }}
              className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
