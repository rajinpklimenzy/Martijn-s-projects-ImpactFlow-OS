
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, User, Globe, Phone, Mail, ChevronRight, Search, Plus, ExternalLink, 
  Calendar, Clock, Sparkles, ArrowRight, X, Trash2, Shield, Settings2, FileSearch, 
  Loader2, AlertTriangle, CheckSquare, ListChecks, Linkedin, Briefcase, TrendingUp,
  UserPlus, Newspaper, Rocket, Zap, Target, Save, Edit3, Wand2, Info, FileText, History,
  MessageSquare, UserCheck, Share2, MoreVertical, Filter, CheckCircle2, Circle, AtSign, Send, Scan, RefreshCw, Star, BookOpen, FolderKanban, Upload
} from 'lucide-react';
import { Company, Contact, Deal, User as UserType, SocialSignal, Note, Project } from '../types';
import { apiCreateNotification, apiGetCompanySatisfaction, apiGetProjects } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';
import { BusinessCardScanner, LinkedInScanner } from './Scanner';
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

const CRM: React.FC<CRMProps> = ({ onNavigate, onAddCompany, onAddContact, externalSearchQuery = '' }) => {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  
  // Get current user from localStorage
  const currentUser = localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data') || '{}') : null;
  
  const [view, setView] = useState<'companies' | 'contacts'>('companies');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [viewingPlaybookInstanceId, setViewingPlaybookInstanceId] = useState<string | null>(null);
  const [showCompanyUploadWizard, setShowCompanyUploadWizard] = useState(false);
  
  // Fetch playbook instances for selected company (roll-up from all deals and projects)
  const { data: companyPlaybookInstances = [], isLoading: isLoadingPlaybooks } = usePlaybookInstances({
    companyId: selectedCompany?.id
  });
  
  // React Query hooks for data fetching with caching
  const { data: companies = [], isLoading: isLoadingCompanies, isError: isCompaniesError, refetch: refetchCompanies } = useCompanies(localSearchQuery);
  const { data: contacts = [], isLoading: isLoadingContacts, isError: isContactsError, refetch: refetchContacts } = useContacts(localSearchQuery);
  const { data: deals = [], isLoading: isLoadingDeals } = useDeals();
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiGetProjects();
      return response.data || response || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  
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

  useEffect(() => {
    if (externalSearchQuery !== undefined) setLocalSearchQuery(externalSearchQuery);
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

  const handleUpdateCompany = async (updates: Partial<Company>) => {
    if (!selectedCompany) return;
    try {
      await updateCompanyMutation.mutateAsync({ id: selectedCompany.id, updates });
      setSelectedCompany({ ...selectedCompany, ...updates });
      showSuccess('Account updated');
    } catch (err) { 
      showError('Update failed'); 
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
      showSuccess('Contact profile updated successfully');
    } catch (err: any) {
      console.error('Contact update error:', err);
      showError(err.message || 'Failed to update contact. Please try again.');
    } finally {
      setIsUpdatingContact(false);
    }
  };

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

  // Extract mentioned users from text
  const extractMentionedUsers = (text: string): string[] => {
    const mentionRegex = /@([A-Za-z0-9\s]+?)(?=\s|$|[.,!?])/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1].trim();
      const user = users.find(u => u.name.toLowerCase() === mentionedName.toLowerCase());
      if (user) {
        mentions.push(user.id);
      }
    }
    
    return [...new Set(mentions)];
  };

  // Render note text with highlighted mentions
  const renderNoteTextWithMentions = (text: string) => {
    const mentionRegex = /@([A-Za-z0-9\s]+?)(?=\s|$|[.,!?])/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const mentionedName = match[1].trim();
      const user = users.find(u => u.name.toLowerCase() === mentionedName.toLowerCase());
      if (user) {
        parts.push(
          <span key={match.index} className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
            @{user.name}
          </span>
        );
      } else {
        parts.push(`@${mentionedName}`);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
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
      setSelectedCompanyIds([]);
      setBulkDeleteConfirmOpen(null);
      showSuccess(`Successfully deleted ${targetIds.length} compan${targetIds.length > 1 ? 'ies' : 'y'}`);
    } catch (err: any) {
      showError(err.message || 'Failed to delete companies');
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
      setSelectedContactIds([]);
      setBulkDeleteConfirmOpen(null);
      showSuccess(`Successfully deleted ${targetIds.length} contact${targetIds.length > 1 ? 's' : ''}`);
    } catch (err: any) {
      showError(err.message || 'Failed to delete contacts');
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
                setSelectedCompanyIds([]);
                setSelectedContactIds([]);
              }} 
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors whitespace-nowrap ${view === 'contacts' ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Contacts ({contacts.length})
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
        {/* Search Bar */}
        <div className="w-full min-w-0">
          <div className="relative group w-full min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors shrink-0" />
            <input type="text" placeholder={`Search ${view}...`} value={localSearchQuery} onChange={(e) => setLocalSearchQuery(e.target.value)} className="w-full min-w-0 pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all" />
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

        {/* Content Grid - Always show grid, skeleton cards when loading */}
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
                  onClick={() => setSelectedCompany(company)} 
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
                      <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{company.name}</h3>
                      <p className="text-slate-500 text-xs font-bold uppercase">{company.industry}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /><span className="truncate">{company.website || 'No website'}</span></div>
                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /><span className="truncate font-medium">{owner?.name || 'Unassigned'}</span></div>
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
                  onClick={() => setSelectedContact(contact)} 
                  className={`bg-white p-5 rounded-2xl border ${isSelected ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200'} hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group shadow-sm relative flex flex-col h-[220px]`}
                >
                  <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      checked={isSelected}
                      onChange={() => setSelectedContactIds(prev => isSelected ? prev.filter(id => id !== contact.id) : [...prev, contact.id])}
                    />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg uppercase shadow-inner">{contact.name.charAt(0)}</div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-base text-slate-900 truncate">{contact.name}</h3>
                      <p className="text-slate-500 text-[11px] font-bold uppercase truncate">{contact.role} @ {company?.name || 'Partner'}</p>
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
      </div>

      {/* Bulk Action Bar */}
      {((view === 'companies' && selectedCompanyIds.length > 0) || (view === 'contacts' && selectedContactIds.length > 0)) && (
        <div className="fixed bottom-6 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300 max-w-2xl sm:max-w-none mx-auto">
          <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl shadow-2xl px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-8 border border-white/10 ring-4 ring-indigo-500/10">
            <span className="text-sm font-black flex items-center gap-3 shrink-0">
              <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[10px]">
                {view === 'companies' ? selectedCompanyIds.length : selectedContactIds.length}
              </div>
              Selected
            </span>
            <div className="hidden sm:block h-8 w-px bg-white/10 shrink-0" />
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
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
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
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
                {isEditingCompany ? (
                  <button onClick={async () => { await handleUpdateCompany(editCompanyFormData); setIsEditingCompany(false); }} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg"><Save className="w-5 h-5" /></button>
                ) : (
                  <>
                    <button onClick={() => { setEditCompanyFormData({ ...selectedCompany }); setIsEditingCompany(true); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><Edit3 className="w-5 h-5" /></button>
                    <button onClick={() => setDeleteConfirmCompany(selectedCompany)} className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition-all" title="Delete Company"><Trash2 className="w-5 h-5" /></button>
                  </>
                )}
                <button onClick={closeCompanyDrawer} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X className="w-5 h-5" /></button>
              </div>
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
                    <div key={contact.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-all cursor-pointer" onClick={() => setSelectedContact(contact)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-xs font-black text-indigo-600 uppercase">{contact.name.charAt(0)}</div>
                        <div><p className="text-sm font-bold text-slate-900">{contact.name}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{contact.role}</p></div>
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
                        <button onClick={() => { setEditContactFormData({...selectedContact}); setIsEditingContact(true); }} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:border-indigo-300 transition-all flex items-center gap-2"><Edit3 className="w-3.5 h-3.5" /> Edit Profile</button>
                        <a href={`mailto:${selectedContact.email}`} className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"><Mail className="w-4 h-4" /></a>
                        {selectedContact.linkedin && <a href={selectedContact.linkedin} target="_blank" rel="noreferrer" className="p-2.5 bg-[#0077b5] text-white rounded-xl hover:bg-[#006da5] transition-all shadow-lg shadow-blue-100"><Linkedin className="w-4 h-4" /></a>}
                      </>
                    ) : (
                      <>
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
                        <button 
                          onClick={() => { 
                            setIsEditingContact(false); 
                            setEditContactFormData({...selectedContact}); 
                          }} 
                          disabled={isUpdatingContact}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:border-slate-300 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </>
                    )}
                  </div>
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
              {activeContactTab === 'details' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {isEditingContact ? (
                    <div className="space-y-8 animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Legal Name <span className="text-red-500">*</span></label>
                          <input 
                            required
                            type="text" 
                            value={editContactFormData.name || ''} 
                            onChange={e => setEditContactFormData({...editContactFormData, name: e.target.value})} 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Professional Role</label>
                          <input 
                            type="text" 
                            value={editContactFormData.role || ''} 
                            onChange={e => setEditContactFormData({...editContactFormData, role: e.target.value})} 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Linked Organization</label>
                        <select 
                          value={editContactFormData.companyId || ''} 
                          onChange={e => setEditContactFormData({...editContactFormData, companyId: e.target.value})} 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_16px_center] bg-no-repeat"
                        >
                          <option value="">No Organization</option>
                          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 pb-2">Communication Registry</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Enterprise Email <span className="text-red-500">*</span></label>
                            <input 
                              required
                              type="email" 
                              value={editContactFormData.email || ''} 
                              onChange={e => setEditContactFormData({...editContactFormData, email: e.target.value})} 
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mobile Contact</label>
                            <input 
                              type="tel" 
                              value={editContactFormData.phone || ''} 
                              onChange={e => setEditContactFormData({...editContactFormData, phone: e.target.value})} 
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all" 
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">LinkedIn Intelligence URL</label>
                            <input 
                              type="url" 
                              value={editContactFormData.linkedin || ''} 
                              onChange={e => setEditContactFormData({...editContactFormData, linkedin: e.target.value})} 
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col justify-between group hover:bg-white hover:border-indigo-200 transition-all shadow-sm">
                           <div className="flex justify-between items-start mb-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Channel</p>
                              <Mail className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                           </div>
                           <p className="text-sm font-black text-slate-900 truncate">{selectedContact.email}</p>
                           <p className="text-[10px] text-indigo-500 font-bold uppercase mt-2">Verified Enterprise Mail</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col justify-between group hover:bg-white hover:border-indigo-200 transition-all shadow-sm">
                           <div className="flex justify-between items-start mb-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Voice Registry</p>
                              <Phone className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                           </div>
                           <p className="text-sm font-black text-slate-900">{selectedContact.phone || 'Registry Pending'}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Direct Terminal</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Building2 className="w-4 h-4 text-indigo-500" /> Account Context</h3>
                        <div className="p-6 bg-white border border-slate-100 rounded-[36px] shadow-sm flex items-center gap-5 hover:border-indigo-300 transition-all group">
                          <ImageWithFallback src={companies.find(c => c.id === selectedContact.companyId)?.logo} className="w-16 h-16 border-2 border-slate-50" fallbackText="C" isAvatar={false} />
                          <div className="flex-1">
                             <p className="font-black text-lg text-slate-900 leading-none mb-1 group-hover:text-indigo-600 transition-colors">{companies.find(c => c.id === selectedContact.companyId)?.name || 'Independent Partner'}</p>
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] text-slate-400 font-black uppercase">{companies.find(c => c.id === selectedContact.companyId)?.industry || 'Uncategorized'}</span>
                               <span className="w-1 h-1 rounded-full bg-slate-200" />
                               <span className="text-[10px] text-indigo-500 font-black uppercase">Primary Stakeholder</span>
                             </div>
                          </div>
                          <button className="p-3 text-indigo-600 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-all"><ExternalLink className="w-5 h-5" /></button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> Intelligence Summary</h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                              <UserCheck className="w-5 h-5 text-emerald-600" />
                              <div>
                                 <p className="text-[10px] font-black text-emerald-600 uppercase">Influence</p>
                                 <p className="text-xs font-bold text-slate-900">Decision Maker</p>
                              </div>
                           </div>
                           <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                              <Share2 className="w-5 h-5 text-blue-600" />
                              <div>
                                 <p className="text-[10px] font-black text-blue-600 uppercase">Network</p>
                                 <p className="text-xs font-bold text-slate-900">Executive Hub</p>
                              </div>
                           </div>
                        </div>
                      </div>
                    </>
                  )}
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
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
                        placeholder="Add strategic context, decision-making patterns, or meeting insights... (Use @ to mention users)"
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
                      disabled={isAddingContactNote || !contactNoteText.trim()}
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
                    <button className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-1.5"><FileSearch className="w-3 h-3" /> Audit Log</button>
                  </div>
                  <div className="relative border-l-2 border-slate-100 ml-4 pl-10 space-y-12">
                     <div className="relative">
                       <div className="absolute -left-[51px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-indigo-600 shadow-xl flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-indigo-600" />
                       </div>
                       <p className="text-[10px] font-black text-indigo-600 uppercase mb-1 tracking-widest">Digital Touchpoint • Yesterday</p>
                       <h4 className="text-sm font-black text-slate-900">Enterprise Email Receipt</h4>
                       <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm">Confirmed receipt of Logistics Transformation Proposal V3. Stakeholder requested EMEA regional review by Friday.</p>
                     </div>
                     <div className="relative">
                       <div className="absolute -left-[51px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-slate-300" />
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Registry Update • Last Week</p>
                       <h4 className="text-sm font-black text-slate-900">Registry Association Linked</h4>
                       <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm">Manually associated with the 'Q4 Global Logistics Consolidation' opportunity by Alex Rivera (Admin).</p>
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Premium Footer */}
            <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
              <button 
                onClick={() => setDeleteConfirmContact(selectedContact)} 
                className="px-6 py-4 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-[28px] transition-all group shrink-0 active:scale-95"
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
                    Delete {bulkDeleteConfirmOpen === 'companies' ? selectedCompanyIds.length : selectedContactIds.length} {bulkDeleteConfirmOpen === 'companies' ? 'Compan' : 'Contact'}{bulkDeleteConfirmOpen === 'companies' ? (selectedCompanyIds.length > 1 ? 'ies' : 'y') : (selectedContactIds.length > 1 ? 's' : '')}?
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. {bulkDeleteConfirmOpen === 'companies' 
                      ? 'All associated contacts, deals, and projects will be affected.'
                      : 'The contacts will be permanently removed from the enterprise registry.'}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                {(bulkDeleteConfirmOpen === 'companies' 
                  ? companies.filter(c => selectedCompanyIds.includes(c.id))
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
                {(bulkDeleteConfirmOpen === 'companies' ? selectedCompanyIds.length : selectedContactIds.length) > 5 && (
                  <p className="text-xs text-slate-400 font-medium mt-2 text-center">
                    + {(bulkDeleteConfirmOpen === 'companies' ? selectedCompanyIds.length : selectedContactIds.length) - 5} more
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setBulkDeleteConfirmOpen(null)}
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
                  `Delete ${bulkDeleteConfirmOpen === 'companies' ? selectedCompanyIds.length : selectedContactIds.length} ${bulkDeleteConfirmOpen === 'companies' ? 'Compan' : 'Contact'}${bulkDeleteConfirmOpen === 'companies' ? (selectedCompanyIds.length > 1 ? 'ies' : 'y') : (selectedContactIds.length > 1 ? 's' : '')}`
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
