
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
} from 'lucide-react';
import {
  apiGetDuplicateCompanies,
  apiGetDuplicateContacts,
  apiGetIncompleteRecords,
  apiGetDomainMismatches,
  apiMergeCompanies,
  apiMergeContacts,
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface DataHygieneProps {
  currentUser: any;
}

type TabId = 'companies' | 'contacts' | 'incomplete' | 'mismatches';

const DataHygiene: React.FC<DataHygieneProps> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const isAdmin = currentUser?.role === 'Admin';

  const [activeTab, setActiveTab] = useState<TabId>('companies');
  const [loading, setLoading] = useState<Record<TabId, boolean>>({
    companies: false,
    contacts: false,
    incomplete: false,
    mismatches: false,
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

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'companies') fetchDuplicateCompanies();
    else if (activeTab === 'contacts') fetchDuplicateContacts();
    else if (activeTab === 'incomplete') fetchIncomplete();
    else if (activeTab === 'mismatches') fetchMismatches();
  }, [isAdmin, activeTab, fetchDuplicateCompanies, fetchDuplicateContacts, fetchIncomplete, fetchMismatches]);

  const refreshActive = () => {
    if (activeTab === 'companies') fetchDuplicateCompanies();
    else if (activeTab === 'contacts') fetchDuplicateContacts();
    else if (activeTab === 'incomplete') fetchIncomplete();
    else fetchMismatches();
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
    </div>
  );
};

export default DataHygiene;
