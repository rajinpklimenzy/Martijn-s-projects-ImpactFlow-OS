/**
 * Phase 1-2: Company Record Page - Full-page view for individual companies
 * REQ-01, 5.1, REQ-02, REQ-03
 */

import React, { useState, useMemo } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Company, User } from '../types';
import { apiGetCompany, apiPatchCompany } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { useUsers } from '../hooks/useCRMData';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import RecordPageLayout from './RecordPageLayout';
import RecordHeader from './common/RecordHeader';
import QuickActionBar from './common/QuickActionBar';
import PropertyPanel from './common/PropertyPanel';
import ViewAllPropertiesSlideOver from './common/ViewAllPropertiesSlideOver';
import TabNav, { TabId } from './common/TabNav';
import DataHighlights, { Highlight } from './common/DataHighlights';
import ActivityTimeline, { ActivityEntry, ActivityType } from './common/ActivityTimeline';
import AssociationPreview, { AssociationItem } from './common/AssociationPreview';
import AssociationCard from './common/AssociationCard';
import SatisfactionWidget from './common/SatisfactionWidget';
import IntelligenceWidget, { SocialSignal } from './common/IntelligenceWidget';
import PlaybookWidget from './common/PlaybookWidget';
import AttachmentsWidget from './common/AttachmentsWidget';
import AssociationSearchModal, { SearchableItem } from './common/AssociationSearchModal';
import PropertyManagementModal from './common/PropertyManagementModal';
import NoteComposerModal from './common/NoteComposerModal';
import QuickCreateModal from './QuickCreateModal';
import { apiGetTags, apiGetAuditLogs, apiGetContacts, apiGetDeals, apiUpdateCompany, apiDeleteCompany, apiGetTasks } from '../utils/api';
import { Calendar, Clock, Users, Star, Building2, TrendingUp, User as UserIcon, Sparkles, CheckSquare, BookOpen } from 'lucide-react';
import { usePlaybookInstances } from '../hooks/usePlaybooks';

interface CompanyRecordPageProps {
  companyId: string;
  onBack: () => void;
  onNavigate: (tab: string) => void;
}

