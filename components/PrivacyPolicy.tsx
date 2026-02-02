import React from 'react';
import { ArrowLeft, Shield, Lock, FileText, Mail } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
                <Shield className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Privacy Policy</h1>
            </div>
            <p className="text-slate-400 text-sm">ImpactFlow OS · Impact 24x7 Enterprise</p>
            <p className="text-slate-500 text-xs mt-2">Last updated: February 2026</p>
          </div>

          <div className="space-y-6 text-slate-300 text-sm">
            <div>
              <p className="leading-relaxed">
                This Privacy Policy describes how ImpactFlow OS and Impact 24x7 Enterprise (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
                collect, use, disclose, and protect your information when you use our platform and services.
              </p>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Information We Collect
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-white font-medium text-sm mb-2">Account Information</h3>
                  <p className="leading-relaxed">
                    We collect information you provide when creating an account or signing in, including your
                    professional email address, name, and any profile information you choose to provide.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm mb-2">Usage Data</h3>
                  <p className="leading-relaxed">
                    We automatically collect information about how you use ImpactFlow OS, including features accessed,
                    actions taken, and time spent on the platform. This helps us improve our services.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm mb-2">Device Information</h3>
                  <p className="leading-relaxed">
                    We may collect information about your device, browser type, IP address, and operating system
                    for security and compatibility purposes.
                  </p>
                </div>
                <p className="leading-relaxed mt-3 text-indigo-400 font-medium">
                  We do not sell your personal information to third parties.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-400" />
                How We Use Your Information
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>To authenticate your access and maintain your account</li>
                <li>To personalize your experience and provide relevant features</li>
                <li>To provide customer support and respond to your inquiries</li>
                <li>To improve our services, features, and user experience</li>
                <li>To ensure security and prevent fraud or abuse</li>
                <li>To comply with legal obligations and enforce our terms</li>
                <li>Access is role-based and limited to what is necessary for your job function</li>
              </ul>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3">Data Security</h2>
              <p className="leading-relaxed mb-3">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Encryption in transit (TLS/SSL) and at rest</li>
                <li>Secure authentication mechanisms including multi-factor authentication</li>
                <li>Access controls and role-based permissions</li>
                <li>Regular security audits and monitoring</li>
                <li>Restricted access to authorized personnel only</li>
              </ul>
              <p className="leading-relaxed mt-3">
                While we strive to protect your information, no method of transmission over the internet is 100% secure.
                We cannot guarantee absolute security but are committed to maintaining the highest standards.
              </p>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3">Your Rights</h2>
              <p className="leading-relaxed mb-3">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Access:</strong> Request access to your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data where applicable by law</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
              </ul>
              <p className="leading-relaxed mt-3">
                To exercise these rights, contact your administrator or our data protection contact at{' '}
                <a href="mailto:privacy@impact247.com" className="text-indigo-400 hover:underline">privacy@impact247.com</a>.
                Enterprise accounts may have additional policies defined by your organization.
              </p>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3">Cookies and Similar Technologies</h2>
              <p className="leading-relaxed mb-3">
                We use essential cookies and local storage for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Authentication and session management</li>
                <li>Remembering your preferences</li>
                <li>Security and fraud prevention</li>
              </ul>
              <p className="leading-relaxed mt-3">
                We do not use third-party advertising cookies or tracking cookies. You can manage cookie preferences
                in your browser settings, though disabling essential cookies may affect platform functionality.
              </p>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3">Data Sharing and Disclosure</h2>
              <p className="leading-relaxed mb-3">
                We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>With your organization&apos;s administrators as part of enterprise account management</li>
                <li>With service providers who assist in operating our platform (under strict confidentiality agreements)</li>
                <li>When required by law or to protect our rights and safety</li>
                <li>In connection with a business transfer (merger, acquisition, etc.)</li>
              </ul>
              <p className="leading-relaxed mt-3 font-medium text-indigo-400">
                We do not sell, rent, or trade your personal information to third parties for marketing purposes.
              </p>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3">Data Retention</h2>
              <p className="leading-relaxed">
                We retain your personal information for as long as necessary to provide our services, comply with legal
                obligations, resolve disputes, and enforce our agreements. When you request deletion, we will delete
                or anonymize your data in accordance with applicable laws, except where retention is required for legal
                or legitimate business purposes.
              </p>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3">International Data Transfers</h2>
              <p className="leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence.
                We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy
                and applicable data protection laws.
              </p>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3">Children&apos;s Privacy</h2>
              <p className="leading-relaxed">
                ImpactFlow OS is intended for business use and is not directed to individuals under the age of 18.
                We do not knowingly collect personal information from children. If you believe we have collected
                information from a child, please contact us immediately.
              </p>
            </div>

            <div>
              <h2 className="text-white font-semibold text-base mb-3">Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology,
                legal requirements, or other factors. The &quot;Last updated&quot; date at the top indicates when the policy
                was last revised. We will notify you of material changes by posting the updated policy on this page and,
                where appropriate, through other communication channels. Continued use of ImpactFlow OS after changes
                constitutes acceptance of the updated policy.
              </p>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6">
              <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                Contact Us
              </h2>
              <p className="leading-relaxed mb-3">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400">•</span>
                  <span>Email: <a href="mailto:privacy@impact247.com" className="text-indigo-400 hover:underline">privacy@impact247.com</a></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400">•</span>
                  <span>Contact your organization&apos;s data protection officer or IT administrator</span>
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

export default PrivacyPolicy;
