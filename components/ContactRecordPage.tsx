/**
 * Phase 1-2: Contact Record Page - Full-page view for individual contacts
 * REQ-01, 5.1, REQ-02, REQ-03
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Contact, User } from '../types';
import { apiGetContact, apiPatchContact } from '../utils/api';
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
import PlaybookWidget from './common/PlaybookWidget';
import AttachmentsWidget from './common/AttachmentsWidget';
import AssociationSearchModal, { SearchableItem } from './common/AssociationSearchModal';
import PropertyManagementModal from './common/PropertyManagementModal';
import NoteComposerModal from './common/NoteComposerModal';
import EmailComposerModal from './common/EmailComposerModal';
import CallLogModal from './common/CallLogModal';
import QuickCreateModal from './QuickCreateModal';
import ScheduleMeetingModal from './ScheduleMeetingModal';
import { apiGetTags, apiGetAuditLogs, apiGetDeals, apiGetCompanies, apiUpdateContact, apiDeleteContact } from '../utils/api';
import { Calendar, Clock, Users, Star, Building2, TrendingUp, BookOpen, Paperclip } from 'lucide-react';

interface ContactRecordPageProps {
  contactId: string;
  onBack: () => void;
  onNavigate: (tab: string) => void;
}

const ContactRecordPage: React.FC<ContactRecordPageProps> = ({ contactId, onBack, onNavigate }) => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const { data: users = [] } = useUsers();
  const [showViewAllProperties, setShowViewAllProperties] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [associationModalType, setAssociationModalType] = useState<'company' | 'deal' | null>(null);
  const [showPropertyManagement, setShowPropertyManagement] = useState(false);
  const [propertyConfig, setPropertyConfig] = useState<any[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<'company' | 'deal' | 'contact' | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Fetch contact data
  const { data: contact, isLoading, error } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const response = await apiGetContact(contactId);
      return response.data || response;
    },
    enabled: !!contactId,
  });

  // Fetch tags for display
  const { data: tagsData = [] } = useQuery({
    queryKey: ['tags', 'contact'],
    queryFn: async () => {
      const response = await apiGetTags('contact');
      return response.data || response || [];
    },
  });

  const tagsMap = new Map(tagsData.map((tag: any) => [tag.id, tag]));

  // Fetch audit logs for activity timeline
  const { data: auditLogsData = [], isLoading: isLoadingAuditLogs } = useQuery({
    queryKey: ['audit-logs', 'contact', contactId],
    queryFn: async () => {
      const res = await apiGetAuditLogs({
        resourceType: 'contact',
        resourceId: contactId,
        limit: 50
      });
      return (res as any)?.data ?? (res as any)?.logs ?? [];
    },
    enabled: !!contactId && activeTab === 'activities'
  });

  // Transform audit logs to activity entries
  const activities: ActivityEntry[] = useMemo(() => {
    const auditLogs: Array<{ id: string; eventType: string; timestamp: string | Date; userId?: string; userEmail?: string; metadata?: Record<string, unknown> }> = Array.isArray(auditLogsData) ? auditLogsData : [];
    
    return auditLogs.map(log => {
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
  }, [auditLogsData, users]);

  // Build data highlights
  const highlights: Highlight[] = useMemo(() => [
    {
      id: 'created',
      label: 'Created',
      value: contact?.createdAt,
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
      value: contact?.lastActivityAt || contact?.updatedAt,
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
      id: 'consentStatus',
      label: 'Consent',
      value: contact?.contact_compliance?.consent_status || 'pending',
      icon: <Star className="w-4 h-4" />,
      formatValue: (val) => {
        const status = val || 'pending';
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
      },
      onClick: () => {
        // Open View All Properties to see compliance details
        setShowViewAllProperties(true);
      }
    },
  ], [contact]);

  // Build association previews
  const associatedCompanies: AssociationItem[] = useMemo(() => {
    if (!contact?.companyId || !contact?.organization) return [];
    return [{
      id: contact.companyId,
      name: contact.organization,
      subtitle: 'Company'
    }];
  }, [contact]);

  // Fetch associated deals
  const { data: dealsData = [] } = useQuery({
    queryKey: ['deals', 'contact', contactId],
    queryFn: async () => {
      const response = await apiGetDeals(undefined, undefined, undefined);
      // Filter deals that have this contact associated
      const deals = response.data || response || [];
      return deals.filter((deal: any) => deal.contactId === contactId || deal.contactIds?.includes(contactId));
    },
    enabled: !!contactId
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
    queryKey: ['satisfaction', 'contact', contactId],
    queryFn: async () => {
      // TODO: Implement API call for contact-specific satisfaction
      return null;
    },
    enabled: false // Disabled until API is available
  });

  // Fetch playbooks
  const { data: playbooksData = [] } = useQuery({
    queryKey: ['playbooks', 'contact', contactId],
    queryFn: async () => {
      // TODO: Implement API call for contact playbooks
      return [];
    },
    enabled: false // Disabled until API is available
  });

  // Association search functions
  const searchCompanies = async (query: string): Promise<SearchableItem[]> => {
    const response = await apiGetCompanies(query);
    const companies = response.data || response || [];
    return companies.map((c: any) => ({
      id: c.id,
      name: c.name,
      subtitle: c.industry,
      type: 'company' as const
    }));
  };

  const searchDeals = async (query: string): Promise<SearchableItem[]> => {
    const response = await apiGetDeals();
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
      await apiPatchContact(contactId, fieldName, newValue);
      // Invalidate and refetch contact data
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      showSuccess(`${fieldName} updated successfully`);
    } catch (err: any) {
      showError(err.message || `Failed to update ${fieldName}`);
      throw err;
    }
  };

  // Get assignee name
  const assignee = users.find(u => u.id === contact?.assigneeId);
  const assigneeName = assignee ? assignee.name : null;

  // Get company name (would need to fetch if not denormalized)
  const companyName = contact?.organization || '--';

  // Get consent status badge
  const getConsentBadge = () => {
    const status = contact?.contact_compliance?.consent_status;
    if (!status) return null;
    const badges: Record<string, { label: string; color: string }> = {
      granted: { label: 'Consent Granted', color: '#10b981' },
      pending: { label: 'Consent Pending', color: '#f59e0b' },
      withdrawn: { label: 'Consent Withdrawn', color: '#ef4444' },
      not_required: { label: 'Not Required', color: '#6b7280' },
    };
    return badges[status] || null;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Contact not found</p>
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

  if (!contact) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Contact not found</p>
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
        <span>Contacts</span>
      </button>
      <span className="text-slate-400">/</span>
      <span className="text-slate-900 font-medium">{contact.name || 'Unnamed Contact'}</span>
    </div>
  );

  // Build properties list for PropertyPanel
  const properties = [
    {
      key: 'email',
      label: 'Email',
      value: contact.email,
      type: 'email' as const,
      onSave: (newValue: any) => handleFieldSave('email', newValue),
      disabled: contact.contact_compliance?.processing_restricted
    },
    {
      key: 'phone',
      label: 'Phone',
      value: contact.phone,
      type: 'phone' as const,
      onSave: (newValue: any) => handleFieldSave('phone', newValue),
      disabled: contact.contact_compliance?.processing_restricted
    },
    {
      key: 'role',
      label: 'Role',
      value: contact.role,
      type: 'text' as const,
      onSave: (newValue: any) => handleFieldSave('role', newValue),
      disabled: contact.contact_compliance?.processing_restricted
    },
    {
      key: 'organization',
      label: 'Organization',
      value: companyName,
      type: 'text' as const,
      disabled: true // Company link managed separately
    },
    {
      key: 'assignee',
      label: 'Owner',
      value: assigneeName,
      type: 'text' as const,
      disabled: contact.contact_compliance?.processing_restricted
    },
    {
      key: 'consent_status',
      label: 'Consent Status',
      value: contact.contact_compliance?.consent_status || 'pending',
      type: 'calculated' as const,
      calculatedValue: getConsentBadge()?.label || 'Pending'
    },
    {
      key: 'data_source',
      label: 'Data Source',
      value: contact.contact_compliance?.data_source || '--',
      type: 'calculated' as const
    },
    {
      key: 'region',
      label: 'Region',
      value: contact.contact_compliance?.region || '--',
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
              name={contact.name || 'Unnamed Contact'}
              avatar={contact.linkedinData?.profileImageUrl}
              subtitle={contact.email}
              subtitleType="email"
              statusBadge={getConsentBadge() || undefined}
              onNameSave={(newName) => handleFieldSave('name', newName)}
              disabled={contact.contact_compliance?.processing_restricted}
            />

            {/* Phase 2: Quick Actions */}
            <QuickActionBar
              type="contact"
              onNote={() => setShowNoteModal(true)}
              onEmail={() => setShowEmailModal(true)}
              onCall={() => setShowCallModal(true)}
              onTask={() => setShowTaskModal(true)}
              onMeeting={() => setShowMeetingModal(true)}
            />

          {/* Phase 2: Property Panel */}
          <PropertyPanel
            title="About this contact"
            properties={properties}
            entityType="contact"
            onViewAllProperties={() => setShowViewAllProperties(true)}
            onViewPropertyHistory={() => {
              // Navigate to Activities tab filtered by property changes
              setActiveTab('activities');
              showSuccess('Property history available in Activities timeline');
            }}
            onMerge={() => {
              // TODO: Implement merge functionality (would need merge API)
              showSuccess('Merge functionality coming soon. This will allow combining duplicate contacts.');
            }}
            onClone={() => {
              // Clone contact by creating a new one with same data
              const cloneData = {
                name: `${contact?.name} (Copy)`,
                email: contact?.email,
                phone: contact?.phone,
                role: contact?.role,
                companyId: contact?.companyId,
                // Copy other fields as needed
              };
              // TODO: Implement clone API call
              showSuccess('Clone functionality coming soon. This will create a duplicate contact.');
            }}
            onDelete={() => setShowDeleteConfirm(true)}
            onExport={() => setShowExportModal(true)}
            onManageProperties={() => setShowPropertyManagement(true)}
            isAdmin={users.find(u => u.id === contact?.assigneeId)?.role === 'Admin'}
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
                  {associatedCompanies.length > 0 && (
                    <AssociationPreview
                      title="Companies"
                      items={associatedCompanies}
                      icon={<Building2 className="w-4 h-4" />}
                      onItemClick={(item) => {
                        // Navigate to company record page
                        const url = new URL(window.location.href);
                        url.searchParams.set('companyId', item.id);
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
                  onAddEmail={() => setShowEmailModal(true)}
                  onAddCall={() => setShowCallModal(true)}
                  onAddTask={() => setShowTaskModal(true)}
                  onAddMeeting={() => setShowMeetingModal(true)}
                />
              )}
              
              {(activeTab === 'strategic-context' || activeTab === 'playbooks') && (
                <div className="p-6">
                  <p className="text-sm text-slate-500">
                    {activeTab === 'strategic-context' 
                      ? 'Strategic Context view coming soon...' 
                      : 'Playbooks view coming soon...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        }
        right={
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Phase 4: Associations & Widgets */}
            {/* Companies */}
            <AssociationCard
              title="Companies"
              items={associatedCompanies}
              icon={<Building2 className="w-4 h-4" />}
              onItemClick={(item) => {
                const url = new URL(window.location.href);
                url.searchParams.set('companyId', item.id);
                window.history.pushState({}, '', url);
                window.location.reload();
              }}
              onAdd={() => {
                setQuickCreateType('company');
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
                // Navigate to satisfaction tab
                onNavigate('satisfaction');
              }}
            />

            {/* Playbooks */}
            <PlaybookWidget
              playbooks={playbooksData}
              onViewAll={() => {
                onNavigate('playbooks');
              }}
              onAdd={() => {
                // Navigate to playbooks to create new one
                onNavigate('playbooks');
              }}
            />

            {/* Attachments */}
            <AttachmentsWidget
              attachments={contact?.attachments || []}
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
                    const currentAttachments = contact?.attachments || [];
                    const updatedAttachments = [...currentAttachments, ...newAttachments];
                    
                    // Update contact with new attachments
                    await apiUpdateContact(contactId, { attachments: updatedAttachments });
                    
                    // Invalidate and refetch contact data
                    queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
                    
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
                  const currentAttachments = contact?.attachments || [];
                  const updatedAttachments = currentAttachments.filter((att: any) => att.id !== attachmentId);
                  await apiUpdateContact(contactId, { attachments: updatedAttachments });
                  queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
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
            value: contact.linkedin || contact.linkedinUrl,
            type: 'url' as const,
            category: 'Social',
            onSave: (newValue: any) => handleFieldSave('linkedin', newValue),
            disabled: contact.contact_compliance?.processing_restricted
          },
          {
            key: 'data_source_detail',
            label: 'Event / Context',
            value: contact.contact_compliance?.data_source_detail,
            type: 'text' as const,
            category: 'Compliance',
            disabled: contact.contact_compliance?.processing_restricted
          },
          {
            key: 'lawful_basis',
            label: 'Lawful Basis',
            value: contact.contact_compliance?.lawful_basis,
            type: 'calculated' as const,
            category: 'Compliance',
            calculatedValue: contact.contact_compliance?.lawful_basis || '--'
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
            if (associationModalType === 'company') {
              // Associate contact with company
              await apiUpdateContact(contactId, { companyId: item.id });
              showSuccess(`Contact associated with ${item.name}`);
            } else if (associationModalType === 'deal') {
              // Associate contact with deal (would need deal update API)
              showSuccess(`Deal ${item.name} selected. Deal association API coming soon.`);
            }
            queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          } catch (err: any) {
            showError(err.message || 'Failed to create association');
          }
        }}
        searchFunction={associationModalType === 'company' ? searchCompanies : searchDeals}
        title={associationModalType === 'company' ? 'Link Company' : 'Link Deal'}
        placeholder={associationModalType === 'company' ? 'Search companies...' : 'Search deals...'}
      />
      {/* Quick Create Modal for creating new records */}
      {showQuickCreateModal && quickCreateType && (
        <QuickCreateModal
          type={quickCreateType}
          lockedType={true}
          onClose={() => {
            setShowQuickCreateModal(false);
            setQuickCreateType(null);
          }}
          onSuccess={() => {
            // Refresh contact data and associations
            queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
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
        entityType="contact"
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
          queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
        }}
        currentUser={users.find(u => u.id === contact?.assigneeId)}
      />
      {/* Phase 5: Functional Modals */}
      <NoteComposerModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        entityType="contact"
        entityId={contactId}
        entityName={contact?.name || 'Contact'}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
          queryClient.invalidateQueries({ queryKey: ['audit-logs', 'contact', contactId] });
        }}
      />
      <EmailComposerModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        toEmail={contact?.email}
        toName={contact?.name}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['audit-logs', 'contact', contactId] });
        }}
      />
      <CallLogModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        entityType="contact"
        entityId={contactId}
        entityName={contact?.name || 'Contact'}
        phoneNumber={contact?.phone}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['audit-logs', 'contact', contactId] });
        }}
      />
      {showTaskModal && (
        <QuickCreateModal
          type="task"
          lockedType={true}
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'contact', contactId] });
            setShowTaskModal(false);
          }}
        />
      )}
      {showMeetingModal && (
        <ScheduleMeetingModal
          isOpen={showMeetingModal}
          onClose={() => setShowMeetingModal(false)}
          userId={users.find(u => u.id === contact?.assigneeId)?.id || users[0]?.id || ''}
          participants={contact?.email ? [contact.email] : []}
          onCreateSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'contact', contactId] });
            setShowMeetingModal(false);
          }}
        />
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Contact</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete {contact?.name}? This action cannot be undone.
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
                    const { apiDeleteContact } = await import('../utils/api');
                    await apiDeleteContact(contactId);
                    showSuccess('Contact deleted successfully');
                    onBack();
                  } catch (err: any) {
                    showError(err.message || 'Failed to delete contact');
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
            <h3 className="text-lg font-bold text-slate-900 mb-2">Export Contact Data</h3>
            <p className="text-sm text-slate-600 mb-4">
              Export all data for {contact?.name} as JSON or CSV.
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
                  const dataStr = JSON.stringify(contact, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${contact?.name || 'contact'}_${Date.now()}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                  showSuccess('Contact data exported');
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

export default ContactRecordPage;
