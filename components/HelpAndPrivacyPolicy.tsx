import React from 'react';
import { ArrowLeft, HelpCircle, Shield, Mail, Lock, FileText } from 'lucide-react';

interface HelpAndPrivacyPolicyProps {
  onBack: () => void;
}

const HelpAndPrivacyPolicy: React.FC<HelpAndPrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-3xl mx-auto z-10 flex flex-col gap-6 animate-in fade-in duration-300">
        <button
          onClick={onBack}
          className="self-start flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-10 shadow-2xl space-y-10">
          <div className="text-center border-b border-white/10 pb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight">Help & Privacy Policy</h1>
            <p className="text-slate-400 text-sm mt-2">ImpactFlow OS · Impact 24x7 Enterprise</p>
          </div>

          {/* Help Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Help & Support</h2>
            </div>

            <div className="space-y-4 text-slate-300 text-sm">
              <div>
                <h3 className="text-white font-semibold text-sm mb-2">How to get access</h3>
                <p className="leading-relaxed">
                  ImpactFlow OS is restricted to authorized personnel. Enter your professional email address
                  and click &quot;Request Access Code&quot; to receive a one-time verification code. If your account
                  has not been provisioned yet, contact your administrator or IT team to request access.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm mb-2">I didn&apos;t receive the code</h3>
                <p className="leading-relaxed">
                  Check your spam or junk folder. Codes are valid for a limited time. You can request a new
                  code by clicking &quot;Request New Code&quot; on the verification screen. If the problem persists,
                  ensure your email is correctly provisioned in the system and contact your administrator.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm mb-2">Contact support</h3>
                <p className="leading-relaxed flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                  For access issues or technical support, contact your organization&apos;s IT administrator or
                  email <span className="text-indigo-400 font-medium">support@impact247.com</span>.
                </p>
              </div>
            </div>
          </section>

          {/* Privacy Policy Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Privacy Policy</h2>
            </div>

            <p className="text-slate-400 text-xs">
              Last updated: February 2026. This policy describes how ImpactFlow OS and Impact 24x7 Enterprise
              collect, use, and protect your information.
            </p>

            <div className="space-y-5 text-slate-300 text-sm">
              <div>
                <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Information we collect
                </h3>
                <p className="leading-relaxed">
                  We collect information you provide when signing in (such as your professional email address),
                  account and profile data, and usage data necessary to operate the platform. We do not sell
                  your personal information to third parties.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  How we use your information
                </h3>
                <p className="leading-relaxed">
                  Your information is used to authenticate your access, personalize your experience, provide
                  support, improve our services, and comply with legal obligations. Access is role-based and
                  limited to what is necessary for your job function.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm mb-2">Data security</h3>
                <p className="leading-relaxed">
                  We use industry-standard security measures including encryption in transit and at rest,
                  secure authentication, and access controls. Access to ImpactFlow OS is restricted to
                  authorized personnel only.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm mb-2">Your rights</h3>
                <p className="leading-relaxed">
                  You may request access to, correction of, or deletion of your personal data where
                  applicable by law. Contact your administrator or our data protection contact for
                  requests. Enterprise accounts may have additional policies defined by your organization.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm mb-2">Cookies and similar technologies</h3>
                <p className="leading-relaxed">
                  We use essential cookies and local storage for authentication and session management.
                  We do not use third-party advertising cookies. You can manage cookie preferences in your
                  browser settings.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold text-sm mb-2">Changes to this policy</h3>
                <p className="leading-relaxed">
                  We may update this policy from time to time. The &quot;Last updated&quot; date at the top
                  indicates when the policy was last revised. Continued use of ImpactFlow OS after changes
                  constitutes acceptance of the updated policy.
                </p>
              </div>
            </div>
          </section>

          <div className="pt-6 border-t border-white/10 text-center">
            <p className="text-[10px] text-slate-500">
              © Impact 24x7 Enterprise. Access restricted to authorized personnel.
            </p>
            <button
              onClick={onBack}
              className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpAndPrivacyPolicy;
