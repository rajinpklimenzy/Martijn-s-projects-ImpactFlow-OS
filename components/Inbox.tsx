import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Mail,
  RefreshCw,
  Search,
  Star,
  StarOff,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Inbox as InboxIcon,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Send,
  User,
  UserPlus,
  Users,
  AtSign,
  Upload as UploadIcon,
  Image as ImageIcon,
  Trash2,
  X,
  CheckCircle2,
  Plus,
  LogOut as DisconnectIcon,
  Paperclip,
  Download,
  File,
  Eye,
  EyeOff,
  CheckCircle2 as CheckCircle,
  Clock,
  AlertCircle as AlertCircleIcon,
  Filter as FilterIcon,
  Bookmark,
  Calendar,
  MapPin,
  ExternalLink,
  Building2,
  Briefcase,
  FolderKanban,
  FileText,
  CheckSquare,
  Link as LinkIcon,
  Ban,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { useSharedInboxEmails, useSharedInboxSenders, useSyncSharedInbox, sharedInboxKeys } from '../hooks/useSharedInboxEmails';
import {
  apiSyncSharedInbox,
  apiGetSharedInboxEmails,
  apiGetSharedInboxSenders,
  apiGetSharedInboxEmailDetails,
  apiMarkSharedInboxEmailRead,
  apiToggleSharedInboxEmailStarred,
  apiGetGoogleCalendarStatus,
  apiGetUsers,
  apiGetConnectedGmailAccounts,
  apiDisconnectGmailAccount,
  apiGetFilteredAccounts,
  apiAddFilteredAccount,
  apiRemoveFilteredAccount,
  apiGetGoogleCalendarAuthUrl,
  apiAddEmailNote,
  apiGetEmailNotes,
  apiDeleteEmailNote,
  apiGenerateAIDraft,
  apiCreateNotification,
  apiCreateEmailTemplate,
  apiGetEmailTemplates,
  apiDeleteEmailTemplate,
  apiSendEmail,
  apiReplyEmail,
  apiForwardEmail,
  apiGetSignatures,
  apiCreateSignature,
  apiGetContacts,
  apiUpdateEmailMetadata,
  apiArchiveEmail,
  apiDeleteEmail,
  apiRestoreEmail,
  apiDownloadAttachment,
  apiGetGmailLabels,
  apiCreateGmailLabel,
  apiUpdateEmailLabels,
  apiRemoveEmailLabel,
  apiCategorizeEmail,
  apiGetCategorizationRules,
  apiCreateCategorizationRule,
  apiUpdateCategorizationRule,
  apiDeleteCategorizationRule,
  apiGetFolderMapping,
  apiUpdateFolderMapping,
  apiGetCategorizationAccuracy,
  apiGetCalendarEvents,
  apiCreateCalendarEvent,
  apiGetCalendarAvailability,
  apiCreateMeetingFromEmail,
  apiGetDriveFiles,
  apiAttachDriveFile,
  apiLinkContact,
  apiLinkCompany,
  apiLinkDeal,
  apiLinkProject,
  apiLinkContract,
  apiGetSuggestedLinks,
  apiCreateTaskFromEmail,
  apiGetRelatedTasks,
  apiGetRelatedProjects,
  apiGetRelatedContracts,
  apiGetCompanies,
  apiGetDeals,
  apiGetProjects,
  apiGetContracts,
  apiSaveDraft,
  apiLoadGmailDrafts,
  apiScheduleSendEmail,
  apiGetExcludedDomains,
  apiAddExcludedDomain,
  apiRemoveExcludedDomain,
} from '../utils/api';
import ScheduleMeetingModal from './ScheduleMeetingModal';
import { ImageWithFallback } from './common';
import type { SharedInboxFilters } from '../utils/api';
import { hasPermission, isAdmin, isCollaboratorOrAdmin } from '../utils/permissions';

interface SharedInboxEmail {
  id: string;
  subject: string;
  sender: string;
  email: string;
  lastMessage: string;
  timestamp: string;
  status: string;
  isStarred: boolean;
  isRead: boolean;
  assigneeId?: string | null;
  sharedByName?: string | null;
  gmailThreadId?: string;
  internalDate?: string;
  accountEmail?: string; // Gmail account that synced this email
  accountOwnerId?: string; // User ID who owns this Gmail account
  accountOwnerName?: string; // Name of user who owns this Gmail account
  to?: string[]; // Recipients
  cc?: string[]; // CC recipients
  bcc?: string[]; // BCC recipients
  participants?: string[]; // All email addresses in thread
  threadStatus?: 'active' | 'archived' | 'resolved' | 'pending';
  priority?: 'high' | 'medium' | 'low';
  owner?: string | null; // Assigned team member ID
  senderClassification?: 'customer' | 'internal' | 'system';
  linkedRecords?: {
    contactId?: string;
    companyId?: string;
    dealId?: string;
    projectId?: string;
    contractId?: string;
  };
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
    downloadUrl?: string;
    previewUrl?: string;
  }>;
  syncStatus?: {
    readStatus?: 'synced' | 'pending' | 'failed';
    starredStatus?: 'synced' | 'pending' | 'failed';
    labelsStatus?: 'synced' | 'pending' | 'failed';
    readStatusSyncedAt?: string;
    starredStatusSyncedAt?: string;
    labelsSyncedAt?: string;
    readStatusError?: string;
    starredStatusError?: string;
    labelsError?: string;
  };
  labels?: string[]; // Array of Gmail label IDs
}

interface EmailDetail extends SharedInboxEmail {
  body: string;
  gmailThreadId?: string;
}

// Wrapper component to properly type ReactQuill with ref support
// Note: ReactQuill internally uses findDOMNode which triggers a deprecation warning in React 18+
// This is a known limitation of the react-quill library and cannot be fixed without modifying the library itself
const QuillEditor = React.forwardRef<any, any>((props, ref) => {
  return <ReactQuill {...props} ref={ref} />;
});
QuillEditor.displayName = 'QuillEditor';

