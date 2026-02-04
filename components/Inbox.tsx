import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  CheckCircle2 as CheckCircle,
  Clock,
  AlertCircle as AlertCircleIcon,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import {
  apiSyncSharedInbox,
  apiGetSharedInboxEmails,
  apiGetSharedInboxEmailDetails,
  apiMarkSharedInboxEmailRead,
  apiToggleSharedInboxEmailStarred,
  apiGetGoogleCalendarStatus,
  apiGetUsers,
  apiGetConnectedGmailAccounts,
  apiDisconnectGmailAccount,
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
  apiDownloadAttachment,
  apiGetGmailLabels,
  apiCreateGmailLabel,
  apiUpdateEmailLabels,
  apiRemoveEmailLabel,
} from '../utils/api';

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

const Inbox: React.FC<{ currentUser?: any }> = ({ currentUser: propUser }) => {
  const { showSuccess, showError } = useToast();
  const currentUser = propUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user_data') || 'null') : null);
  const userId = currentUser?.id;

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

  const [emails, setEmails] = useState<SharedInboxEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<Array<{ email: string; userId: string; ownerName: string; connectedAt: string; lastSyncedAt: string; isCurrentUser?: boolean }>>([]);
  const [showAccountsList, setShowAccountsList] = useState(false);
  const [disconnectingAccount, setDisconnectingAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'threads'>('threads');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
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
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [selectedAccountForLabel, setSelectedAccountForLabel] = useState<string>('');
  
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
  const [composeAttachments, setComposeAttachments] = useState<Array<{ file: File; preview?: string; id: string }>>([]);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  
  // Confirmation modals state
  const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] = useState<string | null>(null);
  const [showDiscardEmailConfirm, setShowDiscardEmailConfirm] = useState(false);
  
  const quillEditorRef = useRef<any>(null);
  const quillInstanceRef = useRef<any>(null); // Store the actual Quill editor instance
  const noteImageInputRef = useRef<HTMLInputElement>(null);
  const composeQuillRef = useRef<any>(null);

  const loadEmails = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetSharedInboxEmails(userId, search || undefined, undefined);
      const data = res?.data ?? res ?? [];
      const emailsArray = Array.isArray(data) ? data : [];
      
      
      setEmails(emailsArray);
    } catch (err: any) {
      setEmails([]);
      const msg = err?.message || 'Failed to load inbox';
      setError(msg);
      if (err?.message?.toLowerCase().includes('google') || err?.message?.toLowerCase().includes('connected')) {
        setGmailConnected(false);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, search]);

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

  const loadConnectedAccounts = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiGetConnectedGmailAccounts(userId);
      const accounts = res?.data ?? res ?? [];
      // Deduplicate accounts by email + userId combination
      const uniqueAccounts = Array.isArray(accounts) 
        ? accounts.filter((account, index, self) => 
            self.findIndex(a => a.email === account.email && a.userId === account.userId) === index
          )
        : [];
      setConnectedAccounts(uniqueAccounts);
      setGmailConnected(uniqueAccounts.length > 0);
      // Set default account email for compose
      if (uniqueAccounts.length > 0 && !composeAccountEmail) {
        setComposeAccountEmail(uniqueAccounts[0].email);
      }
    } catch (err: any) {
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
      await loadEmails(); // Reload emails after disconnecting
    } catch (err: any) {
      showError(err?.message || 'Failed to disconnect account');
    } finally {
      setDisconnectingAccount(null);
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setGmailConnected(false);
      return;
    }
    checkGmailConnection();
    loadConnectedAccounts();
  }, [userId, checkGmailConnection, loadConnectedAccounts]);

  // Update compose account email when accounts change
  useEffect(() => {
    if (connectedAccounts.length > 0 && !composeAccountEmail) {
      setComposeAccountEmail(connectedAccounts[0].email);
    }
  }, [connectedAccounts]);

  useEffect(() => {
    if (!userId) return;
    loadEmails();
    
    // Periodic refresh every 60 seconds for real-time feel
    const intervalId = setInterval(() => {
      loadEmails();
    }, 60000); // 60 seconds
    
    return () => clearInterval(intervalId);
  }, [userId, loadEmails]);

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

  // Fetch Gmail labels
  const fetchGmailLabels = useCallback(async () => {
    if (!userId || loadingLabels) return;
    try {
      setLoadingLabels(true);
      const response = await apiGetGmailLabels(userId);
      if (response.success && response.labels) {
        setGmailLabels(response.labels);
      }
    } catch (err: any) {
      console.error('Error fetching labels:', err);
    } finally {
      setLoadingLabels(false);
    }
  }, [userId, loadingLabels]);

  // Load Gmail labels
  useEffect(() => {
    if (userId && gmailConnected) {
      fetchGmailLabels();
    }
  }, [userId, gmailConnected, fetchGmailLabels]);

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
      const res = await apiSyncSharedInbox(userId);
      showSuccess(res?.message || 'Inbox synced with Gmail');
      await loadEmails();
    } catch (err: any) {
      const msg = err?.message || 'Sync failed';
      showError(msg);
      setError(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectEmail = async (email: SharedInboxEmail) => {
    if (!userId) return;
    setSelectedEmail(null);
    setAiDraft(null); // Clear AI draft when switching emails
    setDetailLoading(true);
    try {
      const res = await apiGetSharedInboxEmailDetails(email.id, userId);
      const data = res?.data ?? res ?? {};
      setSelectedEmail({
        ...email,
        body: data.body ?? email.lastMessage,
        gmailThreadId: data.gmailThreadId,
      });
      setEmails(prev =>
        prev.map(e => (e.id === email.id ? { ...e, isRead: true } : e))
      );
      
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
    } catch (err: any) {
      showError(err?.message || 'Could not load email');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleMarkRead = async (emailId: string, markAsRead: boolean) => {
    if (!userId) return;
    try {
      await apiMarkSharedInboxEmailRead(emailId, markAsRead, userId);
      setEmails(prev =>
        prev.map(e => (e.id === emailId ? { 
          ...e, 
          isRead: markAsRead,
          syncStatus: {
            ...(e.syncStatus || {}),
            readStatus: 'pending'
          }
        } : e))
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
      showSuccess(markAsRead ? 'Marked as read' : 'Marked as unread');
    } catch (err: any) {
      showError(err?.message || 'Update failed');
    }
  };

  const handleToggleStar = async (emailId: string, isStarred: boolean) => {
    try {
      await apiToggleSharedInboxEmailStarred(emailId, isStarred);
      setEmails(prev =>
        prev.map(e => (e.id === emailId ? { 
          ...e, 
          isStarred,
          syncStatus: {
            ...(e.syncStatus || {}),
            starredStatus: 'pending'
          }
        } : e))
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
      showSuccess(isStarred ? 'Starred' : 'Unstarred');
    } catch (err: any) {
      showError(err?.message || 'Update failed');
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
  const handleUpdateEmailLabels = async (emailId: string, addLabelIds: string[] = [], removeLabelIds: string[] = []) => {
    try {
      await apiUpdateEmailLabels(emailId, { addLabelIds, removeLabelIds });
      
      // Update local state
      setEmails(prev =>
        prev.map(e => {
          if (e.id === emailId) {
            const currentLabels = e.labels || [];
            const updatedLabels = [...currentLabels];
            addLabelIds.forEach(id => {
              if (!updatedLabels.includes(id)) updatedLabels.push(id);
            });
            removeLabelIds.forEach(id => {
              const index = updatedLabels.indexOf(id);
              if (index > -1) updatedLabels.splice(index, 1);
            });
            return {
              ...e,
              labels: updatedLabels,
              syncStatus: {
                ...(e.syncStatus || {}),
                labelsStatus: 'pending'
              }
            };
          }
          return e;
        })
      );
      
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
      setEmails(prev =>
        prev.map(e => (e.id === emailId ? { ...e, ...updates } : e))
      );
      if (selectedEmail?.id === emailId) {
        setSelectedEmail((prev) => (prev ? { ...prev, ...updates } : null));
      }
      showSuccess('Email updated');
    } catch (err: any) {
      showError(err?.message || 'Update failed');
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

  // Remove attachment from compose
  const handleRemoveComposeAttachment = (id: string) => {
    const attachment = composeAttachments.find(att => att.id === id);
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setComposeAttachments(composeAttachments.filter(att => att.id !== id));
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
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
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
        // Auto-select highest confidence variation
        setSelectedVariationIndex(0);
        setAiDraft(draftData.variations[0].draft);
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
        setAiDraft(draft);
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

  // Filter emails by selected label
  const filteredEmails = useMemo(() => {
    if (!selectedLabelFilter) {
      return emails;
    }
    
    return emails.filter(email => {
      const emailLabels = email.labels || [];
      return emailLabels.includes(selectedLabelFilter);
    });
  }, [emails, selectedLabelFilter]);

  const unreadCount = filteredEmails.filter(e => !e.isRead).length;

  // Group emails by thread (gmailThreadId)
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
    
    // Sort threads by most recent email
    return Array.from(threads.entries())
      .map(([threadId, threadEmails]) => ({
        threadId,
        emails: threadEmails.sort((a, b) => {
          const dateA = parseInt(a.internalDate || '0') || 0;
          const dateB = parseInt(b.internalDate || '0') || 0;
          return dateB - dateA;
        }),
        latestEmail: threadEmails[0],
        unreadCount: threadEmails.filter(e => !e.isRead).length,
      }))
      .sort((a, b) => {
        const dateA = parseInt(a.latestEmail.internalDate || '0') || 0;
        const dateB = parseInt(b.latestEmail.internalDate || '0') || 0;
        return dateB - dateA;
      });
  }, [filteredEmails, viewMode]);

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

  if (!userId) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20 text-center">
        <InboxIcon className="w-14 h-14 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium">Sign in to view Shared Inbox</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col animate-in fade-in duration-300">
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
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Syncing…' : 'Sync from Gmail'}
          </button>
        </div>
      </div>

      {/* Connected Accounts Section - Shows ALL team accounts */}
      {/* {connectedAccounts.length > 0 && (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-semibold text-slate-900">
                Team Connected Accounts ({connectedAccounts.length})
              </p>
            </div>
            <button
              onClick={() => setShowAccountsList(!showAccountsList)}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              {showAccountsList ? 'Hide' : 'Show'} Accounts
            </button>
          </div>
          
          {showAccountsList && (
            <div className="space-y-2 mt-3">
              {connectedAccounts
                .filter((account, index, self) => 
                  self.findIndex(a => a.email === account.email && a.userId === account.userId) === index
                )
                .map((account, idx) => (
                <div
                  key={`${account.email}-${account.userId}-${idx}`}
                  className={`flex items-center justify-between p-3 bg-white border rounded-lg ${
                    account.isCurrentUser ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                      {account.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{account.email}</p>
                        {account.isCurrentUser && (
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-medium rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {account.ownerName} · Connected {new Date(account.connectedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {account.isCurrentUser && (
                    <button
                      onClick={() => handleDisconnectAccount(account.email)}
                      disabled={disconnectingAccount === account.email}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Disconnect your account"
                    >
                      {disconnectingAccount === account.email ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <DisconnectIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleConnectAccount}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 text-slate-600 text-sm font-medium rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Connect Your Gmail Account
              </button>
            </div>
          )}
        </div>
      )} */}

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

      {/* Search */}
      <div className="mt-4 relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search emails…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadEmails()}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Two-column layout: list | detail — no page scroll; list scrolls in card */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 mt-4 min-h-0">
        {/* Email list — scrolls inside this card only */}
        <div
          className={`flex flex-col min-h-0 border border-slate-200 rounded-xl bg-white overflow-hidden ${
            selectedEmail ? 'lg:w-[380px] lg:flex-shrink-0' : 'flex-1'
          }`}
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
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
                  : 'Connect Gmail and tap "Sync from Gmail" to pull in your inbox.'}
              </p>
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
            <ul className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0" key={`threads-${selectedLabelFilter || 'all'}`}>
              {threadedEmails.map(thread => {
                const isExpanded = expandedThreads.has(thread.threadId);
                const latest = thread.latestEmail;
                const hasMultiple = thread.emails.length > 1;
                
                return (
                  <li key={thread.threadId}>
                    {/* Thread header */}
                    <button
                      type="button"
                      onClick={() => hasMultiple ? toggleThread(thread.threadId) : handleSelectEmail(latest)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                        selectedEmail?.id === latest.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                      }`}
                    >
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`truncate font-medium ${
                              thread.unreadCount > 0 ? 'text-slate-900' : 'text-slate-600'
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
                          {/* Priority Badge */}
                          {latest.priority && latest.priority !== 'medium' && (
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              latest.priority === 'high' ? 'bg-red-100 text-red-700' :
                              latest.priority === 'low' ? 'bg-blue-100 text-blue-700' : ''
                            }`}>
                              {latest.priority === 'high' ? 'High' : 'Low'}
                            </span>
                          )}
                          {/* Thread Status Badge */}
                          {latest.threadStatus && latest.threadStatus !== 'active' && (
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              latest.threadStatus === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
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
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {latest.sender || latest.email}
                        {hasMultiple && ` · ${thread.emails.length} messages`}
                      </p>
                      {(latest.accountEmail || latest.accountOwnerName) && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {latest.accountOwnerName && (
                            <span className="text-slate-500">via {latest.accountOwnerName}</span>
                          )}
                          {latest.accountEmail && (
                            <span className="ml-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-medium rounded">
                              {latest.accountEmail}
                            </span>
                          )}
                        </p>
                      )}
                        {latest.lastMessage && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {latest.lastMessage}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {latest.timestamp}
                        </span>
                        {thread.unreadCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1" />
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                    </button>
                    
                    {/* Thread emails (when expanded) */}
                    {isExpanded && hasMultiple && (
                      <div className="bg-slate-50/50 border-l-4 border-indigo-200 pl-4">
                        {thread.emails.map((email, idx) => (
                          <button
                            key={email.id}
                            type="button"
                            onClick={() => handleSelectEmail(email)}
                            className={`w-full text-left px-4 py-2.5 hover:bg-slate-100 transition-colors flex items-start gap-3 ${
                              selectedEmail?.id === email.id ? 'bg-indigo-50' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium ${!email.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {email.sender || email.email}
                                </span>
                                {!email.isRead && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                )}
                              </div>
                              {email.lastMessage && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                  {email.lastMessage}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                              {email.timestamp}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0" key={`list-${selectedLabelFilter || 'all'}`}>
              {filteredEmails.map(email => (
                <li key={email.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectEmail(email)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                      selectedEmail?.id === email.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`truncate font-medium ${
                            !email.isRead ? 'text-slate-900' : 'text-slate-600'
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
                        {/* Priority Badge */}
                        {email.priority && email.priority !== 'medium' && (
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            email.priority === 'high' ? 'bg-red-100 text-red-700' :
                            email.priority === 'low' ? 'bg-blue-100 text-blue-700' : ''
                          }`}>
                            {email.priority === 'high' ? 'High' : 'Low'}
                          </span>
                        )}
                        {/* Thread Status Badge */}
                        {email.threadStatus && email.threadStatus !== 'active' && (
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            email.threadStatus === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
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
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {email.sender || email.email}
                      </p>
                      {(email.accountEmail || email.accountOwnerName) && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {email.accountOwnerName && (
                            <span className="text-slate-500">via {email.accountOwnerName}</span>
                          )}
                          {email.accountEmail && (
                            <span className="ml-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-medium rounded">
                              {email.accountEmail}
                            </span>
                          )}
                        </p>
                      )}
                      {email.lastMessage && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {email.lastMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {email.timestamp}
                      </span>
                      {!email.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1" />
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Email detail — height by content; body scrolls inside panel */}
        <div className="flex-1 min-h-0 flex flex-col border border-slate-200 rounded-xl bg-white overflow-hidden min-w-0">
          {detailLoading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : selectedEmail ? (
            <>
              <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-4 flex-wrap shrink-0">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900 truncate">
                    {selectedEmail.subject || '(No subject)'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {selectedEmail.sender || selectedEmail.email} · {selectedEmail.timestamp}
                  </p>
                  {(selectedEmail.accountEmail || selectedEmail.accountOwnerName) && (
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedEmail.accountOwnerName && (
                        <span>Synced via <span className="font-medium text-slate-600">{selectedEmail.accountOwnerName}</span></span>
                      )}
                      {selectedEmail.accountEmail && (
                        <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-medium rounded">
                          {selectedEmail.accountEmail}
                        </span>
                      )}
                    </p>
                  )}
                  {/* Labels Display */}
                  {selectedEmail.labels && selectedEmail.labels.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {selectedEmail.labels.map(labelId => {
                        const label = gmailLabels.find(l => l.id === labelId);
                        if (!label) return null;
                        return (
                          <span
                            key={labelId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg"
                          >
                            {label.name}
                            <button
                              type="button"
                              onClick={() => handleRemoveEmailLabel(selectedEmail.id, labelId)}
                              className="hover:text-purple-900"
                              title="Remove label"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {/* Add Labels Button */}
                  <div className="mt-2">
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
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Email Metadata Controls */}
                  <div className="flex items-center gap-2 mr-2">
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
                    
                    {/* Owner Selector */}
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
                  </div>
                  
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
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
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
                      {selectedEmail.attachments.map((attachment, idx) => (
                        <div
                          key={attachment.attachmentId || idx}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg ${
                              isImageFile(attachment.mimeType) ? 'bg-blue-50 text-blue-600' :
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
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {attachment.filename}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatFileSize(attachment.size)} · {attachment.mimeType}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {(isImageFile(attachment.mimeType) || isPdfFile(attachment.mimeType)) && (
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email body */}
                <div className="prose prose-slate max-w-none text-sm whitespace-pre-wrap break-words">
                  {selectedEmail.body || selectedEmail.lastMessage || 'No content'}
                </div>

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
                              (errorMsg) => {}
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
                              (errorMsg) => {}
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
                              setAiDraft(variation.draft);
                            }}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              selectedVariationIndex === index
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
                                className={`h-1.5 rounded-full ${
                                  variation.confidence >= 80
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

                  {/* Add New Note */}
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

                  {/* Notes List */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {internalThreads[selectedEmail?.id] && internalThreads[selectedEmail.id]?.length > 0 ? (
                      internalThreads[selectedEmail.id].map((thread) => {
                        const canDelete = currentUser?.role === 'Admin' || thread.userId === currentUser?.id;
                        return (
                          <div key={thread.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs">
                                  {thread.userName?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{thread.userName}</p>
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
            </>
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
                          className={`w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm ${
                            idx === suggestionIndex ? 'bg-indigo-50' : ''
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
                
                {/* File Input */}
                <label className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
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

                {/* Attachment List */}
                {composeAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {composeAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <div className={`p-2 rounded-lg ${
                          isImageFile(attachment.file.type) ? 'bg-blue-50 text-blue-600' :
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
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {attachment.file.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatFileSize(attachment.file.size)} · {attachment.file.type}
                          </p>
                        </div>
                        {attachment.preview && (
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
              <button
                type="button"
                onClick={() => {
                  setShowDiscardEmailConfirm(true);
                }}
                className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
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

                      // Convert attachments to base64
                      const attachments = await Promise.all(
                        composeAttachments.map(async (att) => {
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
                        await apiSendEmail({
                          userId: userId,
                          accountEmail: composeAccountEmail || connectedAccounts[0]?.email,
                          to: composeTo,
                          cc: composeCc.length > 0 ? composeCc : undefined,
                          bcc: composeBcc.length > 0 ? composeBcc : undefined,
                          subject: composeSubject,
                          body: finalBody,
                          attachments: attachments.length > 0 ? attachments : undefined
                        });
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
                      await loadEmails();
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
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : gmailLabels.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm mb-4">No labels available.</p>
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

    </div>
  );
};

export default Inbox;
