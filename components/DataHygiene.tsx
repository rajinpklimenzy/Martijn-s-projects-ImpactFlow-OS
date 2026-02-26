
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Building2,
  User,
  FileWarning,
  Globe,
  Merge,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  Download,
  Send,
  Archive,
  FileText,
} from 'lucide-react';
import {
  apiGetDuplicateCompanies,
  apiGetDuplicateContacts,
  apiGetIncompleteRecords,
  apiGetDomainMismatches,
  apiMergeCompanies,
  apiMergeContacts,
  apiGetConsentGaps,
  apiGetRetentionReview,
  apiConsentGapsBulkAction,
  apiRetentionReviewBulkAction,
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface DataHygieneProps {
  currentUser: any;
}

type TabId = 'companies' | 'contacts' | 'incomplete' | 'mismatches' | 'consent-gaps' | 'retention-review';

const DataHygiene: React.FC<DataHygieneProps> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const isAdmin = currentUser?.role === 'Admin';

  const [activeTab, setActiveTab] = useState<TabId>('companies');
  const [loading, setLoading] = useState<Record<TabId, boolean>>({
    companies: false,
    contacts: false,
    incomplete: false,
    mismatches: false,
    'consent-gaps': false,
    'retention-review': false,
  });
  const [duplicateCompanies, setDuplicateCompanies] = useState<{ groups: { domain: string; companies: any[]; count: number }[]; totalDuplicates: number }>({ groups: [], totalDuplicates: 0 });
  const [duplicateContacts, setDuplicateContacts] = useState<{ groups: { email: string; contacts: any[]; count: number }[]; totalDuplicates: number }>({ groups: [], totalDuplicates: 0 });
  const [incompleteRecords, setIncompleteRecords] = useState<{
    companies: { record: any; errors: string[]; warnings: string[] }[];
    contacts: { record: any; errors: string[]; warnings: string[] }[];
    deals: { record: any; errors: string[]; warnings: string[] }[];
    projects: { record: any; errors: string[]; warnings: string[] }[];
    invoices: { record: any; errors: string[]; warnings: string[] }[];
  }>({ companies: [], contacts: [], deals: [], projects: [], invoices: [] });
  const [domainMismatches, setDomainMismatches] = useState<{ mismatches: any[]; count: number }>({ mismatches: [], count: 0 });
  const [consentGaps, setConsentGaps] = useState<any[]>([]);
  const [retentionReview, setRetentionReview] = useState<any[]>([]);

  const [mergeModal, setMergeModal] = useState<{
    open: boolean;
    type: 'company' | 'contact';
    primaryId: string;
    secondaryId: string;
    primaryName: string;
    secondaryName: string;
    groupKey: string;
  } | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [consentGapsBulkLoading, setConsentGapsBulkLoading] = useState<'send' | 'archive' | null>(null);
  const [retentionBulkLoading, setRetentionBulkLoading] = useState<'anonymize' | 'extend' | null>(null);
  const [extendRetentionModal, setExtendRetentionModal] = useState<{ open: boolean; justification: string }>({ open: false, justification: '' });

  const fetchDuplicateCompanies = useCallback(async () => {
    setLoading((l) => ({ ...l, companies: true }));
    try {
      const res = await apiGetDuplicateCompanies();
      const data = res?.data ?? res;
      setDuplicateCompanies({
        groups: data.groups || [],
        totalDuplicates: data.totalDuplicates ?? 0,
      });
    } catch (e) {
      showError('Failed to load duplicate companies');
      setDuplicateCompanies({ groups: [], totalDuplicates: 0 });
    } finally {
      setLoading((l) => ({ ...l, companies: false }));
    }
  }, [showError]);

  const fetchDuplicateContacts = useCallback(async () => {
    setLoading((l) => ({ ...l, contacts: true }));
    try {
      const res = await apiGetDuplicateContacts();
      const data = res?.data ?? res;
      setDuplicateContacts({
        groups: data.groups || [],
        totalDuplicates: data.totalDuplicates ?? 0,
      });
    } catch (e) {
      showError('Failed to load duplicate contacts');
      setDuplicateContacts({ groups: [], totalDuplicates: 0 });
    } finally {
      setLoading((l) => ({ ...l, contacts: false }));
    }
  }, [showError]);

  const fetchIncomplete = useCallback(async () => {
    setLoading((l) => ({ ...l, incomplete: true }));
    try {
      const res = await apiGetIncompleteRecords();
      const data = res?.data ?? res;
      setIncompleteRecords({
        companies: data.companies || [],
        contacts: data.contacts || [],
        deals: data.deals || [],
        projects: data.projects || [],
        invoices: data.invoices || [],
      });
    } catch (e) {
      showError('Failed to load incomplete records');
      setIncompleteRecords({ companies: [], contacts: [], deals: [], projects: [], invoices: [] });
    } finally {
      setLoading((l) => ({ ...l, incomplete: false }));
    }
  }, [showError]);

  const fetchMismatches = useCallback(async () => {
    setLoading((l) => ({ ...l, mismatches: true }));
    try {
      const res = await apiGetDomainMismatches();
      const data = res?.data ?? res;
      setDomainMismatches({
        mismatches: data.mismatches || [],
        count: data.count ?? 0,
      });
    } catch (e) {
      showError('Failed to load domain mismatches');
      setDomainMismatches({ mismatches: [], count: 0 });
    } finally {
      setLoading((l) => ({ ...l, mismatches: false }));
    }
  }, [showError]);

  const fetchConsentGaps = useCallback(async () => {
    setLoading((l) => ({ ...l, 'consent-gaps': true }));
    try {
      const res = await apiGetConsentGaps();
      const data = res?.data ?? res;
      setConsentGaps(Array.isArray(data) ? data : []);
    } catch (e) {
      showError('Failed to load consent gaps');
      setConsentGaps([]);
    } finally {
      setLoading((l) => ({ ...l, 'consent-gaps': false }));
    }
  }, [showError]);

  const fetchRetentionReview = useCallback(async () => {
    setLoading((l) => ({ ...l, 'retention-review': true }));
    try {
      const res = await apiGetRetentionReview();
      const data = res?.data ?? res;
      setRetentionReview(Array.isArray(data) ? data : []);
    } catch (e) {
      showError('Failed to load retention review');
      setRetentionReview([]);
    } finally {
      setLoading((l) => ({ ...l, 'retention-review': false }));
    }
  }, [showError]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'companies') fetchDuplicateCompanies();
    else if (activeTab === 'contacts') fetchDuplicateContacts();
    else if (activeTab === 'incomplete') fetchIncomplete();
    else if (activeTab === 'mismatches') fetchMismatches();
    else if (activeTab === 'consent-gaps') fetchConsentGaps();
    else if (activeTab === 'retention-review') fetchRetentionReview();
  }, [isAdmin, activeTab, fetchDuplicateCompanies, fetchDuplicateContacts, fetchIncomplete, fetchMismatches, fetchConsentGaps, fetchRetentionReview]);

  const refreshActive = () => {
    if (activeTab === 'companies') fetchDuplicateCompanies();
    else if (activeTab === 'contacts') fetchDuplicateContacts();
    else if (activeTab === 'incomplete') fetchIncomplete();
    else if (activeTab === 'mismatches') fetchMismatches();
    else if (activeTab === 'consent-gaps') fetchConsentGaps();
    else if (activeTab === 'retention-review') fetchRetentionReview();
  };

  const openMergeModal = (
    type: 'company' | 'contact',
    primaryId: string,
    secondaryId: string,
    primaryName: string,
    secondaryName: string,
    groupKey: string
  ) => {
    setMergeModal({ open: true, type, primaryId, secondaryId, primaryName, secondaryName, groupKey });
  };

  const closeMergeModal = () => {
    if (!isMerging) setMergeModal(null);
  };

  const confirmMerge = async () => {
    if (!mergeModal) return;
    setIsMerging(true);
    try {
      if (mergeModal.type === 'company') {
        await apiMergeCompanies(mergeModal.primaryId, mergeModal.secondaryId);
        showSuccess('Companies merged successfully');
        fetchDuplicateCompanies();
      } else {
        await apiMergeContacts(mergeModal.primaryId, mergeModal.secondaryId);
        showSuccess('Contacts merged successfully');
        fetchDuplicateContacts();
      }
      setMergeModal(null);
    } catch (e: any) {
      showError(e?.message || 'Merge failed');
    } finally {
      setIsMerging(false);
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
          <ShieldAlert className="w-12 h-12 text-amber-600 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Admin Only</h2>
          <p className="text-slate-600 text-sm">
            Data Hygiene is available only to administrators. Contact your workspace admin if you need access.
          </p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'companies', label: 'Duplicate Companies', icon: <Building2 className="w-4 h-4" />, count: duplicateCompanies.totalDuplicates },
    { id: 'contacts', label: 'Duplicate Contacts', icon: <User className="w-4 h-4" />, count: duplicateContacts.totalDuplicates },
    {
      id: 'incomplete',
      label: 'Incomplete Records',
      icon: <FileWarning className="w-4 h-4" />,
      count:
        incompleteRecords.companies.length +
        incompleteRecords.contacts.length +
        incompleteRecords.deals.length +
        incompleteRecords.projects.length +
        incompleteRecords.invoices.length,
    },
    { id: 'mismatches', label: 'Domain Mismatches', icon: <Globe className="w-4 h-4" />, count: domainMismatches.count },
    { id: 'consent-gaps', label: 'Consent Gaps', icon: <Shield className="w-4 h-4" />, count: consentGaps.length },
    { id: 'retention-review', label: 'Retention Review', icon: <Clock className="w-4 h-4" />, count: retentionReview.length },
  ];

  const isLoading = loading[activeTab];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Hygiene</h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">Find duplicates, incomplete records, and domain mismatches</p>
        </div>
        <button
          onClick={refreshActive}
          disabled={isLoading}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-300 text-slate-700'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        )}

        {!isLoading && activeTab === 'companies' && (
          <div className="p-6">
            {duplicateCompanies.groups.length === 0 ? (
              <p className="text-slate-500 text-sm">No duplicate companies found by domain.</p>
            ) : (
              <ul className="space-y-4">
                {duplicateCompanies.groups.map((g) => {
                  const key = `company-${g.domain}`;
                  const expanded = expandedGroups[key] !== false;
                  return (
                    <li key={key} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleGroup(key)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 text-left"
                      >
                        <span className="font-semibold text-slate-900">{g.domain}</span>
                        <span className="text-sm text-slate-500">{g.count} companies</span>
                        {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                      {expanded && (
                        <div className="p-4 border-t border-slate-200 space-y-2">
                          {g.companies.map((a, i) => (
                            <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                              <div>
                                <span className="font-medium text-slate-900">{a.name || '—'}</span>
                                {a.industry && <span className="text-slate-500 text-sm ml-2">({a.industry})</span>}
                              </div>
                              {g.companies.length >= 2 && (
                                <div className="flex gap-2">
                                  {g.companies
                                    .filter((b) => b.id !== a.id)
                                    .map((b) => (
                                      <button
                                        key={b.id}
                                        onClick={() => openMergeModal('company', a.id, b.id, a.name || a.id, b.name || b.id, key)}
                                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 flex items-center gap-1"
                                      >
                                        <Merge className="w-3.5 h-3.5" /> Merge into {a.name || 'this'}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'contacts' && (
          <div className="p-6">
            {duplicateContacts.groups.length === 0 ? (
              <p className="text-slate-500 text-sm">No duplicate contacts found by email.</p>
            ) : (
              <ul className="space-y-4">
                {duplicateContacts.groups.map((g) => {
                  const key = `contact-${g.email}`;
                  const expanded = expandedGroups[key] !== false;
                  return (
                    <li key={key} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleGroup(key)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 text-left"
                      >
                        <span className="font-semibold text-slate-900">{g.email}</span>
                        <span className="text-sm text-slate-500">{g.count} contacts</span>
                        {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                      {expanded && (
                        <div className="p-4 border-t border-slate-200 space-y-2">
                          {g.contacts.map((a) => (
                            <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                              <div>
                                <span className="font-medium text-slate-900">{a.name || '—'}</span>
                                <span className="text-slate-500 text-sm ml-2">{a.email}</span>
                              </div>
                              {g.contacts
                                .filter((b) => b.id !== a.id)
                                .map((b) => (
                                  <button
                                    key={b.id}
                                    onClick={() => openMergeModal('contact', a.id, b.id, a.name || a.id, b.name || b.id, key)}
                                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 flex items-center gap-1"
                                  >
                                    <Merge className="w-3.5 h-3.5" /> Merge into {a.name || 'this'}
                                  </button>
                                ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'incomplete' && (
          <div className="p-6 space-y-6">
            {[
              { key: 'companies', label: 'Companies', items: incompleteRecords.companies, recordLabel: (r: any) => r.name || r.id },
              { key: 'contacts', label: 'Contacts', items: incompleteRecords.contacts, recordLabel: (r: any) => r.name || r.email || r.id },
              { key: 'deals', label: 'Deals', items: incompleteRecords.deals, recordLabel: (r: any) => r.name || r.title || r.id },
              { key: 'projects', label: 'Projects', items: incompleteRecords.projects, recordLabel: (r: any) => r.name || r.title || r.id },
              { key: 'invoices', label: 'Invoices', items: incompleteRecords.invoices, recordLabel: (r: any) => r.id },
            ].map(({ key, label, items, recordLabel }) =>
              items.length === 0 ? null : (
                <div key={key}>
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">{label}</h3>
                  <ul className="space-y-2">
                    {items.map((item: any) => (
                      <li key={item.record.id} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{recordLabel(item.record)}</p>
                          <ul className="text-sm text-amber-800 mt-1 list-disc list-inside">
                            {item.errors.map((err: string, i: number) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}
            {incompleteRecords.companies.length +
              incompleteRecords.contacts.length +
              incompleteRecords.deals.length +
              incompleteRecords.projects.length +
              incompleteRecords.invoices.length === 0 && (
              <p className="text-slate-500 text-sm">No incomplete records found.</p>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'mismatches' && (
          <div className="p-6">
            {domainMismatches.mismatches.length === 0 ? (
              <p className="text-slate-500 text-sm">No domain mismatches (contact email domain matches company domain).</p>
            ) : (
              <ul className="space-y-3">
                {domainMismatches.mismatches.map((m: any, i: number) => (
                  <li key={i} className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {m.contact?.name} ({m.contact?.email})
                      </p>
                      <p className="text-sm text-slate-600">
                        Contact domain: <strong>{m.contactDomain}</strong> → Company domain: <strong>{m.companyDomain}</strong> ({m.company?.name})
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'consent-gaps' && (
          <div className="p-6">
            <p className="text-slate-500 text-sm mb-4">Contacts with pending consent, expired lawful basis, or legitimate interest nearing expiry.</p>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                type="button"
                onClick={async () => {
                  setConsentGapsBulkLoading('send');
                  try {
                    const res = await apiConsentGapsBulkAction({ action: 'send_consent_request' });
                    const data = (res as any)?.data;
                    showSuccess(data?.tasksCreated ? `Created ${data.tasksCreated} consent request task(s). Use Consent Recovery template in Shared Inbox.` : 'Done.');
                    fetchConsentGaps();
                  } catch (e: any) {
                    showError(e?.message || 'Bulk action failed');
                  } finally {
                    setConsentGapsBulkLoading(null);
                  }
                }}
                disabled={consentGaps.length === 0 || consentGapsBulkLoading !== null}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
              >
                {consentGapsBulkLoading === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send consent request to all
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConsentGapsBulkLoading('archive');
                  try {
                    const res = await apiConsentGapsBulkAction({ action: 'archive_expired' });
                    const data = (res as any)?.data;
                    showSuccess(data?.archivedCount != null ? `Archived ${data.archivedCount} expired contact(s).` : 'Done.');
                    fetchConsentGaps();
                  } catch (e: any) {
                    showError(e?.message || 'Archive failed');
                  } finally {
                    setConsentGapsBulkLoading(null);
                  }
                }}
                disabled={consentGapsBulkLoading !== null}
                className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50"
              >
                {consentGapsBulkLoading === 'archive' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                Archive all expired
              </button>
              <button
                type="button"
                onClick={() => {
                  if (consentGaps.length === 0) return;
                  const header = 'id,name,email,gapReason\n';
                  const rows = consentGaps.map((c: any) =>
                    [c.id, (c.name || '').replace(/"/g, '""'), (c.email || '').replace(/"/g, '""'), c.gapReason || ''].join(',')
                  );
                  const csv = header + rows.join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `consent-gaps-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showSuccess('List exported.');
                }}
                disabled={consentGaps.length === 0}
                className="px-4 py-2 bg-slate-600 text-white text-xs font-bold rounded-xl hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Export list
              </button>
            </div>
            {consentGaps.length === 0 ? (
              <p className="text-slate-500 text-sm">No consent gaps found.</p>
            ) : (
              <ul className="space-y-3">
                {consentGaps.map((c: any) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-900">{c.name || c.email || c.id}</p>
                      <p className="text-xs text-slate-600">{c.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-200 text-amber-900">
                        {c.gapReason === 'pending_consent' ? 'Pending consent' : c.gapReason === 'expired_basis' ? 'Expired basis' : 'Nearing expiry'}
                      </span>
                    </div>
                    <a href={`/?tab=crm`} className="text-indigo-600 text-sm font-semibold hover:underline">View in CRM</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'retention-review' && (
          <div className="p-6">
            <p className="text-slate-500 text-sm mb-4">Older, inactive contacts with no active deals. Consider anonymization or export before deletion.</p>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                type="button"
                onClick={async () => {
                  const ids = retentionReview.map((c: any) => c.id);
                  if (ids.length === 0) return;
                  setRetentionBulkLoading('anonymize');
                  try {
                    const res = await apiRetentionReviewBulkAction({ action: 'anonymize_all', contactIds: ids });
                    const data = (res as any)?.data;
                    showSuccess(
                      data?.anonymized != null
                        ? `Anonymized ${data.anonymized} contact(s).${data.blocked ? ` ${data.blocked} blocked (active deal/invoice/DSAR).` : ''}`
                        : 'Done.'
                    );
                    fetchRetentionReview();
                  } catch (e: any) {
                    showError(e?.message || 'Bulk anonymize failed');
                  } finally {
                    setRetentionBulkLoading(null);
                  }
                }}
                disabled={retentionReview.length === 0 || retentionBulkLoading !== null}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 flex items-center gap-2 disabled:opacity-50"
              >
                {retentionBulkLoading === 'anonymize' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Anonymize all
              </button>
              <button
                type="button"
                onClick={() => {
                  if (retentionReview.length === 0) return;
                  const header = 'id,name,email,lastContacted,retentionReason\n';
                  const rows = retentionReview.map((c: any) =>
                    [
                      c.id,
                      (c.name || '').replace(/"/g, '""'),
                      (c.email || '').replace(/"/g, '""'),
                      c.lastContacted || c.updatedAt || c.createdAt || '',
                      c.retentionReason || ''
                    ].join(',')
                  );
                  const csv = header + rows.join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `retention-review-export-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showSuccess('Export before deletion downloaded.');
                }}
                disabled={retentionReview.length === 0}
                className="px-4 py-2 bg-slate-600 text-white text-xs font-bold rounded-xl hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Export before deletion
              </button>
              <button
                type="button"
                onClick={() => setExtendRetentionModal({ open: true, justification: '' })}
                disabled={retentionReview.length === 0 || retentionBulkLoading !== null}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" /> Extend retention (with justification)
              </button>
            </div>
            {retentionReview.length === 0 ? (
              <p className="text-slate-500 text-sm">No contacts in retention review.</p>
            ) : (
              <ul className="space-y-3">
                {retentionReview.map((c: any) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-900">{c.name || c.email || c.id}</p>
                      <p className="text-xs text-slate-600">{c.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Last contacted: {c.lastContacted || c.updatedAt || c.createdAt ? new Date(c.lastContacted || c.updatedAt || c.createdAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <a href={`/?tab=crm`} className="text-indigo-600 text-sm font-semibold hover:underline">View in CRM</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {mergeModal && (
        <div className="fixed inset-0 z-[90] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeMergeModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Confirm merge</h3>
                <button onClick={closeMergeModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-400" disabled={isMerging}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Merge <strong>{mergeModal.secondaryName}</strong> into <strong>{mergeModal.primaryName}</strong>? Related records will point to the primary. The secondary will be removed.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeMergeModal}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200"
                    disabled={isMerging}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmMerge}
                    disabled={isMerging}
                    className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isMerging ? <Loader2 className="w-5 h-5 animate-spin" /> : <Merge className="w-5 h-5" />}
                    Merge
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {extendRetentionModal.open && (
        <div className="fixed inset-0 z-[90] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !retentionBulkLoading && setExtendRetentionModal({ open: false, justification: '' })} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Extend retention</h3>
                <button
                  type="button"
                  onClick={() => !retentionBulkLoading && setExtendRetentionModal({ open: false, justification: '' })}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
                  disabled={retentionBulkLoading === 'extend'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Add a justification to extend retention for the {retentionReview.length} contact(s) in the list. This will record retention_extended_at and your justification on each.
                </p>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Justification (required)</label>
                <textarea
                  value={extendRetentionModal.justification}
                  onChange={(e) => setExtendRetentionModal((prev) => ({ ...prev, justification: e.target.value }))}
                  placeholder="e.g. Legal hold; ongoing dispute; regulatory request"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none"
                />
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setExtendRetentionModal({ open: false, justification: '' })}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200"
                    disabled={retentionBulkLoading === 'extend'}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const justification = extendRetentionModal.justification.trim();
                      if (!justification) {
                        showError('Please enter a justification.');
                        return;
                      }
                      setRetentionBulkLoading('extend');
                      try {
                        const ids = retentionReview.map((c: any) => c.id);
                        await apiRetentionReviewBulkAction({ action: 'extend_retention', contactIds: ids, justification });
                        showSuccess(`Retention extended for ${ids.length} contact(s).`);
                        setExtendRetentionModal({ open: false, justification: '' });
                        fetchRetentionReview();
                      } catch (e: any) {
                        showError(e?.message || 'Extend retention failed');
                      } finally {
                        setRetentionBulkLoading(null);
                      }
                    }}
                    disabled={retentionBulkLoading === 'extend' || !extendRetentionModal.justification.trim()}
                    className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {retentionBulkLoading === 'extend' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                    Extend retention
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataHygiene;