const CompanyRecordPage: React.FC<CompanyRecordPageProps> = ({ companyId, onBack, onNavigate }) => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const { data: users = [] } = useUsers();
  const [showViewAllProperties, setShowViewAllProperties] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [associationModalType, setAssociationModalType] = useState<'contact' | 'deal' | null>(null);
  const [showPropertyManagement, setShowPropertyManagement] = useState(false);
  const [propertyConfig, setPropertyConfig] = useState<any[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<'company' | 'deal' | 'contact' | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Fetch company data
  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const response = await apiGetCompany(companyId);
      return response.data || response;
    },
    enabled: !!companyId,
  });

  // Fetch tags for display
  const { data: tagsData = [] } = useQuery({
    queryKey: ['tags', 'company'],
    queryFn: async () => {
      const response = await apiGetTags('company');
      return response.data || response || [];
    },
  });

  // Fetch associated contacts
  const { data: contactsData = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ['contacts', 'company', companyId],
    queryFn: async () => {
      try {
        const response = await apiGetContacts(undefined, companyId);
        const contacts = response.data || response || [];
        // Ensure we have an array
        if (!Array.isArray(contacts)) {
          console.warn('[CompanyRecordPage] Contacts data is not an array:', contacts);
          return [];
        }
        // Log for debugging - check for mismatch between denormalized count and actual data
        const denormalizedCount = company?.contactCount;
        if (denormalizedCount !== undefined && denormalizedCount !== contacts.length) {
          console.warn('[CompanyRecordPage] Contact count mismatch:', {
            denormalizedCount,
            actualCount: contacts.length,
            companyId,
            companyName: company?.name
          });
        }
        console.log('[CompanyRecordPage] Fetched contacts:', {
          count: contacts.length,
          companyId,
          denormalizedCount,
          contacts: contacts.map(c => ({ id: c.id, name: c.name, companyId: c.companyId }))
        });
        return contacts;
      } catch (error) {
        console.error('[CompanyRecordPage] Error fetching contacts:', error);
        return [];
      }
    },
    enabled: !!companyId
  });

  // Fetch audit logs for activity timeline
  const { data: auditLogsData = [], isLoading: isLoadingAuditLogs } = useQuery({
    queryKey: ['audit-logs', 'company', companyId],
    queryFn: async () => {
      const res = await apiGetAuditLogs({
        resourceType: 'company',
        resourceId: companyId,
        limit: 50
      });
      return (res as any)?.data ?? (res as any)?.logs ?? [];
    },
    enabled: !!companyId && activeTab === 'activities'
  });

  // Fetch tasks related to this company (via project link)
  const { data: companyTasks = [] } = useQuery({
    queryKey: ['tasks', 'company', companyId],
    queryFn: async () => {
      // Get projects for this company, then tasks for those projects
      // For now, fetch all tasks and filter client-side since backend
      // does not yet support companyId filtering directly.
      const res = await apiGetTasks();
      const tasks = (res as any)?.data ?? res ?? [];
      // Tasks created from company page should carry projectId or description linking;
      // As a minimal integration, include tasks whose description mentions company name.
      const companyNameLower = (company?.name || '').toLowerCase();
      return tasks.filter((t: any) =>
        t.projectId === companyId ||
        (t.description && companyNameLower && String(t.description).toLowerCase().includes(companyNameLower))
      );
    },
    enabled: !!companyId && activeTab === 'activities'
  });

  // Transform audit logs, notes, and tasks to unified activity entries
  const activities: ActivityEntry[] = useMemo(() => {
    const auditLogs: Array<{ id: string; eventType: string; timestamp: string | Date; userId?: string; userEmail?: string; metadata?: Record<string, unknown> }> = Array.isArray(auditLogsData) ? auditLogsData : [];
    
    const systemActivities: ActivityEntry[] = auditLogs.map(log => {
      const user = users.find(u => u.id === log.userId || u.email === log.userEmail);
      return {
        id: log.id,
        type: 'system' as ActivityType,
        title: log.eventType.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description: log.metadata ? JSON.stringify(log.metadata) : undefined,
        timestamp: log.timestamp,
        userId: log.userId,
        userName: user?.name || log.userEmail,
        userEmail: log.userEmail,
        metadata: log.metadata
      };
    });

    const noteActivities: ActivityEntry[] = (company?.notes || []).map(note => ({
      id: note.id,
      type: 'note' as ActivityType,
      title: note.text?.split('\n')[0] || 'Note added',
      description: note.text,
      timestamp: note.createdAt,
      userId: note.userId,
      userName: note.userName,
    }));

    const taskActivities: ActivityEntry[] = (companyTasks as any[]).map(task => ({
      id: task.id,
      type: 'task' as ActivityType,
      title: task.title || 'Task',
      description: task.description,
      timestamp: task.createdAt || task.updatedAt || new Date().toISOString(),
      userId: task.assigneeId,
      userName: users.find(u => u.id === task.assigneeId)?.name,
      metadata: {
        status: task.status,
        priority: task.priority,
      },
      icon: <CheckSquare className="w-4 h-4" />
    }));

    const merged = [...noteActivities, ...taskActivities, ...systemActivities];

    // Sort newest first
    merged.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    });

    return merged;
  }, [auditLogsData, users, company, companyTasks]);

  // Build data highlights
  const highlights: Highlight[] = useMemo(() => [
    {
      id: 'created',
      label: 'Created',
      value: company?.createdAt,
      icon: <Calendar className="w-4 h-4" />,
      formatValue: (val) => {
        if (!val) return '--';
        const date = new Date(val);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    },
    {
      id: 'lastActivity',
      label: 'Last Activity',
      value: company?.updatedAt,
      icon: <Clock className="w-4 h-4" />,
      formatValue: (val) => {
        if (!val) return '--';
        const date = new Date(val);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      },
      onClick: () => {
        // Navigate to Activities tab to see activity history
        setActiveTab('activities');
      }
    },
    {
      id: 'contactCount',
      label: 'Contacts',
      value: contactsData.length || company?.contactCount || 0, // Use actual data length first, fallback to denormalized count
      icon: <Users className="w-4 h-4" />,
      formatValue: (val) => `${val || 0} contact${(val || 0) !== 1 ? 's' : ''}`,
      onClick: () => {
        // Navigate to CRM > Contacts filtered by this company
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', 'crm');
          url.searchParams.set('crmView', 'contacts');
          url.searchParams.set('crmCompanyId', companyId);
          window.location.href = url.toString();
        } catch {
          // Fallback: just switch tab in-app
          onNavigate('crm');
        }
      }
    },
    {
      id: 'npsScore',
      label: 'NPS Score',
      value: company?.npsScore,
      icon: <Star className="w-4 h-4" />,
      formatValue: (val) => val !== null && val !== undefined ? String(val) : '--',
      onClick: () => {
        // Navigate to satisfaction tab
        onNavigate('satisfaction');
      }
    },
  ], [company, contactsData.length, companyId, onNavigate]);

  // Build association previews
  const associatedContacts: AssociationItem[] = useMemo(() => {
    // Filter out contacts without required fields (id and name)
    // Note: Backend already filters by companyId, so we trust those results
    const validContacts = (contactsData as any[]).filter((contact: any) => {
      return contact?.id && contact?.name;
    });
    
    console.log('[CompanyRecordPage] Building associatedContacts:', {
      totalContacts: contactsData.length,
      validContacts: validContacts.length,
      companyId,
      sampleContacts: validContacts.slice(0, 3).map(c => ({ id: c.id, name: c.name, companyId: c.companyId }))
    });
    
    return validContacts.slice(0, 5).map((contact: any) => ({
      id: contact.id,
      name: contact.name || 'Unnamed Contact',
      subtitle: contact.role || contact.email || undefined
    }));
  }, [contactsData, companyId]);

  // Fetch associated deals
  const { data: dealsData = [] } = useQuery({
    queryKey: ['deals', 'company', companyId],
    queryFn: async () => {
      const response = await apiGetDeals(undefined, undefined, companyId);
      return response.data || response || [];
    },
    enabled: !!companyId
  });

  const associatedDeals: AssociationItem[] = useMemo(() => {
    return (dealsData as any[]).map((deal: any) => ({
      id: deal.id,
      name: deal.name || deal.title,
      subtitle: deal.stage || deal.value ? `$${deal.value}` : undefined
    }));
  }, [dealsData]);

  // Fetch NPS/satisfaction data
  const { data: satisfactionData } = useQuery({
    queryKey: ['satisfaction', 'company', companyId],
    queryFn: async () => {
      // TODO: Implement API call for company-specific satisfaction
      return { npsScore: company?.npsScore };
    },
    enabled: !!companyId
  });

  // Fetch social signals/intelligence
  const socialSignals: SocialSignal[] = useMemo(() => {
    return company?.socialSignals || [];
  }, [company]);

  // Fetch playbook instances linked to this company
  const { data: playbookInstances = [], isLoading: isLoadingPlaybooks } = usePlaybookInstances({
    companyId,
  });

  // Derived playbook summaries for UI
  const mappedPlaybooks = useMemo(() => {
    return (playbookInstances as any[]).map(instance => ({
      id: instance.id,
      name: instance.templateSnapshot?.name || instance.name || 'Untitled Playbook',
      status: instance.status || 'active',
      progress: instance.progress,
      stepsCompleted: instance.stepsCompleted,
      totalSteps: instance.totalSteps,
      activatedAt: instance.activatedAt,
    }));
  }, [playbookInstances]);

  const strategicMetrics = useMemo(() => {
    const openDeals = (dealsData as any[]).filter(d => d.stage !== 'Won' && d.stage !== 'Lost');
    const totalPipeline = openDeals.reduce((sum, d: any) => sum + (d.value || 0), 0);
    const activePlaybooks = mappedPlaybooks.filter(p => p.status === 'active');

    return {
      openDealsCount: openDeals.length,
      totalPipeline,
      activePlaybooksCount: activePlaybooks.length,
    };
  }, [dealsData, mappedPlaybooks]);

  // Association search functions
  const searchContacts = async (query: string): Promise<SearchableItem[]> => {
    const response = await apiGetContacts(query, companyId);
    const contacts = response.data || response || [];
    return contacts.map((c: any) => ({
      id: c.id,
      name: c.name,
      subtitle: c.email || c.role,
      type: 'contact' as const
    }));
  };

  const searchDeals = async (query: string): Promise<SearchableItem[]> => {
    const response = await apiGetDeals(undefined, undefined, companyId);
    const deals = response.data || response || [];
    const filtered = deals.filter((d: any) => 
      d.name?.toLowerCase().includes(query.toLowerCase()) ||
      d.title?.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.map((d: any) => ({
      id: d.id,
      name: d.name || d.title,
      subtitle: d.stage,
      type: 'deal' as const
    }));
  };

  // Handle field updates via PATCH
  const handleFieldSave = async (fieldName: string, newValue: any) => {
    try {
      await apiPatchCompany(companyId, fieldName, newValue);
      // Invalidate and refetch company data
      queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      showSuccess(`${fieldName} updated successfully`);
    } catch (err: any) {
      showError(err.message || `Failed to update ${fieldName}`);
      throw err;
    }
  };

  // Get owner name
  const owner = users.find(u => u.id === company?.ownerId);
  const ownerName = owner ? owner.name : null;

  // Get account status badge
  const getStatusBadge = () => {
    if (company?.isTargetAccount) {
      return { label: 'Target Account', color: '#f59e0b' };
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Company not found</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Company not found</p>
      </div>
    );
  }

  const breadcrumbs = (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Companies</span>
      </button>
      <span className="text-slate-400">/</span>
      <span className="text-slate-900 font-medium">{company.name || 'Unnamed Company'}</span>
    </div>
  );

  // Build properties list for PropertyPanel
  const properties = [
    {
      key: 'website',
      label: 'Website',
      value: company.website,
      type: 'url' as const,
      onSave: (newValue: any) => handleFieldSave('website', newValue)
    },
    {
      key: 'industry',
      label: 'Industry',
      value: company.industry,
      type: 'text' as const,
      onSave: (newValue: any) => handleFieldSave('industry', newValue)
    },
    {
      key: 'email',
      label: 'Email',
      value: company.email,
      type: 'email' as const,
      onSave: (newValue: any) => handleFieldSave('email', newValue)
    },
    {
      key: 'owner',
      label: 'Account Manager',
      value: ownerName,
      type: 'text' as const,
      disabled: true // Owner managed separately
    },
    {
      key: 'contactCount',
      label: 'Contacts',
      value: contactsData.length || company.contactCount || 0,
      type: 'calculated' as const,
      calculatedValue: `${contactsData.length || company.contactCount || 0} contact${(contactsData.length || company.contactCount || 0) !== 1 ? 's' : ''}`
    },
    {
      key: 'domain',
      label: 'Domain',
      value: company.domain || '--',
      type: 'calculated' as const
    },
    {
      key: 'region',
      label: 'Region',
      value: company.region || '--',
      type: 'calculated' as const
    },
  ];

  return (
    <>
      <RecordPageLayout
        breadcrumbs={breadcrumbs}
        left={
          <div className="flex flex-col h-full">
            {/* Phase 2: Record Header */}
            <RecordHeader
              name={company.name || 'Unnamed Company'}
              avatar={company.logo}
              subtitle={company.industry}
              subtitleType="industry"
              statusBadge={getStatusBadge() || undefined}
              onNameSave={(newName) => handleFieldSave('name', newName)}
            />

            {/* Phase 2: Quick Actions */}
            <QuickActionBar
              type="company"
              onNote={() => setShowNoteModal(true)}
              onTask={() => setShowTaskModal(true)}
            />

            {/* Phase 2: Property Panel */}
            <PropertyPanel
              title="About this company"
              properties={properties}
              entityType="company"
              onViewAllProperties={() => setShowViewAllProperties(true)}
              onViewPropertyHistory={() => {
                // Navigate to Activities tab filtered by property changes
                setActiveTab('activities');
                showSuccess('Property history available in Activities timeline');
              }}
              onMerge={() => {
                // TODO: Implement merge functionality (would need merge API)
                showSuccess('Merge functionality coming soon. This will allow combining duplicate companies.');
              }}
              onClone={() => {
                // Clone company by creating a new one with same data
                const cloneData = {
                  name: `${company?.name} (Copy)`,
                  industry: company?.industry,
                  website: company?.website,
                  email: company?.email,
                  // Copy other fields as needed
                };
                // TODO: Implement clone API call
                showSuccess('Clone functionality coming soon. This will create a duplicate company.');
              }}
              onDelete={() => setShowDeleteConfirm(true)}
              onExport={() => setShowExportModal(true)}
              onManageProperties={() => setShowPropertyManagement(true)}
              isAdmin={users.find(u => u.id === company?.ownerId)?.role === 'Admin'}
            />
          </div>
        }
        center={
          <div className="flex flex-col h-full">
            {/* Phase 3: Tab Navigation */}
            <TabNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            
            {/* Phase 3: Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'overview' && (
                <div className="p-6">
                  {/* Phase 3: Data Highlights */}
                  <DataHighlights highlights={highlights} />
                  
                  {/* Phase 3: Association Previews */}
                  {associatedContacts.length > 0 && (
                    <AssociationPreview
                      title="Active Contacts"
                      items={associatedContacts}
                      icon={<UserIcon className="w-4 h-4" />}
                      onItemClick={(item) => {
                        // Navigate to contact record page
                        const url = new URL(window.location.href);
                        url.searchParams.set('contactId', item.id);
                        window.history.pushState({}, '', url);
                        window.location.reload();
                      }}
                    />
                  )}
                  {associatedDeals.length > 0 && (
                    <AssociationPreview
                      title="Deals"
                      items={associatedDeals}
                      icon={<TrendingUp className="w-4 h-4" />}
                      onItemClick={(item) => {
                        // Navigate to deal
                        onNavigate('pipeline');
                      }}
                    />
                  )}
                </div>
              )}
              
              {activeTab === 'activities' && (
                <ActivityTimeline
                  activities={activities}
                  isLoading={isLoadingAuditLogs}
                  onAddNote={() => setShowNoteModal(true)}
                  onAddTask={() => setShowTaskModal(true)}
                />
              )}

              {activeTab === 'strategic-context' && (
                <div className="p-6 space-y-6">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Strategic Context
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Open Deals</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{strategicMetrics.openDealsCount}</p>
                      <p className="mt-1 text-xs text-slate-500">Deals not marked Won/Lost</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Pipeline Value</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        ${strategicMetrics.totalPipeline.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Sum of open deal values</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Active Playbooks</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{strategicMetrics.activePlaybooksCount}</p>
                      <p className="mt-1 text-xs text-slate-500">Playbooks currently in progress</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      Key Contacts
                    </h3>
                    {associatedContacts.length === 0 ? (
                      <p className="text-xs text-slate-400">No contacts linked yet. Use "Active Contacts" to add stakeholders.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {associatedContacts.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                              {c.subtitle && (
                                <p className="text-[11px] font-bold uppercase text-slate-500">{c.subtitle}</p>
                              )}
                            </div>
                            <button
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                              onClick={() => {
                                const url = new URL(window.location.href);
                                url.searchParams.set('contactId', c.id);
                                window.history.pushState({}, '', url);
                                window.location.reload();
                              }}
                            >
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'playbooks' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                      Playbooks
                      {mappedPlaybooks.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px]">
                          {mappedPlaybooks.length}
                        </span>
                      )}
                    </h2>
                    <button
                      onClick={() => {
                        try {
                          const url = new URL(window.location.href);
                          url.searchParams.set('tab', 'playbooks');
                          // Remove record-page specific params if present
                          url.searchParams.delete('companyId');
                          url.searchParams.delete('contactId');
                          window.location.href = url.toString();
                        } catch {
                          onNavigate('playbooks');
                        }
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Open Playbooks workspace
                    </button>
                  </div>

                  {isLoadingPlaybooks ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    </div>
                  ) : mappedPlaybooks.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                      <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 mb-2">
                        No playbooks are currently linked to this company.
                      </p>
                      <p className="text-xs text-slate-400">
                        Use the Playbooks workspace or deal pipeline to attach a playbook to this account.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mappedPlaybooks.map((p) => (
                        <div
                          key={p.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                              {p.status && (
                                <span className="mt-1 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-700 uppercase">
                                  {p.status}
                                </span>
                              )}
                            </div>
                            {p.activatedAt && (
                              <p className="text-[11px] text-slate-400">
                                Started {new Date(p.activatedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          {p.totalSteps !== undefined && p.stepsCompleted !== undefined && (
                            <p className="text-[11px] text-slate-500">
                              {p.stepsCompleted}/{p.totalSteps} steps completed
                            </p>
                          )}
                          {p.progress !== undefined && (
                            <div className="mt-1 w-full bg-slate-200 rounded-full h-1.5">
                              <div
                                className="bg-indigo-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${p.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        }
        right={
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Phase 4: Associations & Widgets */}
            {/* Active Contacts */}
            <AssociationCard
              title="Active Contacts"
              items={associatedContacts}
              icon={<UserIcon className="w-4 h-4" />}
              emptyMessage={isLoadingContacts ? 'Loading contacts...' : 'No contacts'}
              onItemClick={(item) => {
                const url = new URL(window.location.href);
                url.searchParams.set('contactId', item.id);
                window.history.pushState({}, '', url);
                window.location.reload();
              }}
              onAdd={() => {
                setQuickCreateType('contact');
                setShowQuickCreateModal(true);
              }}
            />

            {/* Deals */}
            <AssociationCard
              title="Deals"
              items={associatedDeals}
              icon={<TrendingUp className="w-4 h-4" />}
              onItemClick={(item) => {
                onNavigate('pipeline');
              }}
              onAdd={() => {
                setQuickCreateType('deal');
                setShowQuickCreateModal(true);
              }}
            />

            {/* Client Satisfaction */}
            <SatisfactionWidget
              npsScore={satisfactionData?.npsScore}
              npsCategory={satisfactionData?.npsCategory}
              latestResponseDate={satisfactionData?.latestResponseDate}
              onViewDetails={() => {
                onNavigate('satisfaction');
              }}
            />

            {/* Intelligence */}
            <IntelligenceWidget
              signals={socialSignals}
              onExecuteScan={() => {
                // TODO: Execute intelligence scan API call
                showSuccess('Intelligence scan initiated. Results will appear shortly.');
              }}
              onViewAll={() => {
                // Navigate to dashboard or intelligence view
                onNavigate('dashboard');
              }}
            />

            {/* Playbooks */}
            <PlaybookWidget
              playbooks={mappedPlaybooks}
              isLoading={isLoadingPlaybooks}
              onViewAll={() => {
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'playbooks');
                  url.searchParams.delete('companyId');
                  url.searchParams.delete('contactId');
                  window.location.href = url.toString();
                } catch {
                  onNavigate('playbooks');
                }
              }}
              onAdd={() => {
                // Navigate to playbooks to create new one
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'playbooks');
                  url.searchParams.delete('companyId');
                  url.searchParams.delete('contactId');
                  window.location.href = url.toString();
                } catch {
                  onNavigate('playbooks');
                }
              }}
            />

            {/* Attachments */}
            <AttachmentsWidget
              attachments={company?.attachments || []}
              isUploading={isUploadingAttachment}
              onUpload={async () => {
                // Create file input and trigger upload
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = '*/*';
                input.onchange = async (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (!files || files.length === 0) return;
                  
                  setIsUploadingAttachment(true);
                  try {
                    const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
                    const newAttachments: any[] = [];
                    
                    // Process each file
                    for (const file of Array.from(files)) {
                      // Convert file to base64 for storage
                      const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      });
                      
                      const attachment = {
                        id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name: file.name,
                        type: file.type || 'application/octet-stream',
                        size: file.size,
                        url: base64, // Store as base64 data URL
                        uploadedAt: new Date().toISOString(),
                        uploadedBy: currentUser.id || 'system',
                        uploadedByName: currentUser.name || 'Unknown User'
                      };
                      
                      newAttachments.push(attachment);
                    }
                    
                    // Get current attachments and append new ones
                    const currentAttachments = company?.attachments || [];
                    const updatedAttachments = [...currentAttachments, ...newAttachments];
                    
                    // Update company with new attachments
                    await apiUpdateCompany(companyId, { attachments: updatedAttachments });
                    
                    // Invalidate and refetch company data
                    queryClient.invalidateQueries({ queryKey: ['company', companyId] });
                    
                    showSuccess(`${files.length} file(s) uploaded successfully`);
                  } catch (err: any) {
                    showError(err.message || 'Failed to upload files');
                  } finally {
                    setIsUploadingAttachment(false);
                  }
                };
                input.click();
              }}
              onDownload={(attachment) => {
                if (attachment.url) {
                  // Create a download link for base64 data
                  const link = document.createElement('a');
                  link.href = attachment.url;
                  link.download = attachment.name;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              onDelete={async (attachmentId) => {
                try {
                  const currentAttachments = company?.attachments || [];
                  const updatedAttachments = currentAttachments.filter((att: any) => att.id !== attachmentId);
                  await apiUpdateCompany(companyId, { attachments: updatedAttachments });
                  queryClient.invalidateQueries({ queryKey: ['company', companyId] });
                  showSuccess('Attachment deleted successfully');
                } catch (err: any) {
                  showError(err.message || 'Failed to delete attachment');
                }
              }}
            />
          </div>
        }
      />
      {/* Phase 2: View All Properties Slide-Over */}
      <ViewAllPropertiesSlideOver
        isOpen={showViewAllProperties}
        onClose={() => setShowViewAllProperties(false)}
        title="All Properties"
        properties={[
          ...properties,
          // Add more properties here for the full view
          {
            key: 'linkedin',
            label: 'LinkedIn',
            value: company.linkedin,
            type: 'url' as const,
            category: 'Social',
            onSave: (newValue: any) => handleFieldSave('linkedin', newValue)
          },
          {
            key: 'status',
            label: 'Status',
            value: company.status,
            type: 'text' as const,
            category: 'Details',
            onSave: (newValue: any) => handleFieldSave('status', newValue)
          },
        ]}
      />
      {/* Phase 4: Association Search Modal (for linking existing records) */}
      <AssociationSearchModal
        isOpen={showAssociationModal}
        onClose={() => {
          setShowAssociationModal(false);
          setAssociationModalType(null);
        }}
        onSelect={async (item) => {
          try {
            if (associationModalType === 'contact') {
              // Associate contact with company
              const { apiUpdateContact } = await import('../utils/api');
              await apiUpdateContact(item.id, { companyId: companyId });
              showSuccess(`Contact ${item.name} associated with company`);
            } else if (associationModalType === 'deal') {
              // Associate deal with company
              const { apiUpdateDeal } = await import('../utils/api');
              await apiUpdateDeal(item.id, { companyId: companyId });
              showSuccess(`Deal ${item.name} associated with company`);
            }
            queryClient.invalidateQueries({ queryKey: ['company', companyId] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['deals'] });
          } catch (err: any) {
            showError(err.message || 'Failed to create association');
          }
        }}
        searchFunction={associationModalType === 'contact' ? searchContacts : searchDeals}
        title={associationModalType === 'contact' ? 'Link Contact' : 'Link Deal'}
        placeholder={associationModalType === 'contact' ? 'Search contacts...' : 'Search deals...'}
      />
      {/* Quick Create Modal for creating new records */}
      {showQuickCreateModal && quickCreateType && (
        <QuickCreateModal
          type={quickCreateType}
          lockedType={true}
          prefillCompanyId={quickCreateType === 'contact' || quickCreateType === 'deal' ? companyId : undefined}
          onClose={() => {
            setShowQuickCreateModal(false);
            setQuickCreateType(null);
          }}
          onSuccess={() => {
            // Refresh company data and associations
            queryClient.invalidateQueries({ queryKey: ['company', companyId] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['deals'] });
            setShowQuickCreateModal(false);
            setQuickCreateType(null);
          }}
        />
      )}
      {/* Phase 5: Property Management Modal */}
      <PropertyManagementModal
        isOpen={showPropertyManagement}
        onClose={() => setShowPropertyManagement(false)}
        entityType="company"
        defaultProperties={properties.map((p, idx) => ({
          id: p.key,
          key: p.key,
          label: p.label,
          type: p.type || 'text',
          visible: true,
          order: idx
        }))}
        onSave={(config) => {
          setPropertyConfig(config);
          queryClient.invalidateQueries({ queryKey: ['company', companyId] });
        }}
        currentUser={users.find(u => u.id === company?.ownerId)}
      />
      {/* Phase 5: Functional Modals */}
      <NoteComposerModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        entityType="company"
        entityId={companyId}
        entityName={company?.name || 'Company'}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['company', companyId] });
          queryClient.invalidateQueries({ queryKey: ['audit-logs', 'company', companyId] });
        }}
      />
      {showTaskModal && (
        <QuickCreateModal
          type="task"
          lockedType={true}
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'company', companyId] });
            setShowTaskModal(false);
          }}
        />
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Company</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete {company?.name}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await apiDeleteCompany(companyId);
                    showSuccess('Company deleted successfully');
                    onBack();
                  } catch (err: any) {
                    showError(err.message || 'Failed to delete company');
                  } finally {
                    setShowDeleteConfirm(false);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Export Company Data</h3>
            <p className="text-sm text-slate-600 mb-4">
              Export all data for {company?.name} as JSON or CSV.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(company, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${company?.name || 'company'}_${Date.now()}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                  showSuccess('Company data exported');
                  setShowExportModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompanyRecordPage;
