
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, User, Globe, Phone, Mail, ChevronRight, Search, Plus, ExternalLink, 
  Calendar, Clock, Sparkles, ArrowRight, X, Trash2, Shield, Lock, Settings2, FileSearch, 
  Loader2, AlertTriangle, CheckSquare, ListChecks, Linkedin, Briefcase, TrendingUp,
  UserPlus, Newspaper, Rocket, Zap, Target, Save, Edit3, Wand2, Info, FileText, History,
  MessageSquare, UserCheck, Share2, MoreVertical, Filter, CheckCircle2, Circle, AtSign, Send, Scan, RefreshCw, Star, BookOpen, FolderKanban, Upload, List, Grid
} from 'lucide-react';
import { Company, Contact, Deal, User as UserType, SocialSignal, Note, Project, Tag, SavedView } from '../types';
import { apiCreateNotification, apiGetCompanySatisfaction, apiGetProjects, apiGetTags, apiGetSavedViews, apiCreateDataRequest, apiWithdrawConsent, apiGetAuditLogs } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { formatNameForDisplay } from '../utils/validate';
import { ImageWithFallback } from './common';
import { BusinessCardScanner, LinkedInScanner } from './Scanner';
import EditableCell from './common/EditableCell';
import ColumnCustomizer, { ColumnDefinition } from './common/ColumnCustomizer';
import { 
  useCompanies, 
  useContacts, 
  useDeals, 
  useUsers,
  useUpdateCompany,
  useUpdateContact,
  useDeleteCompany,
  useDeleteContact,
  useBulkDeleteCompanies,
  useBulkDeleteContacts,
  useBulkUpdateCompanies
} from '../hooks/useCRMData';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { usePlaybookInstances, usePlaybookStepCompletions } from '../hooks/usePlaybooks';
import PlaybookInstanceView from './PlaybookInstanceView';
import CRMCompanyUploadWizard from './CRMCompanyUploadWizard';

interface CRMProps {
  onNavigate: (tab: string) => void;
  onAddCompany: () => void;
  onAddContact: () => void;
  externalSearchQuery?: string;
  // Phase 1: Optional callback to navigate to record pages
  onNavigateToRecord?: (type: 'contact' | 'company', id: string) => void;
}