/** Renders email body as HTML (sanitized) when content looks like HTML, otherwise as plain text. Optional highlightTerm for search match highlighting. */
function EmailBodyContent({ content, highlightTerm }: { content: string; highlightTerm?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const raw = content || 'No content';
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(raw);

  // Lazy load images when they come into view
  useEffect(() => {
    if (!containerRef.current) return;

    const images = containerRef.current.querySelectorAll('img[data-src]');
    if (images.length === 0) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const dataSrc = img.getAttribute('data-src');
          if (dataSrc) {
            img.src = dataSrc;
            img.removeAttribute('data-src');
            img.loading = 'lazy';
            imageObserver.unobserve(img);
          }
        }
      });
    }, { rootMargin: '50px' });

    images.forEach(img => imageObserver.observe(img));

    return () => {
      images.forEach(img => imageObserver.unobserve(img));
    };
  }, [content]);

  if (highlightTerm && highlightTerm.trim()) {
    const term = highlightTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${term})`, 'gi');
    const plain = looksLikeHtml ? raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : raw;
    const withHighlight = plain.replace(re, '<mark class="bg-amber-200 rounded px-0.5">$1</mark>');
    const sanitized = DOMPurify.sanitize(withHighlight, { ALLOWED_TAGS: ['mark', 'br'] });
    return (
      <div ref={containerRef} className="prose prose-slate max-w-none text-sm break-words email-body-content" style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: sanitized }} />
    );
  }
  const sanitized = looksLikeHtml ? DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target', 'loading'],
    ADD_TAGS: ['img']
  }) : '';

  // Add lazy loading to images in HTML content
  let processedHtml = sanitized;
  if (looksLikeHtml && sanitized) {
    // Add loading="lazy" and convert src to data-src for lazy loading
    processedHtml = sanitized.replace(/<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
      return `<img${before}data-src="${src}" loading="lazy"${after}>`;
    });
  }

  return (
    <div
      ref={containerRef}
      className="prose prose-slate max-w-none text-sm break-words email-body-content"
      {...(looksLikeHtml
        ? { dangerouslySetInnerHTML: { __html: processedHtml } }
        : { style: { whiteSpace: 'pre-wrap' } as React.CSSProperties, children: raw })}
    />
  );
}

// Module-level guard: only one background sync can start within this window (avoids duplicate POST /sync when effect runs twice or multiple mounts)
const BACKGROUND_SYNC_DEBOUNCE_MS = 90 * 1000; // 90 seconds
let lastBackgroundSyncStartedAt = 0;

const Inbox: React.FC<{ currentUser?: any }> = ({ currentUser: propUser }) => {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const currentUser = propUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user_data') || 'null') : null);
  const userId = currentUser?.id;
  const userRole = currentUser?.role || 'Viewer';

  // Permission checks
  const canAddNote = hasPermission(userRole, 'shared-inbox:add-note');
  const canAssignEmail = hasPermission(userRole, 'shared-inbox:assign-email');
  const canSendEmail = hasPermission(userRole, 'shared-inbox:send-email');
  const canReplyEmail = hasPermission(userRole, 'shared-inbox:reply-email');
  const canForwardEmail = hasPermission(userRole, 'shared-inbox:forward-email');
  const canStarEmail = hasPermission(userRole, 'shared-inbox:star-email');
  const canArchiveEmail = hasPermission(userRole, 'shared-inbox:archive-email');
  const canDeleteEmail = hasPermission(userRole, 'shared-inbox:delete-email');
  const canUpdateMetadata = hasPermission(userRole, 'shared-inbox:update-metadata');
  const canManageAccounts = hasPermission(userRole, 'shared-inbox:manage-accounts');
  const canSyncEmails = hasPermission(userRole, 'shared-inbox:sync-emails');

  // Helper function to safely extract error message without circular references
  // NEVER tries to serialize the error object - only accesses safe string properties
  const getSafeErrorMessage = (err: any, defaultMsg: string = 'An error occurred'): string => {
    // Immediately return default if err is falsy
    if (!err) return defaultMsg;

    // Handle string errors directly
    if (typeof err === 'string') return err;

    // For objects, ONLY access known safe string properties
    // NEVER call JSON.stringify, String(), or any method that might serialize the object
    if (typeof err === 'object') {
      // Check for message property (most common)
      if (typeof err.message === 'string' && err.message) {
        return err.message;
      }
      // Check for nested error.message
      if (err.error && typeof err.error === 'object' && typeof err.error.message === 'string' && err.error.message) {
        return err.error.message;
      }
      // If we can't safely extract, return default - don't try to stringify!
      return defaultMsg;
    }

    // For non-object, non-string types, return default to avoid serialization
    return defaultMsg;
  };

  /** Convert plain text with newlines to HTML so Quill displays line breaks correctly */
  const plainTextToHtmlForQuill = (text: string): string => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/\n/g, '<br/>');
  };

  // Wrapper to safely execute async functions without React serializing errors
  const safeAsyncCall = async <T,>(fn: () => Promise<T>, errorHandler?: (msg: string) => void): Promise<T | null> => {
    try {
      return await fn();
    } catch (err: any) {
      const errorMsg = getSafeErrorMessage(err, 'An error occurred');
      if (errorHandler) {
        errorHandler(errorMsg);
      }
      return null;
    }
  };

  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const backgroundSyncInProgress = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const PAGE_SIZE = 50;
  const [search, setSearch] = useState('');
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  // Advanced filters (sent to API)
  const [filterFrom, setFilterFrom] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSubjectOperator, setFilterSubjectOperator] = useState<'contains' | 'equals' | 'starts' | 'ends'>('contains');
  const [filterHasAttachment, setFilterHasAttachment] = useState<boolean | undefined>(undefined);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterIsRead, setFilterIsRead] = useState<boolean | undefined>(undefined);
  const [filterIsStarred, setFilterIsStarred] = useState<boolean | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [senderDropdownOpen, setSenderDropdownOpen] = useState(false);

  // Use React Query for senders
  const { data: senders = [] } = useSharedInboxSenders(userId, showAdvancedSearch ? 150 : undefined);
  const [savedSearches, setSavedSearches] = useState<Array<{ id: string; name: string; filters: SharedInboxFilters & { search?: string } }>>([]);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState('');
  const [showSavedSearchesDropdown, setShowSavedSearchesDropdown] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<Array<{ email: string; userId: string; ownerName: string; connectedAt: string; lastSyncedAt: string; isCurrentUser?: boolean }>>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Array<{ id: string; accountEmail: string; createdAt: string }>>([]);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [accountSearchFilter, setAccountSearchFilter] = useState('');
  const [disconnectingAccount, setDisconnectingAccount] = useState<string | null>(null);
  const [filteringAccount, setFilteringAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'threads'>('list');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [internalThreads, setInternalThreads] = useState<Record<string, Array<{ id: string; userId: string; userName: string; message: string; timestamp: string; imageUrl?: string; imageName?: string }>>>({});
  const [newThreadMessage, setNewThreadMessage] = useState('');
  const [noteImagePreview, setNoteImagePreview] = useState<string>('');
  const [noteImageFile, setNoteImageFile] = useState<File | null>(null);
  const [isAddingThread, setIsAddingThread] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiDraftVariations, setAiDraftVariations] = useState<Array<{ style: string; description: string; draft: string; confidence: number }>>([]);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState<number | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const aiDraftEditorRef = useRef<any>(null);
  const aiDraftQuillInstanceRef = useRef<any>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplateNameModal, setShowTemplateNameModal] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const [filteredMentionUsers, setFilteredMentionUsers] = useState<any[]>([]);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [markedForUsers, setMarkedForUsers] = useState<string[]>([]);
  const [showMarkForDropdown, setShowMarkForDropdown] = useState(false);
  const [markForSearchQuery, setMarkForSearchQuery] = useState('');
  const markForDropdownRef = useRef<HTMLDivElement | null>(null);
  const [imagePreviewModal, setImagePreviewModal] = useState<{ isOpen: boolean; imageUrl: string; imageName?: string }>({
    isOpen: false,
    imageUrl: '',
    imageName: undefined,
  });
  const [attachmentPreviewModal, setAttachmentPreviewModal] = useState<{ isOpen: boolean; emailId: string; attachmentId: string; filename: string; mimeType: string; url?: string } | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState<{ [key: string]: boolean }>({});

  // Labels state
  const [gmailLabels, setGmailLabels] = useState<Array<{ id: string; name: string; type: string; accountEmail: string }>>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string | null>(null);
  const [showLabelSelector, setShowLabelSelector] = useState(false);
  const [labelSelectorEmailId, setLabelSelectorEmailId] = useState<string | null>(null);
  const [suggestedLabels, setSuggestedLabels] = useState<Array<{ labelId: string | null; labelName: string; source: string }>>([]);
  const [currentSuggestionId, setCurrentSuggestionId] = useState<string | null>(null);
  const [categorizingLoading, setCategorizingLoading] = useState(false);
  const [categorizationRules, setCategorizationRules] = useState<Array<{ id: string; type: string; value: string; labelId: string; labelName?: string; enabled?: boolean }>>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showCategorizationRulesModal, setShowCategorizationRulesModal] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const emailListContainerRef = useRef<HTMLUListElement | null>(null);
  const loadMoreInFlightRef = useRef(false);
  const [newRuleType, setNewRuleType] = useState<'domain' | 'keyword'>('domain');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleLabelId, setNewRuleLabelId] = useState('');
  const [folderMappings, setFolderMappings] = useState<Array<{ labelId: string; labelName?: string; viewName?: string; sortOrder?: number }>>([]);
  const [showFolderMappingModal, setShowFolderMappingModal] = useState(false);
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [selectedAccountForLabel, setSelectedAccountForLabel] = useState<string>('');
  const [accuracyStats, setAccuracyStats] = useState<{ summary: { total: number; accepted: number; rejected: number; changed: number; pending: number; accuracyRate: number }; bySource: any; periodDays: number } | null>(null);
  const [loadingAccuracyStats, setLoadingAccuracyStats] = useState(false);

  // Calendar integration state (Phase 5)
  const [linkedCalendarEvents, setLinkedCalendarEvents] = useState<Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    location?: string;
    participants?: string[];
    googleEventId?: string;
    htmlLink?: string;
  }>>([]);
  const [loadingCalendarEvents, setLoadingCalendarEvents] = useState(false);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);
  const [scheduleMeetingExtractedDetails, setScheduleMeetingExtractedDetails] = useState<{
    title?: string;
    date?: string;
    time?: string;
    location?: string;
    participants?: string[];
    description?: string;
  } | null>(null);
  const [scheduleMeetingEmailId, setScheduleMeetingEmailId] = useState<string | null>(null);
  const [scheduleMeetingEmailSubject, setScheduleMeetingEmailSubject] = useState<string | null>(null);
  const [scheduleMeetingEmailBody, setScheduleMeetingEmailBody] = useState<string | null>(null);
  const [scheduleMeetingEmailParticipants, setScheduleMeetingEmailParticipants] = useState<string[] | null>(null);

  // Excluded domains state
  const [excludedDomains, setExcludedDomains] = useState<Array<{ id: string; domain: string; createdAt?: string }>>([]);
  const [newExcludedDomain, setNewExcludedDomain] = useState('');
  const [isLoadingExcludedDomains, setIsLoadingExcludedDomains] = useState(false);
  const [isAddingExcludedDomain, setIsAddingExcludedDomain] = useState(false);
  const [showExcludedDomainsModal, setShowExcludedDomainsModal] = useState(false);

  // Compose/Reply state
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeMode, setComposeMode] = useState<'compose' | 'reply' | 'replyAll' | 'forward'>('compose');
  const [composeTo, setComposeTo] = useState<string[]>([]);
  const [composeCc, setComposeCc] = useState<string[]>([]);
  const [composeBcc, setComposeBcc] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAccountEmail, setComposeAccountEmail] = useState<string>('');
  const [composeSignature, setComposeSignature] = useState<string>('');
  const [signatures, setSignatures] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [contactSuggestions, setContactSuggestions] = useState<any[]>([]);
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [composeAttachments, setComposeAttachments] = useState<Array<{ file: File; preview?: string; id: string; isDriveFile?: boolean; driveFileId?: string; driveWebViewLink?: string; driveIconLink?: string }>>([]);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
  const [driveSearchQuery, setDriveSearchQuery] = useState('');
  const [driveNextPageToken, setDriveNextPageToken] = useState<string | null>(null);

  // CRM Integration state (Phase 7.1 & 7.2)
  const [companies, setCompanies] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [suggestedLinks, setSuggestedLinks] = useState<{ contacts: any[]; companies: any[] }>({ contacts: [], companies: [] });
  const [loadingSuggestedLinks, setLoadingSuggestedLinks] = useState(false);
  const [relatedTasks, setRelatedTasks] = useState<any[]>([]);
  const [relatedProjects, setRelatedProjects] = useState<any[]>([]);
  const [relatedContracts, setRelatedContracts] = useState<any[]>([]);
  const [loadingRelatedItems, setLoadingRelatedItems] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkModalType, setLinkModalType] = useState<'contact' | 'company' | 'deal' | 'project' | 'contract' | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [linkingEmail, setLinkingEmail] = useState(false);

  // Confirmation modals state
  const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] = useState<string | null>(null);
  const [showDiscardEmailConfirm, setShowDiscardEmailConfirm] = useState(false);

  // Compose enhancements state (Phase 8.2)
  const [composeSelectedTemplate, setComposeSelectedTemplate] = useState<string | null>(null);
  const [showAIDraftPanel, setShowAIDraftPanel] = useState(false);
  const [composeAIDraft, setComposeAIDraft] = useState<string | null>(null);
  const [isGeneratingComposeDraft, setIsGeneratingComposeDraft] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState<Record<string, number>>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [showScheduleSendModal, setShowScheduleSendModal] = useState(false);
  const [scheduleSendDateTime, setScheduleSendDateTime] = useState('');
  const [scheduleSendTimezone, setScheduleSendTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [gmailDrafts, setGmailDrafts] = useState<any[]>([]);
  const [loadingGmailDrafts, setLoadingGmailDrafts] = useState(false);
  const [showGmailDraftsModal, setShowGmailDraftsModal] = useState(false);

  // Bulk selection state (Phase 8.1)
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Sort state (Phase 8.1)
  const [sortBy, setSortBy] = useState<'date' | 'sender' | 'subject' | 'unread'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Advanced filters state (Phase 8.1)
  const [filterAssignedToMe, setFilterAssignedToMe] = useState(false);
  const [filterAssignedToTeamMember, setFilterAssignedToTeamMember] = useState<string | null>(null);

  const quillEditorRef = useRef<any>(null);
  const quillInstanceRef = useRef<any>(null); // Store the actual Quill editor instance
  const noteImageInputRef = useRef<HTMLInputElement>(null);
  const composeQuillRef = useRef<any>(null);

  /** Parse Gmail-style search syntax from search box (e.g. from:john subject:invoice has:attachment is:unread) */
  const parseGmailSearchSyntax = useCallback((query: string): { from?: string; subject?: string; hasAttachment?: boolean; isRead?: boolean; isStarred?: boolean; searchText: string } => {
    const result: { from?: string; subject?: string; hasAttachment?: boolean; isRead?: boolean; isStarred?: boolean; searchText: string } = { searchText: '' };
    if (!query || typeof query !== 'string') return result;
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < query.length; i++) {
      const c = query[i];
      if (c === '"') { inQuotes = !inQuotes; continue; }
      if (!inQuotes && (c === ' ' || c === '\t')) {
        if (current) { tokens.push(current); current = ''; }
        continue;
      }
      current += c;
    }
    if (current) tokens.push(current);
    const remainder: string[] = [];
    for (const token of tokens) {
      const fromMatch = token.match(/^from:(.+)$/i);
      if (fromMatch) { result.from = fromMatch[1].trim(); continue; }
      const subjectMatch = token.match(/^subject:(.+)$/i);
      if (subjectMatch) { result.subject = subjectMatch[1].trim(); continue; }
      if (/^has:attachment$/i.test(token)) { result.hasAttachment = true; continue; }
      if (/^has:no-attachment$/i.test(token) || /^-has:attachment$/i.test(token)) { result.hasAttachment = false; continue; }
      if (/^is:read$/i.test(token)) { result.isRead = true; continue; }
      if (/^is:unread$/i.test(token)) { result.isRead = false; continue; }
      if (/^is:starred$/i.test(token)) { result.isStarred = true; continue; }
      if (/^is:unstarred$/i.test(token)) { result.isStarred = false; continue; }
      remainder.push(token);
    }
    result.searchText = remainder.join(' ').trim();
    return result;
  }, []);

  // Build filters object from state
  const filters = useMemo<SharedInboxFilters>(() => {
    const parsed = parseGmailSearchSyntax(search);
    const filterObj: SharedInboxFilters = {};

    if (parsed.searchText) filterObj.search = parsed.searchText;
    if (filterStatus) filterObj.status = filterStatus;
    const fromVal = parsed.from ?? filterFrom;
    if (fromVal) filterObj.from = fromVal;
    const subjectVal = parsed.subject ?? filterSubject;
    if (subjectVal) {
      filterObj.subject = subjectVal;
      (filterObj as any).subjectOperator = filterSubjectOperator;
    }
    const hasAttachmentVal = parsed.hasAttachment !== undefined ? parsed.hasAttachment : filterHasAttachment;
    if (hasAttachmentVal !== undefined) filterObj.hasAttachment = hasAttachmentVal;
    if (filterDateFrom) filterObj.dateFrom = filterDateFrom;
    if (filterDateTo) filterObj.dateTo = filterDateTo;
    if (selectedLabelFilter) filterObj.labelId = selectedLabelFilter;
    const isReadVal = parsed.isRead !== undefined ? parsed.isRead : filterIsRead;
    if (isReadVal !== undefined) filterObj.isRead = isReadVal;
    const isStarredVal = parsed.isStarred !== undefined ? parsed.isStarred : filterIsStarred;
    if (isStarredVal !== undefined) filterObj.isStarred = isStarredVal;

    return filterObj;
  }, [search, filterStatus, filterFrom, filterSubject, filterSubjectOperator, filterHasAttachment, filterDateFrom, filterDateTo, selectedLabelFilter, filterIsRead, filterIsStarred, parseGmailSearchSyntax]);

  // Use React Query for email fetching
  const {
    data: emailsData,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    hasNextPage: hasMore,
    fetchNextPage,
    error: emailsError,
    refetch,
  } = useSharedInboxEmails(userId, Object.keys(filters).length > 0 ? filters : undefined, {
    staleTime: 60 * 1000, // 1 min – show cached data, refetch in background
    refetchInterval: 2 * 60 * 1000, // 2 min – avoid frequent heavy refetches
  });

  // Flatten pages into single array and deduplicate
  const emails = useMemo(() => {
    if (!emailsData?.pages) return [];
    const allEmails = emailsData.pages.flatMap(page => page.data || []);
    // Deduplicate by ID
    const uniqueEmails = allEmails.filter((email, index, self) =>
      email.id && index === self.findIndex(e => e.id === email.id)
    );
    return uniqueEmails;
  }, [emailsData]);

  const totalEmails = emailsData?.pages[0]?.total ?? emails.length;

  // Sync mutation
  const syncMutation = useSyncSharedInbox();

  const loadMoreEmails = useCallback(() => {
    if (loadMoreInFlightRef.current || loadingMore || !hasMore || !userId) return;
    loadMoreInFlightRef.current = true;
    fetchNextPage();
  }, [loadingMore, hasMore, fetchNextPage, userId]);

  useEffect(() => {
    if (!loadingMore) loadMoreInFlightRef.current = false;
  }, [loadingMore]);

  // Update error state from React Query
  useEffect(() => {
    if (emailsError) {
      const msg = (emailsError as any)?.message || 'Failed to load inbox';
      setError(msg);
      if (msg.toLowerCase().includes('google') || msg.toLowerCase().includes('connected')) {
        setGmailConnected(false);
      }
    } else {
      setError(null);
    }
  }, [emailsError]);

  // Infinite scroll observer with throttled scroll fallback (avoids duplicate API calls)
  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    const scrollContainer = emailListContainerRef.current;

    if (!loadMoreElement || !scrollContainer || !hasMore || loadingMore) return;

    let observer: IntersectionObserver | null = null;
    let scrollHandler: ((e: Event) => void) | null = null;
    let scrollThrottleId: ReturnType<typeof setTimeout> | null = null;
    const SCROLL_THROTTLE_MS = 400;

    // Primary: Use IntersectionObserver with scrollable container as root
    try {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMoreEmails();
          }
        },
        {
          threshold: 0.1,
          rootMargin: '300px',
          root: scrollContainer
        }
      );

      observer.observe(loadMoreElement);
    } catch (err) {
      console.warn('[INBOX] IntersectionObserver failed, using scroll fallback:', err);
    }

    // Fallback: throttled scroll listener so we don't fire loadMore on every scroll tick
    scrollHandler = () => {
      if (loadingMore || !hasMore) return;
      if (scrollThrottleId != null) return;

      scrollThrottleId = setTimeout(() => {
        scrollThrottleId = null;
        const container = scrollContainer;
        const element = loadMoreElement;
        if (!container || !element || loadingMore || !hasMore) return;

        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const distanceFromBottom = containerRect.bottom - elementRect.top;

        if (distanceFromBottom < 500 && distanceFromBottom > -100) {
          loadMoreEmails();
        }
      }, SCROLL_THROTTLE_MS);
    };

    scrollContainer.addEventListener('scroll', scrollHandler, { passive: true });

    return () => {
      if (scrollThrottleId != null) clearTimeout(scrollThrottleId);
      if (observer) observer.disconnect();
      if (scrollHandler && scrollContainer) {
        scrollContainer.removeEventListener('scroll', scrollHandler);
      }
    };
  }, [hasMore, loadingMore, loadMoreEmails, viewMode, emails.length]);

  const checkGmailConnection = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiGetGoogleCalendarStatus(userId);
      const connected = res?.connected === true || res?.data?.connected === true;
      setGmailConnected(connected);
    } catch {
      setGmailConnected(false);
    }
  }, [userId]);

  const loadExcludedDomains = useCallback(async () => {
    if (!userId) return;
    setIsLoadingExcludedDomains(true);
    try {
      const res = await apiGetExcludedDomains(userId);
      const raw = res?.data ?? res ?? [];
      const list = Array.isArray(raw) ? raw : [];
      // Defensive: only show entries with a non-empty domain
      setExcludedDomains(list.filter((d: { id: string; domain?: string }) => (d.domain && String(d.domain).trim()) || false));
    } catch (err: any) {
      console.error('[INBOX] Failed to load excluded domains:', err);
      showError(getSafeErrorMessage(err, 'Failed to load excluded domains'));
      setExcludedDomains([]);
    } finally {
      setIsLoadingExcludedDomains(false);
    }
  }, [userId, showError]);

  const handleAddExcludedDomain = useCallback(async () => {
    if (!userId || !newExcludedDomain.trim()) return;
    setIsAddingExcludedDomain(true);
    try {
      await apiAddExcludedDomain(userId, newExcludedDomain.trim());
      setNewExcludedDomain('');
      await loadExcludedDomains();
      showSuccess('Domain added to exclusion list');
      // Reload emails to apply the filter
      refetch();
    } catch (err: any) {
      console.error('[INBOX] Failed to add excluded domain:', err);
      showError(getSafeErrorMessage(err, 'Failed to add excluded domain'));
    } finally {
      setIsAddingExcludedDomain(false);
    }
  }, [userId, newExcludedDomain, loadExcludedDomains, refetch, showSuccess, showError]);

  const handleRemoveExcludedDomain = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await apiRemoveExcludedDomain(userId, id);
      await loadExcludedDomains();
      showSuccess('Domain removed from exclusion list');
      // Reload emails to apply the filter
      refetch();
    } catch (err: any) {
      console.error('[INBOX] Failed to remove excluded domain:', err);
      showError(getSafeErrorMessage(err, 'Failed to remove excluded domain'));
    }
  }, [userId, loadExcludedDomains, refetch, showSuccess, showError]);

  const loadConnectedAccounts = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiGetConnectedGmailAccounts(userId);
      const accounts = res?.data ?? res ?? [];
      // Deduplicate accounts by email (case-insensitive) + userId combination
      // This ensures we show all unique account/user combinations
      const uniqueAccounts = Array.isArray(accounts)
        ? accounts.filter((account, index, self) => {
            const accountEmailLower = (account.email || '').toLowerCase();
            return self.findIndex(a => 
              (a.email || '').toLowerCase() === accountEmailLower && 
              a.userId === account.userId
            ) === index;
          })
        : [];
      setConnectedAccounts(uniqueAccounts);
      setGmailConnected(uniqueAccounts.length > 0);
      // Set default account email for compose
      if (uniqueAccounts.length > 0 && !composeAccountEmail) {
        setComposeAccountEmail(uniqueAccounts[0].email);
      }
    } catch (err: any) {
      console.error('[INBOX] Failed to load connected accounts:', err);
      setConnectedAccounts([]);
      setGmailConnected(false);
    }
  }, [userId]);

  const handleConnectAccount = async () => {
    if (!userId) return;
    try {
      const res = await apiGetGoogleCalendarAuthUrl(userId);
      const authUrl = res?.authUrl || res?.data?.authUrl;
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        showError('Failed to get authorization URL');
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to connect account');
    }
  };

  const handleDisconnectAccount = async (accountEmail: string) => {
    if (!userId) return;
    setDisconnectingAccount(accountEmail);
    try {
      await apiDisconnectGmailAccount(userId, accountEmail);
      showSuccess(`Disconnected ${accountEmail}`);
      await loadConnectedAccounts();
      await refetch(); // Reload emails after disconnecting
    } catch (err: any) {
      showError(err?.message || 'Failed to disconnect account');
    } finally {
      setDisconnectingAccount(null);
    }
  };

  const loadFilteredAccounts = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiGetFilteredAccounts(userId);
      const data = res?.data ?? res ?? [];
      setFilteredAccounts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[INBOX] Failed to load filtered accounts:', err);
      setFilteredAccounts([]);
    }
  }, [userId]);

  const handleFilterAccount = async (accountEmail: string) => {
    if (!userId) return;
    setFilteringAccount(accountEmail);
    try {
      await apiAddFilteredAccount(userId, accountEmail);
      await loadFilteredAccounts();
      
      await queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      showSuccess(`Emails from ${accountEmail} will be hidden`);
    } catch (err: any) {
      showError(err?.message || 'Failed to filter account');
    } finally {
      setFilteringAccount(null);
    }
  };

  const handleUnfilterAccount = async (filterId: string, accountEmail: string) => {
    if (!userId) return;
    setFilteringAccount(accountEmail);
    try {
      await apiRemoveFilteredAccount(userId, filterId);
      await loadFilteredAccounts();
      
      await queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      showSuccess(`Emails from ${accountEmail} will now be visible`);
    } catch (err: any) {
      showError(err?.message || 'Failed to unfilter account');
    } finally {
      setFilteringAccount(null);
    }
  };

  useEffect(() => {
    if (!userId) {
      setGmailConnected(false);
      return;
    }
    checkGmailConnection();
    loadConnectedAccounts();
    loadExcludedDomains();
    loadFilteredAccounts();
  }, [userId, checkGmailConnection, loadConnectedAccounts, loadExcludedDomains, loadFilteredAccounts]);

  // Update compose account email when accounts change
  useEffect(() => {
    if (connectedAccounts.length > 0 && !composeAccountEmail) {
      setComposeAccountEmail(connectedAccounts[0].email);
    }
  }, [connectedAccounts]);

  // React Query handles refetching automatically - no manual useEffect needed

  // Load saved searches from localStorage on mount
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('impactOS_savedSearches') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedSearches(parsed);
      }
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (savedSearches.length === 0) return;
    try {
      localStorage.setItem('impactOS_savedSearches', JSON.stringify(savedSearches));
    } catch (_) { /* ignore */ }
  }, [savedSearches]);

  // Senders are automatically fetched via React Query when showAdvancedSearch is true

  // Load users for mentions
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await apiGetUsers();
        const userData = res?.data ?? res ?? [];
        setUsers(Array.isArray(userData) ? userData : []);
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to load users';
        console.error('Failed to load users:', errorMsg);
      }
    };
    if (userId) loadUsers();
  }, [userId]);

  // Close mark for dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (markForDropdownRef.current && !markForDropdownRef.current.contains(event.target as Node)) {
        setShowMarkForDropdown(false);
      }
    };
    if (showMarkForDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMarkForDropdown]);

  // Load contacts for autocomplete
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const res = await apiGetContacts();
        const contactData = res?.data ?? res ?? [];
        setContacts(Array.isArray(contactData) ? contactData : []);
      } catch (err: any) {
        console.error('Failed to load contacts:', err?.message);
      }
    };
    if (userId) loadContacts();
  }, [userId]);

  // Fetch Gmail labels (accepts both { success, labels } and { data } from API or simulator)
  const fetchGmailLabels = useCallback(async (force = false) => {
    if (!userId) return;
    if (loadingLabels && !force) return;
    try {
      setLoadingLabels(true);
      const response: any = await apiGetGmailLabels(userId);
      const list = response?.labels ?? response?.data;
      setGmailLabels(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('Error fetching labels:', err);
      setGmailLabels([]);
    } finally {
      setLoadingLabels(false);
    }
  }, [userId]);

  // Load Gmail labels on mount when connected
  useEffect(() => {
    if (userId && gmailConnected) {
      fetchGmailLabels();
    }
  }, [userId, gmailConnected, fetchGmailLabels]);

  // When Manage Labels modal opens, ensure we have fresh labels (refetch if needed)
  useEffect(() => {
    if (showLabelSelector && labelSelectorEmailId && userId) {
      fetchGmailLabels(true);
    }
  }, [showLabelSelector, labelSelectorEmailId, userId, fetchGmailLabels]);

  // Load signatures
  useEffect(() => {
    const loadSignatures = async () => {
      if (!userId) return;
      try {
        const res = await apiGetSignatures(userId);
        const signatureData = res?.data ?? res ?? [];
        setSignatures(Array.isArray(signatureData) ? signatureData : []);
        // Set default signature
        const defaultSig = signatureData.find((s: any) => s.isDefault);
        if (defaultSig) {
          setComposeSignature(defaultSig.content || '');
        }
      } catch (err: any) {
        console.error('Failed to load signatures:', err?.message);
      }
    };
    if (userId && showComposeModal) loadSignatures();
  }, [userId, showComposeModal]);

  const handleSync = async () => {
    if (!userId) return;
    setSyncing(true);
    setError(null);
    try {
      await syncMutation.mutateAsync({ userId, scopeDays: 'all' });
      showSuccess('Syncing all emails from connected accounts');
      // React Query will automatically refetch emails after sync mutation invalidates the cache
    } catch (err: any) {
      const msg = err?.message || 'Sync failed';
      showError(msg);
      setError(msg);
    } finally {
      setSyncing(false);
    }
  };

  // Automatic background sync every 25 minutes – syncs all emails from connected accounts (no loader)
  // Use refs to store stable references and prevent multiple sync calls
  const syncMutationRef = useRef(syncMutation);
  const queryClientRef = useRef(queryClient);
  
  // Update refs when they change (but don't trigger effect re-run)
  useEffect(() => {
    syncMutationRef.current = syncMutation;
    queryClientRef.current = queryClient;
  }, [syncMutation, queryClient]);

  useEffect(() => {
    if (!userId || !canSyncEmails) {
      // Clean up if conditions are not met
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Clean up any existing timers first to prevent duplicates
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    const performBackgroundSync = () => {
      const now = Date.now();
      if (now - lastBackgroundSyncStartedAt < BACKGROUND_SYNC_DEBOUNCE_MS) {
        return; // Another instance or double effect already started a sync recently
      }
      if (backgroundSyncInProgress.current) {
        return;
      }

      lastBackgroundSyncStartedAt = now;
      backgroundSyncInProgress.current = true;
      setBackgroundSyncing(true);

      syncMutationRef.current.mutate(
        { userId, scopeDays: 'all' },
        {
          onSuccess: () => {
            backgroundSyncInProgress.current = false;
            setBackgroundSyncing(false);
          },
          onError: (err: any) => {
            console.log('[INBOX] Background sync failed:', err?.message || 'Unknown error');
            backgroundSyncInProgress.current = false;
            setBackgroundSyncing(false);
          },
        }
      );
    };

    // First sync only after page has had time to load (30s) – keeps initial load fast; sync runs in background
    syncTimeoutRef.current = setTimeout(() => {
      performBackgroundSync();
      syncTimeoutRef.current = null;
    }, 30 * 1000);

    // Set up interval for every 25 minutes (25 * 60 * 1000 = 1500000 ms)
    syncIntervalRef.current = setInterval(() => {
      performBackgroundSync();
    }, 25 * 60 * 1000); // 25 minutes

    return () => {
      // Clean up timers on unmount or dependency change
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      backgroundSyncInProgress.current = false;
    };
    // Only depend on userId and canSyncEmails - stable values that should trigger re-setup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, canSyncEmails]);

  // Load suggested links for email (Phase 7.1)
  const loadSuggestedLinks = async (emailId: string) => {
    if (!userId) return;
    setLoadingSuggestedLinks(true);
    try {
      const res = await apiGetSuggestedLinks(emailId);
      setSuggestedLinks(res?.data || { contacts: [], companies: [] });
    } catch (err: any) {
      console.error('Failed to load suggested links:', err);
      setSuggestedLinks({ contacts: [], companies: [] });
    } finally {
      setLoadingSuggestedLinks(false);
    }
  };

  // Load related items (tasks, projects, contracts) for email (Phase 7.2)
  const loadRelatedItems = async (emailId: string) => {
    if (!userId) return;
    setLoadingRelatedItems(true);
    try {
      const [tasksRes, projectsRes, contractsRes] = await Promise.all([
        apiGetRelatedTasks(emailId).catch(() => ({ success: true, data: [] })),
        apiGetRelatedProjects(emailId).catch(() => ({ success: true, data: [] })),
        apiGetRelatedContracts(emailId).catch(() => ({ success: true, data: [] }))
      ]);
      setRelatedTasks(tasksRes?.data || []);
      setRelatedProjects(projectsRes?.data || []);
      setRelatedContracts(contractsRes?.data || []);
    } catch (err: any) {
      console.error('Failed to load related items:', err);
      setRelatedTasks([]);
      setRelatedProjects([]);
      setRelatedContracts([]);
    } finally {
      setLoadingRelatedItems(false);
    }
  };

  // Load CRM data (companies, deals, projects, contracts) for linking
  useEffect(() => {
    const loadCrmData = async () => {
      if (!userId) return;
      try {
        const [compRes, dealRes, projRes, contractRes] = await Promise.all([
          apiGetCompanies().catch(() => ({ data: [] })),
          apiGetDeals(userId).catch(() => ({ data: [] })),
          apiGetProjects(userId).catch(() => ({ data: [] })),
          apiGetContracts({ userId }).catch(() => ({ data: [] }))
        ]);
        setCompanies(compRes?.data || []);
        setDeals(dealRes?.data || []);
        setProjects(projRes?.data || []);
        setContracts(contractRes?.data || []);
      } catch (err: any) {
        console.error('Failed to load CRM data:', err);
      }
    };
    loadCrmData();
  }, [userId]);

  // Handle linking email to CRM entity
  const handleLinkEmail = async (type: 'contact' | 'company' | 'deal' | 'project' | 'contract', entityId: string) => {
    if (!selectedEmail?.id || !userId) return;
    setLinkingEmail(true);
    try {
      const emailId = selectedEmail.id;
      let linkedRecordKey: 'contactId' | 'companyId' | 'dealId' | 'projectId' | 'contractId';

      // Call appropriate API function based on type
      switch (type) {
        case 'contact':
          await apiLinkContact({ emailId, contactId: entityId, userId });
          linkedRecordKey = 'contactId';
          break;
        case 'company':
          await apiLinkCompany({ emailId, companyId: entityId, userId });
          linkedRecordKey = 'companyId';
          break;
        case 'deal':
          await apiLinkDeal({ emailId, dealId: entityId, userId });
          linkedRecordKey = 'dealId';
          break;
        case 'project':
          await apiLinkProject({ emailId, projectId: entityId, userId });
          linkedRecordKey = 'projectId';
          break;
        case 'contract':
          await apiLinkContract({ emailId, contractId: entityId, userId });
          linkedRecordKey = 'contractId';
          break;
        default:
          throw new Error(`Unknown link type: ${type}`);
      }

      showSuccess(`Email linked to ${type} successfully`);

      // Update selected email's linkedRecords
      setSelectedEmail(prev => prev ? {
        ...prev,
        linkedRecords: {
          ...(prev.linkedRecords || {}),
          [linkedRecordKey]: entityId
        }
      } : null);

      // Reload related items
      loadRelatedItems(emailId);
      setShowLinkModal(false);
      setLinkModalType(null);
    } catch (err: any) {
      showError(err?.message || `Failed to link email to ${type}`);
    } finally {
      setLinkingEmail(false);
    }
  };

  // Handle creating task from email
  const handleCreateTaskFromEmail = async (taskData: { title?: string; description?: string; dueDate?: string; priority?: string; projectId?: string; assigneeId?: string }) => {
    if (!selectedEmail?.id || !userId) return;
    try {
      const res = await apiCreateTaskFromEmail({
        emailId: selectedEmail.id,
        userId,
        title: taskData.title || selectedEmail.subject || 'Task from Email',
        description: taskData.description || selectedEmail.body || '',
        dueDate: taskData.dueDate,
        priority: taskData.priority || 'Medium',
        projectId: taskData.projectId,
        assigneeId: taskData.assigneeId
      });
      showSuccess('Task created successfully');
      setShowCreateTaskModal(false);
      // Reload related items
      loadRelatedItems(selectedEmail.id);
    } catch (err: any) {
      showError(err?.message || 'Failed to create task');
    }
  };

  const handleSelectEmail = async (email: SharedInboxEmail) => {
    if (!userId) return;
    setSelectedEmail(null);
    setSuggestedLabels([]);
    setCurrentSuggestionId(null);
    setAiDraft(null);
    setAiDraftVariations([]);
    setSelectedVariationIndex(null);
    setDetailLoading(true);
    
    // Check if email is unread before loading details
    const isUnread = !email.isRead;
    
    // Update cache IMMEDIATELY to remove blue dot right away (optimistic update)
    // Update all email queries to ensure UI updates immediately
    if (isUnread) {
      // Update all queries matching the emails pattern
      queryClient.setQueriesData(
        { queryKey: sharedInboxKeys.emails() },
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          // Create completely new objects to ensure React detects the change
          const newPages = oldData.pages.map((page: any) => {
            const updatedData = page.data.map((e: SharedInboxEmail) =>
              e.id === email.id ? { ...e, isRead: true } : e
            );
            return {
              ...page,
              data: updatedData,
            };
          });
          // Return new object with new pages array
          return {
            ...oldData,
            pages: newPages,
          };
        }
      );
      // Do not invalidate here: we already updated the cache; invalidate would trigger a full refetch (page=0 + all cursors).
    }
    
    try {
      const res = await apiGetSharedInboxEmailDetails(email.id, userId);
      const data = res?.data ?? res ?? {};
      const emailDetails = {
        ...email,
        ...data,
        body: data.body ?? email.lastMessage,
        gmailThreadId: data.gmailThreadId ?? email.gmailThreadId,
        isRead: true, // Ensure it's marked as read in the details view
      };
      setSelectedEmail(emailDetails);
      
      // Automatically mark as read if unread and sync to Gmail
      if (isUnread) {
        // Mark as read and sync to Gmail (silently, no notification)
        // Pass silent=true to avoid showing success/error notifications
        handleMarkRead(email.id, true, true).catch((readErr: any) => {
          // Log error but don't show notification - email details are still loaded
          console.error('[INBOX] Failed to mark email as read:', readErr?.message);
          // Revert optimistic update on error
          queryClient.setQueryData(
            sharedInboxKeys.emailsList(userId || '', filters),
            (oldData: any) => {
              if (!oldData?.pages) return oldData;
              return {
                ...oldData,
                pages: oldData.pages.map((page: any) => ({
                  ...page,
                  data: page.data.map((e: SharedInboxEmail) =>
                    e.id === email.id ? { ...e, isRead: false } : e
                  ),
                })),
              };
            }
          );
        });
      }

      // Load suggested links and related items
      if (email.id) {
        loadSuggestedLinks(email.id);
        loadRelatedItems(email.id);
      }

      // Load notes for this email
      try {
        const notesRes = await apiGetEmailNotes(email.id);
        const notesData = notesRes?.data ?? notesRes ?? [];
        setInternalThreads(prev => ({
          ...prev,
          [email.id]: notesData.map((note: any) => ({
            id: note.id,
            userId: note.userId,
            userName: note.userName,
            message: note.message,
            timestamp: note.createdAt,
            imageUrl: note.imageUrl,
            imageName: note.imageName,
            markedFor: note.markedFor || [],
          })),
        }));
      } catch (notesErr: any) {
        const errorMsg = notesErr?.message || 'Failed to load notes';
        console.error('Failed to load notes:', errorMsg);
        // Initialize empty array if no notes exist
        setInternalThreads(prev => ({
          ...prev,
          [email.id]: [],
        }));
      }

      // Load calendar events linked to this email (Phase 5)
      if (userId) {
        try {
          setLoadingCalendarEvents(true);
          const eventsRes = await apiGetCalendarEvents(userId, email.id);
          if (eventsRes.success && eventsRes.data) {
            setLinkedCalendarEvents(eventsRes.data);
          } else {
            setLinkedCalendarEvents([]);
          }
        } catch (err: any) {
          console.error('Failed to load calendar events:', err.message);
          setLinkedCalendarEvents([]);
        } finally {
          setLoadingCalendarEvents(false);
        }
      }
    } catch (err: any) {
      showError(err?.message || 'Could not load email');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleMarkRead = async (emailId: string, markAsRead: boolean, silent: boolean = false) => {
    if (!userId) return;
    try {
      await apiMarkSharedInboxEmailRead(emailId, markAsRead, userId);
      // Update cache optimistically - update all email queries
      queryClient.setQueriesData(
        { queryKey: sharedInboxKeys.emails() },
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          const newPages = oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.map((e: SharedInboxEmail) =>
              e.id === emailId ? {
                ...e,
                isRead: markAsRead,
                syncStatus: {
                  ...(e.syncStatus || {}),
                  readStatus: 'pending'
                }
              } : e
            ),
          }));
          return {
            ...oldData,
            pages: newPages,
          };
        }
      );
      if (selectedEmail?.id === emailId) {
        setSelectedEmail((prev) => (prev ? {
          ...prev,
          isRead: markAsRead,
          syncStatus: {
            ...(prev.syncStatus || {}),
            readStatus: 'pending'
          }
        } : null));
      }
      // Cache already updated above; skip invalidate to avoid full list refetch (page=0 + all cursors).
      if (!silent) {
        showSuccess(markAsRead ? 'Marked as read' : 'Marked as unread');
      }
    } catch (err: any) {
      if (!silent) {
        showError(err?.message || 'Update failed');
        refetch();
      } else {
        console.error('[INBOX] Failed to mark email as read:', err?.message);
      }
    }
  };

  const handleToggleStar = async (emailId: string, isStarred: boolean) => {
    try {
      await apiToggleSharedInboxEmailStarred(emailId, isStarred);
      // Update cache optimistically
      queryClient.setQueryData(
        sharedInboxKeys.emailsList(userId || '', filters),
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              data: page.data.map((e: SharedInboxEmail) =>
                e.id === emailId ? {
                  ...e,
                  isStarred,
                  syncStatus: {
                    ...(e.syncStatus || {}),
                    starredStatus: 'pending'
                  }
                } : e
              ),
            })),
          };
        }
      );
      if (selectedEmail?.id === emailId) {
        setSelectedEmail((prev) => (prev ? {
          ...prev,
          isStarred,
          syncStatus: {
            ...(prev.syncStatus || {}),
            starredStatus: 'pending'
          }
        } : null));
      }
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      showSuccess(isStarred ? 'Starred' : 'Unstarred');
    } catch (err: any) {
      showError(err?.message || 'Update failed');
      refetch();
    }
  };

  // Helper to get sync status icon
  const getSyncStatusIcon = (status?: 'synced' | 'pending' | 'failed') => {
    if (!status) return null;
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-3 h-3 text-green-500" title="Synced to Gmail" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-amber-500 animate-pulse" title="Syncing..." />;
      case 'failed':
        return <AlertCircleIcon className="w-3 h-3 text-red-500" title="Sync failed" />;
      default:
        return null;
    }
  };

  // Update email labels
  const handleUpdateEmailLabels = async (emailId: string, addLabelIds: string[] = [], removeLabelIds: string[] = [], trackAccuracy: boolean = false, suggestionId?: string) => {
    try {
      await apiUpdateEmailLabels(emailId, { addLabelIds, removeLabelIds, trackAccuracy, suggestionId });
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      if (selectedEmail?.id === emailId) {
        const currentLabels = selectedEmail.labels || [];
        const updatedLabels = [...currentLabels];
        addLabelIds.forEach(id => {
          if (!updatedLabels.includes(id)) updatedLabels.push(id);
        });
        removeLabelIds.forEach(id => {
          const index = updatedLabels.indexOf(id);
          if (index > -1) updatedLabels.splice(index, 1);
        });
        setSelectedEmail({
          ...selectedEmail,
          labels: updatedLabels,
          syncStatus: {
            ...(selectedEmail.syncStatus || {}),
            labelsStatus: 'pending'
          }
        });
      }

      showSuccess('Labels updated');
    } catch (err: any) {
      showError(err?.message || 'Failed to update labels');
    }
  };

  // Remove label from email
  const handleRemoveEmailLabel = async (emailId: string, labelId: string) => {
    try {
      await apiRemoveEmailLabel(emailId, labelId);
      await handleUpdateEmailLabels(emailId, [], [labelId]);
    } catch (err: any) {
      showError(err?.message || 'Failed to remove label');
    }
  };

  // Create new Gmail label
  const handleCreateLabel = async (labelName: string, accountEmail: string) => {
    if (!userId) return;
    setCreatingLabel(true);
    try {
      await apiCreateGmailLabel({
        userId,
        accountEmail,
        labelName,
        messageListVisibility: 'show',
        labelListVisibility: 'labelShow'
      });
      showSuccess('Label created successfully');
      await fetchGmailLabels(); // Refresh labels list
      setNewLabelName('');
      setShowCreateLabelModal(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to create label');
    } finally {
      setCreatingLabel(false);
    }
  };

  // Get label name by ID
  const getLabelName = (labelId: string): string => {
    const label = gmailLabels.find(l => l.id === labelId);
    return label?.name || labelId;
  };

  const handleUpdateEmailMetadata = async (emailId: string, updates: { priority?: 'high' | 'medium' | 'low'; threadStatus?: 'active' | 'archived' | 'resolved' | 'pending'; owner?: string | null }) => {
    if (!userId) return;
    try {
      await apiUpdateEmailMetadata(emailId, { userId, ...updates });
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      if (selectedEmail?.id === emailId) {
        setSelectedEmail((prev) => (prev ? { ...prev, ...updates } : null));
      }
      showSuccess('Email updated');
    } catch (err: any) {
      showError(err?.message || 'Update failed');
    }
  };

  // Bulk selection handlers (Phase 8.1)
  const handleToggleBulkMode = () => {
    setIsBulkMode(!isBulkMode);
    setSelectedEmailIds(new Set());
  };

  const handleToggleEmailSelection = (emailId: string) => {
    setSelectedEmailIds(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedEmailIds.size === filteredEmails.length) {
      setSelectedEmailIds(new Set());
    } else {
      setSelectedEmailIds(new Set(filteredEmails.map(e => e.id)));
    }
  };

  // Bulk actions (Phase 8.1 & 8.3)
  const handleBulkMarkRead = async () => {
    if (!userId || selectedEmailIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedEmailIds).map((emailId: string) =>
          apiMarkSharedInboxEmailRead(emailId, true, userId)
        )
      );
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      showSuccess(`${selectedEmailIds.size} email(s) marked as read`);
      setSelectedEmailIds(new Set());
    } catch (err: any) {
      showError(err?.message || 'Failed to mark emails as read');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Archive & Organization handlers (Phase 8.3)
  const handleArchiveEmail = async (emailId: string) => {
    if (!userId) return;
    try {
      await apiArchiveEmail(emailId, userId);
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, threadStatus: 'archived' as const } : null);
      }
      showSuccess('Email archived');
    } catch (err: any) {
      showError(err?.message || 'Failed to archive email');
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    if (!userId) return;
    if (!confirm('Are you sure you want to delete this email? This action cannot be undone.')) {
      return;
    }
    try {
      await apiDeleteEmail(emailId, userId);
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
      showSuccess('Email deleted');
    } catch (err: any) {
      showError(err?.message || 'Failed to delete email');
    }
  };

  const handleRestoreEmail = async (emailId: string) => {
    if (!userId) return;
    try {
      await apiRestoreEmail(emailId, userId);
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, threadStatus: 'active' as const } : null);
      }
      showSuccess('Email restored');
    } catch (err: any) {
      showError(err?.message || 'Failed to restore email');
    }
  };

  const handleResolveConversation = async (emailId: string) => {
    if (!userId) return;
    try {
      await apiUpdateEmailMetadata(emailId, { userId, threadStatus: 'resolved' });
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(prev => prev ? { ...prev, threadStatus: 'resolved' as const } : null);
      }
      showSuccess('Conversation marked as resolved');
    } catch (err: any) {
      showError(err?.message || 'Failed to resolve conversation');
    }
  };

  const handleBulkArchive = async () => {
    if (!userId || selectedEmailIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from<string>(selectedEmailIds).map((emailId) =>
          apiArchiveEmail(emailId, userId)
        )
      );
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      showSuccess(`${selectedEmailIds.size} email(s) archived`);
      setSelectedEmailIds(new Set());
    } catch (err: any) {
      showError(err?.message || 'Failed to archive emails');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!userId || selectedEmailIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedEmailIds.size} email(s)? This action cannot be undone.`)) {
      return;
    }
    setBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from<string>(selectedEmailIds).map((emailId) =>
          apiDeleteEmail(emailId, userId)
        )
      );
      const deletedIds = Array.from(selectedEmailIds);
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
      if (selectedEmail && selectedEmailIds.has(selectedEmail.id)) {
        setSelectedEmail(null);
      }
      showSuccess(`${deletedIds.length} email(s) deleted`);
      setSelectedEmailIds(new Set());
    } catch (err: any) {
      showError(err?.message || 'Failed to delete emails');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleViewAttachment = async (emailId: string, attachmentId: string, filename: string, mimeType: string) => {
    if (!userId) return;
    const loadingKey = `${emailId}-${attachmentId}-view`;
    setAttachmentLoading(prev => ({ ...prev, [loadingKey]: true }));
    try {
      const blob = await apiDownloadAttachment(emailId, attachmentId, userId);
      const url = window.URL.createObjectURL(blob);
      setAttachmentPreviewModal({
        isOpen: true,
        emailId,
        attachmentId,
        filename,
        mimeType,
        url
      });
    } catch (err: any) {
      showError(err?.message || 'Failed to load attachment');
    } finally {
      setAttachmentLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleDownloadAttachment = async (emailId: string, attachmentId: string, filename: string) => {
    if (!userId) return;
    const loadingKey = `${emailId}-${attachmentId}-download`;
    setAttachmentLoading(prev => ({ ...prev, [loadingKey]: true }));
    try {
      const blob = await apiDownloadAttachment(emailId, attachmentId, userId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('Attachment downloaded');
    } catch (err: any) {
      showError(err?.message || 'Failed to download attachment');
    } finally {
      setAttachmentLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isImageFile = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  const isPdfFile = (mimeType: string): boolean => {
    return mimeType === 'application/pdf';
  };

  // Handle file selection for compose attachments
  const handleComposeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    const newAttachments: Array<{ file: File; preview?: string; id: string }> = [];

    Array.from(files).forEach((file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        showError(`File "${file.name}" is too large. Maximum size is 25MB.`);
        return;
      }

      const id = `${Date.now()}-${Math.random()}`;
      let preview: string | undefined;

      // Create preview for images
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      newAttachments.push({ file, preview, id });
    });

    setComposeAttachments([...composeAttachments, ...newAttachments]);

    // Reset input
    if (composeFileInputRef.current) {
      composeFileInputRef.current.value = '';
    }
  };

  // Load Drive files
  const loadDriveFiles = async (searchQuery?: string, pageToken?: string) => {
    if (!userId) return;
    setLoadingDriveFiles(true);
    try {
      const res = await apiGetDriveFiles(userId, composeAccountEmail || undefined, undefined, searchQuery || driveSearchQuery, pageToken);
      const data = res?.data || res || {};
      if (pageToken) {
        // Append to existing files
        setDriveFiles(prev => [...prev, ...(data.files || [])]);
      } else {
        // Replace files
        setDriveFiles(data.files || []);
      }
      setDriveNextPageToken(data.nextPageToken || null);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to load Drive files';
      // Check if it's an account not connected error
      if (errorMsg.includes('not connected') || err?.code === 'ACCOUNT_NOT_CONNECTED') {
        showError(`Google account ${composeAccountEmail || 'selected account'} is not connected. Please connect your Google account in Settings.`);
      } else {
        showError(errorMsg);
      }
      // Clear files on error
      if (!pageToken) {
        setDriveFiles([]);
      }
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  // Handle Drive file selection
  const handleAttachDriveFile = async (file: any) => {
    if (!userId || !showComposeModal) return;

    try {
      // Check if we're replying/forwarding (need emailId)
      const emailId = composeMode !== 'compose' && selectedEmail?.id ? selectedEmail.id : `draft_${Date.now()}`;

      // For compose mode, we'll attach it locally first, then attach when sending
      // For reply/forward, attach immediately
      if (composeMode === 'compose') {
        // Add to local attachments list
        const driveAttachment = {
          id: `drive_${file.id}`,
          file: new File([], file.name, { type: file.mimeType }),
          isDriveFile: true,
          driveFileId: file.id,
          driveWebViewLink: file.webViewLink,
          driveIconLink: file.iconLink,
          preview: file.thumbnailLink || file.iconLink
        };
        setComposeAttachments([...composeAttachments, driveAttachment]);
        setShowDrivePicker(false);
        showSuccess('Drive file added');
      } else {
        // For reply/forward, attach immediately via API
        await apiAttachDriveFile({
          userId,
          emailId: selectedEmail!.id,
          fileId: file.id,
          fileName: file.name,
          fileMimeType: file.mimeType,
          webViewLink: file.webViewLink,
          webContentLink: file.webContentLink,
          iconLink: file.iconLink
        });
        setShowDrivePicker(false);
        showSuccess('Drive file attached');
        // Reload email details to show new attachment
        if (selectedEmail) {
          handleSelectEmail(selectedEmail);
        }
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to attach Drive file');
    }
  };

  // Remove attachment from compose
  const handleRemoveComposeAttachment = (id: string) => {
    const attachment = composeAttachments.find(att => att.id === id);
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    // Remove upload progress if exists
    setAttachmentUploadProgress(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setComposeAttachments(composeAttachments.filter(att => att.id !== id));
  };

  // Save Draft Handler (Phase 8.2)
  const handleSaveDraft = async () => {
    if (!userId || !composeAccountEmail || !composeSubject || !composeBody) {
      showError('Please fill in subject and message to save draft');
      return;
    }

    setSavingDraft(true);
    try {
      await apiSaveDraft({
        userId,
        accountEmail: composeAccountEmail || connectedAccounts[0]?.email,
        to: composeTo.length > 0 ? composeTo : undefined,
        cc: composeCc.length > 0 ? composeCc : undefined,
        bcc: composeBcc.length > 0 ? composeBcc : undefined,
        subject: composeSubject,
        body: composeBody,
      });
      showSuccess('Draft saved to Gmail');
    } catch (err: any) {
      const errorMsg = getSafeErrorMessage(err, 'Failed to save draft');
      showError(errorMsg);
    } finally {
      setSavingDraft(false);
    }
  };

  // Load Gmail Drafts Handler (Phase 8.2)
  const loadGmailDrafts = async () => {
    if (!userId || !composeAccountEmail) return;

    setLoadingGmailDrafts(true);
    try {
      const res = await apiLoadGmailDrafts(userId, composeAccountEmail || connectedAccounts[0]?.email);
      const drafts = res?.data || res || [];
      setGmailDrafts(Array.isArray(drafts) ? drafts : []);
    } catch (err: any) {
      const errorMsg = getSafeErrorMessage(err, 'Failed to load drafts');
      showError(errorMsg);
      setGmailDrafts([]);
    } finally {
      setLoadingGmailDrafts(false);
    }
  };

  // Cleanup compose attachments on unmount
  useEffect(() => {
    return () => {
      composeAttachments.forEach(att => {
        if (att.preview) {
          URL.revokeObjectURL(att.preview);
        }
      });
    };
  }, [composeAttachments]);

  // Clear compose attachments when modal closes
  useEffect(() => {
    if (!showComposeModal && composeAttachments.length > 0) {
      composeAttachments.forEach(att => {
        if (att.preview) {
          URL.revokeObjectURL(att.preview);
        }
      });
      setComposeAttachments([]);
    }
  }, [showComposeModal, composeAttachments]);

  // Image compression helper
  const compressNoteImage = (file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            reject(new Error('Canvas context not available'));
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleNoteImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('Image size must be less than 10MB');
      return;
    }

    try {
      const compressed = await compressNoteImage(file, 1200, 1200, 0.8);
      setNoteImagePreview(compressed);
      setNoteImageFile(file);
    } catch (err: any) {
      showError(err.message || 'Failed to process image');
    }
  };


  // Extract mentions from HTML content (for rich text)
  const extractMentionedUsers = (htmlContent: string): string[] => {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';

    const mentionRegex = /@([A-Za-z0-9\s]+?)(?=\s|$|[.,!?])/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(textContent)) !== null) {
      const mentionedName = match[1].trim();
      const user = users.find((u: any) => u.name.toLowerCase() === mentionedName.toLowerCase());
      if (user && user.id !== userId) {
        mentions.push(user.id);
      }
    }

    return [...new Set(mentions)]; // Remove duplicates
  };

  // Quill modules configuration
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
    keyboard: {
      bindings: {
        // Allow @ symbol to be typed normally
        'mention': {
          key: '@',
          handler: () => {
            // Let @ be inserted normally, handleQuillChange will detect it
            return true;
          }
        }
      }
    }
  }), []);

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link'
  ];

  // Handle Quill editor change
  // Note: `editor` parameter is the Quill editor instance (not ReactQuill component)
  const handleQuillChange = useCallback((content: string, delta: any, source: string, editor: any) => {
    setNewThreadMessage(content);
    // Store the Quill editor instance for later use
    quillInstanceRef.current = editor;

    // Only check for mentions on user input (not on programmatic changes)
    if (source === 'user') {
      // Get cursor position from Quill
      const selection = editor.getSelection(true);
      if (selection) {
        const text = editor.getText();
        const textUpToCursor = text.substring(0, selection.index);
        const lastAtSymbol = textUpToCursor.lastIndexOf('@');

        if (lastAtSymbol !== -1) {
          const searchQuery = textUpToCursor.substring(lastAtSymbol + 1);
          const charBeforeAt = lastAtSymbol > 0 ? textUpToCursor[lastAtSymbol - 1] : ' ';

          // Check if @ is at start of word or line
          if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtSymbol === 0) {
            // Only show dropdown if query doesn't contain space or newline
            if (!searchQuery.includes(' ') && !searchQuery.includes('\n') && searchQuery.length < 50) {
              // Save the index where @ starts for mention insertion
              setMentionStartIndex(lastAtSymbol);
              setMentionSearchQuery(searchQuery);
              const filtered = users.filter((u: any) =>
                u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchQuery.toLowerCase())
              );
              setFilteredMentionUsers(filtered);
              setShowMentionDropdown(filtered.length > 0);
            } else {
              setShowMentionDropdown(false);
              setMentionStartIndex(null);
            }
          } else {
            setShowMentionDropdown(false);
            setMentionStartIndex(null);
          }
        } else {
          setShowMentionDropdown(false);
          setMentionStartIndex(null);
        }
      }
    }
  }, [users]);

  // Handle mention selection in Quill
  const handleMentionSelect = useCallback((user: any) => {
    // Get the Quill editor instance from stored reference
    const quill = quillInstanceRef.current;

    if (!quill) {
      console.error('[INBOX] Quill editor not available');
      return;
    }

    // Focus editor first to ensure we can get selection
    quill.focus();

    // Get current text and find @ symbol
    const text = quill.getText();
    let atIndex = mentionStartIndex;

    // If we don't have saved index, find the last @ symbol
    if (atIndex === null || atIndex < 0) {
      atIndex = text.lastIndexOf('@');
    }

    if (atIndex === -1) {
      console.error('[INBOX] Could not find @ symbol for mention');
      setShowMentionDropdown(false);
      setMentionStartIndex(null);
      return;
    }

    // Find where the search query ends (current cursor position or end of query)
    const textAfterAt = text.substring(atIndex + 1);
    const spaceIndex = textAfterAt.indexOf(' ');
    const newlineIndex = textAfterAt.indexOf('\n');
    let queryEndIndex = textAfterAt.length;
    if (spaceIndex !== -1) queryEndIndex = Math.min(queryEndIndex, spaceIndex);
    if (newlineIndex !== -1) queryEndIndex = Math.min(queryEndIndex, newlineIndex);

    // Calculate positions
    const deleteStartIndex = atIndex;
    const deleteEndIndex = atIndex + 1 + queryEndIndex; // +1 for @, +queryEndIndex for query
    const deleteLength = deleteEndIndex - deleteStartIndex;

    console.log('[INBOX] Inserting mention:', {
      atIndex,
      deleteStartIndex,
      deleteEndIndex,
      deleteLength,
      textAfterAt: textAfterAt.substring(0, queryEndIndex),
      mentionText: `@${user.name} `
    });

    // Set selection to delete (@ and search query)
    quill.setSelection(deleteStartIndex, deleteLength, 'api');
    quill.deleteText(deleteStartIndex, deleteLength, 'api');

    // Insert mention with styling
    const mentionText = `@${user.name} `;
    quill.insertText(deleteStartIndex, mentionText, 'api');

    // Apply styling to mention
    quill.formatText(deleteStartIndex, mentionText.length - 1, {
      'bold': true,
      'color': '#4338ca'
    }, 'api');

    // Move cursor after mention
    const newPosition = deleteStartIndex + mentionText.length;
    quill.setSelection(newPosition, 0, 'api');

    // Update content state
    const newContent = quill.root.innerHTML;
    setNewThreadMessage(newContent);

    setShowMentionDropdown(false);
    setMentionStartIndex(null);
  }, [mentionStartIndex]);

  const handleAddThreadMessage = async () => {
    if (!selectedEmail || (!newThreadMessage.trim() && !noteImageFile) || !userId || !currentUser) {
      if (!newThreadMessage.trim() && !noteImageFile) {
        showError('Please enter a note or upload an image');
      }
      return;
    }

    setIsAddingThread(true);
    try {
      const threadId = selectedEmail.id;
      const userName = currentUser.name || currentUser.email || 'You';
      // For HTML content, we need to check if it has actual text content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newThreadMessage;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      const messageText = textContent.trim() ? newThreadMessage.trim() : '';

      // Prepare note data - only include imageUrl if it exists and is not empty
      const notePayload: any = {
        emailId: threadId,
        userId: userId,
        userName: userName,
        message: messageText,
      };

      // Add markedFor if any team members are selected
      if (markedForUsers.length > 0) {
        notePayload.markedFor = markedForUsers;
      }

      // Only add image fields if image exists
      if (noteImagePreview && noteImagePreview.trim()) {
        // Check if base64 string is too large (Firestore limit is ~1MB per field)
        // Base64 is ~33% larger than original, so limit to ~750KB base64 = ~500KB image
        if (noteImagePreview.length > 750000) {
          showError('Image is too large. Please use a smaller image.');
          setIsAddingThread(false);
          return;
        }
        notePayload.imageUrl = noteImagePreview;
        if (noteImageFile?.name) {
          notePayload.imageName = noteImageFile.name;
        }
      }

      // Save note to database
      const res = await apiAddEmailNote(notePayload);

      // Handle response - apiFetch returns the JSON response object directly
      // Backend returns: { success: true, data: { id, ...noteData }, message: "..." }
      // So res = { success: true, data: {...}, message: "..." }
      const noteData = res?.data || {};

      if (!noteData.id && !noteData.emailId) {
        console.error('[INBOX] Invalid note response:', res);
        throw new Error('Invalid response from server. Note was not created.');
      }

      const newMessage = {
        id: noteData.id || `thread-${Date.now()}`,
        userId: userId,
        userName: userName,
        message: messageText,
        timestamp: noteData.createdAt || new Date().toISOString(),
        imageUrl: noteImagePreview || undefined,
        imageName: noteImageFile?.name || undefined,
        markedFor: noteData.markedFor || [],
      };

      // Update local state - add new note at the beginning (newest first)
      setInternalThreads(prev => ({
        ...prev,
        [threadId]: [newMessage, ...(prev[threadId] || [])],
      }));

      // Extract mentioned users and send notifications
      const mentionedUserIds = extractMentionedUsers(messageText);
      if (mentionedUserIds.length > 0) {
        for (const mentionedUserId of mentionedUserIds) {
          try {
            await apiCreateNotification({
              userId: mentionedUserId,
              type: 'mention',
              title: 'You were mentioned in an email note',
              message: `${userName} mentioned you in a note on email: "${selectedEmail.subject || 'Untitled'}"`,
              link: `/?tab=inbox&email=${threadId}`,
              read: false
            });
          } catch (notifErr: any) {
            const errorMsg = notifErr?.message || 'Failed to send notification';
            console.error('Failed to send notification:', errorMsg);
          }
        }
      }

      // Clear form
      setNewThreadMessage('');
      setNoteImagePreview('');
      setNoteImageFile(null);
      setMarkedForUsers([]);
      if (noteImageInputRef.current) noteImageInputRef.current.value = '';
      // Clear Quill editor
      if (quillInstanceRef.current) {
        quillInstanceRef.current.setText('');
      }

      // Show success message
      const successMsg = res?.message || (mentionedUserIds.length > 0
        ? `Note added and ${mentionedUserIds.length} user(s) notified`
        : 'Internal note added');
      showSuccess(successMsg);
    } catch (err: any) {
      // Safely log error without circular references
      const errorMsg = getSafeErrorMessage(err, 'Failed to add note');
      console.error('[INBOX] Error adding note:', errorMsg);
      showError(errorMsg);
    } finally {
      setIsAddingThread(false);
    }
  };

  const handleDeleteThreadMessage = async (emailId: string, noteId: string) => {
    if (!userId || !currentUser) return;

    setDeletingNoteId(noteId);
    try {
      // Delete from database
      await apiDeleteEmailNote(noteId, userId);

      // Update local state
      setInternalThreads(prev => ({
        ...prev,
        [emailId]: (prev[emailId] || []).filter(n => n.id !== noteId),
      }));
      showSuccess('Note deleted');
    } catch (err: any) {
      const errorMsg = getSafeErrorMessage(err, 'Failed to delete note');
      showError(errorMsg);
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleGenerateAIDraft = async (templateId?: string) => {
    if (!selectedEmail || !userId) return;

    setIsGeneratingDraft(true);
    setAiDraftVariations([]);
    setSelectedVariationIndex(null);
    setAiDraft(null);

    try {
      // Call real AI draft API with optional template
      const res = await apiGenerateAIDraft(selectedEmail.id, userId, templateId);
      const draftData = res?.data ?? res ?? {};

      // Handle new format with variations
      if (draftData.variations && Array.isArray(draftData.variations) && draftData.variations.length > 0) {
        setAiDraftVariations(draftData.variations);
        // Auto-select highest confidence variation; convert plain-text newlines to HTML for Quill
        setSelectedVariationIndex(0);
        setAiDraft(plainTextToHtmlForQuill(draftData.variations[0].draft));
        showSuccess(`Generated ${draftData.variations.length} draft variations`);
      } else {
        // Fallback to single draft (backward compatibility)
        let draft = draftData.draft;
        if (!draft || typeof draft !== 'string') {
          draft = `Hi ${selectedEmail.sender || 'there'},

Thank you for your email regarding "${selectedEmail.subject || 'your inquiry'}".

[AI-generated draft response - customize as needed]

Best regards,
${currentUser?.name || 'Team'}`;
        }
        setAiDraft(plainTextToHtmlForQuill(draft));
        setAiDraftVariations([{
          style: 'default',
          description: 'AI-generated draft',
          draft: draft,
          confidence: 75
        }]);
        setSelectedVariationIndex(0);
        showSuccess('AI draft generated');
      }
    } catch (err: any) {
      // Extract error message immediately - NEVER log or serialize the error object
      const errorMsg = getSafeErrorMessage(err, 'Failed to generate draft');

      // Update state first to exit React's error handling context
      setIsGeneratingDraft(false);

      // Then handle error asynchronously to prevent React from serializing error context
      setTimeout(() => {
        console.error('[INBOX] Error generating draft:', errorMsg);
        showError(errorMsg);
      }, 0);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Generate AI draft for compose mode (Phase 8.2)
  const handleGenerateComposeAIDraft = async () => {
    if (!userId || !composeSubject || composeTo.length === 0) {
      showError('Please enter a subject and recipient to generate AI draft');
      return;
    }

    setIsGeneratingComposeDraft(true);
    setComposeAIDraft(null);

    try {
      // For compose mode, we'll generate a draft based on subject and recipient
      // This is a simplified version - in production, you'd call an API endpoint
      const recipientName = composeTo[0].split('@')[0];
      const draft = `Hi ${recipientName},

${composeSubject ? `Regarding: ${composeSubject}` : ''}

[Your message here]

Best regards,
${currentUser?.name || 'Team'}`;

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setComposeAIDraft(plainTextToHtmlForQuill(draft));
      showSuccess('AI draft generated');
    } catch (err: any) {
      const errorMsg = getSafeErrorMessage(err, 'Failed to generate draft');
      showError(errorMsg);
    } finally {
      setIsGeneratingComposeDraft(false);
    }
  };

  const handleUseDraft = () => {
    if (!aiDraft) return;

    // Get text content from Quill editor instance or use HTML content
    let textContent = '';
    try {
      // Try to get plain text from Quill editor
      if (aiDraftQuillInstanceRef.current && typeof aiDraftQuillInstanceRef.current.getText === 'function') {
        textContent = aiDraftQuillInstanceRef.current.getText();
      } else {
        // Fallback: strip HTML tags from draft content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = aiDraft;
        textContent = tempDiv.textContent || tempDiv.innerText || '';
      }
    } catch (err: any) {
      // If anything fails, strip HTML from draft
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = aiDraft || '';
      textContent = tempDiv.textContent || tempDiv.innerText || '';
      // Safely log error without circular references
      const errorMsg = err?.message || 'Error extracting text';
      console.error('[INBOX] Error extracting draft text:', errorMsg);
    }

    // Copy to clipboard
    navigator.clipboard.writeText(textContent).then(() => {
      showSuccess('Draft copied to clipboard! You can paste it into your email client.');
    }).catch((clipboardErr: any) => {
      // Fallback: select text
      try {
        const textarea = document.createElement('textarea');
        textarea.value = textContent;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showSuccess('Draft copied to clipboard!');
      } catch (fallbackErr: any) {
        const errorMsg = fallbackErr?.message || 'Failed to copy to clipboard';
        console.error('[INBOX] Clipboard copy failed:', errorMsg);
        showError('Failed to copy draft. Please select and copy manually.');
      }
    });
  };

  const handleSaveAsTemplate = () => {
    if (!aiDraft || !userId || !selectedEmail) return;
    setTemplateNameInput('');
    setShowTemplateNameModal(true);
  };

  const handleSubmitTemplateName = async () => {
    if (!templateNameInput || !templateNameInput.trim() || !aiDraft || !userId || !selectedEmail) {
      showError('Please enter a template name');
      return;
    }

    try {
      // Ensure content is a string, not a DOM element
      const templateContent = typeof aiDraft === 'string' ? aiDraft : String(aiDraft || '');

      await apiCreateEmailTemplate({
        name: templateNameInput.trim(),
        content: templateContent,
        userId: userId,
        category: 'email-response'
      });
      showSuccess('Template saved successfully!');
      setShowTemplateNameModal(false);
      setTemplateNameInput('');
      // Refresh templates list
      loadTemplates();
    } catch (err: any) {
      const errorMsg = getSafeErrorMessage(err, 'Failed to save template');
      console.error('[INBOX] Error saving template:', errorMsg);
      showError(errorMsg);
    }
  };

  const loadTemplates = async () => {
    if (!userId) return;
    try {
      const res = await apiGetEmailTemplates(userId);
      const templatesData = res?.data ?? res ?? [];
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to load templates';
      console.error('Failed to load templates:', errorMsg);
    }
  };

  useEffect(() => {
    if (userId) {
      loadTemplates();
    }
  }, [userId]);

  // Load templates when compose modal opens (Phase 8.2)
  useEffect(() => {
    if (userId && showComposeModal) {
      loadTemplates();
    }
  }, [userId, showComposeModal]);

  // Helper function to truncate preview text to 100 characters
  const truncatePreview = (text: string | undefined, maxLength: number = 100): string => {
    if (!text) return '';
    // Remove HTML tags and decode entities, normalize whitespace
    let plainText = text.replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Remove common email signature patterns and URLs that might be concatenated
    // This helps clean up previews that include signatures, websites, etc.
    plainText = plainText.replace(/https?:\/\/[^\s]+/g, '').trim();
    plainText = plainText.replace(/\s+/g, ' ').trim();

    if (plainText.length <= maxLength) return plainText;
    // Truncate at word boundary if possible
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  };

  // Helper function to get sender initials for avatar
  const getSenderInitials = (sender: string | undefined, email: string | undefined): string => {
    const name = sender || email || '';
    const parts = name.split(/[\s@]/);
    if (parts.length >= 2) {
      return (parts[0][0] || '').toUpperCase() + (parts[1][0] || '').toUpperCase();
    }
    return (name[0] || '?').toUpperCase();
  };

  // Filter and sort emails (Phase 8.1)
  const filteredEmails = useMemo(() => {
    // Deduplicate emails by ID first to prevent duplicate keys
    const uniqueEmails = emails.filter((email, index, self) =>
      email.id && index === self.findIndex(e => e.id === email.id)
    );
    let result = [...uniqueEmails];

    // Apply threadStatus filter (Phase 8.3: Archive view)
    if (filterStatus === 'archived') {
      result = result.filter(email => email.threadStatus === 'archived');
    } else if (filterStatus && filterStatus !== 'archived') {
      // For other status filters, use the existing filterStatus logic
      result = result.filter(email => email.status === filterStatus);
    } else if (!filterStatus) {
      // By default, exclude archived emails unless specifically viewing archived
      result = result.filter(email => email.threadStatus !== 'archived');
    }

    // Apply label filter
    if (selectedLabelFilter) {
      result = result.filter(email => {
        const emailLabels = email.labels || [];
        return emailLabels.includes(selectedLabelFilter);
      });
    }

    // Apply advanced filters
    if (filterAssignedToMe && userId) {
      result = result.filter(email => email.owner === userId);
    }

    if (filterAssignedToTeamMember) {
      result = result.filter(email => email.owner === filterAssignedToTeamMember);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          const dateA = parseInt(a.internalDate || '0') || 0;
          const dateB = parseInt(b.internalDate || '0') || 0;
          comparison = dateB - dateA; // Most recent first by default
          break;
        case 'sender':
          const senderA = (a.sender || a.email || '').toLowerCase();
          const senderB = (b.sender || b.email || '').toLowerCase();
          comparison = senderA.localeCompare(senderB);
          break;
        case 'subject':
          const subjectA = (a.subject || '').toLowerCase();
          const subjectB = (b.subject || '').toLowerCase();
          comparison = subjectA.localeCompare(subjectB);
          break;
        case 'unread':
          // Unread first (or last if ascending)
          if (a.isRead === b.isRead) {
            // If same read status, sort by date as secondary
            const dateA = parseInt(a.internalDate || '0') || 0;
            const dateB = parseInt(b.internalDate || '0') || 0;
            comparison = dateB - dateA; // Most recent first as secondary sort
          } else {
            // Unread emails come first (negative comparison)
            comparison = a.isRead ? 1 : -1;
          }
          break;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [emails, selectedLabelFilter, filterAssignedToMe, filterAssignedToTeamMember, userId, sortBy, sortOrder]);

  // Clear selected email if it's filtered out from the list
  // This handles cases where filters change (including domain exclusions) and the selected email is no longer visible
  useEffect(() => {
    if (selectedEmail?.id) {
      // Check if the selected email is still in the filtered emails list
      const isEmailInFilteredList = filteredEmails.some(email => email.id === selectedEmail.id);

      if (!isEmailInFilteredList) {
        // Email is not in filtered list anymore (could be due to domain exclusion, status filter, etc.)
        // Clear the selection
        setSelectedEmail(null);
        // Also clear related state
        setSuggestedLabels([]);
        setCurrentSuggestionId(null);
        setAiDraft(null);
        setAiDraftVariations([]);
        setSelectedVariationIndex(null);
        setLinkedCalendarEvents([]);
        setInternalThreads(prev => {
          const updated = { ...prev };
          delete updated[selectedEmail.id];
          return updated;
        });
      }
    }
  }, [filteredEmails, selectedEmail?.id]);

  const unreadCount = filteredEmails.filter(e => !e.isRead).length;

  // Group emails by thread (gmailThreadId) - respects sortBy and sortOrder (Phase 8.1)
  const threadedEmails = useMemo(() => {
    if (viewMode === 'list') return null;

    const threads = new Map<string, SharedInboxEmail[]>();
    filteredEmails.forEach(email => {
      const threadId = email.gmailThreadId || email.id; // Fallback to email.id if no threadId
      if (!threads.has(threadId)) {
        threads.set(threadId, []);
      }
      threads.get(threadId)!.push(email);
    });

    // Sort emails within each thread by date (most recent first)
    const threadArray = Array.from(threads.entries())
      .map(([threadId, threadEmails]) => {
        // Sort emails within thread by date
        const sortedThreadEmails = [...threadEmails].sort((a, b) => {
          const dateA = parseInt(a.internalDate || '0') || 0;
          const dateB = parseInt(b.internalDate || '0') || 0;
          return dateB - dateA;
        });
        return {
          threadId,
          emails: sortedThreadEmails,
          latestEmail: sortedThreadEmails[0],
          unreadCount: sortedThreadEmails.filter(e => !e.isRead).length,
        };
      });

    // Sort threads based on sortBy and sortOrder
    threadArray.sort((a, b) => {
      let comparison = 0;
      const latestA = a.latestEmail;
      const latestB = b.latestEmail;

      switch (sortBy) {
        case 'date':
          const dateA = parseInt(latestA.internalDate || '0') || 0;
          const dateB = parseInt(latestB.internalDate || '0') || 0;
          comparison = dateB - dateA; // Most recent first by default
          break;
        case 'sender':
          const senderA = (latestA.sender || latestA.email || '').toLowerCase();
          const senderB = (latestB.sender || latestB.email || '').toLowerCase();
          comparison = senderA.localeCompare(senderB);
          break;
        case 'subject':
          const subjectA = (latestA.subject || '').toLowerCase();
          const subjectB = (latestB.subject || '').toLowerCase();
          comparison = subjectA.localeCompare(subjectB);
          break;
        case 'unread':
          // Unread threads first
          if (a.unreadCount > 0 && b.unreadCount === 0) comparison = -1;
          else if (a.unreadCount === 0 && b.unreadCount > 0) comparison = 1;
          else if (a.unreadCount === b.unreadCount) {
            // If same unread count, sort by date as secondary
            const dateA = parseInt(latestA.internalDate || '0') || 0;
            const dateB = parseInt(latestB.internalDate || '0') || 0;
            comparison = dateB - dateA;
          } else {
            // More unread emails first
            comparison = b.unreadCount - a.unreadCount;
          }
          break;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return threadArray;
  }, [filteredEmails, viewMode, sortBy, sortOrder]);

  const toggleThread = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const toggleMessage = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  if (!userId) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20 text-center">
        <InboxIcon className="w-14 h-14 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium">Sign in to view Shared Inbox</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col animate-in fade-in duration-300 pb-8 min-w-0 relative">
      {/* Background auto-sync indicator (fixed in corner) */}
      {backgroundSyncing && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-full shadow-lg border border-indigo-500/30 animate-in fade-in duration-200"
          title="Auto-syncing emails from connected accounts"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>Auto-syncing…</span>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Shared Inbox</h1>
            {selectedLabelFilter && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg">
                Filtered: {gmailLabels.find(l => l.id === selectedLabelFilter)?.name || selectedLabelFilter}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Unified view from all team members&apos; Gmail accounts · {unreadCount} unread
            {selectedLabelFilter && ` · ${filteredEmails.length} email${filteredEmails.length !== 1 ? 's' : ''} with label`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Label Filter */}
          {gmailLabels.length > 0 && (
            <div className="relative">
              <select
                value={selectedLabelFilter || ''}
                onChange={(e) => {
                  const newFilter = e.target.value || null;
                  setSelectedLabelFilter(newFilter);

                  // Scroll to top of email list when filter changes
                  const emailListContainer = document.querySelector('.overflow-y-auto');
                  if (emailListContainer) {
                    emailListContainer.scrollTop = 0;
                  }
                }}
                className="px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <option value="">All Labels</option>
                {gmailLabels.map(label => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => setViewMode(viewMode === 'threads' ? 'list' : 'threads')}
            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            title={viewMode === 'threads' ? 'Switch to list view' : 'Switch to threaded view'}
          >
            <MessageSquare className="w-4 h-4" />
            {viewMode === 'threads' ? 'Threads' : 'List'}
          </button>
          {canSyncEmails && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? 'Syncing…' : 'Sync from Gmail'}
            </button>
          )}
          {/* Connected Accounts Button - Compact design */}
          {connectedAccounts.length > 0 && (
            <button
              onClick={() => setShowAccountsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-700 transition-colors"
              title={`${connectedAccounts.length} connected account${connectedAccounts.length !== 1 ? 's' : ''}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Accounts</span>
              <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">{connectedAccounts.length}</span>
            </button>
          )}
        </div>
      </div>


      {gmailConnected === false && connectedAccounts.length === 0 && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-800 font-medium text-sm">Connect Gmail to sync inbox</p>
            <p className="text-amber-700 text-xs mt-1">
              Link your Google account to start syncing emails. You can connect multiple Gmail accounts.
            </p>
            <button
              onClick={handleConnectAccount}
              className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Connect Gmail Account
            </button>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="mt-4 shrink-0 space-y-2 px-1">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search or use from: subject: has:attachment is:read"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && refetch()}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAdvancedSearch(prev => !prev)}
            className={`px-3 py-2.5 border rounded-xl text-sm font-medium flex items-center gap-2 shrink-0 ${showAdvancedSearch ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            title="Advanced filters"
          >
            <FilterIcon className="w-4 h-4" />
            Filters
            {(filterFrom || filterSubject || filterHasAttachment !== undefined || filterDateFrom || filterDateTo || filterIsRead !== undefined || filterIsStarred !== undefined || filterStatus || selectedLabelFilter) && (
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>
        </div>
        {showAdvancedSearch && (
          <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm space-y-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">ADVANCED FILTERS</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1 */}
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">From (sender)</label>
                  <input
                    type="text"
                    placeholder="email or name"
                    value={filterFrom}
                    onChange={e => { setFilterFrom(e.target.value); setSenderDropdownOpen(true); }}
                    onFocus={() => setSenderDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setSenderDropdownOpen(false), 180)}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all hover:border-slate-300"
                  />
                  {senderDropdownOpen && senders.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                      {senders
                        .filter(s => !filterFrom || [s.email, s.name].some(t => t?.toLowerCase().includes(filterFrom.toLowerCase())))
                        .slice(0, 20)
                        .map(s => (
                          <button
                            key={s.email}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex flex-col"
                            onMouseDown={e => { e.preventDefault(); setFilterFrom(s.email || s.name); setSenderDropdownOpen(false); }}
                          >
                            <span className="font-medium text-slate-800">{s.name || s.email}</span>
                            {s.email !== s.name && <span className="text-xs text-slate-500">{s.email}</span>}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Read</label>
                  <div className="relative">
                    <select
                      value={filterIsRead === undefined ? '' : String(filterIsRead)}
                      onChange={e => setFilterIsRead(e.target.value === '' ? undefined : e.target.value === 'true')}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer appearance-none pr-10 hover:border-slate-300"
                    >
                      <option value="">Any</option>
                      <option value="false">Unread</option>
                      <option value="true">Read</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Date from</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={e => setFilterDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all hover:border-slate-300 pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Date to</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={e => setFilterDateTo(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all hover:border-slate-300 pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Subject</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder=""
                      value={filterSubject}
                      onChange={e => setFilterSubject(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all hover:border-slate-300"
                    />
                    <div className="relative w-32">
                      <select
                        value={filterSubjectOperator}
                        onChange={e => setFilterSubjectOperator(e.target.value as 'contains' | 'equals' | 'starts' | 'ends')}
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer appearance-none pr-8 hover:border-slate-300"
                      >
                        <option value="contains">contains</option>
                        <option value="equals">equals</option>
                        <option value="starts">starts with</option>
                        <option value="ends">ends with</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Attachment</label>
                  <div className="relative">
                    <select
                      value={filterHasAttachment === undefined ? '' : String(filterHasAttachment)}
                      onChange={e => setFilterHasAttachment(e.target.value === '' ? undefined : e.target.value === 'true')}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer appearance-none pr-10 hover:border-slate-300"
                    >
                      <option value="">Any</option>
                      <option value="true">Has attachment</option>
                      <option value="false">No attachment</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Status</label>
                  <div className="relative">
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer appearance-none pr-10 hover:border-slate-300"
                    >
                      <option value="">Any</option>
                      <option value="open">Open</option>
                      <option value="assigned">Assigned to me</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Starred</label>
                  <div className="relative">
                    <select
                      value={filterIsStarred === undefined ? '' : String(filterIsStarred)}
                      onChange={e => setFilterIsStarred(e.target.value === '' ? undefined : e.target.value === 'true')}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer appearance-none pr-10 hover:border-slate-300"
                    >
                      <option value="">Any</option>
                      <option value="true">Starred</option>
                      <option value="false">Not starred</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                {gmailLabels.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Label</label>
                    <div className="relative">
                      <select
                        value={selectedLabelFilter || ''}
                        onChange={e => setSelectedLabelFilter(e.target.value || null)}
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer appearance-none pr-10 hover:border-slate-300"
                      >
                        <option value="">All labels</option>
                        {gmailLabels.map(label => (
                          <option key={label.id} value={label.id}>{label.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}
                {/* Advanced Filters: Assigned to me, Assigned to team member (Phase 8.1) */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Assigned To</label>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={filterAssignedToMe}
                        onChange={(e) => {
                          setFilterAssignedToMe(e.target.checked);
                          if (e.target.checked) setFilterAssignedToTeamMember(null);
                        }}
                        className="w-4 h-4 text-indigo-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 focus:border-indigo-500 cursor-pointer transition-colors"
                      />
                      <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">Assigned to me</span>
                    </label>
                    <div className="relative">
                      <select
                        value={filterAssignedToTeamMember || ''}
                        onChange={(e) => {
                          const value = e.target.value || null;
                          setFilterAssignedToTeamMember(value);
                          if (value) setFilterAssignedToMe(false);
                        }}
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer appearance-none pr-10 hover:border-slate-300"
                      >
                        <option value="">Any team member</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() })}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterFrom('');
                  setFilterSubject('');
                  setFilterSubjectOperator('contains');
                  setFilterHasAttachment(undefined);
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setFilterIsRead(undefined);
                  setFilterIsStarred(undefined);
                  setFilterStatus('');
                  setSelectedLabelFilter(null);
                  setFilterAssignedToMe(false);
                  setFilterAssignedToTeamMember(null);
                  setSearch('');
                  setTimeout(() => queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() }), 0);
                }}
                className="px-4 py-2 border-2 border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setShowSaveSearchModal(true)}
                className="px-4 py-2 border-2 border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Save search
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSavedSearchesDropdown(prev => !prev)}
                  className="px-4 py-2 border-2 border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                >
                  <Bookmark className="w-4 h-4" />
                  Saved ({savedSearches.length})
                </button>
                {showSavedSearchesDropdown && (
                  <div className="absolute left-0 top-full z-20 mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                    {savedSearches.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-slate-500">No saved searches</p>
                    ) : (
                      savedSearches.map(s => (
                        <div key={s.id} className="flex items-center group">
                          <button
                            type="button"
                            className="flex-1 text-left px-3 py-2 text-sm hover:bg-slate-100 truncate"
                            onClick={() => {
                              setSearch(s.filters.search ?? '');
                              setFilterFrom(s.filters.from ?? '');
                              setFilterSubject(s.filters.subject ?? '');
                              setFilterSubjectOperator((s.filters as any).subjectOperator ?? 'contains');
                              setFilterHasAttachment(s.filters.hasAttachment);
                              setFilterDateFrom(s.filters.dateFrom ?? '');
                              setFilterDateTo(s.filters.dateTo ?? '');
                              setFilterIsRead(s.filters.isRead);
                              setFilterIsStarred(s.filters.isStarred);
                              setFilterStatus(s.filters.status ?? '');
                              setSelectedLabelFilter(s.filters.labelId ?? null);
                              setShowSavedSearchesDropdown(false);
                              setTimeout(() => queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() }), 0);
                            }}
                          >
                            {s.name}
                          </button>
                          <button
                            type="button"
                            className="p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              setSavedSearches(prev => prev.filter(x => x.id !== s.id));
                              setShowSavedSearchesDropdown(false);
                            }}
                            title="Delete saved search"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCategorizationRulesModal(true);
                  if (userId) {
                    apiGetCategorizationRules(userId).then((r: any) => {
                      const data = r?.data ?? r ?? [];
                      setCategorizationRules(Array.isArray(data) ? data : []);
                    }).catch(() => setCategorizationRules([]));
                  }
                }}
                className="px-4 py-2 border-2 border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                title="Auto-labeling rules (domain or keyword → label)"
              >
                <FilterIcon className="w-4 h-4" />
                Categorization rules
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFolderMappingModal(true);
                  if (userId) {
                    apiGetFolderMapping(userId).then((r: any) => {
                      const data = r?.data ?? r ?? [];
                      setFolderMappings(Array.isArray(data) ? data : []);
                    }).catch(() => setFolderMappings([]));
                  }
                }}
                className="px-4 py-2 border-2 border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                title="Map Gmail labels to Impact OS views"
              >
                Folder mapping
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExcludedDomainsModal(true);
                  if (excludedDomains.length === 0) {
                    loadExcludedDomains();
                  }
                }}
                className="px-4 py-2 border-2 border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                title="Manage excluded email domains"
              >
                <Ban className="w-4 h-4" />
                Excluded Domains {excludedDomains.length > 0 && `(${excludedDomains.length})`}
              </button>
            </div>
          </div>
        )}
        {/* Filter chips */}
        {(search || filterFrom || filterSubject || filterHasAttachment !== undefined || filterDateFrom || filterDateTo || filterIsRead !== undefined || filterIsStarred !== undefined || filterStatus || selectedLabelFilter) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Active:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs">
                Search &quot;{search.length > 20 ? search.slice(0, 20) + '…' : search}&quot;
                <button type="button" onClick={() => setSearch('')} className="hover:bg-slate-300 rounded p-0.5" aria-label="Clear">×</button>
              </span>
            )}
            {selectedLabelFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs">
                Label: {gmailLabels.find(l => l.id === selectedLabelFilter)?.name || selectedLabelFilter}
                <button type="button" onClick={() => setSelectedLabelFilter(null)} className="hover:bg-indigo-200 rounded p-0.5" aria-label="Clear">×</button>
              </span>
            )}
            {filterFrom && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs">
                From: {filterFrom}
                <button type="button" onClick={() => setFilterFrom('')} className="hover:bg-slate-300 rounded p-0.5" aria-label="Clear">×</button>
              </span>
            )}
            {filterSubject && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs">
                Subject
                <button type="button" onClick={() => setFilterSubject('')} className="hover:bg-slate-300 rounded p-0.5" aria-label="Clear">×</button>
              </span>
            )}
            {filterHasAttachment !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs">
                {filterHasAttachment ? 'Has attachment' : 'No attachment'}
                <button type="button" onClick={() => setFilterHasAttachment(undefined)} className="hover:bg-slate-300 rounded p-0.5" aria-label="Clear">×</button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs">
                Status: {filterStatus}
                <button type="button" onClick={() => setFilterStatus('')} className="hover:bg-slate-300 rounded p-0.5" aria-label="Clear">×</button>
              </span>
            )}
            {filterIsRead !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs">
                {filterIsRead ? 'Read' : 'Unread'}
                <button type="button" onClick={() => setFilterIsRead(undefined)} className="hover:bg-slate-300 rounded p-0.5" aria-label="Clear">×</button>
              </span>
            )}
            {filterIsStarred !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs">
                {filterIsStarred ? 'Starred' : 'Not starred'}
                <button type="button" onClick={() => setFilterIsStarred(undefined)} className="hover:bg-slate-300 rounded p-0.5" aria-label="Clear">×</button>
              </span>
            )}
            {(filterDateFrom || filterDateTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs">
                Date {filterDateFrom && filterDateTo ? `${filterDateFrom} – ${filterDateTo}` : (filterDateFrom || filterDateTo)}
                <button type="button" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }} className="hover:bg-slate-300 rounded p-0.5" aria-label="Clear">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Archive View Toggle (Phase 8.3) */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (filterStatus === 'archived') {
              setFilterStatus('');
            } else {
              setFilterStatus('archived');
            }
          }}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${filterStatus === 'archived'
            ? 'bg-indigo-600 text-white'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          <InboxIcon className="w-4 h-4 inline mr-1.5" />
          {filterStatus === 'archived' ? 'Show Active' : 'Show Archived'}
        </button>
        {filterStatus === 'archived' && (
          <span className="text-sm text-slate-500">
            {filteredEmails.length} archived email(s)
          </span>
        )}
      </div>

      {/* Bulk Actions Toolbar & Sort (Phase 8.1) */}
      {(isBulkMode || selectedEmailIds.size > 0) && (
        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm font-medium text-indigo-700 hover:text-indigo-800"
            >
              {selectedEmailIds.size === filteredEmails.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-sm text-indigo-600">
              {selectedEmailIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkMarkRead}
              disabled={bulkActionLoading || selectedEmailIds.size === 0}
              className="px-3 py-1.5 bg-white border border-indigo-300 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark Read
            </button>
            <button
              type="button"
              onClick={handleBulkArchive}
              disabled={bulkActionLoading || selectedEmailIds.size === 0}
              className="px-3 py-1.5 bg-white border border-indigo-300 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Archive
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkActionLoading || selectedEmailIds.size === 0}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={handleToggleBulkMode}
              className="px-3 py-1.5 text-indigo-700 text-sm font-medium hover:text-indigo-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* View Controls: Bulk Mode Toggle & Sort (Phase 8.1) */}
      <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {!isBulkMode && (
            <button
              type="button"
              onClick={handleToggleBulkMode}
              className="px-3 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              Select
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'sender' | 'subject' | 'unread')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date">Date</option>
            <option value="sender">Sender</option>
            <option value="subject">Subject</option>
            <option value="unread">Unread</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Save search modal */}
      {showSaveSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { setShowSaveSearchModal(false); setSavedSearchName(''); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium text-slate-800">Save current search</p>
            <input
              type="text"
              placeholder="Search name"
              value={savedSearchName}
              onChange={e => setSavedSearchName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowSaveSearchModal(false); setSavedSearchName(''); }} className="px-3 py-1.5 text-slate-600 text-sm hover:bg-slate-100 rounded-lg">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  const name = savedSearchName.trim() || 'Saved search';
                  const filters: SharedInboxFilters & { search?: string; subjectOperator?: string } = {
                    search: search || undefined,
                    status: filterStatus || undefined,
                    from: filterFrom || undefined,
                    subject: filterSubject || undefined,
                    subjectOperator: filterSubjectOperator,
                    hasAttachment: filterHasAttachment,
                    dateFrom: filterDateFrom || undefined,
                    dateTo: filterDateTo || undefined,
                    labelId: selectedLabelFilter || undefined,
                    isRead: filterIsRead,
                    isStarred: filterIsStarred
                  };
                  const next = { id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `saved-${Date.now()}`, name, filters };
                  setSavedSearches(prev => [...prev, next]);
                  setShowSaveSearchModal(false);
                  setSavedSearchName('');
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categorization rules modal (Phase 3.3) */}
      {showCategorizationRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowCategorizationRulesModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-800">Auto-labeling rules</p>
              <button
                type="button"
                onClick={async () => {
                  if (!userId) return;
                  setLoadingAccuracyStats(true);
                  try {
                    const res = await apiGetCategorizationAccuracy(userId, 30);
                    const data = (res as any)?.data;
                    setAccuracyStats(data);
                  } catch (e: any) {
                    console.error('Failed to load accuracy stats:', e);
                  } finally {
                    setLoadingAccuracyStats(false);
                  }
                }}
                className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
                disabled={loadingAccuracyStats}
              >
                {loadingAccuracyStats ? 'Loading...' : 'View accuracy stats'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">When an email matches a rule (sender domain or keyword in subject/body), &quot;Suggest labels&quot; will recommend the label. Add rules below.</p>

            {/* Accuracy Stats Section */}
            {accuracyStats && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">Categorization Accuracy (Last {accuracyStats.periodDays} days)</p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <p className="text-xs text-slate-500">Overall Accuracy</p>
                    <p className="text-lg font-semibold text-indigo-600">{accuracyStats.summary.accuracyRate}%</p>
                    <p className="text-xs text-slate-400">{accuracyStats.summary.accepted} accepted / {accuracyStats.summary.accepted + accuracyStats.summary.rejected + accuracyStats.summary.changed} resolved</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Suggestions</p>
                    <p className="text-lg font-semibold text-slate-700">{accuracyStats.summary.total}</p>
                    <p className="text-xs text-slate-400">{accuracyStats.summary.pending} pending</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-600 mb-1">By Source:</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Domain Rules</p>
                      <p className="font-semibold text-slate-700">{accuracyStats.bySource.domain.accuracyRate}%</p>
                      <p className="text-slate-400">{accuracyStats.bySource.domain.accepted}/{accuracyStats.bySource.domain.total}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Keyword Rules</p>
                      <p className="font-semibold text-slate-700">{accuracyStats.bySource.keyword.accuracyRate}%</p>
                      <p className="text-slate-400">{accuracyStats.bySource.keyword.accepted}/{accuracyStats.bySource.keyword.total}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">AI Suggestions</p>
                      <p className="font-semibold text-slate-700">{accuracyStats.bySource.ai.accuracyRate}%</p>
                      <p className="text-slate-400">{accuracyStats.bySource.ai.accepted}/{accuracyStats.bySource.ai.total}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mb-3">
              <select value={newRuleType} onChange={e => setNewRuleType(e.target.value as 'domain' | 'keyword')} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="domain">Sender domain</option>
                <option value="keyword">Keyword</option>
              </select>
              <input
                type="text"
                placeholder={newRuleType === 'domain' ? 'e.g. company.com' : 'e.g. invoice'}
                value={newRuleValue}
                onChange={e => setNewRuleValue(e.target.value)}
                className="flex-1 min-w-[120px] px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
              />
              <select value={newRuleLabelId} onChange={e => setNewRuleLabelId(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Select label</option>
                {gmailLabels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!newRuleValue.trim() || !newRuleLabelId || !userId}
                onClick={async () => {
                  if (!userId || !newRuleValue.trim() || !newRuleLabelId) return;
                  try {
                    await apiCreateCategorizationRule({
                      userId,
                      type: newRuleType,
                      value: newRuleValue.trim(),
                      labelId: newRuleLabelId,
                      labelName: gmailLabels.find(l => l.id === newRuleLabelId)?.name
                    });
                    const res = await apiGetCategorizationRules(userId);
                    const data = (res as any)?.data ?? (res as any) ?? [];
                    setCategorizationRules(Array.isArray(data) ? data : []);
                    setNewRuleValue('');
                    setNewRuleLabelId('');
                    showSuccess('Rule added');
                  } catch (e: any) {
                    showError(e?.message || 'Failed to add rule');
                  }
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Add rule
              </button>
            </div>
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {categorizationRules.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No rules yet. Add a domain or keyword rule above.</p>
              ) : (
                categorizationRules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                    <span className="text-slate-700">
                      <span className="font-medium">{rule.type === 'domain' ? 'Domain' : 'Keyword'}</span>
                      <span className="text-slate-500"> &quot;{rule.value}&quot; → </span>
                      <span className="text-indigo-600">{rule.labelName || rule.labelId}</span>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!userId) return;
                        try {
                          await apiDeleteCategorizationRule(rule.id, userId);
                          setCategorizationRules(prev => prev.filter(r => r.id !== rule.id));
                          showSuccess('Rule removed');
                        } catch (e: any) {
                          showError(e?.message || 'Failed to delete');
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                      title="Delete rule"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => setShowCategorizationRulesModal(false)} className="px-3 py-1.5 text-slate-600 text-sm hover:bg-slate-100 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Excluded Domains Modal */}
      {showExcludedDomainsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowExcludedDomainsModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-red-50 to-pink-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-600 rounded-xl text-white shadow-lg shadow-red-100">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Excluded Email Domains</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Email Filtering</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExcludedDomainsModal(false)}
                  className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm border border-transparent hover:border-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                Emails from domains listed below will not sync or appear in your shared inbox. To see emails from a domain again, remove it from this list.
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Add Domain Section */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. wx.agency"
                  value={newExcludedDomain}
                  onChange={e => setNewExcludedDomain(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newExcludedDomain.trim()) {
                      handleAddExcludedDomain();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddExcludedDomain}
                  disabled={!newExcludedDomain.trim() || isAddingExcludedDomain}
                  className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  {isAddingExcludedDomain ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add
                    </>
                  )}
                </button>
              </div>

              {/* Domains List */}
              {isLoadingExcludedDomains ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
                  <p className="text-sm text-slate-500">Loading excluded domains...</p>
                </div>
              ) : excludedDomains.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <Ban className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-medium">No excluded domains</p>
                  <p className="text-xs text-slate-400 mt-1">Add domains above to prevent emails from syncing</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {excludedDomains
                    .filter(d => d.domain && String(d.domain).trim())
                    .map(domain => (
                    <div
                      key={domain.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-slate-200 hover:border-red-300 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <Ban className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">{domain.domain}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExcludedDomain(domain.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove domain"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowExcludedDomainsModal(false)}
                className="px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder mapping modal (Phase 3.3) */}
      {showFolderMappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowFolderMappingModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col p-4" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-slate-800 mb-2">Folder mapping</p>
            <p className="text-xs text-slate-500 mb-3">Map Gmail labels to display names (view names) in Impact OS. Order determines sort in views.</p>
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 mb-3">
              {folderMappings.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No mappings. Add labels below to create folder-like views.</p>
              ) : (
                folderMappings.map((m, i) => (
                  <div key={m.labelId || i} className="flex items-center gap-2 p-2 text-sm">
                    <span className="flex-1 text-slate-700 truncate">{m.labelName || m.labelId}</span>
                    <input
                      type="text"
                      placeholder="View name"
                      value={m.viewName ?? ''}
                      onChange={e => {
                        const next = [...folderMappings];
                        next[i] = { ...next[i], viewName: e.target.value };
                        setFolderMappings(next);
                      }}
                      className="w-32 px-2 py-1 border border-slate-200 rounded text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setFolderMappings(prev => prev.filter((_, j) => j !== i))}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2 flex-wrap items-center mb-3">
              <select
                value=""
                onChange={e => {
                  const id = e.target.value;
                  if (!id) return;
                  if (folderMappings.some(m => m.labelId === id)) return;
                  const label = gmailLabels.find(l => l.id === id);
                  setFolderMappings(prev => [...prev, { labelId: id, labelName: label?.name, viewName: label?.name ?? '', sortOrder: prev.length }]);
                  e.target.value = '';
                }}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">Add label to mapping</option>
                {gmailLabels.filter(l => !folderMappings.some(m => m.labelId === l.id)).map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowFolderMappingModal(false)} className="px-3 py-1.5 text-slate-600 text-sm hover:bg-slate-100 rounded-lg">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  if (!userId) return;
                  try {
                    await apiUpdateFolderMapping({ userId, mappings: folderMappings });
                    showSuccess('Folder mapping saved');
                    setShowFolderMappingModal(false);
                  } catch (e: any) {
                    showError(e?.message || 'Failed to save');
                  }
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                Save mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Two-column layout: list | detail — on mobile stack with list always visible and scrollable */}
      <div className="flex-1 min-h-[50vh] lg:min-h-[400px] flex flex-col lg:flex-row gap-4 mt-4 min-w-0">
        {/* Email list — scrolls inside this card only; on mobile ensure min height so list is never hidden */}
        <div
          className={`flex flex-col min-h-0 border border-slate-200 rounded-xl bg-white overflow-hidden ${selectedEmail
            ? 'min-h-[35vh] flex-1 lg:min-h-0 lg:w-[380px] lg:max-w-[380px] lg:flex-shrink-0'
            : 'flex-1 min-h-[35vh] lg:min-h-0'
            }`}
        >
          {loading ? (
            <div className="flex-1 overflow-y-auto">
              {/* Loading skeletons */}
              {[...Array(10)].map((_, idx) => (
                <div key={idx} className="px-4 py-3 border-b border-slate-100 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-1/2 mb-1" />
                      <div className="h-3 bg-slate-200 rounded w-full" />
                    </div>
                    <div className="w-16 h-3 bg-slate-200 rounded flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
              <Mail className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">
                {selectedLabelFilter ? 'No emails with this label' : 'No emails yet'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {selectedLabelFilter
                  ? 'Try selecting a different label or clear the filter to see all emails.'
                  : 'Connect Gmail and tap "Sync from Gmail" to pull in your inbox (including older mail).'}
              </p>
              {(filterDateFrom || filterDateTo) && !selectedLabelFilter && (
                <p className="text-slate-500 text-xs mt-2 max-w-sm">
                  To see emails older than your date range, run Sync from Gmail first so full history is available.
                </p>
              )}
              {selectedLabelFilter && (
                <button
                  onClick={() => setSelectedLabelFilter(null)}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
                >
                  Clear Filter
                </button>
              )}
              {!selectedLabelFilter && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 disabled:opacity-60"
                >
                  {syncing ? 'Syncing…' : 'Sync from Gmail'}
                </button>
              )}
            </div>
          ) : viewMode === 'threads' && threadedEmails ? (
            <ul ref={emailListContainerRef} className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0" key={`threads-${selectedLabelFilter || 'all'}`}>
              {threadedEmails.map(thread => {
                const isExpanded = expandedThreads.has(thread.threadId);
                const latest = thread.latestEmail;
                const hasMultiple = thread.emails.length > 1;

                return (
                  <li key={thread.threadId}>
                    {/* Thread header */}
                    <div
                      role={isBulkMode ? undefined : 'button'}
                      tabIndex={isBulkMode ? undefined : 0}
                      onKeyDown={e => {
                        if (!isBulkMode && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          hasMultiple ? toggleThread(thread.threadId) : handleSelectEmail(latest);
                        }
                      }}
                      onClick={() => !isBulkMode && (hasMultiple ? toggleThread(thread.threadId) : handleSelectEmail(latest))}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-start gap-2 cursor-pointer ${selectedEmail?.id === latest.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                        }`}
                    >
                      {/* Bulk Selection Checkbox (Phase 8.1) */}
                      {isBulkMode && (
                        <input
                          type="checkbox"
                          checked={selectedEmailIds.has(latest.id)}
                          onChange={() => handleToggleEmailSelection(latest.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                      )}
                      {/* Sender Avatar (Phase 8.1) */}
                      <div className="flex-shrink-0 mt-0.5">
                        <ImageWithFallback
                          src={undefined}
                          alt={latest.sender || latest.email || ''}
                          fallbackText={latest.sender || latest.email || ''}
                          isAvatar={true}
                          className="w-8 h-8 rounded-full"
                        />
                      </div>
                      {hasMultiple && (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleThread(thread.threadId);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleThread(thread.threadId);
                            }
                          }}
                          className="p-1 hover:bg-slate-200 rounded flex-shrink-0 mt-0.5 cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      )}
                      <div
                        className="flex-1 min-w-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`truncate font-medium ${thread.unreadCount > 0 ? 'text-slate-900' : 'text-slate-600'
                                }`}
                            >
                              {latest.subject || '(No subject)'}
                            </span>
                            {latest.isStarred && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                                {latest.syncStatus?.starredStatus && getSyncStatusIcon(latest.syncStatus.starredStatus)}
                              </div>
                            )}
                            {/* Attachment Indicator (Phase 8.1) */}
                            {latest.attachments && latest.attachments.length > 0 && (
                              <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" title={`${latest.attachments.length} attachment(s)`} />
                            )}
                            {/* Priority Badge */}
                            {latest.priority && (
                              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${latest.priority === 'high' ? 'bg-red-100 text-red-700' :
                                latest.priority === 'low' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                {latest.priority === 'high' ? 'High' : latest.priority === 'low' ? 'Low' : 'Medium'}
                              </span>
                            )}
                            {/* Thread Status Badge */}
                            {latest.threadStatus && latest.threadStatus !== 'active' && (
                              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${latest.threadStatus === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                                latest.threadStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                                  latest.threadStatus === 'archived' ? 'bg-slate-100 text-slate-700' : ''
                                }`}>
                                {latest.threadStatus.charAt(0).toUpperCase() + latest.threadStatus.slice(1)}
                              </span>
                            )}
                            {/* Owner Badge */}
                            {latest.owner && users.find(u => u.id === latest.owner) && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-100 text-indigo-700">
                                {users.find(u => u.id === latest.owner)?.name || 'Assigned'}
                              </span>
                            )}
                            {hasMultiple && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-full">
                                {thread.emails.length}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0 truncate">
                            {latest.sender || latest.email}
                            {hasMultiple && ` · ${thread.emails.length} messages`}
                          </p>
                          {/* Participants display */}
                          {(() => {
                            // Collect all unique participants from thread
                            const allParticipants = new Set<string>();
                            thread.emails.forEach(email => {
                              if (email.participants && Array.isArray(email.participants)) {
                                email.participants.forEach(p => allParticipants.add(p.toLowerCase()));
                              }
                              if (email.to && Array.isArray(email.to)) {
                                email.to.forEach(p => allParticipants.add(p.toLowerCase()));
                              }
                              if (email.cc && Array.isArray(email.cc)) {
                                email.cc.forEach(p => allParticipants.add(p.toLowerCase()));
                              }
                            });
                            const participantsList = Array.from(allParticipants).slice(0, 5);
                            if (participantsList.length > 0) {
                              return (
                                <p className="text-xs text-slate-400 mt-0 truncate">
                                  <span className="text-slate-500">To: </span>
                                  {participantsList.map((p, idx) => (
                                    <span key={p}>
                                      {p.split('@')[0]}
                                      {idx < participantsList.length - 1 && ', '}
                                    </span>
                                  ))}
                                  {allParticipants.size > 5 && ` +${allParticipants.size - 5} more`}
                                </p>
                              );
                            }
                            return null;
                          })()}
                          {(latest.accountEmail || latest.accountOwnerName) && (
                            <p className="text-xs text-slate-400 mt-0 truncate">
                              {latest.accountOwnerName && (
                                <span className="text-slate-500">via {latest.accountOwnerName}</span>
                              )}
                              {latest.accountEmail && (
                                <span className="ml-1 px-1 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-medium rounded">
                                  {latest.accountEmail}
                                </span>
                              )}
                            </p>
                          )}
                          {/* Improved Preview Text Truncation (Phase 8.1) */}
                          {latest.lastMessage && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                              {truncatePreview(latest.lastMessage, 80)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {latest.timestamp}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 mt-0.5" />
                        )}
                      </div>
                      {!isBulkMode && (
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      )}
                    </div>

                    {/* Thread emails (when expanded) */}
                    {isExpanded && hasMultiple && (
                      <div className="bg-slate-50/50 border-l-4 border-indigo-200 pl-4">
                        {thread.emails.map((email, idx) => {
                          const isMessageExpanded = expandedMessages.has(email.id);
                          return (
                            <div key={email.id} className="border-b border-slate-200 last:border-b-0">
                              <button
                                type="button"
                                onClick={() => toggleMessage(email.id)}
                                className={`w-full text-left px-4 py-2.5 hover:bg-slate-100 transition-colors flex items-start gap-3 ${selectedEmail?.id === email.id ? 'bg-indigo-50' : ''
                                  }`}
                              >
                                <div
                                  className="p-1 hover:bg-slate-200 rounded flex-shrink-0 mt-0.5 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMessage(email.id);
                                  }}
                                >
                                  {isMessageExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-slate-500" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-slate-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-xs font-medium ${!email.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                      {email.sender || email.email}
                                    </span>
                                    {!email.isRead && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    )}
                                    {/* Show To/CC if available */}
                                    {(email.to?.length > 0 || email.cc?.length > 0) && (
                                      <span className="text-xs text-slate-400">
                                        {email.to?.length > 0 && `To: ${email.to.slice(0, 2).map((e: string) => e.split('@')[0]).join(', ')}${email.to.length > 2 ? '...' : ''}`}
                                        {email.cc?.length > 0 && ` CC: ${email.cc.slice(0, 2).map((e: string) => e.split('@')[0]).join(', ')}${email.cc.length > 2 ? '...' : ''}`}
                                      </span>
                                    )}
                                  </div>
                                  {email.lastMessage && !isMessageExpanded && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                      {truncatePreview(email.lastMessage, 100)}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                                  {email.timestamp}
                                </span>
                              </button>
                              {/* Expanded message body */}
                              {isMessageExpanded && (
                                <div className="px-4 pb-3 pt-1 bg-white border-t border-slate-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <span className="font-medium">{email.sender || email.email}</span>
                                      <span className="text-slate-400">·</span>
                                      <span>{email.timestamp}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectEmail(email)}
                                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                      View full email →
                                    </button>
                                  </div>
                                  {/* Email body with HTML formatting preserved */}
                                  <div className="text-xs text-slate-700 mt-2">
                                    <EmailBodyContent content={email.lastMessage || 'No content'} />
                                  </div>
                                  {/* Show participants if available */}
                                  {(email.to?.length > 0 || email.cc?.length > 0 || email.bcc?.length > 0) && (
                                    <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-slate-500">
                                      {email.to?.length > 0 && (
                                        <div className="mb-1">
                                          <span className="font-medium">To:</span> {email.to.join(', ')}
                                        </div>
                                      )}
                                      {email.cc?.length > 0 && (
                                        <div className="mb-1">
                                          <span className="font-medium">CC:</span> {email.cc.join(', ')}
                                        </div>
                                      )}
                                      {email.bcc?.length > 0 && (
                                        <div>
                                          <span className="font-medium">BCC:</span> {email.bcc.join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
              {/* Load more: always show when there may be more so user can load older emails */}
              {hasMore && (
                <li className="px-4 py-4 pb-6" ref={loadMoreRef}>
                  {loadingMore ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                      <span className="ml-2 text-sm text-slate-500">Loading more...</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={loadMoreEmails}
                      className="w-full py-3.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl border-2 border-indigo-200 transition-colors"
                    >
                      Load older emails
                    </button>
                  )}
                </li>
              )}
            </ul>
          ) : (
            <ul ref={emailListContainerRef} className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0" key={`list-${selectedLabelFilter || 'all'}`}>
              {filteredEmails.map(email => (
                <li key={email.id}>
                  <div
                    role={isBulkMode ? undefined : 'button'}
                    tabIndex={isBulkMode ? undefined : 0}
                    onKeyDown={e => { if (!isBulkMode && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleSelectEmail(email); } }}
                    onClick={() => !isBulkMode && handleSelectEmail(email)}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex items-start gap-2 cursor-pointer ${selectedEmail?.id === email.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                      }`}
                  >
                    {/* Bulk Selection Checkbox (Phase 8.1) */}
                    {isBulkMode && (
                      <input
                        type="checkbox"
                        checked={selectedEmailIds.has(email.id)}
                        onChange={() => handleToggleEmailSelection(email.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                    )}
                    {/* Sender Avatar (Phase 8.1) */}
                    <div className="flex-shrink-0 mt-0.5">
                      <ImageWithFallback
                        src={undefined}
                        alt={email.sender || email.email || ''}
                        fallbackText={email.sender || email.email || ''}
                        isAvatar={true}
                        className="w-8 h-8 rounded-full"
                      />
                    </div>
                    <div
                      className="flex-1 min-w-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`truncate font-medium ${!email.isRead ? 'text-slate-900' : 'text-slate-600'
                              }`}
                          >
                            {email.subject || '(No subject)'}
                          </span>
                          {email.isStarred && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                              {email.syncStatus?.starredStatus && getSyncStatusIcon(email.syncStatus.starredStatus)}
                            </div>
                          )}
                          {/* Attachment Indicator (Phase 8.1) */}
                          {email.attachments && email.attachments.length > 0 && (
                            <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" title={`${email.attachments.length} attachment(s)`} />
                          )}
                          {/* Priority Badge */}
                          {email.priority && (
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${email.priority === 'high' ? 'bg-red-100 text-red-700' :
                              email.priority === 'low' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                              {email.priority === 'high' ? 'High' : email.priority === 'low' ? 'Low' : 'Medium'}
                            </span>
                          )}
                          {/* Thread Status Badge */}
                          {email.threadStatus && email.threadStatus !== 'active' && (
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${email.threadStatus === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                              email.threadStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                                email.threadStatus === 'archived' ? 'bg-slate-100 text-slate-700' : ''
                              }`}>
                              {email.threadStatus.charAt(0).toUpperCase() + email.threadStatus.slice(1)}
                            </span>
                          )}
                          {/* Owner Badge */}
                          {email.owner && users.find(u => u.id === email.owner) && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-100 text-indigo-700">
                              {users.find(u => u.id === email.owner)?.name || 'Assigned'}
                            </span>
                          )}
                          {/* Label Badges */}
                          {email.labels && email.labels.length > 0 && (
                            <>
                              {email.labels.slice(0, 3).map(labelId => {
                                const label = gmailLabels.find(l => l.id === labelId);
                                if (!label) return null;
                                return (
                                  <span
                                    key={labelId}
                                    className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700"
                                    title={label.name}
                                  >
                                    {label.name}
                                  </span>
                                );
                              })}
                              {email.labels.length > 3 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700">
                                  +{email.labels.length - 3}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0 truncate">
                          {email.sender || email.email}
                        </p>
                        {(email.accountEmail || email.accountOwnerName) && (
                          <p className="text-xs text-slate-400 mt-0 truncate">
                            {email.accountOwnerName && (
                              <span className="text-slate-500">via {email.accountOwnerName}</span>
                            )}
                            {email.accountEmail && (
                              <span className="ml-1 px-1 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-medium rounded">
                                {email.accountEmail}
                              </span>
                            )}
                          </p>
                        )}
                        {/* Improved Preview Text Truncation (Phase 8.1) */}
                        {email.lastMessage && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {truncatePreview(email.lastMessage, 80)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {email.timestamp}
                      </span>
                      {!email.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 mt-0.5" />
                      )}
                    </div>
                    {!isBulkMode && (
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </li>
              ))}
              {/* Load more for list view: show whenever there may be more (no viewMode check so it's always visible when hasMore) */}
              {hasMore && (
                <li ref={loadMoreRef} className="px-4 py-4 pb-6">
                  {loadingMore ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                      <span className="ml-2 text-sm text-slate-500">Loading more...</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={loadMoreEmails}
                      className="w-full py-3.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl border-2 border-indigo-200 transition-colors"
                    >
                      Load older emails
                    </button>
                  )}
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Email detail — height by content; body scrolls inside panel */}
        <div className="flex-1 min-h-[200px] lg:min-h-[400px] flex flex-col border border-slate-200 rounded-xl bg-white overflow-hidden min-w-0 max-h-full">
          {detailLoading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : selectedEmail ? (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="p-3 border-b border-slate-100 flex flex-col gap-2 overflow-visible">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-slate-900 break-words">
                      {selectedEmail.subject || '(No subject)'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="break-words">{selectedEmail.sender || selectedEmail.email}</span>
                      <span>·</span>
                      <span>{selectedEmail.timestamp}</span>
                      {(selectedEmail as EmailDetail).senderClassification && (
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${(selectedEmail as EmailDetail).senderClassification === 'internal' ? 'bg-slate-100 text-slate-700' :
                          (selectedEmail as EmailDetail).senderClassification === 'system' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-50 text-indigo-700'
                          }`}>
                          {(selectedEmail as EmailDetail).senderClassification === 'internal' ? 'Internal' :
                            (selectedEmail as EmailDetail).senderClassification === 'system' ? 'System' : 'Customer'}
                        </span>
                      )}
                    </p>
                    {(selectedEmail.accountEmail || selectedEmail.accountOwnerName) && (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        {selectedEmail.accountOwnerName && (
                          <span>Synced via <span className="font-medium text-slate-600">{selectedEmail.accountOwnerName}</span></span>
                        )}
                        {selectedEmail.accountEmail && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded">
                            {selectedEmail.accountEmail}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  {/* Action buttons moved to separate row */}
                </div>

                {/* CRM Integration - Contact/Company Info & Linking (Phase 7.1) */}
                {selectedEmail.linkedRecords && (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedEmail.linkedRecords.contactId && (() => {
                      const contact = contacts.find(c => c.id === selectedEmail.linkedRecords?.contactId);
                      return contact ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">
                          <User className="w-3 h-3" />
                          {contact.name}
                        </span>
                      ) : null;
                    })()}
                    {selectedEmail.linkedRecords.companyId && (() => {
                      const company = companies.find(c => c.id === selectedEmail.linkedRecords?.companyId);
                      return company ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-lg">
                          <Building2 className="w-3 h-3" />
                          {company.name}
                        </span>
                      ) : null;
                    })()}
                    {selectedEmail.linkedRecords.dealId && (() => {
                      const deal = deals.find(d => d.id === selectedEmail.linkedRecords?.dealId);
                      return deal ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg">
                          <Briefcase className="w-3 h-3" />
                          {deal.title || deal.name}
                        </span>
                      ) : null;
                    })()}
                    {selectedEmail.linkedRecords.projectId && (() => {
                      const project = projects.find(p => p.id === selectedEmail.linkedRecords?.projectId);
                      return project ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg">
                          <FolderKanban className="w-3 h-3" />
                          {project.title || project.name}
                        </span>
                      ) : null;
                    })()}
                    {selectedEmail.linkedRecords.contractId && (() => {
                      const contract = contracts.find(c => c.id === selectedEmail.linkedRecords?.contractId);
                      return contract ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-lg">
                          <FileText className="w-3 h-3" />
                          {contract.title}
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
                {/* Suggested Links (Phase 7.1) */}
                {loadingSuggestedLinks ? (
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Finding matches...
                  </div>
                ) : (suggestedLinks.contacts.length > 0 || suggestedLinks.companies.length > 0) && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Suggested links:</span>
                    {suggestedLinks.contacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => handleLinkEmail('contact', contact.id)}
                        disabled={linkingEmail}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        <User className="w-3 h-3" />
                        {contact.name}
                        <Plus className="w-3 h-3" />
                      </button>
                    ))}
                    {suggestedLinks.companies.map(company => (
                      <button
                        key={company.id}
                        onClick={() => handleLinkEmail('company', company.id)}
                        disabled={linkingEmail}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        <Building2 className="w-3 h-3" />
                        {company.name}
                        <Plus className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
                {/* Linking Buttons (Phase 7.1 & 7.2) */}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 max-w-full">
                  <button
                    type="button"
                    onClick={() => { setLinkModalType('contact'); setShowLinkModal(true); }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <LinkIcon className="w-3 h-3 flex-shrink-0" />
                    Link Contact
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLinkModalType('company'); setShowLinkModal(true); }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <LinkIcon className="w-3 h-3 flex-shrink-0" />
                    Link Company
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLinkModalType('deal'); setShowLinkModal(true); }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <LinkIcon className="w-3 h-3 flex-shrink-0" />
                    Link Deal
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLinkModalType('project'); setShowLinkModal(true); }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <LinkIcon className="w-3 h-3 flex-shrink-0" />
                    Link Project
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLinkModalType('contract'); setShowLinkModal(true); }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <LinkIcon className="w-3 h-3 flex-shrink-0" />
                    Link Contract
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateTaskModal(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <CheckSquare className="w-3 h-3 flex-shrink-0" />
                    Create Task
                  </button>
                </div>
                {/* Labels Display */}
                {selectedEmail.labels && selectedEmail.labels.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-1 max-w-full">
                    {selectedEmail.labels.map(labelId => {
                      const label = gmailLabels.find(l => l.id === labelId);
                      if (!label) return null;
                      return (
                        <span
                          key={labelId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg whitespace-nowrap flex-shrink-0"
                        >
                          <span className="truncate max-w-[200px]">{label.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmailLabel(selectedEmail.id, labelId)}
                            className="hover:text-purple-900 flex-shrink-0"
                            title="Remove label"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Suggest labels (Phase 3.3) */}
                <div className="mt-1 flex flex-wrap items-center gap-2 max-w-full">
                  <button
                    type="button"
                    disabled={categorizingLoading || !userId}
                    onClick={async () => {
                      if (!selectedEmail?.id || !userId) return;
                      setCategorizingLoading(true);
                      setSuggestedLabels([]);
                      try {
                        const res = await apiCategorizeEmail({
                          emailId: selectedEmail.id,
                          userId,
                          useAi: true,
                          availableLabels: gmailLabels.map(l => ({ id: l.id, name: l.name }))
                        });
                        const data = (res as any)?.data;
                        if (data?.suggestedLabels?.length) {
                          setSuggestedLabels(data.suggestedLabels);
                          setCurrentSuggestionId(data.suggestionId || null);
                        }
                      } catch (_) {
                        setSuggestedLabels([]);
                      } finally {
                        setCategorizingLoading(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                  >
                    {categorizingLoading ? <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" /> : <Sparkles className="w-3 h-3 flex-shrink-0" />}
                    Suggest labels
                  </button>
                  {suggestedLabels.length > 0 && (
                    <span className="text-xs text-slate-500 flex-shrink-0">Suggested:</span>
                  )}
                  {suggestedLabels.map((s, i) => (
                    <span
                      key={s.labelId || i}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-800 text-xs font-medium rounded-lg whitespace-nowrap flex-shrink-0"
                    >
                      <span className="truncate max-w-[150px]">{s.labelName}</span>
                      <span className="text-amber-600 text-[10px] flex-shrink-0">({s.source})</span>
                      {s.labelId && (
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateEmailLabels(selectedEmail.id, [s.labelId!], [], true, currentSuggestionId || undefined);
                            setSuggestedLabels(prev => prev.filter((_, j) => j !== i));
                          }}
                          className="hover:bg-amber-100 rounded px-0.5 flex-shrink-0"
                          title="Add to email"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {/* Add Labels Button */}
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLabelSelectorEmailId(selectedEmail.id);
                      setShowLabelSelector(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {selectedEmail.labels && selectedEmail.labels.length > 0 ? 'Manage Labels' : 'Add Labels'}
                  </button>
                </div>
                {/* Custom tags (Phase 3.3) */}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">Tags:</span>
                  {((selectedEmail as any).customTags || []).map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-lg"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => {
                          const next = ((selectedEmail as any).customTags || []).filter((_: string, j: number) => j !== i);
                          apiUpdateEmailMetadata(selectedEmail.id, { userId: userId!, customTags: next }).then(() => {
                            setSelectedEmail(prev => prev ? { ...prev, customTags: next } : null);
                          }).catch(() => { });
                        }}
                        className="hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newTagInput.trim()) {
                        const current = (selectedEmail as any).customTags || [];
                        const next = [...current, newTagInput.trim()];
                        apiUpdateEmailMetadata(selectedEmail.id, { userId: userId!, customTags: next }).then(() => {
                          setSelectedEmail(prev => prev ? { ...prev, customTags: next } : null);
                          setNewTagInput('');
                        }).catch(() => { });
                      }
                    }}
                    className="w-24 px-2 py-0.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                {/* Action Bar - Separate row for better layout */}
                <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100">
                  {/* Email Metadata Controls - Admin only */}
                  {canUpdateMetadata && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Priority Selector */}
                      <select
                        value={selectedEmail.priority || 'medium'}
                        onChange={(e) => handleUpdateEmailMetadata(selectedEmail.id, { priority: e.target.value as 'high' | 'medium' | 'low' })}
                        className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        title="Priority"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>

                      {/* Thread Status Selector */}
                      <select
                        value={selectedEmail.threadStatus || 'active'}
                        onChange={(e) => handleUpdateEmailMetadata(selectedEmail.id, { threadStatus: e.target.value as 'active' | 'archived' | 'resolved' | 'pending' })}
                        className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        title="Status"
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="archived">Archived</option>
                      </select>

                      {/* Owner Selector - Admin only */}
                      {canAssignEmail && (
                        <select
                          value={selectedEmail.owner || ''}
                          onChange={(e) => handleUpdateEmailMetadata(selectedEmail.id, { owner: e.target.value || null })}
                          className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
                          title="Assign to"
                        >
                          <option value="">Unassigned</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.name || user.email}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Star button - Collaborator+ */}
                  {canStarEmail && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleStar(selectedEmail.id, !selectedEmail.isStarred)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                        title={selectedEmail.isStarred ? 'Unstar' : 'Star'}
                      >
                        {selectedEmail.isStarred ? (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </button>
                      {selectedEmail.syncStatus?.starredStatus && (
                        <div className="flex-shrink-0">
                          {getSyncStatusIcon(selectedEmail.syncStatus.starredStatus)}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMarkRead(selectedEmail.id, !selectedEmail.isRead)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 text-xs font-medium"
                    >
                      {selectedEmail.isRead ? 'Mark unread' : 'Mark read'}
                    </button>
                    {selectedEmail.syncStatus?.readStatus && (
                      <div className="flex-shrink-0">
                        {getSyncStatusIcon(selectedEmail.syncStatus.readStatus)}
                      </div>
                    )}
                  </div>
                  {/* Archive & Organization Actions - Admin only */}
                  {canArchiveEmail && (
                    <>
                      {selectedEmail.threadStatus === 'archived' ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreEmail(selectedEmail.id)}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                          title="Restore from archive"
                        >
                          <InboxIcon className="w-3 h-3" />
                          Restore
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleArchiveEmail(selectedEmail.id)}
                            className="px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                            title="Archive email"
                          >
                            <InboxIcon className="w-3 h-3" />
                            Archive
                          </button>
                          {selectedEmail.threadStatus !== 'resolved' && canUpdateMetadata && (
                            <button
                              type="button"
                              onClick={() => handleResolveConversation(selectedEmail.id)}
                              className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                              title="Mark as resolved"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Resolve
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                  {/* Delete - Admin only */}
                  {canDeleteEmail && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEmail(selectedEmail.id)}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      title="Delete email"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                  {/* Reply/Forward - Admin only (Collaborators can draft but not send) */}
                  {canReplyEmail && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setComposeMode('reply');
                          setComposeTo([selectedEmail.email]);
                          setComposeCc([]);
                          setComposeBcc([]);
                          setComposeSubject(selectedEmail.subject?.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject || ''}`);
                          setComposeBody('');
                          setComposeAccountEmail(selectedEmail.accountEmail || connectedAccounts[0]?.email || '');
                          setShowCc(false);
                          setShowBcc(false);
                          setShowComposeModal(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        <Send className="w-3 h-3" />
                        Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComposeMode('replyAll');
                          const accountEmailLower = (selectedEmail.accountEmail || '').toLowerCase();
                          const allRecipients = [
                            selectedEmail.email,
                            ...(selectedEmail.to || []),
                            ...(selectedEmail.cc || [])
                          ].filter((email, index, self) => {
                            const emailLower = email.toLowerCase();
                            return self.findIndex(e => e.toLowerCase() === emailLower) === index &&
                              emailLower !== accountEmailLower;
                          });
                          setComposeTo([selectedEmail.email]);
                          setComposeCc(allRecipients.filter(e => e.toLowerCase() !== selectedEmail.email.toLowerCase()));
                          setComposeBcc([]);
                          setComposeSubject(selectedEmail.subject?.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject || ''}`);
                          setComposeBody('');
                          setComposeAccountEmail(selectedEmail.accountEmail || connectedAccounts[0]?.email || '');
                          setShowCc(true);
                          setShowBcc(false);
                          setShowComposeModal(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        Reply All
                      </button>
                    </>
                  )}
                  {/* Forward - Admin only */}
                  {canForwardEmail && (
                    <button
                      type="button"
                      onClick={() => {
                        setComposeMode('forward');
                        setComposeTo([]);
                        setComposeCc([]);
                        setComposeBcc([]);
                        setComposeSubject(selectedEmail.subject?.startsWith('Fwd:') || selectedEmail.subject?.startsWith('Fw:') ? selectedEmail.subject : `Fwd: ${selectedEmail.subject || ''}`);
                        const forwardedContent = selectedEmail.body || selectedEmail.lastMessage || '';
                        setComposeBody(`\n\n--- Forwarded message ---\nFrom: ${selectedEmail.sender || selectedEmail.email}\nDate: ${selectedEmail.timestamp}\nSubject: ${selectedEmail.subject}\nTo: ${selectedEmail.to?.join(', ') || selectedEmail.email}\n\n${forwardedContent}`);
                        setComposeAccountEmail(selectedEmail.accountEmail || connectedAccounts[0]?.email || '');
                        setShowCc(false);
                        setShowBcc(false);
                        setShowComposeModal(true);
                      }}
                      className="px-3 py-1.5 bg-white text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
                    >
                      Forward
                    </button>
                  )}
                  {/* Schedule Meeting Button (Phase 5) - opens modal with email data for reconfirmation */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!userId || !selectedEmail.id) return;
                      const body = (selectedEmail.body || selectedEmail.lastMessage || '').replace(/<[^>]+>/g, ' ');
                      const fullText = `${selectedEmail.subject || ''} ${body}`.toLowerCase();

                      const datePatterns = [
                        /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
                        /(\d{1,2}-\d{1,2}-\d{2,4})/g,
                        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{2,4}/gi,
                        /(today|tomorrow|next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))/gi
                      ];
                      let extractedDate: string | undefined;
                      for (const pattern of datePatterns) {
                        const match = fullText.match(pattern);
                        if (match) { extractedDate = match[0]; break; }
                      }
                      const timePatterns = [/\b(\d{1,2}):(\d{2})\s*(am|pm)\b/gi, /\b(\d{1,2}):(\d{2})\b/gi, /\b(\d{1,2})\s*(am|pm)\b/gi];
                      let extractedTime: string | undefined;
                      for (const pattern of timePatterns) {
                        const match = fullText.match(pattern);
                        if (match) { extractedTime = match[0]; break; }
                      }
                      const locationPatterns = [
                        /(?:location|where|venue|address|place|at):\s*([^\n,]+)/gi,
                        /(?:meeting|call|conference)\s+(?:at|in|on)\s+([^\n,]+)/gi,
                        /(?:zoom|meet|teams|webex|skype|google\s+meet)[\s:]+([^\s\n]+)/gi
                      ];
                      let extractedLocation: string | undefined;
                      for (const pattern of locationPatterns) {
                        const match = fullText.match(pattern);
                        if (match?.[1]) { extractedLocation = match[1].trim(); break; }
                      }

                      const toList = Array.isArray(selectedEmail.to) ? selectedEmail.to : (selectedEmail.to ? [selectedEmail.to] : []);
                      const fromEmail = selectedEmail.sender || (selectedEmail as any).from || selectedEmail.email;
                      const participants = [...new Set([...toList, fromEmail].filter(Boolean))] as string[];

                      setScheduleMeetingEmailId(selectedEmail.id);
                      setScheduleMeetingEmailSubject(selectedEmail.subject || null);
                      setScheduleMeetingEmailBody(selectedEmail.body || selectedEmail.lastMessage || null);
                      setScheduleMeetingEmailParticipants(participants.length ? participants : null);
                      setScheduleMeetingExtractedDetails({
                        title: selectedEmail.subject || 'Meeting',
                        date: extractedDate,
                        time: extractedTime,
                        location: extractedLocation,
                        participants,
                        description: (selectedEmail.body || selectedEmail.lastMessage || '').substring(0, 500)
                      });
                      setShowScheduleMeetingModal(true);
                    }}
                    disabled={!userId}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Open schedule meeting modal to review and confirm"
                  >
                    <Calendar className="w-3 h-3" />
                    Schedule Meeting
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-6">
                {/* Email body - render as HTML when content looks like HTML so links, images, and formatting display correctly */}
                {/* Always show email body first so it's always visible */}
                <div className="border-b border-slate-200 pb-6 min-h-[200px]">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Email Content</h3>
                  <div className="prose prose-slate max-w-none break-words">
                    <EmailBodyContent content={selectedEmail.body || selectedEmail.lastMessage || 'No content'} highlightTerm={parseGmailSearchSyntax(search).searchText || undefined} />
                  </div>
                </div>

                {/* Related Items - Tasks, Projects, Contracts (Phase 7.2) */}
                {(relatedTasks.length > 0 || relatedProjects.length > 0 || relatedContracts.length > 0) && (
                  <div className="border-b border-slate-200 pb-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Related Items</h3>
                    <div className="space-y-3">
                      {relatedTasks.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckSquare className="w-4 h-4 text-indigo-500" />
                            <h4 className="text-xs font-semibold text-slate-700">Tasks ({relatedTasks.length})</h4>
                          </div>
                          <div className="space-y-2">
                            {relatedTasks.map((task) => (
                              <div key={task.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-sm font-medium text-slate-900">{task.title}</p>
                                {task.status && (
                                  <span className="text-xs text-slate-500">{task.status}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {relatedProjects.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FolderKanban className="w-4 h-4 text-amber-500" />
                            <h4 className="text-xs font-semibold text-slate-700">Projects ({relatedProjects.length})</h4>
                          </div>
                          <div className="space-y-2">
                            {relatedProjects.map((project) => (
                              <div key={project.id} className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                                <p className="text-sm font-medium text-amber-900">{project.title || project.name}</p>
                                {project.status && (
                                  <span className="text-xs text-amber-600">{project.status}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {relatedContracts.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-red-500" />
                            <h4 className="text-xs font-semibold text-slate-700">Contracts ({relatedContracts.length})</h4>
                          </div>
                          <div className="space-y-2">
                            {relatedContracts.map((contract) => (
                              <div key={contract.id} className="p-2 bg-red-50 rounded-lg border border-red-200">
                                <p className="text-sm font-medium text-red-900">{contract.title}</p>
                                {contract.status && (
                                  <span className="text-xs text-red-600">{contract.status}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* Calendar Events Linked to Email (Phase 5) */}
                {linkedCalendarEvents.length > 0 && (
                  <div className="border-b border-slate-200 pb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Linked Calendar Events ({linkedCalendarEvents.length})
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {linkedCalendarEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-indigo-900 mb-1">
                                {event.title}
                              </h4>
                              <div className="flex flex-col gap-1 text-xs text-indigo-700">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
                                  </span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                                {event.participants && event.participants.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    <span>{event.participants.join(', ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {event.htmlLink && (
                              <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 p-1.5 text-indigo-600 hover:bg-indigo-200 rounded transition-colors"
                                title="Open in Google Calendar"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Attachments */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="border-b border-slate-200 pb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Paperclip className="w-4 h-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Attachments ({selectedEmail.attachments.length})
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedEmail.attachments.map((attachment, idx) => {
                        const isDriveFile = (attachment as any).isDriveFile || (attachment as any).driveFileId;
                        return (
                          <div
                            key={attachment.attachmentId || idx}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isDriveFile
                              ? 'bg-blue-50/30 border-blue-200 hover:bg-blue-50'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                              }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {isDriveFile && (attachment as any).iconUrl ? (
                                <img src={(attachment as any).iconUrl} alt={attachment.filename} className="w-8 h-8" />
                              ) : (
                                <div className={`p-2 rounded-lg ${isImageFile(attachment.mimeType) ? 'bg-blue-50 text-blue-600' :
                                  isPdfFile(attachment.mimeType) ? 'bg-red-50 text-red-600' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                  {isImageFile(attachment.mimeType) ? (
                                    <ImageIcon className="w-4 h-4" />
                                  ) : isPdfFile(attachment.mimeType) ? (
                                    <File className="w-4 h-4" />
                                  ) : (
                                    <Paperclip className="w-4 h-4" />
                                  )}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-slate-900 truncate">
                                    {attachment.filename}
                                  </p>
                                  {isDriveFile && (
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-bold rounded">Drive</span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">
                                  {isDriveFile ? 'Google Drive file' : `${formatFileSize(attachment.size)} · ${attachment.mimeType}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {isDriveFile && (attachment as any).previewUrl && (
                                <a
                                  href={(attachment as any).previewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                                  title="Open in Drive"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              {!isDriveFile && (isImageFile(attachment.mimeType) || isPdfFile(attachment.mimeType)) && (
                                <button
                                  onClick={() => handleViewAttachment(selectedEmail.id, attachment.attachmentId, attachment.filename, attachment.mimeType)}
                                  disabled={attachmentLoading[`${selectedEmail.id}-${attachment.attachmentId}-view`]}
                                  className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="View"
                                >
                                  {attachmentLoading[`${selectedEmail.id}-${attachment.attachmentId}-view`] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              {!isDriveFile && (
                                <button
                                  onClick={() => handleDownloadAttachment(selectedEmail.id, attachment.attachmentId, attachment.filename)}
                                  disabled={attachmentLoading[`${selectedEmail.id}-${attachment.attachmentId}-download`]}
                                  className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Download"
                                >
                                  {attachmentLoading[`${selectedEmail.id}-${attachment.attachmentId}-download`] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              {isDriveFile && (attachment as any).downloadUrl && (
                                <a
                                  href={(attachment as any).downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Inline Drive Document Embedding */}
                {selectedEmail.attachments && selectedEmail.attachments.some((att: any) => (att.isDriveFile || att.driveFileId) && att.previewUrl && (att.mimeType?.includes('google-apps') || att.mimeType?.includes('document') || att.mimeType?.includes('spreadsheet') || att.mimeType?.includes('presentation'))) && (
                  <div className="border-b border-slate-200 pb-6 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <File className="w-4 h-4 text-blue-500" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Embedded Documents
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {selectedEmail.attachments
                        .filter((att: any) => (att.isDriveFile || att.driveFileId) && att.previewUrl && (att.mimeType?.includes('google-apps') || att.mimeType?.includes('document') || att.mimeType?.includes('spreadsheet') || att.mimeType?.includes('presentation')))
                        .map((attachment: any, idx: number) => {
                          // Convert webViewLink to embeddable format for Google Docs/Sheets/Slides
                          const embedUrl = attachment.previewUrl?.replace('/edit', '/preview') || attachment.previewUrl;
                          return (
                            <div key={attachment.attachmentId || idx} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {attachment.iconUrl && (
                                    <img src={attachment.iconUrl} alt={attachment.filename} className="w-5 h-5" />
                                  )}
                                  <span className="text-sm font-medium text-slate-900">{attachment.filename}</span>
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-bold rounded">Drive</span>
                                </div>
                                {attachment.previewUrl && (
                                  <a
                                    href={attachment.previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                                    title="Open in Drive"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                              <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                                <iframe
                                  src={embedUrl}
                                  className="absolute top-0 left-0 w-full h-full border-0"
                                  title={attachment.filename}
                                  allow="fullscreen"
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* AI Reply Draft */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      AI Reply Draft
                    </h3>
                    <div className="flex items-center gap-2">
                      {aiDraftVariations.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            safeAsyncCall(
                              () => handleGenerateAIDraft(),
                              (errorMsg) => { }
                            );
                          }}
                          disabled={isGeneratingDraft}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-indigo-600 text-xs font-medium rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-200 disabled:opacity-60"
                        >
                          {isGeneratingDraft ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              Regenerate
                            </>
                          )}
                        </button>
                      )}
                      {!aiDraft && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            safeAsyncCall(
                              () => handleGenerateAIDraft(),
                              (errorMsg) => { }
                            );
                          }}
                          disabled={isGeneratingDraft}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 disabled:opacity-60 transition-colors"
                        >
                          {isGeneratingDraft ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              Generate Draft
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variation Selector */}
                  {aiDraftVariations.length > 1 && (
                    <div className="mb-3 space-y-2">
                      <p className="text-xs font-medium text-slate-700">Select a variation:</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {aiDraftVariations.map((variation, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setSelectedVariationIndex(index);
                              setAiDraft(plainTextToHtmlForQuill(variation.draft));
                            }}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${selectedVariationIndex === index
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
                              }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-900 capitalize">
                                {variation.style}
                              </span>
                              <span className="text-xs font-bold text-indigo-600">
                                {variation.confidence}%
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mb-2">{variation.description}</p>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${variation.confidence >= 80
                                  ? 'bg-green-500'
                                  : variation.confidence >= 60
                                    ? 'bg-indigo-500'
                                    : 'bg-amber-500'
                                  }`}
                                style={{ width: `${variation.confidence}%` }}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiDraft ? (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                      {aiDraftVariations.length > 1 && selectedVariationIndex !== null && (
                        <div className="flex items-center justify-between pb-2 border-b border-indigo-200">
                          <div>
                            <span className="text-xs font-semibold text-slate-900 capitalize">
                              {aiDraftVariations[selectedVariationIndex].style} Variation
                            </span>
                            <span className="ml-2 text-xs text-slate-500">
                              ({aiDraftVariations[selectedVariationIndex].description})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Confidence:</span>
                            <span className="text-xs font-bold text-indigo-600">
                              {aiDraftVariations[selectedVariationIndex].confidence}%
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="quill-wrapper">
                        <QuillEditor
                          ref={(el: any) => {
                            aiDraftEditorRef.current = el;
                            if (el) {
                              aiDraftQuillInstanceRef.current = el.getEditor();
                            }
                          }}
                          theme="snow"
                          value={aiDraft}
                          onChange={(content) => setAiDraft(content)}
                          modules={quillModules}
                          formats={quillFormats}
                          placeholder="Edit your draft..."
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleUseDraft}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                          <Send className="w-3 h-3" />
                          Copy to Clipboard
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAsTemplate}
                          className="px-3 py-1.5 bg-white text-indigo-600 text-xs font-medium rounded-lg hover:bg-indigo-50 transition-colors border border-indigo-200 flex items-center gap-2"
                        >
                          <Plus className="w-3 h-3" />
                          Save as Template
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTemplatesModal(true);
                            loadTemplates();
                          }}
                          className="px-3 py-1.5 bg-white text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
                        >
                          Templates
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAiDraft(null);
                            setAiDraftVariations([]);
                            setSelectedVariationIndex(null);
                          }}
                          className="px-3 py-1.5 bg-white text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">Click "Generate Draft" to create AI-powered reply suggestions.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTemplatesModal(true);
                          loadTemplates();
                        }}
                        className="px-3 py-1.5 bg-white text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
                      >
                        View Templates
                      </button>
                    </div>
                  )}
                </div>

                {/* Internal Discussion Thread */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500" />
                    Notes & Comments
                    {selectedEmail?.id && internalThreads[selectedEmail.id] && internalThreads[selectedEmail.id].length > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[10px]">
                        {internalThreads[selectedEmail.id].length}
                      </span>
                    )}
                  </h3>

                  {/* Add New Note - Collaborator+ only */}
                  {canAddNote && (
                    <div className="space-y-3">
                      <div className="relative" style={{ position: 'relative' }}>
                        <div className="quill-wrapper">
                          <style>{`
                          .quill-wrapper .ql-container {
                            border-bottom-left-radius: 0.75rem;
                            border-bottom-right-radius: 0.75rem;
                            font-size: 0.875rem;
                            min-height: 100px;
                          }
                          .quill-wrapper .ql-toolbar {
                            border-top-left-radius: 0.75rem;
                            border-top-right-radius: 0.75rem;
                            border: none;
                            border-bottom: 2px solid #e2e8f0;
                            background: #f8fafc;
                          }
                          .quill-wrapper .ql-editor {
                            min-height: 100px;
                            padding: 1rem;
                          }
                          .quill-wrapper .ql-editor.ql-blank::before {
                            color: #94a3b8;
                            font-style: normal;
                            font-size: 0.875rem;
                          }
                          .quill-wrapper .ql-snow {
                            border: 2px solid #e2e8f0;
                            border-radius: 0.75rem;
                          }
                          .quill-wrapper:focus-within .ql-snow {
                            border-color: #818cf8;
                            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
                          }
                        `}</style>
                          <QuillEditor
                            ref={(el: any) => {
                              quillEditorRef.current = el;
                              // Also store the editor instance when component mounts
                              if (el) {
                                quillInstanceRef.current = el.getEditor();
                              }
                            }}
                            theme="snow"
                            value={newThreadMessage}
                            onChange={handleQuillChange}
                            onBlur={() => {
                              // Don't hide dropdown immediately on blur (user might be clicking dropdown)
                              setTimeout(() => {
                                if (!showMentionDropdown) {
                                  setMentionStartIndex(null);
                                }
                              }, 200);
                            }}
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="Add a note or comment... (Use @ to mention users)"
                          />
                        </div>

                        {/* Mention Dropdown */}
                        {showMentionDropdown && filteredMentionUsers.length > 0 && (
                          <div
                            className="absolute top-full mt-2 left-0 w-full max-w-sm bg-white border-2 border-indigo-200 rounded-xl shadow-2xl z-[100] max-h-48 overflow-y-auto"
                            onMouseDown={(e) => {
                              // Prevent editor from losing focus when clicking dropdown
                              e.preventDefault();
                            }}
                          >
                            <div className="p-2">
                              <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <AtSign className="w-3 h-3" />
                                Mention User
                              </div>
                              {filteredMentionUsers.map((user: any) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent losing focus from Quill
                                    e.stopPropagation();
                                    handleMentionSelect(user);
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 rounded-lg transition-all text-left"
                                >
                                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                                    {user.name?.charAt(0) || 'U'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">{user.name || 'Unknown'}</p>
                                    <p className="text-xs text-slate-400 truncate">{user.email || ''}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Mark for Team Members */}
                      <div className="relative" ref={markForDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowMarkForDropdown(!showMarkForDropdown)}
                          className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border-2 rounded-xl text-sm transition-all ${markedForUsers.length > 0
                            ? 'border-indigo-300 bg-indigo-50'
                            : 'border-slate-200 hover:border-indigo-200'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <UserPlus className={`w-4 h-4 ${markedForUsers.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className={`font-medium ${markedForUsers.length > 0 ? 'text-indigo-900' : 'text-slate-600'}`}>
                              {markedForUsers.length > 0
                                ? `Marked for ${markedForUsers.length} team member${markedForUsers.length > 1 ? 's' : ''}`
                                : 'Mark for team member'}
                            </span>
                          </div>
                          {markedForUsers.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMarkedForUsers([]);
                              }}
                              className="p-1 hover:bg-indigo-200 rounded transition-all"
                            >
                              <X className="w-3 h-3 text-indigo-600" />
                            </button>
                          )}
                        </button>

                        {/* Mark For Dropdown */}
                        {showMarkForDropdown && (
                          <div className="absolute top-full mt-2 left-0 w-full bg-white border-2 border-indigo-200 rounded-xl shadow-2xl z-[100] max-h-64 overflow-y-auto">
                            <div className="p-2">
                              <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-2">
                                <UserPlus className="w-3 h-3" />
                                Select Team Members
                              </div>
                              <input
                                type="text"
                                placeholder="Search team members..."
                                value={markForSearchQuery}
                                onChange={(e) => setMarkForSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 mb-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              />
                              {users
                                .filter((user: any) =>
                                  user.id !== userId &&
                                  (markForSearchQuery === '' ||
                                    user.name?.toLowerCase().includes(markForSearchQuery.toLowerCase()) ||
                                    user.email?.toLowerCase().includes(markForSearchQuery.toLowerCase()))
                                )
                                .map((user: any) => {
                                  const isSelected = markedForUsers.includes(user.id);
                                  return (
                                    <button
                                      key={user.id}
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          setMarkedForUsers(prev => prev.filter(id => id !== user.id));
                                        } else {
                                          setMarkedForUsers(prev => [...prev, user.id]);
                                        }
                                      }}
                                      className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 rounded-lg transition-all text-left ${isSelected ? 'bg-indigo-50' : ''
                                        }`}
                                    >
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {user.name?.charAt(0) || 'U'}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">{user.name || 'Unknown'}</p>
                                        <p className="text-xs text-slate-400 truncate">{user.email || ''}</p>
                                      </div>
                                      {isSelected && (
                                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                      )}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Image Upload */}
                      <div className="flex items-center gap-3">
                        <label className="flex-1 cursor-pointer group">
                          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-all">
                              {noteImagePreview ? (
                                <ImageIcon className="w-4 h-4" />
                              ) : (
                                <UploadIcon className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-900">
                                {noteImagePreview ? (noteImageFile?.name || 'Image selected') : 'Attach Image'}
                              </p>
                              <p className="text-[10px] text-slate-400">PNG, JPG (Max 10MB)</p>
                            </div>
                          </div>
                          <input
                            ref={noteImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleNoteImageSelect}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={handleAddThreadMessage}
                          disabled={isAddingThread || (!newThreadMessage.trim() && !noteImageFile)}
                          className="px-6 py-3 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          {isAddingThread ? (
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

                      {/* Image Preview */}
                      {noteImagePreview && (
                        <div className="relative">
                          <img
                            src={noteImagePreview}
                            alt="Note attachment preview"
                            className="w-full max-h-48 object-contain rounded-lg border-2 border-slate-200"
                          />
                          <button
                            onClick={() => {
                              setNoteImagePreview('');
                              setNoteImageFile(null);
                              if (noteImageInputRef.current) noteImageInputRef.current.value = '';
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Viewer-only message */}
                  {!canAddNote && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <p className="text-sm text-slate-600">You have read-only access. Contact an admin to add notes or comments.</p>
                    </div>
                  )}

                  {/* Notes List */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {internalThreads[selectedEmail?.id] && internalThreads[selectedEmail.id]?.length > 0 ? (
                      internalThreads[selectedEmail.id].map((thread) => {
                        const canDelete = hasPermission(userRole, 'shared-inbox:delete-note') && (isAdmin(userRole) || thread.userId === userId);
                        return (
                          <div key={thread.id} className={`p-4 bg-white border rounded-xl space-y-2 ${(thread.markedFor || []).length > 0 ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'
                            }`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">
                                  {thread.userName?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-slate-900">{thread.userName}</p>
                                    {(thread.markedFor || []).length > 0 && (
                                      <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center gap-1">
                                        <UserPlus className="w-2.5 h-2.5" />
                                        Marked
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400">
                                    {new Date(thread.timestamp).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </p>
                                  {(thread.markedFor || []).length > 0 && (
                                    <p className="text-[10px] text-indigo-600 mt-1">
                                      Marked for: {users.filter((u: any) => (thread.markedFor || []).includes(u.id)).map((u: any) => u.name).join(', ') || 'Unknown'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {canDelete && (
                                <button
                                  onClick={() => selectedEmail?.id && handleDeleteThreadMessage(selectedEmail.id, thread.id)}
                                  disabled={deletingNoteId === thread.id}
                                  className="p-2 hover:bg-red-50 rounded-lg transition-colors group disabled:opacity-50"
                                  title="Delete note"
                                >
                                  {deletingNoteId === thread.id ? (
                                    <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
                                  )}
                                </button>
                              )}
                            </div>
                            {thread.message && (
                              <div
                                className="text-sm text-slate-700 leading-relaxed pl-10 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: thread.message }}
                              />
                            )}
                            {thread.imageUrl && (
                              <div className="pl-10">
                                <button
                                  type="button"
                                  onClick={() => setImagePreviewModal({
                                    isOpen: true,
                                    imageUrl: thread.imageUrl!,
                                    imageName: thread.imageName,
                                  })}
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors group"
                                >
                                  <ImageIcon className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                                  <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                                    {thread.imageName || 'View Attachment'}
                                  </span>
                                </button>
                              </div>
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
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
              <Mail className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">Select an email to read</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {imagePreviewModal.isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setImagePreviewModal({ isOpen: false, imageUrl: '', imageName: undefined })}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setImagePreviewModal({ isOpen: false, imageUrl: '', imageName: undefined })}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors backdrop-blur-sm z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={imagePreviewModal.imageUrl}
              alt={imagePreviewModal.imageName || 'Note attachment'}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {imagePreviewModal.imageName && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg">
                <p className="text-sm font-medium text-slate-900">{imagePreviewModal.imageName}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Name Modal */}
      {showTemplateNameModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => {
            setShowTemplateNameModal(false);
            setTemplateNameInput('');
          }}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Save as Template
              </h2>
              <button
                onClick={() => {
                  setShowTemplateNameModal(false);
                  setTemplateNameInput('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitTemplateName();
                    }
                  }}
                  placeholder="Enter template name..."
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowTemplateNameModal(false);
                    setTemplateNameInput('');
                  }}
                  className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitTemplateName}
                  disabled={!templateNameInput || !templateNameInput.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowTemplatesModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Email Response Templates
              </h2>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm">No templates yet. Create one by saving a draft!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template: any) => (
                    <div
                      key={template.id}
                      className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (selectedEmail && template.content) {
                          // Use template content directly instead of generating new draft
                          setAiDraft(template.content);
                          setShowTemplatesModal(false);
                          showSuccess('Template loaded');
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-1">{template.name}</h3>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {template.content?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                          </p>
                          <p className="text-[10px] text-slate-400 mt-2">
                            Created {new Date(template.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (selectedEmail && template.content) {
                                // Use template content directly instead of generating new draft
                                setAiDraft(template.content);
                                setShowTemplatesModal(false);
                                showSuccess('Template loaded');
                              }
                            }}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Use
                          </button>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowDeleteTemplateConfirm(template.id);
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Template Confirmation Modal */}
      {showDeleteTemplateConfirm && (
        <div className="fixed inset-0 z-[250] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setShowDeleteTemplateConfirm(null)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full pointer-events-auto animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-6">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-3">Delete Template?</h2>
                <p className="text-sm text-slate-600 mb-6">
                  Are you sure you want to delete this template? This action cannot be undone.
                </p>
              </div>
              <div className="p-6 flex gap-3 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => setShowDeleteTemplateConfirm(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const templateId = showDeleteTemplateConfirm;
                    setShowDeleteTemplateConfirm(null);
                    try {
                      await apiDeleteEmailTemplate(templateId, userId);
                      showSuccess('Template deleted');
                      loadTemplates();
                    } catch (err: any) {
                      const errorMsg = err?.message || 'Failed to delete template';
                      console.error('[INBOX] Error deleting template:', errorMsg);
                      showError(errorMsg);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive File Picker Modal */}
      {showDrivePicker && (
        <div className="fixed inset-0 z-[250] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setShowDrivePicker(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[28px] shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col pointer-events-auto animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <File className="w-5 h-5 text-blue-600" />
                  Attach from Google Drive
                </h2>
                <button
                  onClick={() => setShowDrivePicker(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Search */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={driveSearchQuery}
                    onChange={(e) => setDriveSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        loadDriveFiles(driveSearchQuery);
                      }
                    }}
                    placeholder="Search Drive files..."
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
                  <button
                    onClick={() => loadDriveFiles(driveSearchQuery)}
                    disabled={loadingDriveFiles}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {loadingDriveFiles ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                  </button>
                </div>

                {/* Files List */}
                {loadingDriveFiles && driveFiles.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <File className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No files found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {driveFiles.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => handleAttachDriveFile(file)}
                        className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-left"
                      >
                        {file.iconLink ? (
                          <img src={file.iconLink} alt={file.name} className="w-8 h-8" />
                        ) : (
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <File className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">
                            {file.size ? formatFileSize(file.size) : 'Drive file'} · {file.mimeType || 'Unknown type'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (file.webViewLink) {
                              window.open(file.webViewLink, '_blank');
                            }
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Open in Drive"
                        >
                          <ExternalLink className="w-4 h-4 text-slate-400" />
                        </button>
                      </button>
                    ))}
                  </div>
                )}

                {/* Load More */}
                {driveNextPageToken && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => loadDriveFiles(driveSearchQuery, driveNextPageToken)}
                      disabled={loadingDriveFiles}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      {loadingDriveFiles ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discard Email Confirmation Modal */}
      {showDiscardEmailConfirm && (
        <div className="fixed inset-0 z-[250] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setShowDiscardEmailConfirm(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full pointer-events-auto animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mx-auto mb-6">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-3">Discard Email?</h2>
                <p className="text-sm text-slate-600 mb-6">
                  Are you sure you want to discard this email? All unsaved changes will be lost.
                </p>
              </div>
              <div className="p-6 flex gap-3 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => setShowDiscardEmailConfirm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDiscardEmailConfirm(false);
                    setShowComposeModal(false);
                    setComposeTo([]);
                    setComposeCc([]);
                    setComposeBcc([]);
                    setComposeSubject('');
                    setComposeBody('');
                    setToInput('');
                    setCcInput('');
                    setBccInput('');
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose/Reply Modal */}
      {showComposeModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => {
            setShowDiscardEmailConfirm(true);
          }}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {composeMode === 'compose' ? 'Compose Email' :
                  composeMode === 'reply' ? 'Reply' :
                    composeMode === 'replyAll' ? 'Reply All' : 'Forward'}
              </h2>
              <button
                onClick={() => {
                  setShowDiscardEmailConfirm(true);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Account Selector */}
              {connectedAccounts.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    From
                  </label>
                  <select
                    value={composeAccountEmail}
                    onChange={(e) => setComposeAccountEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  >
                    {connectedAccounts
                      .filter((account, index, self) =>
                        self.findIndex(a => a.email === account.email && a.userId === account.userId) === index
                      )
                      .map((account, index) => (
                        <option key={`${account.email}-${account.userId}-${index}`} value={account.email}>
                          {account.email} {account.isCurrentUser ? '(You)' : `(${account.ownerName})`}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {connectedAccounts.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  No Gmail accounts connected. Please connect a Gmail account to send emails.
                </div>
              )}

              {/* To Field */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  To <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="flex flex-wrap gap-2 p-2 border border-slate-200 rounded-lg min-h-[40px] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
                    {composeTo.map((email, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => setComposeTo(composeTo.filter((_, i) => i !== idx))}
                          className="hover:text-indigo-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={toInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setToInput(value);

                        // Show contact suggestions
                        if (value.length > 0) {
                          const filtered = contacts.filter(c =>
                            c.email?.toLowerCase().includes(value.toLowerCase()) ||
                            c.name?.toLowerCase().includes(value.toLowerCase())
                          ).slice(0, 5);
                          setContactSuggestions(filtered);
                          setShowContactSuggestions(true);
                        } else {
                          setShowContactSuggestions(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && toInput.trim()) {
                          e.preventDefault();
                          const email = toInput.trim();
                          // Validate email format before adding
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                          if (emailRegex.test(email) && !composeTo.includes(email)) {
                            setComposeTo([...composeTo, email]);
                            setToInput('');
                            setShowContactSuggestions(false);
                          }
                        } else if (e.key === 'Backspace' && toInput === '' && composeTo.length > 0) {
                          setComposeTo(composeTo.slice(0, -1));
                        } else if (e.key === 'ArrowDown' && showContactSuggestions) {
                          e.preventDefault();
                          setSuggestionIndex(prev => Math.min(prev + 1, contactSuggestions.length - 1));
                        } else if (e.key === 'ArrowUp' && showContactSuggestions) {
                          e.preventDefault();
                          setSuggestionIndex(prev => Math.max(prev - 1, 0));
                        } else if (e.key === 'Enter' && showContactSuggestions && contactSuggestions[suggestionIndex]) {
                          e.preventDefault();
                          const contact = contactSuggestions[suggestionIndex];
                          if (contact.email && !composeTo.includes(contact.email)) {
                            setComposeTo([...composeTo, contact.email]);
                            setToInput('');
                            setShowContactSuggestions(false);
                          }
                        } else if (e.key === ',' || e.key === ';') {
                          // Allow comma/semicolon to trigger email extraction
                          e.preventDefault();
                          const email = toInput.trim().replace(/[,;]$/, '');
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                          if (emailRegex.test(email) && !composeTo.includes(email)) {
                            setComposeTo([...composeTo, email]);
                            setToInput('');
                            setShowContactSuggestions(false);
                          }
                        }
                      }}
                      onBlur={() => {
                        // When input loses focus, try to extract and add email if valid
                        const email = toInput.trim();
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (emailRegex.test(email) && !composeTo.includes(email)) {
                          setComposeTo([...composeTo, email]);
                          setToInput('');
                          setShowContactSuggestions(false);
                        }
                      }}
                      placeholder={composeTo.length === 0 ? "Recipients" : ""}
                      className="flex-1 min-w-[120px] border-0 outline-none text-sm"
                    />
                  </div>
                  {showContactSuggestions && contactSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {contactSuggestions.map((contact, idx) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            if (contact.email && !composeTo.includes(contact.email)) {
                              setComposeTo([...composeTo, contact.email]);
                              setToInput('');
                              setShowContactSuggestions(false);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm ${idx === suggestionIndex ? 'bg-indigo-50' : ''
                            }`}
                        >
                          <div className="font-medium text-slate-900">{contact.name}</div>
                          <div className="text-xs text-slate-500">{contact.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CC Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Cc
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCc(!showCc)}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    {showCc ? 'Hide' : 'Show'} Cc
                  </button>
                </div>
                {showCc && (
                  <div className="relative">
                    <div className="flex flex-wrap gap-2 p-2 border border-slate-200 rounded-lg min-h-[40px]">
                      {composeCc.map((email, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-700 text-xs font-medium rounded"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => setComposeCc(composeCc.filter((_, i) => i !== idx))}
                            className="hover:text-slate-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={ccInput}
                        onChange={(e) => {
                          setCcInput(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && ccInput.trim()) {
                            e.preventDefault();
                            const email = ccInput.trim();
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (emailRegex.test(email) && !composeCc.includes(email)) {
                              setComposeCc([...composeCc, email]);
                              setCcInput('');
                            }
                          } else if (e.key === 'Backspace' && ccInput === '' && composeCc.length > 0) {
                            setComposeCc(composeCc.slice(0, -1));
                          } else if (e.key === ',' || e.key === ';') {
                            e.preventDefault();
                            const email = ccInput.trim().replace(/[,;]$/, '');
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (emailRegex.test(email) && !composeCc.includes(email)) {
                              setComposeCc([...composeCc, email]);
                              setCcInput('');
                            }
                          }
                        }}
                        onBlur={() => {
                          const email = ccInput.trim();
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                          if (emailRegex.test(email) && !composeCc.includes(email)) {
                            setComposeCc([...composeCc, email]);
                            setCcInput('');
                          }
                        }}
                        placeholder={composeCc.length === 0 ? "Cc" : ""}
                        className="flex-1 min-w-[120px] border-0 outline-none text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* BCC Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Bcc
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowBcc(!showBcc)}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    {showBcc ? 'Hide' : 'Show'} Bcc
                  </button>
                </div>
                {showBcc && (
                  <div className="flex flex-wrap gap-2 p-2 border border-slate-200 rounded-lg min-h-[40px]">
                    {composeBcc.map((email, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-700 text-xs font-medium rounded"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => setComposeBcc(composeBcc.filter((_, i) => i !== idx))}
                          className="hover:text-slate-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={bccInput}
                      onChange={(e) => {
                        setBccInput(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && bccInput.trim()) {
                          e.preventDefault();
                          const email = bccInput.trim();
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                          if (emailRegex.test(email) && !composeBcc.includes(email)) {
                            setComposeBcc([...composeBcc, email]);
                            setBccInput('');
                          }
                        } else if (e.key === 'Backspace' && bccInput === '' && composeBcc.length > 0) {
                          setComposeBcc(composeBcc.slice(0, -1));
                        } else if (e.key === ',' || e.key === ';') {
                          e.preventDefault();
                          const email = bccInput.trim().replace(/[,;]$/, '');
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                          if (emailRegex.test(email) && !composeBcc.includes(email)) {
                            setComposeBcc([...composeBcc, email]);
                            setBccInput('');
                          }
                        }
                      }}
                      onBlur={() => {
                        const email = bccInput.trim();
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (emailRegex.test(email) && !composeBcc.includes(email)) {
                          setComposeBcc([...composeBcc, email]);
                          setBccInput('');
                        }
                      }}
                      placeholder={composeBcc.length === 0 ? "Bcc" : ""}
                      className="flex-1 min-w-[120px] border-0 outline-none text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>

              {/* Template Selection Dropdown (Phase 8.2) */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Template
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={composeSelectedTemplate || ''}
                      onChange={(e) => {
                        const templateId = e.target.value || null;
                        setComposeSelectedTemplate(templateId);
                        if (templateId) {
                          const template = templates.find(t => t.id === templateId);
                          if (template?.content) {
                            setComposeBody(template.content);
                            showSuccess('Template loaded');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    >
                      <option value="">No template</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowTemplatesModal(true)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                      title="Manage templates"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* AI Drafting Panel Toggle (Phase 8.2) */}
              {composeMode === 'compose' && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAIDraftPanel(!showAIDraftPanel);
                      if (!showAIDraftPanel && !composeAIDraft && composeSubject && composeTo.length > 0) {
                        handleGenerateComposeAIDraft();
                      }
                    }}
                    className="w-full px-4 py-2.5 border-2 border-dashed border-indigo-200 rounded-lg text-sm font-medium text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {showAIDraftPanel ? 'Hide AI Suggestions' : 'Get AI Draft Suggestions'}
                  </button>
                  {showAIDraftPanel && (
                    <div className="mt-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                      {isGeneratingComposeDraft ? (
                        <div className="flex items-center gap-2 text-sm text-indigo-700">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating AI draft...
                        </div>
                      ) : composeAIDraft ? (
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium text-indigo-900">AI Draft Suggestion:</p>
                            <button
                              type="button"
                              onClick={handleGenerateComposeAIDraft}
                              className="text-xs text-indigo-600 hover:text-indigo-700"
                            >
                              Regenerate
                            </button>
                          </div>
                          <div className="p-3 bg-white border border-indigo-200 rounded-lg text-sm text-slate-700 max-h-48 overflow-y-auto">
                            <div dangerouslySetInnerHTML={{ __html: composeAIDraft }} />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setComposeBody(composeAIDraft || '');
                                showSuccess('AI draft inserted');
                              }}
                              className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Use This Draft
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const textContent = composeAIDraft?.replace(/<[^>]+>/g, '') || '';
                                navigator.clipboard.writeText(textContent);
                                showSuccess('Draft copied to clipboard');
                              }}
                              className="px-3 py-2 border border-indigo-300 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-50 transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-indigo-600">Enter a subject and recipient to generate AI draft suggestions.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Signature Selector */}
              {signatures.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Signature
                  </label>
                  <select
                    value={signatures.find(s => s.content === composeSignature)?.id || ''}
                    onChange={(e) => {
                      const sig = signatures.find(s => s.id === e.target.value);
                      setComposeSignature(sig?.content || '');
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  >
                    <option value="">No signature</option>
                    {signatures.map(sig => (
                      <option key={sig.id} value={sig.id}>
                        {sig.name} {sig.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Body Editor */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <div className="quill-wrapper">
                  <style>{`
                    .quill-wrapper .ql-container {
                      border-bottom-left-radius: 0.75rem;
                      border-bottom-right-radius: 0.75rem;
                      font-size: 0.875rem;
                      min-height: 300px;
                    }
                    .quill-wrapper .ql-toolbar {
                      border-top-left-radius: 0.75rem;
                      border-top-right-radius: 0.75rem;
                      border: none;
                      border-bottom: 2px solid #e2e8f0;
                      background: #f8fafc;
                    }
                    .quill-wrapper .ql-editor {
                      min-height: 300px;
                      padding: 1rem;
                    }
                    .quill-wrapper .ql-editor.ql-blank::before {
                      color: #94a3b8;
                      font-style: normal;
                      font-size: 0.875rem;
                    }
                    .quill-wrapper .ql-snow {
                      border: 2px solid #e2e8f0;
                      border-radius: 0.75rem;
                    }
                    .quill-wrapper:focus-within .ql-snow {
                      border-color: #818cf8;
                      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
                    }
                  `}</style>
                  <QuillEditor
                    ref={(el: any) => {
                      composeQuillRef.current = el;
                    }}
                    theme="snow"
                    value={composeBody}
                    onChange={(content: string) => {
                      setComposeBody(content);
                    }}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Compose your message..."
                  />
                </div>
                {composeSignature && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                    <div className="text-xs text-slate-500 mb-1">Signature:</div>
                    <div dangerouslySetInnerHTML={{ __html: composeSignature }} />
                  </div>
                )}
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Attachments
                </label>

                {/* Attachment Buttons */}
                <div className="flex items-center gap-2 mb-2">
                  {/* File Input */}
                  <label className="flex-1 flex items-center gap-3 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-900">Add Attachment</p>
                      <p className="text-[10px] text-slate-400">Max 25MB per file</p>
                    </div>
                    <input
                      ref={composeFileInputRef}
                      type="file"
                      multiple
                      onChange={handleComposeFileSelect}
                      className="hidden"
                    />
                  </label>

                  {/* Drive Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDrivePicker(true);
                      setDriveSearchQuery('');
                      loadDriveFiles();
                    }}
                    className="px-4 py-3 bg-white border-2 border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center gap-2"
                    title="Attach from Google Drive"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      <File className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-slate-900 hidden sm:inline">Drive</span>
                  </button>
                </div>

                {/* Attachment List */}
                {composeAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {composeAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg ${attachment.isDriveFile ? 'bg-blue-50/30 border-blue-200' : 'bg-slate-50 border-slate-200'
                          }`}
                      >
                        {attachment.isDriveFile && attachment.driveIconLink ? (
                          <img src={attachment.driveIconLink} alt="Drive file" className="w-8 h-8" />
                        ) : (
                          <div className={`p-2 rounded-lg ${isImageFile(attachment.file.type) ? 'bg-blue-50 text-blue-600' :
                            isPdfFile(attachment.file.type) ? 'bg-red-50 text-red-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                            {isImageFile(attachment.file.type) ? (
                              <ImageIcon className="w-4 h-4" />
                            ) : isPdfFile(attachment.file.type) ? (
                              <File className="w-4 h-4" />
                            ) : (
                              <Paperclip className="w-4 h-4" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {attachment.file.name}
                            </p>
                            {attachment.isDriveFile && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-bold rounded">Drive</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500">
                              {attachment.isDriveFile ? 'Google Drive file' : `${formatFileSize(attachment.file.size)} · ${attachment.file.type}`}
                            </p>
                            {/* Upload Progress Indicator (Phase 8.2) */}
                            {attachmentUploadProgress[attachment.id] !== undefined && attachmentUploadProgress[attachment.id] < 100 && (
                              <div className="flex-1 max-w-[100px]">
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-600 transition-all duration-300"
                                    style={{ width: `${attachmentUploadProgress[attachment.id]}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">{attachmentUploadProgress[attachment.id]}%</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {attachment.isDriveFile && attachment.driveWebViewLink && (
                          <a
                            href={attachment.driveWebViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                            title="Open in Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {attachment.preview && !attachment.isDriveFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setAttachmentPreviewModal({
                                isOpen: true,
                                emailId: '',
                                attachmentId: attachment.id,
                                filename: attachment.file.name,
                                mimeType: attachment.file.type,
                                url: attachment.preview
                              });
                            }}
                            className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveComposeAttachment(attachment.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardEmailConfirm(true);
                  }}
                  className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                {/* Load Gmail Drafts Button (Phase 8.2) */}
                {composeMode === 'compose' && (
                  <button
                    type="button"
                    onClick={async () => {
                      setShowGmailDraftsModal(true);
                      await loadGmailDrafts();
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <File className="w-4 h-4" />
                    Load Drafts
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Save Draft Button (Phase 8.2) */}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={savingDraft || !composeSubject || !composeBody}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingDraft ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <File className="w-4 h-4" />
                      Save Draft
                    </>
                  )}
                </button>
                {/* Schedule Send Button (Phase 8.2) */}
                {composeMode === 'compose' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!composeTo.length || !composeSubject || !composeBody) {
                        showError('Please fill in all required fields (To, Subject, Message)');
                        return;
                      }
                      setShowScheduleSendModal(true);
                    }}
                    className="px-4 py-2 border border-indigo-200 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Schedule
                  </button>
                )}
                {/* Schedule Meeting Button (Phase 5) */}
                {composeMode === 'compose' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!userId || composeTo.length === 0 || !composeSubject || !composeBody) {
                        showError('Please fill in all required fields (To, Subject, Message)');
                        return;
                      }

                      // Extract meeting details from compose content
                      const bodyText = composeBody.replace(/<[^>]+>/g, ' ').toLowerCase();
                      const fullText = `${composeSubject} ${bodyText}`;

                      // Extract date patterns
                      const datePatterns = [
                        /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
                        /(\d{1,2}-\d{1,2}-\d{2,4})/g,
                        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{2,4}/gi,
                        /(monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/gi,
                        /(today|tomorrow|next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))/gi
                      ];

                      let extractedDate: string | undefined;
                      for (const pattern of datePatterns) {
                        const match = fullText.match(pattern);
                        if (match) {
                          extractedDate = match[0];
                          break;
                        }
                      }

                      // Extract time patterns
                      const timePatterns = [
                        /\b(\d{1,2}):(\d{2})\s*(am|pm)\b/gi,
                        /\b(\d{1,2}):(\d{2})\b/gi,
                        /\b(\d{1,2})\s*(am|pm)\b/gi
                      ];

                      let extractedTime: string | undefined;
                      for (const pattern of timePatterns) {
                        const match = fullText.match(pattern);
                        if (match) {
                          extractedTime = match[0];
                          break;
                        }
                      }

                      // Extract location patterns
                      const locationPatterns = [
                        /(?:location|where|venue|address|place|at):\s*([^\n,]+)/gi,
                        /(?:meeting|call|conference)\s+(?:at|in|on)\s+([^\n,]+)/gi,
                        /(?:zoom|meet|teams|webex|skype|google\s+meet)[\s:]+([^\s\n]+)/gi
                      ];

                      let extractedLocation: string | undefined;
                      for (const pattern of locationPatterns) {
                        const match = fullText.match(pattern);
                        if (match && match[1]) {
                          extractedLocation = match[1].trim();
                          break;
                        }
                      }

                      // Set extracted details and open modal
                      setScheduleMeetingExtractedDetails({
                        title: composeSubject,
                        date: extractedDate,
                        time: extractedTime,
                        location: extractedLocation,
                        participants: composeTo,
                        description: composeBody.substring(0, 500)
                      });
                      setScheduleMeetingEmailId(null); // Will be set after email is sent
                      setShowScheduleMeetingModal(true);
                    }}
                    disabled={creatingMeeting || !userId || composeTo.length === 0 || !composeSubject}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Schedule a meeting"
                  >
                    {creatingMeeting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                    Schedule Meeting
                  </button>
                )}
                {/* Send Button - Admin only (Collaborators can draft but not send) */}
                {canSendEmail ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!userId || composeTo.length === 0 || !composeSubject || !composeBody) {
                        showError('Please fill in all required fields (To, Subject, Message)');
                        return;
                      }

                      setIsSending(true);
                      try {
                        let finalBody = composeBody;
                        if (composeSignature) {
                          finalBody += `<br><br>${composeSignature}`;
                        }

                        // Convert attachments to base64 (skip Drive files - they're linked, not attached)
                        const attachments = await Promise.all(
                          composeAttachments
                            .filter(att => !att.isDriveFile) // Only process regular file attachments
                            .map(async (att) => {
                              return new Promise<{ filename: string; content: string; type: string }>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const base64 = (reader.result as string).split(',')[1]; // Remove data:type;base64, prefix
                                  resolve({
                                    filename: att.file.name,
                                    content: base64,
                                    type: att.file.type
                                  });
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(att.file);
                              });
                            })
                        );

                        // Add Drive file links to email body for compose mode
                        const driveFiles = composeAttachments.filter(a => a.isDriveFile && a.driveWebViewLink);
                        if (driveFiles.length > 0 && composeMode === 'compose') {
                          let driveLinksHtml = '<br><br><div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 12px;"><p style="font-size: 12px; color: #64748b; margin-bottom: 8px;"><strong>Attached from Google Drive:</strong></p><ul style="margin: 0; padding-left: 20px;">';
                          driveFiles.forEach(file => {
                            driveLinksHtml += `<li style="margin-bottom: 4px;"><a href="${file.driveWebViewLink}" target="_blank" style="color: #4f46e5; text-decoration: none;">${file.file.name}</a></li>`;
                          });
                          driveLinksHtml += '</ul></div>';
                          finalBody += driveLinksHtml;
                        }

                        if (composeMode === 'reply' || composeMode === 'replyAll') {
                          await apiReplyEmail({
                            emailId: selectedEmail?.id || '',
                            userId: userId,
                            accountEmail: composeAccountEmail || connectedAccounts[0]?.email,
                            body: finalBody,
                            replyAll: composeMode === 'replyAll',
                            attachments: attachments.length > 0 ? attachments : undefined
                          });
                          showSuccess('Reply sent successfully');
                        } else if (composeMode === 'forward') {
                          await apiForwardEmail({
                            emailId: selectedEmail?.id || '',
                            userId: userId,
                            accountEmail: composeAccountEmail || connectedAccounts[0]?.email,
                            to: composeTo,
                            cc: composeCc.length > 0 ? composeCc : undefined,
                            bcc: composeBcc.length > 0 ? composeBcc : undefined,
                            body: finalBody,
                            attachments: attachments.length > 0 ? attachments : undefined
                          });
                          showSuccess('Email forwarded successfully');
                        } else {
                          const sentEmail = await apiSendEmail({
                            userId: userId,
                            accountEmail: composeAccountEmail || connectedAccounts[0]?.email,
                            to: composeTo,
                            cc: composeCc.length > 0 ? composeCc : undefined,
                            bcc: composeBcc.length > 0 ? composeBcc : undefined,
                            subject: composeSubject,
                            body: finalBody,
                            attachments: attachments.length > 0 ? attachments : undefined
                          });

                          // Attach Drive files to sent email (if we have an email ID)
                          const sentEmailId = sentEmail?.data?.id;
                          if (sentEmailId) {
                            const driveFilesToAttach = composeAttachments.filter(a => a.isDriveFile && a.driveFileId);
                            for (const att of driveFilesToAttach) {
                              try {
                                await apiAttachDriveFile({
                                  userId,
                                  emailId: sentEmailId,
                                  fileId: att.driveFileId!,
                                  fileName: att.file.name,
                                  fileMimeType: att.file.type,
                                  webViewLink: att.driveWebViewLink,
                                  webContentLink: undefined,
                                  iconLink: att.driveIconLink
                                });
                              } catch (err: any) {
                                console.error('Failed to attach Drive file:', err);
                                // Continue with other attachments
                              }
                            }
                          }

                          showSuccess('Email sent successfully');
                        }

                        // Cleanup attachments
                        composeAttachments.forEach(att => {
                          if (att.preview) {
                            URL.revokeObjectURL(att.preview);
                          }
                        });

                        setShowComposeModal(false);
                        setComposeTo([]);
                        setComposeCc([]);
                        setComposeBcc([]);
                        setComposeSubject('');
                        setComposeBody('');
                        setComposeAttachments([]);
                        setToInput('');
                        setCcInput('');
                        setBccInput('');
                        setShowDrivePicker(false);
                        await refetch();
                      } catch (err: any) {
                        const errorMsg = getSafeErrorMessage(err, 'Failed to send email');
                        showError(errorMsg);
                      } finally {
                        setIsSending(false);
                      }
                    }}
                    disabled={isSending || composeTo.length === 0 || !composeSubject || !composeBody || connectedAccounts.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {composeMode === 'reply' || composeMode === 'replyAll' ? 'Send Reply' :
                          composeMode === 'forward' ? 'Forward' : 'Send'}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-slate-100 text-slate-500 text-sm font-medium rounded-lg flex items-center gap-2" title="You don't have permission to send emails. Contact an admin.">
                    <Send className="w-4 h-4" />
                    Send (Admin Only)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {attachmentPreviewModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4 flex flex-col bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {(isImageFile(attachmentPreviewModal.mimeType) || isPdfFile(attachmentPreviewModal.mimeType)) && (
                  <ImageIcon className="w-5 h-5 text-indigo-600" />
                )}
                <h3 className="text-lg font-semibold text-slate-900 truncate">
                  {attachmentPreviewModal.filename}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (attachmentPreviewModal.url) {
                      window.URL.revokeObjectURL(attachmentPreviewModal.url);
                    }
                    setAttachmentPreviewModal(null);
                  }}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (selectedEmail && attachmentPreviewModal.url) {
                      handleDownloadAttachment(attachmentPreviewModal.emailId, attachmentPreviewModal.attachmentId, attachmentPreviewModal.filename);
                    }
                  }}
                  className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50">
              {attachmentPreviewModal.url ? (
                isImageFile(attachmentPreviewModal.mimeType) ? (
                  <img
                    src={attachmentPreviewModal.url}
                    alt={attachmentPreviewModal.filename}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : isPdfFile(attachmentPreviewModal.mimeType) ? (
                  <iframe
                    src={attachmentPreviewModal.url}
                    className="w-full h-full min-h-[600px] rounded-lg border border-slate-200"
                    title={attachmentPreviewModal.filename}
                  />
                ) : (
                  <div className="text-center text-slate-500">
                    <File className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <p className="text-sm">Preview not available for this file type</p>
                    <button
                      onClick={() => {
                        if (selectedEmail) {
                          handleDownloadAttachment(attachmentPreviewModal.emailId, attachmentPreviewModal.attachmentId, attachmentPreviewModal.filename);
                        }
                      }}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Download File
                    </button>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-sm text-slate-500">Loading attachment...</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Label Selector Modal */}
      {showLabelSelector && labelSelectorEmailId && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => {
            setShowLabelSelector(false);
            setLabelSelectorEmailId(null);
          }}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Manage Labels</h2>
              <button
                onClick={() => {
                  setShowLabelSelector(false);
                  setLabelSelectorEmailId(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Create Label Button */}
              {connectedAccounts.length > 0 && (
                <div className="mb-4 pb-4 border-b border-slate-200">
                  <button
                    onClick={() => setShowCreateLabelModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 border-2 border-dashed border-indigo-200 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Label
                  </button>
                </div>
              )}

              {loadingLabels ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <p className="text-slate-500 text-sm">Loading labels…</p>
                </div>
              ) : gmailLabels.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm mb-4">No labels available. Connect Gmail and sync to see labels, or create one below.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchGmailLabels(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry
                    </button>
                    {connectedAccounts.length > 0 && (
                      <button
                        onClick={() => setShowCreateLabelModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create Your First Label
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {gmailLabels.map(label => {
                    const email = emails.find(e => e.id === labelSelectorEmailId);
                    const isSelected = email?.labels?.includes(label.id) || false;
                    return (
                      <label
                        key={label.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (labelSelectorEmailId) {
                              if (e.target.checked) {
                                handleUpdateEmailLabels(labelSelectorEmailId, [label.id], []);
                              } else {
                                handleUpdateEmailLabels(labelSelectorEmailId, [], [label.id]);
                              }
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <span className="flex-1 text-sm font-medium text-slate-900">{label.name}</span>
                        {label.type === 'system' && (
                          <span className="px-2 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 rounded">
                            System
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Label Modal */}
      {showCreateLabelModal && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => {
            setShowCreateLabelModal(false);
            setNewLabelName('');
          }}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Create New Label</h2>
              <button
                onClick={() => {
                  setShowCreateLabelModal(false);
                  setNewLabelName('');
                  setSelectedAccountForLabel('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Label Name
                </label>
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="e.g., Important, Follow-up, Project X"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newLabelName.trim() && (selectedAccountForLabel || connectedAccounts.length > 0)) {
                      const accountEmail = selectedAccountForLabel || connectedAccounts[0].email;
                      handleCreateLabel(newLabelName.trim(), accountEmail);
                    }
                  }}
                  autoFocus
                />
              </div>

              {connectedAccounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Gmail Account
                  </label>
                  <select
                    value={selectedAccountForLabel || connectedAccounts[0].email}
                    onChange={(e) => setSelectedAccountForLabel(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {connectedAccounts.map(account => (
                      <option key={account.email} value={account.email}>
                        {account.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreateLabelModal(false);
                    setNewLabelName('');
                    setSelectedAccountForLabel('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newLabelName.trim() && connectedAccounts.length > 0) {
                      const accountEmail = selectedAccountForLabel || connectedAccounts[0].email;
                      handleCreateLabel(newLabelName.trim(), accountEmail);
                    }
                  }}
                  disabled={!newLabelName.trim() || creatingLabel || connectedAccounts.length === 0}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creatingLabel ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Label
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal (Phase 5) - shows required data from email for reconfirmation */}
      {showScheduleMeetingModal && userId && (
        <ScheduleMeetingModal
          isOpen={showScheduleMeetingModal}
          onClose={() => {
            setShowScheduleMeetingModal(false);
            setScheduleMeetingExtractedDetails(null);
            setScheduleMeetingEmailId(null);
            setScheduleMeetingEmailSubject(null);
            setScheduleMeetingEmailBody(null);
            setScheduleMeetingEmailParticipants(null);
          }}
          userId={userId}
          emailId={scheduleMeetingEmailId || undefined}
          emailSubject={scheduleMeetingEmailSubject ?? composeSubject}
          emailBody={scheduleMeetingEmailBody ?? composeBody}
          participants={scheduleMeetingEmailParticipants ?? composeTo}
          extractedDetails={scheduleMeetingExtractedDetails || undefined}
          onCreateSuccess={() => {
            if (scheduleMeetingEmailId && selectedEmail?.id === scheduleMeetingEmailId) {
              apiGetCalendarEvents(userId, scheduleMeetingEmailId).then(res => {
                if (res.success && res.data) {
                  setLinkedCalendarEvents(res.data);
                }
              }).catch(() => { });
            }
          }}
        />
      )}

      {/* Link Modal (Phase 7.1) */}
      {showLinkModal && linkModalType && selectedEmail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Link to {linkModalType.charAt(0).toUpperCase() + linkModalType.slice(1)}
              </h3>
              <button
                onClick={() => { setShowLinkModal(false); setLinkModalType(null); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {linkModalType === 'contact' && (
                <div className="space-y-2">
                  {contacts.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => handleLinkEmail('contact', contact.id)}
                      disabled={linkingEmail}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors disabled:opacity-50"
                    >
                      <p className="font-medium text-slate-900">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.email}</p>
                    </button>
                  ))}
                </div>
              )}
              {linkModalType === 'company' && (
                <div className="space-y-2">
                  {companies.map(company => (
                    <button
                      key={company.id}
                      onClick={() => handleLinkEmail('company', company.id)}
                      disabled={linkingEmail}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-green-50 rounded-lg border border-slate-200 hover:border-green-300 transition-colors disabled:opacity-50"
                    >
                      <p className="font-medium text-slate-900">{company.name}</p>
                      {company.industry && <p className="text-xs text-slate-500">{company.industry}</p>}
                    </button>
                  ))}
                </div>
              )}
              {linkModalType === 'deal' && (
                <div className="space-y-2">
                  {deals.map(deal => (
                    <button
                      key={deal.id}
                      onClick={() => handleLinkEmail('deal', deal.id)}
                      disabled={linkingEmail}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-purple-50 rounded-lg border border-slate-200 hover:border-purple-300 transition-colors disabled:opacity-50"
                    >
                      <p className="font-medium text-slate-900">{deal.title || deal.name}</p>
                      {deal.stage && <p className="text-xs text-slate-500">{deal.stage}</p>}
                    </button>
                  ))}
                </div>
              )}
              {linkModalType === 'project' && (
                <div className="space-y-2">
                  {projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => handleLinkEmail('project', project.id)}
                      disabled={linkingEmail}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-amber-50 rounded-lg border border-slate-200 hover:border-amber-300 transition-colors disabled:opacity-50"
                    >
                      <p className="font-medium text-slate-900">{project.title || project.name}</p>
                      {project.status && <p className="text-xs text-slate-500">{project.status}</p>}
                    </button>
                  ))}
                </div>
              )}
              {linkModalType === 'contract' && (
                <div className="space-y-2">
                  {contracts.map(contract => (
                    <button
                      key={contract.id}
                      onClick={() => handleLinkEmail('contract', contract.id)}
                      disabled={linkingEmail}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-300 transition-colors disabled:opacity-50"
                    >
                      <p className="font-medium text-slate-900">{contract.title}</p>
                      {contract.status && <p className="text-xs text-slate-500">{contract.status}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal (Phase 7.2) */}
      {showCreateTaskModal && selectedEmail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create Task from Email</h3>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  defaultValue={selectedEmail.subject || 'Task from Email'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  id="task-title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  id="task-priority"
                  defaultValue="Medium"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project (Optional)</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  id="task-project"
                  defaultValue=""
                >
                  <option value="">None</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.title || project.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign To (Optional)</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  id="task-assignee"
                  defaultValue=""
                >
                  <option value="">Unassigned</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name || user.email}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  const titleInput = document.getElementById('task-title') as HTMLInputElement;
                  const priorityInput = document.getElementById('task-priority') as HTMLSelectElement;
                  const projectInput = document.getElementById('task-project') as HTMLSelectElement;
                  const assigneeInput = document.getElementById('task-assignee') as HTMLSelectElement;
                  handleCreateTaskFromEmail({
                    title: titleInput?.value,
                    priority: priorityInput?.value,
                    projectId: projectInput?.value || undefined,
                    assigneeId: assigneeInput?.value || undefined
                  });
                }}
                className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Send Modal (Phase 8.2) */}
      {showScheduleSendModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                Schedule Send
              </h2>
              <button
                onClick={() => {
                  setShowScheduleSendModal(false);
                  setScheduleSendDateTime('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduleSendDateTime}
                  onChange={(e) => setScheduleSendDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Timezone
                </label>
                <select
                  value={scheduleSendTimezone}
                  onChange={(e) => setScheduleSendTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="UTC">UTC</option>
                  <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                    {Intl.DateTimeFormat().resolvedOptions().timeZone} (Local)
                  </option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowScheduleSendModal(false);
                    setScheduleSendDateTime('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!scheduleSendDateTime) {
                      showError('Please select a date and time');
                      return;
                    }
                    if (!userId || composeTo.length === 0 || !composeSubject || !composeBody) {
                      showError('Please fill in all required fields');
                      return;
                    }

                    try {
                      // Convert attachments to base64
                      const attachments = await Promise.all(
                        composeAttachments
                          .filter(att => !att.isDriveFile)
                          .map(async (att) => {
                            return new Promise<{ filename: string; content: string; type: string }>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => {
                                const base64 = (reader.result as string).split(',')[1];
                                resolve({
                                  filename: att.file.name,
                                  content: base64,
                                  type: att.file.type
                                });
                              };
                              reader.onerror = reject;
                              reader.readAsDataURL(att.file);
                            });
                          })
                      );

                      let finalBody = composeBody;
                      if (composeSignature) {
                        finalBody += `<br><br>${composeSignature}`;
                      }

                      await apiScheduleSendEmail({
                        userId,
                        accountEmail: composeAccountEmail || connectedAccounts[0]?.email,
                        to: composeTo,
                        cc: composeCc.length > 0 ? composeCc : undefined,
                        bcc: composeBcc.length > 0 ? composeBcc : undefined,
                        subject: composeSubject,
                        body: finalBody,
                        scheduledDateTime: scheduleSendDateTime,
                        timezone: scheduleSendTimezone,
                        attachments: attachments.length > 0 ? attachments : undefined
                      });

                      showSuccess('Email scheduled successfully');
                      setShowScheduleSendModal(false);
                      setShowComposeModal(false);
                      // Reset compose form
                      setComposeTo([]);
                      setComposeCc([]);
                      setComposeBcc([]);
                      setComposeSubject('');
                      setComposeBody('');
                      setComposeAttachments([]);
                      setScheduleSendDateTime('');
                    } catch (err: any) {
                      const errorMsg = getSafeErrorMessage(err, 'Failed to schedule email');
                      showError(errorMsg);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Schedule Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Drafts Modal (Phase 8.2) */}
      {showGmailDraftsModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <File className="w-5 h-5 text-indigo-500" />
                Gmail Drafts
              </h2>
              <button
                onClick={() => {
                  setShowGmailDraftsModal(false);
                  setGmailDrafts([]);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingGmailDrafts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="ml-3 text-slate-600">Loading drafts...</span>
                </div>
              ) : gmailDrafts.length === 0 ? (
                <div className="text-center py-12">
                  <File className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm">No drafts found in Gmail</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gmailDrafts.map((draft: any) => (
                    <div
                      key={draft.id}
                      className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer"
                      onClick={() => {
                        // Load draft into compose form
                        if (draft.payload?.headers) {
                          const headers = draft.payload.headers;
                          const toHeader = headers.find((h: any) => h.name === 'To');
                          const ccHeader = headers.find((h: any) => h.name === 'Cc');
                          const bccHeader = headers.find((h: any) => h.name === 'Bcc');
                          const subjectHeader = headers.find((h: any) => h.name === 'Subject');

                          if (toHeader?.value) {
                            setComposeTo(toHeader.value.split(',').map((e: string) => e.trim()));
                          }
                          if (ccHeader?.value) {
                            setComposeCc(ccHeader.value.split(',').map((e: string) => e.trim()));
                          }
                          if (bccHeader?.value) {
                            setComposeBcc(bccHeader.value.split(',').map((e: string) => e.trim()));
                          }
                          if (subjectHeader?.value) {
                            setComposeSubject(subjectHeader.value);
                          }
                        }

                        // Extract body from draft (decode base64 in browser)
                        if (draft.payload?.body?.data) {
                          try {
                            const decoded = atob(draft.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                            setComposeBody(decoded);
                          } catch (e) {
                            console.error('Failed to decode draft body:', e);
                            showError('Failed to decode draft body');
                          }
                        } else if (draft.payload?.parts) {
                          // Handle multipart messages
                          const htmlPart = draft.payload.parts.find((p: any) => p.mimeType === 'text/html');
                          if (htmlPart?.body?.data) {
                            try {
                              const decoded = atob(htmlPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                              setComposeBody(decoded);
                            } catch (e) {
                              console.error('Failed to decode draft body:', e);
                              showError('Failed to decode draft body');
                            }
                          }
                        }

                        setShowGmailDraftsModal(false);
                        showSuccess('Draft loaded');
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 mb-1 truncate">
                            {draft.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '(No subject)'}
                          </h3>
                          <p className="text-xs text-slate-500 mb-2">
                            To: {draft.payload?.headers?.find((h: any) => h.name === 'To')?.value || 'No recipients'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Created {draft.message?.internalDate ? new Date(parseInt(draft.message.internalDate)).toLocaleString() : 'Unknown date'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Load draft
                            if (draft.payload?.headers) {
                              const headers = draft.payload.headers;
                              const toHeader = headers.find((h: any) => h.name === 'To');
                              const ccHeader = headers.find((h: any) => h.name === 'Cc');
                              const bccHeader = headers.find((h: any) => h.name === 'Bcc');
                              const subjectHeader = headers.find((h: any) => h.name === 'Subject');

                              if (toHeader?.value) {
                                setComposeTo(toHeader.value.split(',').map((e: string) => e.trim()));
                              }
                              if (ccHeader?.value) {
                                setComposeCc(ccHeader.value.split(',').map((e: string) => e.trim()));
                              }
                              if (bccHeader?.value) {
                                setComposeBcc(bccHeader.value.split(',').map((e: string) => e.trim()));
                              }
                              if (subjectHeader?.value) {
                                setComposeSubject(subjectHeader.value);
                              }
                            }

                            if (draft.payload?.body?.data) {
                              try {
                                const decoded = atob(draft.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                                setComposeBody(decoded);
                              } catch (e) {
                                console.error('Failed to decode draft body:', e);
                                showError('Failed to decode draft body');
                              }
                            } else if (draft.payload?.parts) {
                              const htmlPart = draft.payload.parts.find((p: any) => p.mimeType === 'text/html');
                              if (htmlPart?.body?.data) {
                                try {
                                  const decoded = atob(htmlPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                                  setComposeBody(decoded);
                                } catch (e) {
                                  console.error('Failed to decode draft body:', e);
                                  showError('Failed to decode draft body');
                                }
                              }
                            }
                            setShowGmailDraftsModal(false);
                            showSuccess('Draft loaded');
                          }}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connected Accounts Modal */}
      {showAccountsModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => {
            setShowAccountsModal(false);
            setAccountSearchFilter('');
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-900">Team Connected Accounts</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {connectedAccounts.length} account{connectedAccounts.length !== 1 ? 's' : ''} connected
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAccountsModal(false);
                  setAccountSearchFilter('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Search Filter */}
            <div className="p-4 border-b border-slate-200 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by email or owner name..."
                  value={accountSearchFilter}
                  onChange={(e) => setAccountSearchFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Accounts List */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {(() => {
                // Get list of filtered account emails for quick lookup
                const filteredAccountEmails = new Set(filteredAccounts.map(fa => fa.accountEmail.toLowerCase()));
                
                // Filter accounts based on search
                const searchFilteredAccounts = connectedAccounts
                  .filter((account, index, self) =>
                    self.findIndex(a => a.email === account.email && a.userId === account.userId) === index
                  )
                  .filter(account => {
                    if (!accountSearchFilter.trim()) return true;
                    const searchLower = accountSearchFilter.toLowerCase();
                    return (
                      account.email.toLowerCase().includes(searchLower) ||
                      account.ownerName.toLowerCase().includes(searchLower)
                    );
                  });

                return searchFilteredAccounts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-600 font-medium text-sm">
                      {accountSearchFilter ? 'No accounts found matching your search' : 'No accounts connected'}
                    </p>
                    {accountSearchFilter && (
                      <button
                        onClick={() => setAccountSearchFilter('')}
                        className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchFilteredAccounts.map((account, idx) => {
                      const isFiltered = filteredAccountEmails.has(account.email.toLowerCase());
                      const filteredAccountData = filteredAccounts.find(fa => fa.accountEmail.toLowerCase() === account.email.toLowerCase());
                      
                      return (
                        <div
                          key={`${account.email}-${account.userId}-${idx}`}
                          className={`flex items-center justify-between p-4 bg-white border rounded-xl transition-all ${
                            account.isCurrentUser
                              ? 'border-indigo-300 bg-indigo-50/30'
                              : isFiltered
                              ? 'border-amber-300 bg-amber-50/30'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                              isFiltered ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                            }`}>
                              {account.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-slate-900 truncate">{account.email}</p>
                                {account.isCurrentUser && (
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded uppercase shrink-0">
                                    You
                                  </span>
                                )}
                                {isFiltered && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase shrink-0">
                                    Filtered
                                  </span>
                                )}
                              </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {account.ownerName === 'Unknown User' ? (
                                <span className="italic">Account synced from emails · {new Date(account.connectedAt).toLocaleDateString()}</span>
                              ) : (
                                <>
                                  {account.ownerName} · Connected {new Date(account.connectedAt).toLocaleDateString()}
                                  {!account.hasToken && account.ownerName !== 'Unknown User' && (
                                    <span className="ml-1 text-amber-600" title="No active token - emails were synced previously">⚠️</span>
                                  )}
                                </>
                              )}
                            </p>
                            </div>
                          </div>
                          <div className="ml-3 flex items-center gap-2 shrink-0">
                            {isFiltered ? (
                              <button
                                onClick={() => filteredAccountData && handleUnfilterAccount(filteredAccountData.id, account.email)}
                                disabled={filteringAccount === account.email}
                                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                title="Show emails from this account"
                              >
                                {filteringAccount === account.email ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Unfiltering...</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Show</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleFilterAccount(account.email)}
                                disabled={filteringAccount === account.email}
                                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                title="Hide emails from this account"
                              >
                                {filteringAccount === account.email ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Hiding...</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5" />
                                    <span>Hide</span>
                                  </>
                                )}
                              </button>
                            )}
                            {account.isCurrentUser && account.hasToken !== false && (
                              <button
                                onClick={() => handleDisconnectAccount(account.email)}
                                disabled={disconnectingAccount === account.email}
                                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                title="Disconnect your account"
                              >
                                {disconnectingAccount === account.email ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Disconnecting...</span>
                                  </>
                                ) : (
                                  <>
                                    <DisconnectIcon className="w-3.5 h-3.5" />
                                    <span>Remove</span>
                                  </>
                                )}
                              </button>
                            )}
                            {account.isCurrentUser && account.hasToken === false && (
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded" title="This account has no active token - cannot be disconnected">
                                No Token
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer with Connect Button */}
            <div className="p-4 border-t border-slate-200 shrink-0">
              <button
                onClick={() => {
                  setShowAccountsModal(false);
                  handleConnectAccount();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Connect Your Gmail Account
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inbox;