// Playbook Instance Card Component for CRM - fetches completions to calculate accurate progress
const CompanyPlaybookInstanceCard: React.FC<{ 
  instance: any; 
  deals: Deal[];
  projects: Project[];
  onView: (id: string) => void;
}> = ({ instance, deals, projects, onView }) => {
  const { data: completions = [] } = usePlaybookStepCompletions(instance.id);
  
  const totalSteps = instance.templateSnapshot?.sections?.reduce((total: number, section: any) => {
    return total + (section.steps?.length || 0);
  }, 0) || 0;
  const completedSteps = completions.length;
  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  // Find attached deal or project
  const attachedDeal = instance.dealId ? deals.find((d: Deal) => d.id === instance.dealId) : null;
  const attachedProject = instance.projectId ? projects.find((p: Project) => p.id === instance.projectId) : null;
  const attachedTo = attachedDeal 
    ? { type: 'Deal', name: attachedDeal.title || attachedDeal.name, id: attachedDeal.id }
    : attachedProject
    ? { type: 'Project', name: attachedProject.title || attachedProject.name, id: attachedProject.id }
    : null;
  
  return (
    <div 
      className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-900 truncate">
              {instance.templateSnapshot?.name || 'Unknown Playbook'}
            </h4>
            {attachedTo && (
              <div className="flex items-center gap-2 mt-1">
                {attachedTo.type === 'Deal' ? (
                  <Briefcase className="w-3 h-3 text-slate-400" />
                ) : (
                  <FolderKanban className="w-3 h-3 text-slate-400" />
                )}
                <span className="text-xs text-slate-500 truncate">{attachedTo.name}</span>
              </div>
            )}
          </div>
        </div>
        {percentage === 100 && (
          <CheckSquare className="w-5 h-5 text-green-500 shrink-0" />
        )}
      </div>
      
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-slate-600">
            {completedSteps} / {totalSteps} steps completed
          </span>
          <span className="text-xs font-bold text-slate-500">{percentage}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              percentage === 100
                ? 'bg-green-500'
                : percentage >= 50
                ? 'bg-indigo-500'
                : 'bg-yellow-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      
      <button
        onClick={() => {
          // From company view, navigate to deal/project first, then open playbook
          if (attachedTo?.type === 'Deal') {
            // For now, just open the playbook instance view
            // In a full implementation, you might want to navigate to pipeline first
            onView(instance.id);
          } else if (attachedTo?.type === 'Project') {
            // For now, just open the playbook instance view
            onView(instance.id);
          } else {
            onView(instance.id);
          }
        }}
        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
      >
        View {attachedTo ? attachedTo.type : 'Playbook'}
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
};

const CRM: React.FC<CRMProps> = ({ onNavigate, onAddCompany, onAddContact, externalSearchQuery = '', onNavigateToRecord }) => {
  // Phase 1: Feature flag for record page navigation (can be moved to settings later)
  const USE_RECORD_PAGES = true; // Set to false to use drawer view
  
  // Phase 1: Helper to navigate to record page
  const navigateToRecord = (type: 'contact' | 'company', id: string) => {
    if (USE_RECORD_PAGES) {
      if (onNavigateToRecord) {
        onNavigateToRecord(type, id);
      } else {
        // Fallback: use URL params
        const params = new URLSearchParams(window.location.search);
        params.set(type === 'contact' ? 'contactId' : 'companyId', id);
        window.location.search = params.toString();
      }
    } else {
      // Legacy drawer view
      if (type === 'company') {
        const company = companies.find(c => c.id === id);
        if (company) setSelectedCompany(company);
      } else {
        const contact = contacts.find(c => c.id === id);
        if (contact) setSelectedContact(contact);
      }
    }
  };
  const { showSuccess, showError, showInfo } = useToast();
  const queryClient = useQueryClient();
  
  // Get current user from localStorage
  const currentUser = localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data') || '{}') : null;
  
  // Initialize view and optional company filter from URL params
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialCrmCompanyId = urlParams?.get('crmCompanyId') || null;
  const initialCrmView: 'companies' | 'contacts' =
    urlParams?.get('crmView') === 'contacts' || initialCrmCompanyId ? 'contacts' : 'companies';

  const [view, setView] = useState<'companies' | 'contacts'>(initialCrmView);
  const [displayMode, setDisplayMode] = useState<'list' | 'card'>('list'); // Phase 2: Default to table view
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(''); // Phase 2: Debounced search
  // Phase 2: Pagination state
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(50);
  const [currentPage, setCurrentPage] = useState(1);
  // Phase 4: Saved views state
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [isCreatingSavedView, setIsCreatingSavedView] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [viewingPlaybookInstanceId, setViewingPlaybookInstanceId] = useState<string | null>(null);
  const [showCompanyUploadWizard, setShowCompanyUploadWizard] = useState(false);
  const [companyFilterId, setCompanyFilterId] = useState<string | null>(initialCrmCompanyId);
 
  // Fetch playbook instances for selected company (roll-up from all deals and projects)
  const { data: companyPlaybookInstances = [], isLoading: isLoadingPlaybooks } = usePlaybookInstances({
    companyId: selectedCompany?.id
  });
  
  // Phase 2: Debounced search (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = localSearchQuery.trim();

      // Trigger search for any non-empty input
      if (trimmed.length === 0 || trimmed.length >= 1) {
        setDebouncedSearchQuery((prev) => (prev === trimmed ? prev : trimmed));
        // Phase 8: Reset to page 1 on new search
        setCurrentPage(1);
      } else {
        setDebouncedSearchQuery((prev) => (prev === '' ? prev : ''));
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery]);

  // React Query hooks for data fetching with caching - use debounced search
  const { data: companies = [], isLoading: isLoadingCompanies, isError: isCompaniesError, refetch: refetchCompanies } = useCompanies(debouncedSearchQuery || undefined);
  const { data: contacts = [], isLoading: isLoadingContacts, isError: isContactsError, refetch: refetchContacts } = useContacts(debouncedSearchQuery || undefined);
  const { data: deals = [], isLoading: isLoadingDeals } = useDeals();
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();

  const activeCompanyFilterName = useMemo(() => {
    if (!companyFilterId) return null;
    const companyMatch = companies.find(c => c.id === companyFilterId);
    if (companyMatch?.name) return companyMatch.name;
    const contactMatch = contacts.find(c => c.companyId === companyFilterId && c.organization);
    return contactMatch?.organization || null;
  }, [companyFilterId, companies, contacts]);
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiGetProjects();
      return response.data || response || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  
  // Phase 3: Fetch tags
  const { data: tags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: ['tags', view],
    queryFn: async () => {
      const response = await apiGetTags(view === 'contacts' ? 'contact' : 'company');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  
  // Create tag lookup map
  const tagsMap = useMemo(() => {
    const map = new Map<string, Tag>();
    tags.forEach(tag => map.set(tag.id, tag));
    return map;
  }, [tags]);
  
  // Phase 4: Fetch saved views
  const { data: fetchedSavedViews = [], isLoading: isLoadingSavedViews } = useQuery({
    queryKey: ['savedViews', view],
    queryFn: async () => {
      const response = await apiGetSavedViews(view === 'contacts' ? 'contact' : 'company');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  
  useEffect(() => {
    // Only update local savedViews state when data meaningfully changes
    setSavedViews((prev) => {
      if (prev.length === fetchedSavedViews.length &&
          prev.every((sv, idx) => sv.id === fetchedSavedViews[idx]?.id)) {
        return prev;
      }
      return fetchedSavedViews;
    });

    // Set default view once, or when default changes
    const defaultView = fetchedSavedViews.find((sv: SavedView) => sv.isDefault);
    if (defaultView && defaultView.id !== activeSavedViewId) {
      setActiveSavedViewId(defaultView.id);
    }
  }, [fetchedSavedViews, activeSavedViewId]);
  
  // React Query mutations
  const updateCompanyMutation = useUpdateCompany();
  const updateContactMutation = useUpdateContact();
  const deleteCompanyMutation = useDeleteCompany();
  const deleteContactMutation = useDeleteContact();
  const bulkDeleteCompaniesMutation = useBulkDeleteCompanies();
  const bulkDeleteContactsMutation = useBulkDeleteContacts();
  const bulkUpdateCompaniesMutation = useBulkUpdateCompanies();
  
  // Combine loading states
  const isLoading = isLoadingCompanies || isLoadingContacts || isLoadingDeals || isLoadingUsers;
  
  // Company filters - using arrays for multiple selections
  const [targetAccountFilters, setTargetAccountFilters] = useState<string[]>([]);
  const [assignedFilters, setAssignedFilters] = useState<string[]>([]);
  const [dealsFilters, setDealsFilters] = useState<string[]>([]);
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  
  // Editing state for Company
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editCompanyFormData, setEditCompanyFormData] = useState<Partial<Company>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Editing state for Contact
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editContactFormData, setEditContactFormData] = useState<Partial<Contact>>({});
  const [activeContactTab, setActiveContactTab] = useState<'details' | 'notes' | 'activity'>('details');
  const [showHandleDataRequestModal, setShowHandleDataRequestModal] = useState(false);
  const [dataRequestType, setDataRequestType] = useState<'access' | 'erasure' | 'rectification' | 'restrict'>('access');
  const [dataRequestDetails, setDataRequestDetails] = useState('');
  const [isSubmittingDataRequest, setIsSubmittingDataRequest] = useState(false);
  const [showRecordWithdrawalConfirm, setShowRecordWithdrawalConfirm] = useState(false);
  const [isWithdrawingConsent, setIsWithdrawingConsent] = useState(false);
  const [isUpdatingContact, setIsUpdatingContact] = useState(false);
  
  // Delete confirmation state
  const [deleteConfirmCompany, setDeleteConfirmCompany] = useState<Company | null>(null);
  const [deleteConfirmContact, setDeleteConfirmContact] = useState<Contact | null>(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  const [isDeletingContact, setIsDeletingContact] = useState(false);
  
  // Multi-select state
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isBulkDeletingCompanies, setIsBulkDeletingCompanies] = useState(false);
  const [isBulkDeletingContacts, setIsBulkDeletingContacts] = useState(false);
  const [isBulkMarkingTargetAccount, setIsBulkMarkingTargetAccount] = useState(false);
  const [isBulkUnmarkingTargetAccount, setIsBulkUnmarkingTargetAccount] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState<'companies' | 'contacts' | null>(null);
  // Store items to be deleted separately so they don't disappear from modal during deletion
  const [itemsToDelete, setItemsToDelete] = useState<{ companies: Company[]; contacts: Contact[] }>({ companies: [], contacts: [] });

  // §3B: Consent stats for selected contacts (outbound: only granted count for outreach)
  const selectedContactConsentStats = useMemo(() => {
    if (selectedContactIds.length === 0) return { withConsent: 0, withoutConsent: 0, total: 0 };
    const selected = contacts.filter((c: Contact) => selectedContactIds.includes(c.id));
    const withConsent = selected.filter((c: Contact) => (c.contact_compliance?.consent_status === 'granted')).length;
    return { withConsent, withoutConsent: selected.length - withConsent, total: selected.length };
  }, [contacts, selectedContactIds]);

  // Satisfaction state
  const [companySatisfaction, setCompanySatisfaction] = useState<any>(null);
  const [isLoadingSatisfaction, setIsLoadingSatisfaction] = useState(false);
  
  // Notes state for Companies
  const [companyNoteText, setCompanyNoteText] = useState('');
  const [isAddingCompanyNote, setIsAddingCompanyNote] = useState(false);
  const [deletingCompanyNoteId, setDeletingCompanyNoteId] = useState<string | null>(null);
  const [companyNoteToDelete, setCompanyNoteToDelete] = useState<string | null>(null);
  const [showCompanyMentionDropdown, setShowCompanyMentionDropdown] = useState(false);
  const [companyMentionSearchQuery, setCompanyMentionSearchQuery] = useState('');
  const [companyMentionCursorPosition, setCompanyMentionCursorPosition] = useState(0);
  const [filteredCompanyMentionUsers, setFilteredCompanyMentionUsers] = useState<UserType[]>([]);
  
  // Notes state for Contacts
  const [contactNoteText, setContactNoteText] = useState('');
  const [isAddingContactNote, setIsAddingContactNote] = useState(false);
  const [deletingContactNoteId, setDeletingContactNoteId] = useState<string | null>(null);
  const [contactNoteToDelete, setContactNoteToDelete] = useState<string | null>(null);
  const [showContactMentionDropdown, setShowContactMentionDropdown] = useState(false);
  const [contactMentionSearchQuery, setContactMentionSearchQuery] = useState('');
  const [contactMentionCursorPosition, setContactMentionCursorPosition] = useState(0);
  const [filteredContactMentionUsers, setFilteredContactMentionUsers] = useState<UserType[]>([]);
  
  // Scanner state
  const [isBusinessCardScannerOpen, setIsBusinessCardScannerOpen] = useState(false);
  const [isLinkedInScannerOpen, setIsLinkedInScannerOpen] = useState(false);
  
  // Manual refresh state
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
  // Phase 8: Column customization state
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [contactColumns, setContactColumns] = useState<ColumnDefinition[]>([
    { key: 'name', label: 'Name', locked: true, visible: true, order: 0 },
    { key: 'email', label: 'Email', visible: true, order: 1 },
    { key: 'organization', label: 'Organization', visible: true, order: 2 },
    { key: 'phone', label: 'Phone', visible: true, order: 3 },
    { key: 'role', label: 'Role', visible: true, order: 4 },
    { key: 'tags', label: 'Tags', visible: true, order: 5 },
    { key: 'assignee', label: 'Assignee', visible: true, order: 6 },
    { key: 'domain', label: 'Domain', visible: true, order: 7 },
    { key: 'consent', label: 'Consent', visible: true, order: 8 },
    { key: 'created', label: 'Created', visible: false, order: 9 },
  ]);
  const [companyColumns, setCompanyColumns] = useState<ColumnDefinition[]>([
    { key: 'name', label: 'Name', locked: true, visible: true, order: 0 },
    { key: 'domain', label: 'Domain', visible: true, order: 1 },
    { key: 'industry', label: 'Industry', visible: true, order: 2 },
    { key: 'region', label: 'Region', visible: true, order: 3 },
    { key: 'accountManager', label: 'Account Manager', visible: true, order: 4 },
    { key: 'status', label: 'Status', visible: true, order: 5 },
    { key: 'contactCount', label: 'Contact Count', visible: true, order: 6 },
    { key: 'tags', label: 'Tags', visible: true, order: 7 },
    { key: 'npsScore', label: 'NPS Score', visible: true, order: 8 },
  ]);
  
  // Phase 8: Unsaved changes tracking
  const [hasUnsavedContactChanges, setHasUnsavedContactChanges] = useState(false);
  const [hasUnsavedCompanyChanges, setHasUnsavedCompanyChanges] = useState(false);

  // §7: Contact History — compliance audit log entries for selected contact
  const { data: contactAuditData, isLoading: isLoadingContactAudit } = useQuery({
    queryKey: ['audit-logs', 'contact', selectedContact?.id],
    queryFn: async () => {
      const res = await apiGetAuditLogs({
        resourceType: 'contact',
        resourceId: selectedContact!.id,
        limit: 50
      });
      return (res as any)?.data ?? (res as any)?.logs ?? [];
    },
    enabled: !!(selectedContact?.id && activeContactTab === 'activity')
  });
  const contactAuditLogs: Array<{ id: string; eventType: string; timestamp: string | Date; userId?: string; userEmail?: string; metadata?: Record<string, unknown> }> = Array.isArray(contactAuditData) ? contactAuditData : [];
  const COMPLIANCE_EVENT_TYPES = new Set([
    'contact_created', 'contact_updated', 'consent_granted', 'consent_withdrawn', 'consent_expired',
    'lawful_basis_changed', 'outbound_sent', 'outbound_blocked', 'data_exported', 'data_anonymized',
    'data_deleted', 'processing_restricted', 'processing_unrestricted', 'card_image_deleted',
    'dsar_access', 'dsar_erasure', 'dsar_rectification', 'dsar_restrict', 'bulk_import', 'cross_border_transfer'
  ]);
  const formatAuditEventLabel = (eventType: string) =>
    eventType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  
  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['companies'] }),
        queryClient.invalidateQueries({ queryKey: ['contacts'] }),
        queryClient.invalidateQueries({ queryKey: ['deals'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] })
      ]);
      showSuccess('Data refreshed successfully');
    } catch (err) {
      showError('Failed to refresh data');
    } finally {
      // Keep spinner for at least 500ms for better UX
      setTimeout(() => setIsManualRefreshing(false), 500);
    }
  };

  // Sync external search query (e.g. from URL) once, without overriding
  // user typing on every keystroke. Ignore empty external values.
  useEffect(() => {
    if (externalSearchQuery !== undefined && externalSearchQuery !== '' && externalSearchQuery !== localSearchQuery) {
      setLocalSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  // Clear selections when search query or view changes
  useEffect(() => {
    setSelectedCompanyIds([]);
    setSelectedContactIds([]);
  }, [view, localSearchQuery]);

  // Listen for external refresh events (e.g., from other components)
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 CRM refresh triggered - invalidating cache');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    };
    
    window.addEventListener('refresh-crm', handleRefresh);
    return () => window.removeEventListener('refresh-crm', handleRefresh);
  }, [queryClient]);
  
  // Phase 8: Load column preferences from localStorage on mount
  useEffect(() => {
    const savedContactCols = localStorage.getItem('crm_contact_columns');
    const savedCompanyCols = localStorage.getItem('crm_company_columns');
    
    if (savedContactCols) {
      try {
        setContactColumns(JSON.parse(savedContactCols));
      } catch (e) {
        console.error('Failed to load contact column preferences:', e);
      }
    }
    
    if (savedCompanyCols) {
      try {
        setCompanyColumns(JSON.parse(savedCompanyCols));
      } catch (e) {
        console.error('Failed to load company column preferences:', e);
      }
    }
  }, []);

  const handleUpdateCompany = async (updates: Partial<Company>) => {
    if (!selectedCompany) return;
    try {
      await updateCompanyMutation.mutateAsync({ id: selectedCompany.id, updates });
      setSelectedCompany({ ...selectedCompany, ...updates });
      setIsEditingCompany(false);
      setHasUnsavedCompanyChanges(false);
      showSuccess('Account updated');
    } catch (err) { 
      showError('Update failed'); 
    }
  };
  
  // Phase 8: Handle inline cell save
  const handleInlineCellSave = async (field: string, value: any, entityId: string, entityType: 'contact' | 'company') => {
    try {
      if (entityType === 'contact') {
        await updateContactMutation.mutateAsync({ 
          id: entityId, 
          updates: { [field]: value } 
        });
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        // Update selected contact if it's the one being edited
        if (selectedContact?.id === entityId) {
          setSelectedContact({ ...selectedContact, [field]: value });
        }
      } else {
        await updateCompanyMutation.mutateAsync({ 
          id: entityId, 
          updates: { [field]: value } 
        });
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['companies'] });
        // Update selected company if it's the one being edited
        if (selectedCompany?.id === entityId) {
          setSelectedCompany({ ...selectedCompany, [field]: value });
        }
      }
      showSuccess(`${field} updated successfully`);
    } catch (error: any) {
      console.error('Inline cell save error:', error);
      showError(error.message || 'Failed to update');
      throw error;
    }
  };

  const handleUpdateContactDetails = async () => {
    if (!selectedContact || isUpdatingContact) return;
    
    // Validate required fields
    if (!editContactFormData.name || !editContactFormData.email) {
      showError('Name and Email are required fields');
      return;
    }

    setIsUpdatingContact(true);
    try {
      // Normalize form data: convert empty strings to null for optional fields
      const normalizedUpdates = {
        ...editContactFormData,
        companyId: editContactFormData.companyId === '' ? null : editContactFormData.companyId,
        phone: editContactFormData.phone === '' ? null : editContactFormData.phone,
        linkedin: editContactFormData.linkedin === '' ? null : editContactFormData.linkedin,
        role: editContactFormData.role === '' ? null : editContactFormData.role,
      };
      
      await updateContactMutation.mutateAsync({ id: selectedContact.id, updates: normalizedUpdates });
      const updatedContact = { ...selectedContact, ...normalizedUpdates };
      setSelectedContact(updatedContact);
      setIsEditingContact(false);
      setHasUnsavedContactChanges(false);
      showSuccess('Contact profile updated successfully');
    } catch (err: any) {
      console.error('Contact update error:', err);
      showError(err.message || 'Failed to update contact. Please try again.');
    } finally {
      setIsUpdatingContact(false);
    }
  };
  
  // Phase 8: Track unsaved changes
  useEffect(() => {
    if (!selectedContact || !isEditingContact) {
      setHasUnsavedContactChanges(false);
      return;
    }
    
    const hasChanges = JSON.stringify(editContactFormData) !== JSON.stringify(selectedContact);
    setHasUnsavedContactChanges(hasChanges);
  }, [editContactFormData, selectedContact, isEditingContact]);
  
  useEffect(() => {
    if (!selectedCompany || !isEditingCompany) {
      setHasUnsavedCompanyChanges(false);
      return;
    }
    
    const hasChanges = JSON.stringify(editCompanyFormData) !== JSON.stringify(selectedCompany);
    setHasUnsavedCompanyChanges(hasChanges);
  }, [editCompanyFormData, selectedCompany, isEditingCompany]);

  const handleDeleteCompany = async (id: string) => {
    setIsDeletingCompany(true);
    try {
      await deleteCompanyMutation.mutateAsync(id);
      if (selectedCompany?.id === id) {
        setSelectedCompany(null);
        setIsEditingCompany(false);
      }
      setDeleteConfirmCompany(null);
      showSuccess('Company deleted successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to delete company');
    } finally {
      setIsDeletingCompany(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    setIsDeletingContact(true);
    try {
      await deleteContactMutation.mutateAsync(id);
      if (selectedContact?.id === id) {
        setSelectedContact(null);
        setIsEditingContact(false);
      }
      setDeleteConfirmContact(null);
      showSuccess('Contact deleted successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to delete contact');
    } finally {
      setIsDeletingContact(false);
    }
  };

  // Load satisfaction data when company is selected
  useEffect(() => {
    if (selectedCompany?.id) {
      const loadSatisfaction = async () => {
        try {
          setIsLoadingSatisfaction(true);
          const response = await apiGetCompanySatisfaction(selectedCompany.id);
          if (response.success) {
            setCompanySatisfaction(response.data);
          }
        } catch (err) {
          // Don't show error if satisfaction record doesn't exist
          setCompanySatisfaction(null);
        } finally {
          setIsLoadingSatisfaction(false);
        }
      };
      loadSatisfaction();
    } else {
      setCompanySatisfaction(null);
    }
  }, [selectedCompany?.id]);
  
  // Close handlers with cleanup
  const closeCompanyDrawer = () => {
    setSelectedCompany(null);
    setIsEditingCompany(false);
    setCompanyNoteText('');
    setShowCompanyMentionDropdown(false);
    setCompanySatisfaction(null);
  };

  const closeContactDrawer = () => {
    setSelectedContact(null);
    setIsEditingContact(false);
    setContactNoteText('');
    setShowContactMentionDropdown(false);
  };

  // Extract mentioned users from text (without using regex literals for better bundler compatibility)
  const extractMentionedUsers = (text: string): string[] => {
    const mentions: string[] = [];

    const isMentionChar = (ch: string) =>
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= 'a' && ch <= 'z') ||
      (ch >= '0' && ch <= '9') ||
      ch === ' ';

    let i = 0;
    while (i < text.length) {
      if (text[i] === '@') {
        let j = i + 1;
        while (j < text.length && isMentionChar(text[j])) {
          j++;
        }
        const mentionedName = text.slice(i + 1, j).trim();
        if (mentionedName) {
          const user = users.find(
            (u) => u.name.trim().toLowerCase() === mentionedName.toLowerCase()
          );
          if (user) {
            mentions.push(user.id);
          }
        }
        i = j;
      } else {
        i++;
      }
    }

    return [...new Set(mentions)];
  };

  // Render note text with highlighted mentions (regex-free implementation)
  const renderNoteTextWithMentions = (text: string) => {
    const parts: React.ReactNode[] = [];

    const isMentionChar = (ch: string) =>
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= 'a' && ch <= 'z') ||
      (ch >= '0' && ch <= '9') ||
      ch === ' ';

    let i = 0;
    let lastIndex = 0;

    while (i < text.length) {
      if (text[i] === '@') {
        if (i > lastIndex) {
          parts.push(text.slice(lastIndex, i));
        }

        let j = i + 1;
        while (j < text.length && isMentionChar(text[j])) {
          j++;
        }

        const mentionedName = text.slice(i + 1, j).trim();

        if (mentionedName) {
          const user = users.find(
            (u) => u.name.trim().toLowerCase() === mentionedName.toLowerCase()
          );

          if (user) {
            parts.push(
              <span
                key={i}
                className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold"
              >
                @{user.name}
              </span>
            );
          } else {
            parts.push(text.slice(i, j));
          }
        }

        i = j;
        lastIndex = j;
      } else {
        i++;
      }
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Company note handlers
  const handleCompanyNoteTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setCompanyNoteText(text);
    setCompanyMentionCursorPosition(cursorPos);
    
    const textUpToCursor = text.substring(0, cursorPos);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const searchQuery = textUpToCursor.substring(lastAtSymbol + 1);
      const charBeforeAt = lastAtSymbol > 0 ? textUpToCursor[lastAtSymbol - 1] : ' ';
      if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtSymbol === 0) {
        if (!searchQuery.includes(' ') && !searchQuery.includes('\n')) {
          setCompanyMentionSearchQuery(searchQuery);
          const filtered = users.filter(u => 
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setFilteredCompanyMentionUsers(filtered.slice(0, 5));
          setShowCompanyMentionDropdown(true);
          return;
        }
      }
    }
    
    setShowCompanyMentionDropdown(false);
  };

  const handleCompanyMentionSelect = (user: UserType) => {
    const textUpToCursor = companyNoteText.substring(0, companyMentionCursorPosition);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    const textAfterCursor = companyNoteText.substring(companyMentionCursorPosition);
    
    const beforeMention = companyNoteText.substring(0, lastAtSymbol);
    const newText = `${beforeMention}@${user.name} ${textAfterCursor}`;
    
    setCompanyNoteText(newText);
    setShowCompanyMentionDropdown(false);
  };

  const handleAddCompanyNote = async () => {
    if (!selectedCompany || !companyNoteText.trim()) return;
    
    setIsAddingCompanyNote(true);
    try {
      const currentUserId = localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data') || '{}').id : '';
      const currentUserName = localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data') || '{}').name : 'Unknown User';
      
      const newNote: Note = {
        id: `note_${Date.now()}`,
        userId: currentUserId,
        userName: currentUserName,
        text: companyNoteText.trim(),
        createdAt: new Date().toISOString()
      };
      
      const updatedNotes = [...(selectedCompany.notes || []), newNote];
      
      await updateCompanyMutation.mutateAsync({ 
        id: selectedCompany.id, 
        updates: { notes: updatedNotes } 
      });
      
      setSelectedCompany({ ...selectedCompany, notes: updatedNotes });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      
      // Send notifications
      const mentionedUserIds = extractMentionedUsers(companyNoteText);
      for (const mentionedUserId of mentionedUserIds) {
        try {
          await apiCreateNotification({
            userId: mentionedUserId,
            type: 'mention',
            title: 'You were mentioned in a company note',
            message: `${currentUserName} mentioned you in ${selectedCompany.name}`,
            relatedId: selectedCompany.id,
            relatedType: 'company',
            read: false
          });
        } catch (notifErr) {
          console.error('Failed to send notification:', notifErr);
        }
      }
      
      setCompanyNoteText('');
      const successMsg = mentionedUserIds.length > 0 
        ? `Note added and ${mentionedUserIds.length} user(s) notified`
        : 'Note added successfully';
      showSuccess(successMsg);
    } catch (err: any) {
      showError(err.message || 'Failed to add note');
    } finally {
      setIsAddingCompanyNote(false);
    }
  };

  const confirmDeleteCompanyNote = async () => {
    if (!selectedCompany || !currentUser || !companyNoteToDelete) return;

    try {
      setDeletingCompanyNoteId(companyNoteToDelete);

      const updatedNotes = selectedCompany.notes?.filter(note => note.id !== companyNoteToDelete) || [];

      await updateCompanyMutation.mutateAsync({ 
        id: selectedCompany.id, 
        updates: { notes: updatedNotes } 
      });

      setSelectedCompany({
        ...selectedCompany,
        notes: updatedNotes
      });

      queryClient.invalidateQueries({ queryKey: ['companies'] });

      showSuccess('Note deleted successfully');
      setCompanyNoteToDelete(null);
    } catch (err: any) {
      showError(err.message || 'Failed to delete note');
    } finally {
      setDeletingCompanyNoteId(null);
    }
  };

  // Contact note handlers
  const handleContactNoteTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setContactNoteText(text);
    setContactMentionCursorPosition(cursorPos);
    
    const textUpToCursor = text.substring(0, cursorPos);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const searchQuery = textUpToCursor.substring(lastAtSymbol + 1);
      const charBeforeAt = lastAtSymbol > 0 ? textUpToCursor[lastAtSymbol - 1] : ' ';
      if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtSymbol === 0) {
        if (!searchQuery.includes(' ') && !searchQuery.includes('\n')) {
          setContactMentionSearchQuery(searchQuery);
          const filtered = users.filter(u => 
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setFilteredContactMentionUsers(filtered.slice(0, 5));
          setShowContactMentionDropdown(true);
          return;
        }
      }
    }
    
    setShowContactMentionDropdown(false);
  };

  const handleContactMentionSelect = (user: UserType) => {
    const textUpToCursor = contactNoteText.substring(0, contactMentionCursorPosition);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    const textAfterCursor = contactNoteText.substring(contactMentionCursorPosition);
    
    const beforeMention = contactNoteText.substring(0, lastAtSymbol);
    const newText = `${beforeMention}@${user.name} ${textAfterCursor}`;
    
    setContactNoteText(newText);
    setShowContactMentionDropdown(false);
  };

  const handleAddContactNote = async () => {
    if (!selectedContact || !contactNoteText.trim()) return;
    
    setIsAddingContactNote(true);
    try {
      const currentUserId = localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data') || '{}').id : '';
      const currentUserName = localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data') || '{}').name : 'Unknown User';
      
      const newNote: Note = {
        id: `note_${Date.now()}`,
        userId: currentUserId,
        userName: currentUserName,
        text: contactNoteText.trim(),
        createdAt: new Date().toISOString()
      };
      
      const updatedNotes = [...(selectedContact.notes || []), newNote];
      
      await updateContactMutation.mutateAsync({ 
        id: selectedContact.id, 
        updates: { notes: updatedNotes } 
      });
      
      setSelectedContact({ ...selectedContact, notes: updatedNotes });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      
      // Send notifications
      const mentionedUserIds = extractMentionedUsers(contactNoteText);
      for (const mentionedUserId of mentionedUserIds) {
        try {
          await apiCreateNotification({
            userId: mentionedUserId,
            type: 'mention',
            title: 'You were mentioned in a contact note',
            message: `${currentUserName} mentioned you in ${selectedContact.name}`,
            relatedId: selectedContact.id,
            relatedType: 'contact',
            read: false
          });
        } catch (notifErr) {
          console.error('Failed to send notification:', notifErr);
        }
      }
      
      setContactNoteText('');
      const successMsg = mentionedUserIds.length > 0 
        ? `Note added and ${mentionedUserIds.length} user(s) notified`
        : 'Note added successfully';
      showSuccess(successMsg);
    } catch (err: any) {
      showError(err.message || 'Failed to add note');
    } finally {
      setIsAddingContactNote(false);
    }
  };

  const confirmDeleteContactNote = async () => {
    if (!selectedContact || !currentUser || !contactNoteToDelete) return;

    try {
      setDeletingContactNoteId(contactNoteToDelete);

      const updatedNotes = selectedContact.notes?.filter(note => note.id !== contactNoteToDelete) || [];

      await updateContactMutation.mutateAsync({ 
        id: selectedContact.id, 
        updates: { notes: updatedNotes } 
      });

      setSelectedContact({
        ...selectedContact,
        notes: updatedNotes
      });

      queryClient.invalidateQueries({ queryKey: ['contacts'] });

      showSuccess('Note deleted successfully');
      setContactNoteToDelete(null);
    } catch (err: any) {
      showError(err.message || 'Failed to delete note');
    } finally {
      setDeletingContactNoteId(null);
    }
  };

  // Helper function to check if company has deals
  // Memoize hasDeals function to avoid recalculation on every render
  const hasDeals = useCallback((companyId: string) => {
    return deals.some(d => d.companyId === companyId);
  }, [deals]);

  // Filter companies based on selected filters (multiple selections allowed)
  // Memoize filtered companies to avoid recalculation on every render
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      // Target account filter - if filters selected, must match at least one
      if (targetAccountFilters.length > 0) {
        const matchesTarget = targetAccountFilters.includes('target') && company.isTargetAccount;
        const matchesNonTarget = targetAccountFilters.includes('non-target') && !company.isTargetAccount;
        if (!matchesTarget && !matchesNonTarget) return false;
      }

      // Assigned filter - if filters selected, must match at least one
      if (assignedFilters.length > 0) {
        const matchesAssigned = assignedFilters.includes('assigned') && company.ownerId;
        const matchesUnassigned = assignedFilters.includes('unassigned') && !company.ownerId;
        if (!matchesAssigned && !matchesUnassigned) return false;
      }

      // Deals filter - if filters selected, must match at least one
      if (dealsFilters.length > 0) {
        const matchesHasDeals = dealsFilters.includes('has-deals') && hasDeals(company.id);
        const matchesNoDeals = dealsFilters.includes('no-deals') && !hasDeals(company.id);
        if (!matchesHasDeals && !matchesNoDeals) return false;
      }

      return true;
    });
  }, [companies, targetAccountFilters, assignedFilters, dealsFilters, hasDeals]);

  // Filter contacts by company when a company filter is active (e.g. from Company Record page)
  const filteredContactsByCompany = useMemo(() => {
    if (!companyFilterId) return contacts;
    return contacts.filter((c: Contact) => c.companyId === companyFilterId);
  }, [contacts, companyFilterId]);

  // Derived list and pagination for current view (companies vs contacts)
  const allItemsForCurrentView = view === 'companies' ? filteredCompanies : filteredContactsByCompany;
  const totalItemsForCurrentView = allItemsForCurrentView.length;
  const paginatedItemsForCurrentView = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return allItemsForCurrentView.slice(startIndex, endIndex);
  }, [allItemsForCurrentView, currentPage, pageSize]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => 
    targetAccountFilters.length > 0 || assignedFilters.length > 0 || dealsFilters.length > 0,
    [targetAccountFilters, assignedFilters, dealsFilters]
  );

  // Clear all filters
  const clearAllFilters = () => {
    setTargetAccountFilters([]);
    setAssignedFilters([]);
    setDealsFilters([]);
  };

  // Toggle filter option
  const toggleFilter = (category: 'target' | 'assigned' | 'deals', value: string) => {
    if (category === 'target') {
      setTargetAccountFilters(prev => 
        prev.includes(value) 
          ? prev.filter(f => f !== value)
          : [...prev, value]
      );
    } else if (category === 'assigned') {
      setAssignedFilters(prev => 
        prev.includes(value) 
          ? prev.filter(f => f !== value)
          : [...prev, value]
      );
    } else if (category === 'deals') {
      setDealsFilters(prev => 
        prev.includes(value) 
          ? prev.filter(f => f !== value)
          : [...prev, value]
      );
    }
  };

  // Multi-select handlers
  const selectAllCompanies = () => {
    // Use filtered companies for select all
    if (selectedCompanyIds.length === filteredCompanies.length && filteredCompanies.length > 0) {
      setSelectedCompanyIds([]);
    } else {
      setSelectedCompanyIds(filteredCompanies.map(c => c.id));
    }
  };

  const selectAllContacts = () => {
    if (selectedContactIds.length === contacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(contacts.map(c => c.id));
    }
  };

  const handleBulkDeleteCompanies = async () => {
    setIsBulkDeletingCompanies(true);
    try {
      const targetIds = [...selectedCompanyIds];
      await bulkDeleteCompaniesMutation.mutateAsync(targetIds);
      if (selectedCompany && targetIds.includes(selectedCompany.id)) {
        setSelectedCompany(null);
        setIsEditingCompany(false);
      }
      // Only clear selection and close modal AFTER successful deletion
      setSelectedCompanyIds([]);
      setItemsToDelete({ companies: [], contacts: [] });
      setBulkDeleteConfirmOpen(null);
      showSuccess(`Successfully deleted ${targetIds.length} compan${targetIds.length > 1 ? 'ies' : 'y'}`);
    } catch (err: any) {
      showError(err.message || 'Failed to delete companies');
      // Don't clear selection or close modal on error - let user retry or cancel
    } finally {
      setIsBulkDeletingCompanies(false);
    }
  };

  const handleBulkDeleteContacts = async () => {
    setIsBulkDeletingContacts(true);
    try {
      const targetIds = [...selectedContactIds];
      await bulkDeleteContactsMutation.mutateAsync(targetIds);
      if (selectedContact && targetIds.includes(selectedContact.id)) {
        setSelectedContact(null);
        setIsEditingContact(false);
      }
      // Only clear selection and close modal AFTER successful deletion
      setSelectedContactIds([]);
      setItemsToDelete({ companies: [], contacts: [] });
      setBulkDeleteConfirmOpen(null);
      showSuccess(`Successfully deleted ${targetIds.length} contact${targetIds.length > 1 ? 's' : ''}`);
    } catch (err: any) {
      showError(err.message || 'Failed to delete contacts');
      // Don't clear selection or close modal on error - let user retry or cancel
    } finally {
      setIsBulkDeletingContacts(false);
    }
  };

  const handleBulkMarkAsTargetAccount = async () => {
    if (selectedCompanyIds.length === 0) return;
    
    setIsBulkMarkingTargetAccount(true);
    try {
      const targetIds = [...selectedCompanyIds];
      // Mark all selected companies as target accounts
      await bulkUpdateCompaniesMutation.mutateAsync({ 
        ids: targetIds, 
        updates: { isTargetAccount: true } 
      });
      
      // Update selected company if it's in the list
      if (selectedCompany && targetIds.includes(selectedCompany.id)) {
        setSelectedCompany({ ...selectedCompany, isTargetAccount: true });
      }
      
      setSelectedCompanyIds([]);
      showSuccess(`Successfully marked ${targetIds.length} compan${targetIds.length > 1 ? 'ies' : 'y'} as target account${targetIds.length > 1 ? 's' : ''}`);
    } catch (err: any) {
      showError(err.message || 'Failed to mark companies as target accounts');
    } finally {
      setIsBulkMarkingTargetAccount(false);
    }
  };

  const handleBulkUnmarkAsTargetAccount = async () => {
    if (selectedCompanyIds.length === 0) return;
    
    setIsBulkUnmarkingTargetAccount(true);
    try {
      const targetIds = [...selectedCompanyIds];
      // Unmark all selected companies as target accounts
      await bulkUpdateCompaniesMutation.mutateAsync({ 
        ids: targetIds, 
        updates: { isTargetAccount: false } 
      });
      
      // Update selected company if it's in the list
      if (selectedCompany && targetIds.includes(selectedCompany.id)) {
        setSelectedCompany({ ...selectedCompany, isTargetAccount: false });
      }
      
      setSelectedCompanyIds([]);
      showSuccess(`Successfully unmarked ${targetIds.length} compan${targetIds.length > 1 ? 'ies' : 'y'} as target account${targetIds.length > 1 ? 's' : ''}`);
    } catch (err: any) {
      showError(err.message || 'Failed to unmark companies as target accounts');
    } finally {
      setIsBulkUnmarkingTargetAccount(false);
    }
  };

  const handleAiInsightLookup = async () => {
    if (!selectedCompany) return;
    // AI functionality is currently unavailable
    showError('AI Intelligence feature is not available. Please install @google/genai package to enable this feature.');
  };

  const getCompanyDealsCount = (companyId: string) => {
    return deals.filter(d => d.companyId === companyId && d.stage !== 'Won' && d.stage !== 'Lost').length;
  };

  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return 'Unassigned';
    return users.find(u => u.id === ownerId)?.name || 'Unknown';
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">CRM</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            <button 
              onClick={() => {
                setView('companies');
                setCompanyFilterId(null);
                setSelectedCompanyIds([]);
                setSelectedContactIds([]);
              }} 
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors whitespace-nowrap ${view === 'companies' ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Companies ({view === 'companies' ? filteredCompanies.length : companies.length})
            </button>
            <button 
              onClick={() => {
                setView('contacts');
                setCompanyFilterId(null);
                setSelectedCompanyIds([]);
                setSelectedContactIds([]);
              }} 
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors whitespace-nowrap ${view === 'contacts' ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Contacts ({view === 'contacts' && companyFilterId ? filteredContactsByCompany.length : contacts.length})
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className="px-2 sm:px-3 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 hover:bg-slate-200 transition-all shadow-sm disabled:opacity-50 shrink-0"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isManualRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowCompanyUploadWizard(true)}
            className="px-3 sm:px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 hover:bg-slate-200 transition-all shadow-sm shrink-0"
            title={`Upload ${view === 'companies' ? 'companies' : 'contacts'} from CSV, Excel, or Google Sheets`}
          >
            <Upload className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Upload</span>
          </button>
          <button onClick={() => view === 'companies' ? onAddCompany() : onAddContact()} className="px-3 sm:px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 hover:bg-indigo-700 transition-all shadow-sm shrink-0">
            <Plus className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Add {view === 'companies' ? 'Company' : 'Contact'}</span>
          </button>
          {view === 'contacts' && (
            <>
              <button 
                onClick={() => setIsBusinessCardScannerOpen(true)} 
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 hover:bg-blue-700 transition-all shadow-sm shrink-0"
                title="Scan Business Card"
              >
                <Scan className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">Scan Card</span>
              </button>
              <button 
                onClick={() => setIsLinkedInScannerOpen(true)} 
                className="px-3 sm:px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 hover:bg-blue-800 transition-all shadow-sm shrink-0"
                title="Import from LinkedIn"
              >
                <Linkedin className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">LinkedIn</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-6 w-full min-w-0">
        {/* Phase 4: Saved Views Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          <button
            onClick={() => {
              setActiveSavedViewId(null);
              // Reset filters/sort when switching to "All"
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeSavedViewId === null
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All {view === 'companies' ? 'Companies' : 'Contacts'}
          </button>
          {savedViews.map((savedView) => (
            <button
              key={savedView.id}
              onClick={() => {
                setActiveSavedViewId(savedView.id);
                // TODO: Apply filters, sort, and columns from saved view
              }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                activeSavedViewId === savedView.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {savedView.name}
            </button>
          ))}
          <button
            onClick={() => setIsCreatingSavedView(true)}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            New View
          </button>
        </div>
        
        {/* Search Bar, Active Filters, and View Toggle */}
        <div className="flex flex-col gap-2 w-full min-w-0">
          <div className="flex items-center gap-3 w-full">
          <div className="relative group flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors shrink-0" />
            <input 
              type="text" 
              placeholder={`Search ${view}...`} 
              value={localSearchQuery} 
              onChange={(e) => {
                setLocalSearchQuery(e.target.value);
                // Phase 8: Reset to page 1 on search change
                setCurrentPage(1);
              }} 
              className="w-full min-w-0 pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all" 
            />
            {/* Phase 8: Clear button */}
            {localSearchQuery && (
              <button
                onClick={() => {
                  setLocalSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
            {/* Phase 8: Loading indicator */}
            {(isLoadingCompanies || isLoadingContacts) && !localSearchQuery && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600 animate-spin" />
            )}
          </div>
          {companyFilterId && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold uppercase tracking-wide">Active filter:</span>
              <button
                onClick={() => {
                  setCompanyFilterId(null);
                  // Clean URL params if present
                  try {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('crmCompanyId');
                    url.searchParams.delete('crmView');
                    window.history.replaceState({}, '', url.toString());
                  } catch {
                    // ignore if URL parsing fails
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-700 border border-indigo-100 hover:bg-indigo-100"
              >
                <span>{activeCompanyFilterName || 'Company contacts only'}</span>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
          {/* Phase 8: Column Customizer Button */}
          <div className="relative">
            <button
              onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 transition-all flex items-center gap-2 shrink-0"
              title="Customize columns"
            >
              <Settings2 className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-700 hidden sm:inline">Columns</span>
            </button>
            {showColumnCustomizer && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <ColumnCustomizer
                  columns={view === 'contacts' ? contactColumns : companyColumns}
                  onColumnsChange={(cols) => {
                    if (view === 'contacts') {
                      setContactColumns(cols);
                      localStorage.setItem('crm_contact_columns', JSON.stringify(cols));
                    } else {
                      setCompanyColumns(cols);
                      localStorage.setItem('crm_company_columns', JSON.stringify(cols));
                    }
                  }}
                  onReset={() => {
                    const defaultContactCols: ColumnDefinition[] = [
                      { key: 'name', label: 'Name', locked: true, visible: true, order: 0 },
                      { key: 'email', label: 'Email', visible: true, order: 1 },
                      { key: 'organization', label: 'Organization', visible: true, order: 2 },
                      { key: 'phone', label: 'Phone', visible: true, order: 3 },
                      { key: 'role', label: 'Role', visible: true, order: 4 },
                      { key: 'tags', label: 'Tags', visible: true, order: 5 },
                      { key: 'assignee', label: 'Assignee', visible: true, order: 6 },
                      { key: 'domain', label: 'Domain', visible: true, order: 7 },
                      { key: 'created', label: 'Created', visible: false, order: 8 },
                    ];
                    const defaultCompanyCols: ColumnDefinition[] = [
                      { key: 'name', label: 'Name', locked: true, visible: true, order: 0 },
                      { key: 'domain', label: 'Domain', visible: true, order: 1 },
                      { key: 'industry', label: 'Industry', visible: true, order: 2 },
                      { key: 'region', label: 'Region', visible: true, order: 3 },
                      { key: 'accountManager', label: 'Account Manager', visible: true, order: 4 },
                      { key: 'status', label: 'Status', visible: true, order: 5 },
                      { key: 'contactCount', label: 'Contact Count', visible: true, order: 6 },
                      { key: 'tags', label: 'Tags', visible: true, order: 7 },
                      { key: 'npsScore', label: 'NPS Score', visible: true, order: 8 },
                    ];
                    if (view === 'contacts') {
                      setContactColumns(defaultContactCols);
                      localStorage.removeItem('crm_contact_columns');
                    } else {
                      setCompanyColumns(defaultCompanyCols);
                      localStorage.removeItem('crm_company_columns');
                    }
                  }}
                  entityType={view}
                />
              </div>
            )}
          </div>
          {/* Phase 2: View Toggle */}
          <div className="flex bg-white p-1 border border-slate-200 rounded-xl shadow-sm shrink-0">
            <button 
              onClick={() => setDisplayMode('list')} 
              className={`p-2 rounded-lg transition-colors ${displayMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setDisplayMode('card')} 
              className={`p-2 rounded-lg transition-colors ${displayMode === 'card' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Card View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Load error banner */}
        {(view === 'companies' && isCompaniesError) || (view === 'contacts' && isContactsError) ? (
          <div className="flex items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800">
              {view === 'companies' ? 'Companies' : 'Contacts'} could not be loaded. Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => { view === 'companies' ? refetchCompanies() : refetchContacts(); }}
              className="shrink-0 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : null}

        {/* Select All Header */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pb-2 min-w-0">
          <input 
            type="checkbox" 
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 shrink-0"
            disabled={isLoading}
            checked={
              view === 'companies' 
                ? filteredCompanies.length > 0 && selectedCompanyIds.length === filteredCompanies.length && filteredCompanies.every(c => selectedCompanyIds.includes(c.id))
                : contacts.length > 0 && selectedContactIds.length === contacts.length
            }
            onChange={view === 'companies' ? selectAllCompanies : selectAllContacts}
          />
          <span className="text-sm font-semibold text-slate-600 truncate">
            Select All {view === 'companies' ? 'Companies' : 'Contacts'}
          </span>
        </div>

        {/* Filters and Count Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 min-w-0">
          {view === 'companies' ? (
            <>
              <button
                onClick={() => setIsFilterPopupOpen(true)}
                disabled={isLoading}
                className={`px-3 sm:px-4 py-2 rounded-xl border-2 transition-all flex items-center gap-2 w-fit shrink-0 ${
                  hasActiveFilters
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Filter className="w-4 h-4 shrink-0" />
                <span className="text-sm font-bold">Filters</span>
                {hasActiveFilters && (
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">
                    {targetAccountFilters.length + assignedFilters.length + dealsFilters.length}
                  </span>
                )}
              </button>
              <div className="text-xs text-slate-400 font-bold min-w-0 sm:text-right break-words">
                {isLoading ? 'Loading...' : `Showing ${filteredCompanies.length} of ${companies.length} companies`}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 font-bold min-w-0 text-right">
              {isLoading ? 'Loading...' : `Showing ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`}
            </div>
          )}
        </div>

          {/* Filter Popup Modal */}
          {isFilterPopupOpen && view === 'companies' && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                      <Filter className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-lg sm:text-xl text-slate-900 truncate">Filter Companies</h3>
                      <p className="text-xs text-slate-400 font-medium hidden sm:block">Select multiple filters to refine your search</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFilterPopupOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Filter Options */}
                <div className="p-4 sm:p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Target Account Filter */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Target Account
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={targetAccountFilters.includes('target')}
                          onChange={() => toggleFilter('target', 'target')}
                          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Target className="w-4 h-4 text-amber-500" />
                          <span className="font-bold text-slate-900">Target Account</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {companies.filter(c => c.isTargetAccount).length} companies
                        </span>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={targetAccountFilters.includes('non-target')}
                          onChange={() => toggleFilter('target', 'non-target')}
                          className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <span className="font-bold text-slate-900">Standard Account</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {companies.filter(c => !c.isTargetAccount).length} companies
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Assigned Filter */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Assignment
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={assignedFilters.includes('assigned')}
                          onChange={() => toggleFilter('assigned', 'assigned')}
                          className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <UserCheck className="w-4 h-4 text-green-600" />
                          <span className="font-bold text-slate-900">Assigned</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {companies.filter(c => c.ownerId).length} companies
                        </span>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={assignedFilters.includes('unassigned')}
                          onChange={() => toggleFilter('assigned', 'unassigned')}
                          className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Circle className="w-4 h-4 text-orange-500" />
                          <span className="font-bold text-slate-900">Unassigned</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {companies.filter(c => !c.ownerId).length} companies
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Deals Filter */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Deals
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={dealsFilters.includes('has-deals')}
                          onChange={() => toggleFilter('deals', 'has-deals')}
                          className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Briefcase className="w-4 h-4 text-purple-600" />
                          <span className="font-bold text-slate-900">Has Deals</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {companies.filter(c => hasDeals(c.id)).length} companies
                        </span>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={dealsFilters.includes('no-deals')}
                          onChange={() => toggleFilter('deals', 'no-deals')}
                          className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          <span className="font-bold text-slate-900">No Deals</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {companies.filter(c => !hasDeals(c.id)).length} companies
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={clearAllFilters}
                    disabled={!hasActiveFilters}
                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear All Filters
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-bold">
                      {filteredCompanies.length} of {companies.length} companies
                    </span>
                    <button
                      onClick={() => setIsFilterPopupOpen(false)}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Phase 2: Table View or Card Grid */}
        {displayMode === 'list' ? (
          /* Table View */
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        checked={
                          view === 'companies' 
                            ? filteredCompanies.length > 0 && selectedCompanyIds.length === filteredCompanies.length && filteredCompanies.every(c => selectedCompanyIds.includes(c.id))
                            : contacts.length > 0 && selectedContactIds.length === contacts.length
                        }
                        onChange={view === 'companies' ? selectAllCompanies : selectAllContacts}
                        disabled={isLoading}
                      />
                    </th>
                    {view === 'companies' ? (
                      <>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Domain</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Industry</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Region</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Manager</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Count</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tags</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">NPS Score</th>
                        <th className="px-6 py-4 text-right"></th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tags</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignee</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Domain</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Consent</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</th>
                        <th className="px-6 py-4 text-right"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    <tr><td colSpan={view === 'companies' ? 11 : 12} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></td></tr>
                  ) : totalItemsForCurrentView === 0 ? (
                    <tr><td colSpan={view === 'companies' ? 11 : 12} className="py-10 text-center text-slate-400 text-sm font-medium">No {view} found.</td></tr>
                  ) : paginatedItemsForCurrentView.map((item: Company | Contact) => {
                    const isSelected = view === 'companies' 
                      ? selectedCompanyIds.includes(item.id)
                      : selectedContactIds.includes(item.id);
                    
                    if (view === 'companies') {
                      const company = item as Company;
                      const owner = users.find(u => u.id === company.ownerId);
                      return (
                        <tr 
                          key={company.id} 
                          onClick={() => navigateToRecord('company', company.id)}
                          className={`group transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                        >
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                              checked={isSelected}
                              onChange={() => setSelectedCompanyIds(prev => isSelected ? prev.filter(id => id !== company.id) : [...prev, company.id])}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <ImageWithFallback src={company.logo} fallbackText={company.name} className="w-8 h-8 border border-slate-100 rounded-lg" isAvatar={false} />
                              <div>
                                <p className="text-sm font-bold text-slate-900" title={company.name}>
                                  {formatNameForDisplay(company.name) || '-'}
                                </p>
                                {company.isTargetAccount && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded">
                                    <Target className="w-2.5 h-2.5" /> Target
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{company.domain || '-'}</td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <EditableCell
                              value={company.industry || ''}
                              onSave={async (newValue) => await handleInlineCellSave('industry', newValue, company.id, 'company')}
                              type="text"
                              placeholder="Industry"
                              className="text-sm"
                            />
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <EditableCell
                              value={company.region || ''}
                              onSave={async (newValue) => await handleInlineCellSave('region', newValue || null, company.id, 'company')}
                              type="select"
                              options={[
                                { value: '', label: 'No Region' },
                                { value: 'North America', label: 'North America' },
                                { value: 'South America', label: 'South America' },
                                { value: 'Europe', label: 'Europe' },
                                { value: 'Asia', label: 'Asia' },
                                { value: 'Africa', label: 'Africa' },
                                { value: 'Middle East', label: 'Middle East' },
                                { value: 'Oceania', label: 'Oceania' },
                                { value: 'Central America', label: 'Central America' },
                                { value: 'Caribbean', label: 'Caribbean' },
                                { value: 'Eastern Europe', label: 'Eastern Europe' },
                                { value: 'Western Europe', label: 'Western Europe' },
                                { value: 'Northern Europe', label: 'Northern Europe' },
                                { value: 'Southern Europe', label: 'Southern Europe' },
                                { value: 'Southeast Asia', label: 'Southeast Asia' },
                                { value: 'East Asia', label: 'East Asia' },
                                { value: 'South Asia', label: 'South Asia' },
                                { value: 'Central Asia', label: 'Central Asia' },
                                { value: 'North Africa', label: 'North Africa' },
                                { value: 'Sub-Saharan Africa', label: 'Sub-Saharan Africa' },
                                { value: 'Latin America', label: 'Latin America' },
                                { value: 'United States', label: 'United States' },
                                { value: 'Canada', label: 'Canada' },
                                { value: 'Mexico', label: 'Mexico' },
                                { value: 'United Kingdom', label: 'United Kingdom' },
                                { value: 'Germany', label: 'Germany' },
                                { value: 'France', label: 'France' },
                                { value: 'Italy', label: 'Italy' },
                                { value: 'Spain', label: 'Spain' },
                                { value: 'Netherlands', label: 'Netherlands' },
                                { value: 'Belgium', label: 'Belgium' },
                                { value: 'Switzerland', label: 'Switzerland' },
                                { value: 'Austria', label: 'Austria' },
                                { value: 'Sweden', label: 'Sweden' },
                                { value: 'Norway', label: 'Norway' },
                                { value: 'Denmark', label: 'Denmark' },
                                { value: 'Finland', label: 'Finland' },
                                { value: 'Poland', label: 'Poland' },
                                { value: 'Russia', label: 'Russia' },
                                { value: 'China', label: 'China' },
                                { value: 'Japan', label: 'Japan' },
                                { value: 'India', label: 'India' },
                                { value: 'South Korea', label: 'South Korea' },
                                { value: 'Singapore', label: 'Singapore' },
                                { value: 'Australia', label: 'Australia' },
                                { value: 'New Zealand', label: 'New Zealand' },
                                { value: 'Brazil', label: 'Brazil' },
                                { value: 'Argentina', label: 'Argentina' },
                                { value: 'Chile', label: 'Chile' },
                                { value: 'United Arab Emirates', label: 'United Arab Emirates' },
                                { value: 'Saudi Arabia', label: 'Saudi Arabia' },
                                { value: 'Israel', label: 'Israel' },
                                { value: 'South Africa', label: 'South Africa' },
                                { value: 'Global', label: 'Global' },
                                { value: 'International', label: 'International' }
                              ]}
                              className="text-sm"
                            />
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <EditableCell
                              value={company.ownerId || ''}
                              displayValue={owner?.name ? formatNameForDisplay(owner.name) : 'Unassigned'}
                              onSave={async (newValue) => await handleInlineCellSave('ownerId', newValue || null, company.id, 'company')}
                              type="select"
                              options={[
                                { value: '', label: 'Unassigned' },
                                ...users.map(u => ({ value: u.id, label: formatNameForDisplay(u.name) }))
                              ]}
                              className="text-sm"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700">
                              {company.status || 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{company.contactCount || 0}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(company.tags || []).length > 0 ? (
                                (company.tags || []).slice(0, 3).map((tagId: string) => {
                                  const tag = tagsMap.get(tagId);
                                  if (!tag) return null;
                                  return (
                                    <span 
                                      key={tagId} 
                                      className="px-2 py-0.5 text-xs font-semibold rounded text-white"
                                      style={{ backgroundColor: tag.color }}
                                    >
                                      {tag.name}
                                    </span>
                                  );
                                }).filter(Boolean)
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                              {(company.tags || []).length > 3 && (
                                <span className="text-xs text-slate-400">+{(company.tags || []).length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{company.npsScore || '-'}</td>
                          <td className="px-6 py-4 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                          </td>
                        </tr>
                      );
                    } else {
                      const contact = item as Contact;
                      const company = companies.find(c => c.id === contact.companyId);
                      const assignee = users.find(u => u.id === contact.assigneeId);

                      const consentStatus = contact.contact_compliance?.consent_status || 'pending';
                      const consentLabel =
                        consentStatus === 'granted'
                          ? 'Granted'
                          : consentStatus === 'withdrawn'
                          ? 'Withdrawn'
                          : consentStatus === 'not_required'
                          ? 'Not Required'
                          : 'Pending';
                      const consentClass =
                        consentStatus === 'granted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : consentStatus === 'withdrawn'
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : consentStatus === 'not_required'
                          ? 'bg-slate-50 text-slate-600 border-slate-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100';

                      return (
                        <tr 
                          key={contact.id} 
                          onClick={() => navigateToRecord('contact', contact.id)}
                          className={`group transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'} ${(contact as Contact).contact_compliance?.processing_restricted ? 'bg-slate-100/80' : ''}`}
                        >
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                              checked={isSelected}
                              onChange={() => setSelectedContactIds(prev => isSelected ? prev.filter(id => id !== contact.id) : [...prev, contact.id])}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {(contact as Contact).contact_compliance?.processing_restricted && (
                                <Lock className="w-4 h-4 text-slate-500 shrink-0" title="Processing restricted — read-only" />
                              )}
                              <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                                {formatNameForDisplay(contact.name).charAt(0) || '?'}
                              </div>
                              <p className="text-sm font-bold text-slate-900" title={contact.name}>
                                {formatNameForDisplay(contact.name) || '-'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{contact.email || '-'}</td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <EditableCell
                              value={contact.companyId || ''}
                              displayValue={company?.name || contact.organization || '-'}
                              onSave={async (selectedCompanyId) => {
                                const selectedCompany = companies.find(c => c.id === selectedCompanyId);
                                await handleInlineCellSave('companyId', selectedCompanyId || null, contact.id, 'contact');
                                if (selectedCompany) {
                                  await handleInlineCellSave('organization', selectedCompany.name, contact.id, 'contact');
                                } else {
                                  await handleInlineCellSave('organization', null, contact.id, 'contact');
                                }
                              }}
                              type="select"
                              options={[
                                { value: '', label: 'No Organization' },
                                ...companies.map(c => ({ value: c.id, label: c.name }))
                              ]}
                              className="text-sm"
                              disabled={(contact as Contact).contact_compliance?.processing_restricted}
                            />
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <EditableCell
                              value={contact.phone || ''}
                              onSave={async (newValue) => await handleInlineCellSave('phone', newValue, contact.id, 'contact')}
                              type="tel"
                              placeholder="Phone"
                              className="text-sm"
                              disabled={(contact as Contact).contact_compliance?.processing_restricted}
                            />
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <EditableCell
                              value={contact.role || ''}
                              onSave={async (newValue) => await handleInlineCellSave('role', newValue, contact.id, 'contact')}
                              type="text"
                              placeholder="Role"
                              className="text-sm"
                              disabled={(contact as Contact).contact_compliance?.processing_restricted}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(contact.tags || []).length > 0 ? (
                                (contact.tags || []).slice(0, 3).map((tagId: string) => {
                                  const tag = tagsMap.get(tagId);
                                  if (!tag) return null;
                                  return (
                                    <span 
                                      key={tagId} 
                                      className="px-2 py-0.5 text-xs font-semibold rounded text-white"
                                      style={{ backgroundColor: tag.color }}
                                    >
                                      {tag.name}
                                    </span>
                                  );
                                }).filter(Boolean)
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                              {(contact.tags || []).length > 3 && (
                                <span className="text-xs text-slate-400">+{(contact.tags || []).length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <EditableCell
                              value={contact.assigneeId || ''}
                              displayValue={assignee?.name ? formatNameForDisplay(assignee.name) : 'Unassigned'}
                              onSave={async (newValue) => await handleInlineCellSave('assigneeId', newValue || null, contact.id, 'contact')}
                              type="select"
                              options={[
                                { value: '', label: 'Unassigned' },
                                ...users.map(u => ({ value: u.id, label: formatNameForDisplay(u.name) }))
                              ]}
                              className="text-sm"
                              disabled={(contact as Contact).contact_compliance?.processing_restricted}
                            />
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{contact.domain || '-'}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${consentClass}`}>
                              {consentLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 min-h-[600px] w-full min-w-0 items-start">
          {isLoading ? (
            // Show skeleton cards while loading - exact same dimensions as real cards
            Array.from({ length: 8 }).map((_, index) => (
              <div 
                key={`skeleton-${index}`}
                className={`bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse flex flex-col ${
                  view === 'companies' ? 'p-6' : 'p-5 h-[220px]'
                }`}
              >
                {view === 'companies' ? (
                  // Company skeleton - matches real company card structure
                  <>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-200 rounded"></div>
                        <div className="h-3 bg-slate-200 rounded flex-1"></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-200 rounded"></div>
                        <div className="h-3 bg-slate-200 rounded flex-1"></div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                      <div className="w-4 h-4 bg-slate-200 rounded"></div>
                    </div>
                  </>
                ) : (
                  // Contact skeleton - matches real contact card structure (220px height)
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 bg-slate-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-200 rounded"></div>
                        <div className="h-3 bg-slate-200 rounded flex-1"></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-200 rounded"></div>
                        <div className="h-3 bg-slate-200 rounded flex-1"></div>
                      </div>
                    </div>
                    <div className="pt-3 mt-auto border-t border-slate-100">
                      <div className="h-8 bg-slate-200 rounded-xl w-full"></div>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            view === 'companies' ? (
                filteredCompanies.map(company => {
              const owner = users.find(u => u.id === company.ownerId);
              const isSelected = selectedCompanyIds.includes(company.id);
              return (
                <div 
                  key={company.id} 
                  onClick={() => navigateToRecord('company', company.id)} 
                  className={`bg-white p-6 rounded-2xl border ${isSelected ? 'border-indigo-400 bg-indigo-50/30' : company.isTargetAccount ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]' : 'border-slate-200'} hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col relative`}
                >
                  {company.isTargetAccount && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded shadow-sm flex items-center gap-1 whitespace-nowrap"><Target className="w-2.5 h-2.5" /> Target Account</div>}
                  <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      checked={isSelected}
                      onChange={() => setSelectedCompanyIds(prev => isSelected ? prev.filter(id => id !== company.id) : [...prev, company.id])}
                    />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <ImageWithFallback src={company.logo} fallbackText={company.name} className="w-12 h-12 border border-slate-100" isAvatar={false} />
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-indigo-600 transition-colors" title={company.name}>
                        {formatNameForDisplay(company.name) || '-'}
                      </h3>
                      <p className="text-slate-500 text-xs font-bold uppercase">{company.industry}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /><span className="truncate">{company.website || 'No website'}</span></div>
                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /><span className="truncate font-medium">{owner?.name ? formatNameForDisplay(owner.name) : 'Unassigned'}</span></div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getCompanyDealsCount(company.id)} Active Deals</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              );
            })
          ) : (
            contacts.map(contact => {
              const company = companies.find(c => c.id === contact.companyId);
              const isSelected = selectedContactIds.includes(contact.id);
              return (
                <div 
                  key={contact.id}
                  onClick={() => navigateToRecord('contact', contact.id)} 
                  className={`bg-white p-5 rounded-2xl border ${isSelected ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200'} hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group shadow-sm relative flex flex-col h-[220px]`}
                >
                  {(contact as Contact).contact_compliance?.processing_restricted && (
                    <>
                      <div className="absolute inset-0 bg-slate-400/30 rounded-2xl pointer-events-none z-10" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center gap-1">
                        <Lock className="w-8 h-8 text-slate-600 drop-shadow" />
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Read-only</span>
                      </div>
                    </>
                  )}
                  <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      checked={isSelected}
                      onChange={() => setSelectedContactIds(prev => isSelected ? prev.filter(id => id !== contact.id) : [...prev, contact.id])}
                    />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg uppercase shadow-inner">
                      {formatNameForDisplay(contact.name).charAt(0) || '?'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-base text-slate-900 truncate" title={contact.name}>
                        {formatNameForDisplay(contact.name) || '-'}
                      </h3>
                      <p className="text-slate-500 text-[11px] font-bold uppercase truncate">{contact.role} @ {formatNameForDisplay(company?.name) || 'Partner'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600 flex-1">
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /><span className="truncate text-indigo-600 text-[13px]">{contact.email}</span></div>
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /><span className="text-[13px]">{contact.phone}</span></div>
                  </div>
                  {contact.linkedin && (
                    <div className="pt-3 mt-auto border-t border-slate-100">
                      <a 
                        href={contact.linkedin} 
                        target="_blank" 
                        rel="noreferrer" 
                        onClick={(e) => e.stopPropagation()}
                        className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
          </div>
        )}

        {/* Phase 2: Pagination */}
        {!isLoading && totalItemsForCurrentView > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 font-medium">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalItemsForCurrentView)} - {Math.min(currentPage * pageSize, totalItemsForCurrentView)} of {totalItemsForCurrentView}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as 25 | 50 | 100);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm font-semibold text-slate-700">
                Page {currentPage} of {Math.ceil(totalItemsForCurrentView / pageSize) || 1}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItemsForCurrentView / pageSize) || 1, prev + 1))}
                disabled={currentPage >= Math.ceil(totalItemsForCurrentView / pageSize)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Phase 2: Enhanced Bulk Action Bar */}
      {((view === 'companies' && selectedCompanyIds.length > 0) || (view === 'contacts' && selectedContactIds.length > 0)) && (
        <div className="fixed bottom-6 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300 max-w-2xl sm:max-w-none mx-auto">
          <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl shadow-2xl px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-8 border border-white/10 ring-4 ring-indigo-500/10">
            <span className="text-sm font-black flex items-center gap-3 shrink-0">
              <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[10px]">
                {view === 'companies' ? selectedCompanyIds.length : selectedContactIds.length}
              </div>
              Selected
            </span>
            {view === 'contacts' && selectedContactConsentStats.total > 0 && (
              <span className="text-xs text-slate-300 font-medium">
                {selectedContactConsentStats.withConsent} of {selectedContactConsentStats.total} have valid consent for outreach.
                {selectedContactConsentStats.withoutConsent > 0 && ` ${selectedContactConsentStats.withoutConsent} will be excluded from email/campaigns.`}
              </span>
            )}
            <div className="hidden sm:block h-8 w-px bg-white/10 shrink-0" />
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
              {/* Phase 2: Assign Owner */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation();
                  // TODO: Open assign owner modal/dropdown
                  showInfo('Assign owner feature - coming soon');
                }}
                className="px-3 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 shrink-0"
                title="Assign Owner"
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Assign Owner</span>
              </button>
              {view === 'companies' && (
                <>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleBulkMarkAsTargetAccount();
                    }}
                    disabled={isBulkMarkingTargetAccount || isBulkUnmarkingTargetAccount}
                    className="px-3 sm:px-5 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 shrink-0"
                  >
                    {isBulkMarkingTargetAccount ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Target className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="whitespace-nowrap">Mark Target</span>
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleBulkUnmarkAsTargetAccount();
                    }}
                    disabled={isBulkMarkingTargetAccount || isBulkUnmarkingTargetAccount}
                    className="px-3 sm:px-5 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 shrink-0"
                  >
                    {isBulkUnmarkingTargetAccount ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="whitespace-nowrap">Unmark Target</span>
                  </button>
                </>
              )}
              {/* Phase 2: Edit Field (placeholder - full implementation in Phase 3) */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation();
                  showInfo('Edit field feature - coming in Phase 3');
                }}
                className="px-3 sm:px-5 py-2 bg-slate-600 hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 shrink-0"
                title="Edit Field"
              >
                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Edit Field</span>
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation();
                  // Store items to delete before opening modal so they don't disappear during deletion
                  if (view === 'companies') {
                    setItemsToDelete({
                      companies: companies.filter(c => selectedCompanyIds.includes(c.id)),
                      contacts: []
                    });
                  } else {
                    setItemsToDelete({
                      companies: [],
                      contacts: contacts.filter(c => selectedContactIds.includes(c.id))
                    });
                  }
                  setBulkDeleteConfirmOpen(view);
                }}
                disabled={view === 'companies' ? isBulkDeletingCompanies : isBulkDeletingContacts}
                className="px-3 sm:px-5 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 shrink-0"
              >
                {(view === 'companies' ? isBulkDeletingCompanies : isBulkDeletingContacts) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                )}
                Delete
              </button>
              <button 
                onClick={() => {
                  if (view === 'companies') setSelectedCompanyIds([]);
                  else setSelectedContactIds([]);
                }} 
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors shrink-0 ml-auto sm:ml-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Detail Drawer */}
      {selectedCompany && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={closeCompanyDrawer} />
          <div className="absolute right-0 inset-y-0 w-full max-w-2xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <ImageWithFallback src={selectedCompany.logo} fallbackText={selectedCompany.name} className="w-12 h-12 border border-slate-200" isAvatar={false} />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedCompany.name}</h2>
                    <button onClick={() => handleUpdateCompany({ isTargetAccount: !selectedCompany.isTargetAccount })} className={`p-1 rounded-lg transition-all ${selectedCompany.isTargetAccount ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`} title="Mark as Target Account"><Target className="w-5 h-5" /></button>
                  </div>
                  <p className="text-xs text-slate-500">{selectedCompany.industry}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingCompany ? (
                  <>
                    <button onClick={() => { setEditCompanyFormData({ ...selectedCompany }); setIsEditingCompany(true); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><Edit3 className="w-5 h-5" /></button>
                    <button onClick={() => setDeleteConfirmCompany(selectedCompany)} className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition-all" title="Delete Company"><Trash2 className="w-5 h-5" /></button>
                  </>
                ) : null}
                <button onClick={closeCompanyDrawer} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X className="w-5 h-5" /></button>
              </div>
              
              {/* Phase 8: Contextual SAVE/CANCEL bar for company */}
              {isEditingCompany && hasUnsavedCompanyChanges && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-indigo-500 shadow-2xl p-4 animate-in slide-in-from-bottom duration-300">
                  <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-semibold text-slate-700">Unsaved changes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { 
                          setIsEditingCompany(false); 
                          setEditCompanyFormData({...selectedCompany}); 
                          setHasUnsavedCompanyChanges(false);
                        }} 
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:border-slate-300 transition-all flex items-center gap-2"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button 
                        onClick={async () => { 
                          await handleUpdateCompany(editCompanyFormData); 
                        }} 
                        className="px-4 py-2 bg-indigo-600 border border-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {isEditingCompany ? (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Name</label>
                    <input type="text" value={editCompanyFormData.name} onChange={e => setEditCompanyFormData({...editCompanyFormData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Industry</label>
                    <input type="text" value={editCompanyFormData.industry} onChange={e => setEditCompanyFormData({...editCompanyFormData, industry: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner</label>
                    <select value={editCompanyFormData.ownerId} onChange={e => setEditCompanyFormData({...editCompanyFormData, ownerId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Website</label>
                    <input type="text" value={editCompanyFormData.website} onChange={e => setEditCompanyFormData({...editCompanyFormData, website: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LinkedIn</label>
                    <input type="text" value={editCompanyFormData.linkedin} onChange={e => setEditCompanyFormData({...editCompanyFormData, linkedin: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Manager</p>
                    <span className="text-sm font-bold text-indigo-600 flex items-center gap-2"><User className="w-4 h-4" /> {getOwnerName(selectedCompany.ownerId)}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${selectedCompany.isTargetAccount ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {selectedCompany.isTargetAccount ? 'Target Account' : 'Standard Account'}
                    </span>
                  </div>
                </div>
              )}

              {/* Social Signals Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Social Signals & Intelligence
                  </h3>
                  <button onClick={handleAiInsightLookup} disabled={isAiLoading} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 transition-all disabled:opacity-50">
                    {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Execute Intelligence Scan
                  </button>
                </div>
                <div className="space-y-3">
                  {isAiLoading && (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-indigo-200 flex flex-col items-center justify-center text-center">
                       <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                       <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Scanning global digital signals...</p>
                    </div>
                  )}
                  {(!selectedCompany.socialSignals || selectedCompany.socialSignals.length === 0) && !isAiLoading ? (
                    <div className="py-12 text-center text-slate-400"><TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-10" /><p className="text-xs font-medium">No signals found. Use AI Scan to refresh intelligence.</p></div>
                  ) : (selectedCompany.socialSignals || []).map(signal => (
                    <div key={signal.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all shadow-sm group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${signal.type === 'funding' ? 'bg-emerald-50 text-emerald-600' : signal.type === 'hiring' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {signal.type === 'funding' && <Rocket className="w-4 h-4" />}
                            {signal.type === 'hiring' && <UserPlus className="w-4 h-4" />}
                            {signal.type === 'acquisition' && <Zap className="w-4 h-4" />}
                            {signal.type === 'news' && <Newspaper className="w-4 h-4" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{signal.title}</h4>
                            {signal.isAiGenerated && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter flex items-center gap-1"><Sparkles className="w-2 h-2" /> Verified by Impact AI</span>}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{signal.date}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{signal.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Client Satisfaction Section */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" /> 
                    Client Satisfaction
                  </h3>
                  {companySatisfaction && (
                    <button
                      onClick={() => onNavigate('satisfaction')}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                    >
                      View Details
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                {isLoadingSatisfaction ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  </div>
                ) : companySatisfaction ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border-2 ${
                      companySatisfaction.latestNpsScore >= 9 ? 'bg-green-50 border-green-200' :
                      companySatisfaction.latestNpsScore >= 7 ? 'bg-yellow-50 border-yellow-200' :
                      companySatisfaction.latestNpsScore !== undefined && companySatisfaction.latestNpsScore !== null ? 'bg-red-50 border-red-200' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Latest NPS Score</p>
                      {companySatisfaction.latestNpsScore !== undefined && companySatisfaction.latestNpsScore !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-black ${
                            companySatisfaction.latestNpsScore >= 9 ? 'text-green-600' :
                            companySatisfaction.latestNpsScore >= 7 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {companySatisfaction.latestNpsScore}
                          </span>
                          {companySatisfaction.npsCategory && (
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                              companySatisfaction.npsCategory === 'Promoter' ? 'bg-green-100 text-green-700' :
                              companySatisfaction.npsCategory === 'Passive' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {companySatisfaction.npsCategory}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">No score yet</span>
                      )}
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Last Survey</p>
                      {companySatisfaction.lastSurveyDate ? (
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(companySatisfaction.lastSurveyDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">Not sent</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                    <p className="text-xs text-slate-400">No satisfaction data available</p>
                  </div>
                )}
              </div>

              {/* Playbooks Section */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" /> 
                  Playbooks
                  {companyPlaybookInstances.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px]">
                      {companyPlaybookInstances.length}
                    </span>
                  )}
                </h3>

                {isLoadingPlaybooks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  </div>
                ) : companyPlaybookInstances.length > 0 ? (
                  <div className="space-y-3">
                    {companyPlaybookInstances.map((instance: any) => (
                      <CompanyPlaybookInstanceCard
                        key={instance.id}
                        instance={instance}
                        deals={deals}
                        projects={projects}
                        onView={(id) => setViewingPlaybookInstanceId(id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                    <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-xs text-slate-400 font-medium">No playbooks attached to deals or projects for this company.</p>
                  </div>
                )}
              </div>

              {/* Notes Section */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" /> 
                  Notes & Comments
                  {selectedCompany.notes && selectedCompany.notes.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px]">
                      {selectedCompany.notes.length}
                    </span>
                  )}
                </h3>

                {/* Add New Note */}
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={companyNoteText}
                      onChange={handleCompanyNoteTextChange}
                      onBlur={() => setTimeout(() => setShowCompanyMentionDropdown(false), 200)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
                      placeholder="Add a note or comment... (Use @ to mention users)"
                    />
                    
                    {/* Mention Dropdown */}
                    {showCompanyMentionDropdown && filteredCompanyMentionUsers.length > 0 && (
                      <div className="absolute bottom-full mb-2 left-0 w-full max-w-sm bg-white border-2 border-indigo-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                        <div className="p-2">
                          <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <AtSign className="w-3 h-3" />
                            Mention User
                          </div>
                          {filteredCompanyMentionUsers.map(user => (
                            <button
                              key={user.id}
                              onClick={() => handleCompanyMentionSelect(user)}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 rounded-lg transition-all text-left"
                            >
                              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                                {user.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAddCompanyNote}
                    disabled={isAddingCompanyNote || !companyNoteText.trim()}
                    className="w-full px-6 py-3 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingCompanyNote ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>

                {/* Notes List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {selectedCompany.notes && selectedCompany.notes.length > 0 ? (
                    [...selectedCompany.notes].reverse().map((note) => {
                      const canDelete = currentUser?.role === 'Admin' || note.userId === currentUser?.id;
                      return (
                        <div key={note.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">
                                {note.userName?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">{note.userName}</p>
                                <p className="text-[10px] text-slate-400">
                                  {new Date(note.createdAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </p>
                              </div>
                            </div>
                            {canDelete && (
                              <button
                                onClick={() => setCompanyNoteToDelete(note.id)}
                                disabled={deletingCompanyNoteId === note.id}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors group disabled:opacity-50"
                                title="Delete note"
                              >
                                {deletingCompanyNoteId === note.id ? (
                                  <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
                                )}
                              </button>
                            )}
                          </div>
                          {note.text && (
                            <p className="text-sm text-slate-700 leading-relaxed pl-10">
                              {renderNoteTextWithMentions(note.text)}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-400 font-medium">No notes yet</p>
                      <p className="text-xs text-slate-400 mt-1">Add your first note above</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Contacts</h3>
                <div className="space-y-3">
                  {contacts.filter(c => c.companyId === selectedCompany.id).map(contact => (
                    <div key={contact.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-all cursor-pointer relative" onClick={() => navigateToRecord('contact', contact.id)}>
                      {(contact as Contact).contact_compliance?.processing_restricted && (
                        <>
                          <div className="absolute inset-0 bg-slate-400/30 rounded-2xl pointer-events-none z-10" />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center gap-1.5 text-slate-600">
                            <Lock className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">Read-only</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-xs font-black text-indigo-600 uppercase">
                          {formatNameForDisplay(contact.name).charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900" title={contact.name}>
                            {formatNameForDisplay(contact.name) || '-'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{contact.role}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sophisticated Contact Profile Drawer */}
      {selectedContact && (
        <div className="fixed inset-0 z-[75] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300" onClick={closeContactDrawer} />
          <div className="absolute right-0 inset-y-0 w-full max-w-xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            
            {/* §5D: Processing restricted banner */}
            {selectedContact.contact_compliance?.processing_restricted && (
              <div className="px-6 py-3 bg-slate-200 border-b border-slate-300 flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-600 shrink-0" />
                <p className="text-sm font-semibold text-slate-800">
                  Processing restricted — this contact is read-only. No outbound, enrichment, or pipeline movement.
                </p>
              </div>
            )}

            {/* Business Card Header */}
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 relative">
              <button onClick={closeContactDrawer} className="absolute top-6 right-6 p-2 hover:bg-white rounded-full text-slate-400 transition-all shadow-sm z-10"><X className="w-5 h-5" /></button>
              
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-100 ring-4 ring-indigo-50 shrink-0">
                  {selectedContact.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-black text-slate-900 truncate mb-1">{selectedContact.name}</h2>
                  <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest truncate">
                    {selectedContact.role} @ {companies.find(c => c.id === selectedContact.companyId)?.name || 'Direct Contact'}
                  </p>
                  
                  <div className="flex gap-2 mt-4">
                    {!isEditingContact ? (
                      <>
                        {!selectedContact.contact_compliance?.processing_restricted && (
                          <button
                            onClick={() => { setEditContactFormData({ ...selectedContact }); setIsEditingContact(true); }}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:border-indigo-300 transition-all flex items-center gap-2"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                          </button>
                        )}
                        {/* LinkedIn import: block direct outreach from profile header until consent granted */}
                        {selectedContact.scannedFrom === 'linkedin' &&
                        selectedContact.contact_compliance?.consent_status !== 'granted' ? (
                          <button
                            type="button"
                            disabled
                            className="p-2.5 bg-slate-200 text-slate-400 rounded-xl cursor-not-allowed flex items-center justify-center"
                            title="LinkedIn contacts cannot be used for direct outreach without separate consent under UAE PDPL and LinkedIn's Terms of Service."
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        ) : (
                          <a
                            href={`mailto:${selectedContact.email}`}
                            className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                        {selectedContact.linkedin && <a href={selectedContact.linkedin} target="_blank" rel="noreferrer" className="p-2.5 bg-[#0077b5] text-white rounded-xl hover:bg-[#006da5] transition-all shadow-lg shadow-blue-100"><Linkedin className="w-4 h-4" /></a>}
                      </>
                    ) : null}
                  </div>

                  {/* LinkedIn-specific compliance banner */}
                  {selectedContact.scannedFrom === 'linkedin' &&
                    selectedContact.contact_compliance?.consent_status !== 'granted' && (
                      <div className="mt-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                        <p className="text-xs text-amber-900">
                          <strong>LinkedIn contacts cannot be used for direct outreach without separate consent</strong>{' '}
                          under UAE PDPL and LinkedIn&apos;s Terms of Service. This contact will remain in a pending consent
                          state until you obtain explicit opt-in.
                        </p>
                      </div>
                    )}
                  
                  {/* Phase 8: Contextual SAVE/CANCEL bar - shows when editing and has unsaved changes */}
                  {isEditingContact && hasUnsavedContactChanges && !selectedContact.contact_compliance?.processing_restricted && (
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-indigo-500 shadow-2xl p-4 animate-in slide-in-from-bottom duration-300">
                      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          <span className="text-sm font-semibold text-slate-700">Unsaved changes</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => { 
                              setIsEditingContact(false); 
                              setEditContactFormData({...selectedContact}); 
                              setHasUnsavedContactChanges(false);
                            }} 
                            disabled={isUpdatingContact}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:border-slate-300 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                          <button 
                            onClick={handleUpdateContactDetails} 
                            disabled={isUpdatingContact}
                            className="px-4 py-2 bg-indigo-600 border border-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isUpdatingContact ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" /> Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit mt-8">
                {[
                  { id: 'details', label: 'Overview', icon: <Info className="w-3.5 h-3.5" /> },
                  { id: 'notes', label: 'Strategic Context', icon: <FileText className="w-3.5 h-3.5" /> },
                  { id: 'activity', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveContactTab(tab.id as any); setIsEditingContact(false); }}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeContactTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {activeContactTab === 'details' && selectedContact && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Overview
                  </h3>
                  <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-2">
                    <p className="text-sm font-bold text-slate-900">{selectedContact.name}</p>
                    <p className="text-sm text-slate-600">{selectedContact.email || 'No email'}</p>
                    <p className="text-xs text-slate-500">
                      {companies.find(c => c.id === selectedContact.companyId)?.name || 'Independent Partner'}
                    </p>
                  </div>
                </div>
              )}

              {activeContactTab === 'notes' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" /> 
                    Strategic Context & Notes
                    {selectedContact.notes && selectedContact.notes.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px]">
                        {selectedContact.notes.length}
                      </span>
                    )}
                  </h3>

                  {/* Add New Note */}
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        rows={4}
                        value={contactNoteText}
                        onChange={handleContactNoteTextChange}
                        onBlur={() => setTimeout(() => setShowContactMentionDropdown(false), 200)}
                        disabled={selectedContact.contact_compliance?.processing_restricted}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50"
                        placeholder={selectedContact.contact_compliance?.processing_restricted ? 'Processing restricted — cannot add notes' : 'Add strategic context, decision-making patterns, or meeting insights... (Use @ to mention users)'}
                      />
                      
                      {/* Mention Dropdown */}
                      {showContactMentionDropdown && filteredContactMentionUsers.length > 0 && (
                        <div className="absolute bottom-full mb-2 left-0 w-full max-w-sm bg-white border-2 border-indigo-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                          <div className="p-2">
                            <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                              <AtSign className="w-3 h-3" />
                              Mention User
                            </div>
                            {filteredContactMentionUsers.map(user => (
                              <button
                                key={user.id}
                                onClick={() => handleContactMentionSelect(user)}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 rounded-lg transition-all text-left"
                              >
                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                                  {user.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAddContactNote}
                      disabled={isAddingContactNote || !contactNoteText.trim() || selectedContact.contact_compliance?.processing_restricted}
                      className="w-full px-6 py-3 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingContactNote ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send
                        </>
                      )}
                    </button>
                  </div>

                  {/* Legacy Notes Display (if exists) */}
                  {selectedContact.legacyNotes && (
                    <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-amber-600" />
                        <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Legacy Notes</p>
                      </div>
                      <p className="text-sm text-amber-800 leading-relaxed italic">
                        {selectedContact.legacyNotes}
                      </p>
                    </div>
                  )}

                  {/* Notes List */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {selectedContact.notes && selectedContact.notes.length > 0 ? (
                      [...selectedContact.notes].reverse().map((note) => {
                        const canDelete = currentUser?.role === 'Admin' || note.userId === currentUser?.id;
                        return (
                          <div key={note.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">
                                  {note.userName?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{note.userName}</p>
                                  <p className="text-[10px] text-slate-400">
                                    {new Date(note.createdAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </p>
                                </div>
                              </div>
                              {canDelete && (
                                <button
                                  onClick={() => setContactNoteToDelete(note.id)}
                                  disabled={deletingContactNoteId === note.id}
                                  className="p-2 hover:bg-red-50 rounded-lg transition-colors group disabled:opacity-50"
                                  title="Delete note"
                                >
                                  {deletingContactNoteId === note.id ? (
                                    <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
                                  )}
                                </button>
                              )}
                            </div>
                            {note.text && (
                              <p className="text-sm text-slate-700 leading-relaxed pl-10">
                                {renderNoteTextWithMentions(note.text)}
                              </p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-400 font-medium">No notes yet</p>
                        <p className="text-xs text-slate-400 mt-1">Add strategic insights above</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeContactTab === 'activity' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Operational Engagement Timeline</h3>
                    <button
                      type="button"
                      onClick={() => onNavigate('compliance-audit-log')}
                      className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-1.5"
                    >
                      <FileSearch className="w-3 h-3" /> Full Audit Log
                    </button>
                  </div>
                  <div className="relative border-l-2 border-slate-100 ml-4 pl-10 space-y-12">
                    {isLoadingContactAudit ? (
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
                      </div>
                    ) : (
                      <>
                        {contactAuditLogs.map((log) => {
                          const ts = log.timestamp && (typeof log.timestamp === 'string' ? new Date(log.timestamp) : (log as any).timestamp?.toDate ? (log as any).timestamp.toDate() : new Date((log as any).timestamp));
                          const isCompliance = COMPLIANCE_EVENT_TYPES.has(log.eventType);
                          const dateLabel = ts ? (ts.getTime() > Date.now() - 86400000 ? 'Today' : ts.getTime() > Date.now() - 604800000 ? 'This week' : ts.toLocaleDateString()) : '—';
                          return (
                            <div key={log.id} className="relative">
                              <div className={`absolute -left-[51px] top-1.5 w-8 h-8 rounded-full border-2 shadow-sm flex items-center justify-center ${isCompliance ? 'bg-blue-50 border-blue-400 text-blue-600' : 'bg-white border-slate-200'}`}>
                                {isCompliance ? <Shield className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                              </div>
                              <p className={`text-[10px] font-black uppercase mb-1 tracking-widest ${isCompliance ? 'text-blue-600' : 'text-slate-400'}`}>
                                {isCompliance ? 'Compliance' : 'Activity'} • {dateLabel}
                              </p>
                              <h4 className="text-sm font-black text-slate-900">{formatAuditEventLabel(log.eventType)}</h4>
                              <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm">
                                {log.metadata && typeof log.metadata === 'object' && (log.metadata as any).description ? String((log.metadata as any).description) : (log.userEmail ? `By ${log.userEmail}` : '—')}
                              </p>
                            </div>
                          );
                        })}
                        <div className="relative">
                          <div className="absolute -left-[51px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-indigo-600 shadow-xl flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-indigo-600" />
                          </div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase mb-1 tracking-widest">Digital Touchpoint • Recent</p>
                          <h4 className="text-sm font-black text-slate-900">Enterprise Email Receipt</h4>
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm">Confirmed receipt of Logistics Transformation Proposal V3. Stakeholder requested EMEA regional review by Friday.</p>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[51px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Registry Update • Last Week</p>
                          <h4 className="text-sm font-black text-slate-900">Registry Association Linked</h4>
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm">Manually associated with the &apos;Q4 Global Logistics Consolidation&apos; opportunity by Alex Rivera (Admin).</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Premium Footer */}
            <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
              <button 
                onClick={() => !selectedContact.contact_compliance?.processing_restricted && setDeleteConfirmContact(selectedContact)} 
                disabled={selectedContact.contact_compliance?.processing_restricted}
                className="px-6 py-4 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-[28px] transition-all group shrink-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
              <button onClick={() => { setSelectedContact(null); setIsEditingContact(false); }} className="flex-1 py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.25em] rounded-[28px] hover:bg-indigo-700 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3">
                <UserCheck className="w-5 h-5" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handle Data Request (DSAR) modal */}
      {selectedContact && showHandleDataRequestModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmittingDataRequest && setShowHandleDataRequestModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create data request</h3>
            <p className="text-sm text-slate-500 mb-4">For {selectedContact.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Request type</label>
                <select
                  value={dataRequestType}
                  onChange={e => setDataRequestType(e.target.value as any)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="access">Access (export data)</option>
                  <option value="erasure">Erasure (delete/anonymize)</option>
                  <option value="rectification">Rectification (correct data)</option>
                  <option value="restrict">Restrict processing</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Details (optional)</label>
                <textarea
                  value={dataRequestDetails}
                  onChange={e => setDataRequestDetails(e.target.value)}
                  placeholder="Notes or context for this request"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowHandleDataRequestModal(false)}
                disabled={isSubmittingDataRequest}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!selectedContact?.id) return;
                  setIsSubmittingDataRequest(true);
                  try {
                    await apiCreateDataRequest({
                      contactId: selectedContact.id,
                      type: dataRequestType,
                      channel: 'in_app',
                      details: dataRequestDetails.trim() || null
                    });
                    showSuccess('Data request created. Handle it in Settings → Workspace → Data Requests.');
                    setShowHandleDataRequestModal(false);
                    setDataRequestDetails('');
                  } catch (err: any) {
                    showError(err?.message || 'Failed to create data request');
                  } finally {
                    setIsSubmittingDataRequest(false);
                  }
                }}
                disabled={isSubmittingDataRequest}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmittingDataRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* §4C: Record Withdrawal confirmation */}
      {selectedContact && showRecordWithdrawalConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isWithdrawingConsent && setShowRecordWithdrawalConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Record withdrawal</h3>
            <p className="text-sm text-slate-500 mb-4">
              Record that <strong>{selectedContact.name}</strong> has withdrawn consent? This will set consent status to &quot;Withdrawn&quot;, clear consent purposes, log the event, and notify the assignee. No further marketing communications will be sent.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowRecordWithdrawalConfirm(false)}
                disabled={isWithdrawingConsent}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!selectedContact?.id) return;
                  setIsWithdrawingConsent(true);
                  try {
                    const res = await apiWithdrawConsent(selectedContact.id);
                    const updatedCompliance = (res as any)?.data?.contact_compliance;
                    setSelectedContact(prev => prev ? { ...prev, contact_compliance: updatedCompliance || { ...prev.contact_compliance, consent_status: 'withdrawn', consent_purposes: [] } } : null);
                    queryClient.invalidateQueries({ queryKey: ['contacts'] });
                    showSuccess('Consent withdrawn. Assignee has been notified.');
                    setShowRecordWithdrawalConfirm(false);
                  } catch (err: any) {
                    showError(err?.message || 'Failed to record withdrawal');
                  } finally {
                    setIsWithdrawingConsent(false);
                  }
                }}
                disabled={isWithdrawingConsent}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isWithdrawingConsent ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Record withdrawal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Company Confirmation Modal */}
      {deleteConfirmCompany && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Delete Company?</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. All associated contacts, deals, and projects will be affected.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <ImageWithFallback 
                    src={deleteConfirmCompany.logo} 
                    fallbackText={deleteConfirmCompany.name} 
                    className="w-10 h-10 border border-slate-200" 
                    isAvatar={false} 
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{deleteConfirmCompany.name}</p>
                    <p className="text-xs text-slate-500">{deleteConfirmCompany.industry}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirmCompany(null)}
                disabled={isDeletingCompany}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCompany(deleteConfirmCompany.id)}
                disabled={isDeletingCompany}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeletingCompany ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Company'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Contact Confirmation Modal */}
      {deleteConfirmContact && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Delete Contact?</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. The contact will be permanently removed from the enterprise registry.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-lg border border-indigo-100">
                    {deleteConfirmContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{deleteConfirmContact.name}</p>
                    <p className="text-xs text-slate-500">{deleteConfirmContact.email}</p>
                    {deleteConfirmContact.role && (
                      <p className="text-xs text-slate-400 font-bold uppercase mt-1">{deleteConfirmContact.role}</p>
                    )}
                  </div>
                </div>
                {companies.find(c => c.id === deleteConfirmContact.companyId) && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <p className="text-xs font-bold text-slate-600">{companies.find(c => c.id === deleteConfirmContact.companyId)?.name}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirmContact(null)}
                disabled={isDeletingContact}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteContact(deleteConfirmContact.id)}
                disabled={isDeletingContact}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeletingContact ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Contact'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {(() => {
                      const count = bulkDeleteConfirmOpen === 'companies' 
                        ? (itemsToDelete.companies.length > 0 ? itemsToDelete.companies.length : selectedCompanyIds.length)
                        : (itemsToDelete.contacts.length > 0 ? itemsToDelete.contacts.length : selectedContactIds.length);
                      return `Delete ${count} ${bulkDeleteConfirmOpen === 'companies' ? 'Compan' : 'Contact'}${bulkDeleteConfirmOpen === 'companies' ? (count > 1 ? 'ies' : 'y') : (count > 1 ? 's' : '')}?`;
                    })()}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. {bulkDeleteConfirmOpen === 'companies' 
                      ? 'All associated contacts, deals, and projects will be affected.'
                      : 'The contacts will be permanently removed from the enterprise registry.'}
                  </p>
                  {bulkDeleteConfirmOpen === 'contacts' && (() => {
                    const list = itemsToDelete.contacts.length > 0 ? itemsToDelete.contacts : contacts.filter((c: Contact) => selectedContactIds.includes(c.id));
                    const withConsent = list.filter((c: Contact) => (c as Contact).contact_compliance?.consent_status === 'granted').length;
                    const withoutConsent = list.length - withConsent;
                    if (list.length === 0) return null;
                    return (
                      <p className="text-xs text-amber-700 font-medium mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {withConsent} of {list.length} selected have valid consent for outreach. {withoutConsent > 0 ? `${withoutConsent} will be excluded from future email/campaigns. ` : ''}Confirm to proceed with deletion.
                      </p>
                    );
                  })()}
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                {(bulkDeleteConfirmOpen === 'companies' 
                  ? itemsToDelete.companies.length > 0 
                    ? itemsToDelete.companies 
                    : companies.filter(c => selectedCompanyIds.includes(c.id))
                  : itemsToDelete.contacts.length > 0
                    ? itemsToDelete.contacts
                    : contacts.filter(c => selectedContactIds.includes(c.id))
                ).slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 mb-2 last:mb-0">
                    {bulkDeleteConfirmOpen === 'companies' ? (
                      <>
                        <ImageWithFallback 
                          src={item.logo} 
                          fallbackText={item.name} 
                          className="w-8 h-8 border border-slate-200" 
                          isAvatar={false} 
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-slate-500">{item.industry}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-slate-500">{item.email}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {(() => {
                  const totalCount = bulkDeleteConfirmOpen === 'companies' 
                    ? (itemsToDelete.companies.length > 0 ? itemsToDelete.companies.length : selectedCompanyIds.length)
                    : (itemsToDelete.contacts.length > 0 ? itemsToDelete.contacts.length : selectedContactIds.length);
                  return totalCount > 5 && (
                    <p className="text-xs text-slate-400 font-medium mt-2 text-center">
                      + {totalCount - 5} more
                    </p>
                  );
                })()}
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => {
                  setBulkDeleteConfirmOpen(null);
                  // Clear stored items when canceling
                  setItemsToDelete({ companies: [], contacts: [] });
                }}
                disabled={bulkDeleteConfirmOpen === 'companies' ? isBulkDeletingCompanies : isBulkDeletingContacts}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (bulkDeleteConfirmOpen === 'companies') {
                    handleBulkDeleteCompanies();
                  } else {
                    handleBulkDeleteContacts();
                  }
                }}
                disabled={bulkDeleteConfirmOpen === 'companies' ? isBulkDeletingCompanies : isBulkDeletingContacts}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(bulkDeleteConfirmOpen === 'companies' ? isBulkDeletingCompanies : isBulkDeletingContacts) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  (() => {
                    const count = bulkDeleteConfirmOpen === 'companies' 
                      ? (itemsToDelete.companies.length > 0 ? itemsToDelete.companies.length : selectedCompanyIds.length)
                      : (itemsToDelete.contacts.length > 0 ? itemsToDelete.contacts.length : selectedContactIds.length);
                    return `Delete ${count} ${bulkDeleteConfirmOpen === 'companies' ? 'Compan' : 'Contact'}${bulkDeleteConfirmOpen === 'companies' ? (count > 1 ? 'ies' : 'y') : (count > 1 ? 's' : '')}`;
                  })()
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Company Note Confirmation Dialog */}
      {companyNoteToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-900 mb-2">Delete Note?</h3>
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete this note? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-6 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setCompanyNoteToDelete(null)}
                disabled={deletingCompanyNoteId === companyNoteToDelete}
                className="flex-1 px-4 py-2 bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCompanyNote}
                disabled={deletingCompanyNoteId === companyNoteToDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingCompanyNoteId === companyNoteToDelete ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Contact Note Confirmation Dialog */}
      {contactNoteToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-900 mb-2">Delete Note?</h3>
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete this note? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-6 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setContactNoteToDelete(null)}
                disabled={deletingContactNoteId === contactNoteToDelete}
                className="flex-1 px-4 py-2 bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteContactNote}
                disabled={deletingContactNoteId === contactNoteToDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingContactNoteId === contactNoteToDelete ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Business Card Scanner Modal */}
      {isBusinessCardScannerOpen && (
        <BusinessCardScanner
          onClose={() => setIsBusinessCardScannerOpen(false)}
          onSuccess={() => {
            setIsBusinessCardScannerOpen(false);
            // Invalidate and refetch companies and contacts from cache
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          }}
          currentUserId={currentUser?.id || ''}
        />
      )}

      {/* LinkedIn Scanner Modal */}
      {isLinkedInScannerOpen && (
        <LinkedInScanner
          onClose={() => setIsLinkedInScannerOpen(false)}
          onSuccess={() => {
            setIsLinkedInScannerOpen(false);
            // Invalidate and refetch companies and contacts from cache
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
          }}
          currentUserId={currentUser?.id || ''}
        />
      )}

      {/* Company/Contact Upload Wizard */}
      {showCompanyUploadWizard && (
        <CRMCompanyUploadWizard
          type={view === 'contacts' ? 'contact' : 'company'}
          onClose={() => setShowCompanyUploadWizard(false)}
          onSuccess={() => {
            if (view === 'contacts') {
              queryClient.invalidateQueries({ queryKey: ['contacts'] });
            } else {
              queryClient.invalidateQueries({ queryKey: ['companies'] });
            }
          }}
        />
      )}

      {/* Playbook Instance View */}
      {viewingPlaybookInstanceId && (
        <PlaybookInstanceView
          instanceId={viewingPlaybookInstanceId}
          isOpen={!!viewingPlaybookInstanceId}
          onClose={() => setViewingPlaybookInstanceId(null)}
        />
      )}
    </div>
  );
};

export default CRM;
