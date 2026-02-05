
export type Status = 'open' | 'assigned' | 'resolved' | 'closed';

export interface User {
  id: string;
  name: string;
  email: string;
  // Role-based access control: Viewer (read-only), Collaborator (comment/draft), Admin (full access)
  role: 'Viewer' | 'Collaborator' | 'Admin' | 'User'; // 'User' is legacy, maps to 'Collaborator'
  avatar: string;
  active: boolean;
  jobTitle?: string;
  department?: string;
  phone?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}

export interface FeedbackItem {
  id: string;
  userId: string;
  type: 'bug' | 'feature' | 'idea';
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'done' | 'postponed' | 'canceled';
  url?: string; // Separate field for URL attachments
  attachments?: Array<{
    type: 'image' | 'video';
    source: 'file';
    data: string; // base64 encoded (for files only)
    filename: string; // For file attachments
    mimeType: string; // For file attachments
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  start: string; // ISO 8601 datetime or time format (HH:MM)
  end: string;   // ISO 8601 datetime or time format (HH:MM)
  type: 'meeting' | 'task' | 'deadline' | 'reminder' | 'custom';
  location?: string;
  participants?: string[];
  relatedEntity?: {
    type: 'deal' | 'project' | 'task' | 'contact';
    id: string;
  };
  color?: string;
  isAllDay?: boolean;
  recurringEventId?: string | null;
  recurrence?: string[] | null; // Google Calendar recurrence rules (e.g., ["RRULE:FREQ=DAILY"])
  reminders?: {
    minutesBefore: number[];
    email: boolean;
    push: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  // Google Calendar specific fields
  source?: 'google' | 'local';
  googleEventId?: string;
  htmlLink?: string;
}

export interface Note {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  companyId: string;
  role: string;
  phone: string;
  lastContacted: string;
  linkedin?: string;
  notes?: Note[]; // Changed from string to Note array
  legacyNotes?: string; // Keep old notes field for backward compatibility
  // Scanner-specific fields
  leadSourceId?: string; // Reference to LeadSource
  linkedinUrl?: string; // LinkedIn profile URL
  linkedinData?: {
    headline?: string;
    currentRole?: string;
    profileImageUrl?: string;
  };
  scannedFrom?: 'business_card' | 'linkedin';
  scanConfidenceScore?: number; // 0-100
  scanDate?: string; // ISO 8601 timestamp
  originalScanData?: {
    rawOcrText?: string;
    extractedFields?: any;
  };
}

export interface SocialSignal {
  id: string;
  type: 'funding' | 'hiring' | 'acquisition' | 'news';
  title: string;
  date: string;
  description: string;
  isAiGenerated?: boolean;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  logo: string;
  email?: string;
  linkedin?: string;
  ownerId?: string; // Account Manager
  isTargetAccount?: boolean;
  socialSignals?: SocialSignal[];
  notes?: Note[];
  // Scanner-specific fields
  domain?: string; // Email domain (e.g., "techcorp.com")
  createdSource?: string; // "business_card_scanner" | "linkedin_scanner" | "manual"
  createdFromContactId?: string; // If auto-created from contact
  linkedinCompanyUrl?: string; // Company LinkedIn page
}

export interface Deal {
  id: string;
  name?: string; // Alias for title
  title: string;
  account?: string; // Alias for companyId
  companyId: string | null; // Can be null for standalone/direct deals
  amount?: number; // Alias for value
  value: number;
  currency?: string; // Currency code (USD, EUR, GBP, etc.) - defaults to USD
  stage: 'Discovery' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost' | 'Order Received' | 'Processing' | 'In Transit' | 'Delivered';
  pipelineType?: 'sales' | 'operations'; // Pipeline type: 'sales' or 'operations'
  ownerId: string;
  expectedCloseDate: string;
  description?: string;
  stakeholderIds?: string[]; // IDs of contacts linked to this deal
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name?: string; // Alias for title
  title: string;
  engagement?: string; // Engagement type/name
  companyId: string | null; // Can be null for standalone/general projects
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed';
  dealId?: string;
  progress: number;
  startDate?: string; // Project start date
  endDate?: string; // Project end date
  projectManager?: string; // Project manager user ID
  ownerId?: string;
  description?: string;
  noteImage?: string; // Base64 or URL for uploaded note image
  noteImageName?: string;
  noteImageMimeType?: string;
  assignedUserIds?: string[];
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskNote {
  id: string;
  userId: string;
  userName: string;
  text: string;
  imageUrl?: string; // Base64 or URL for uploaded image
  imageName?: string;
  imageMimeType?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId?: string; // Optional for standalone tasks
  title: string;
  description: string;
  category?: string; // Task category for organization
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  assigneeId: string;
  notes?: TaskNote[]; // Notes/comments with optional images
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Thread {
  id: string;
  subject: string;
  sender: string;
  email: string;
  lastMessage: string;
  timestamp: string;
  status: Status;
  assigneeId?: string;
  isStarred?: boolean;
  sharedBy?: string;
  sharedByName?: string;
  gmailMessageId?: string;
  gmailThreadId?: string;
  body?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  client?: string; // Alias for companyId
  companyId: string;
  amount: number;
  currency?: string; // Currency code (USD, EUR, GBP, etc.) - defaults to USD
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  dueDate: string;
  description?: string;
  userId?: string;
  items?: InvoiceItem[];
  lineItems?: InvoiceItem[]; // Alias for items
  incoterms?: string; // INCOTERMS value (EXW, FOB, CIF, DDP, etc.)
  createdAt?: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  companyId: string;
  title: string;
  amount: number;
  category: string;
  date: string; // Expense date
  description?: string;
  receiptUrl?: string; // URL or base64 for uploaded receipt/document
  receiptFilename?: string;
  receiptMimeType?: string;
  userId: string; // User who created/uploaded the expense
  status?: 'Pending' | 'Approved' | 'Rejected';
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  budget: number; // Total budget for this category
  department?: string; // Optional department filter
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Budget {
  id: string;
  year: number;
  department?: string; // Department-specific budget
  categories: {
    categoryId: string;
    categoryName: string;
    yearlyBudget: number;
    q1Budget?: number;
    q2Budget?: number;
    q3Budget?: number;
    q4Budget?: number;
  }[];
  totalBudget: number; // Sum of all category budgets
  createdBy: string; // User ID
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contract {
  id: string;
  title: string;
  documentType: string; // e.g., "NDA", "Service Agreement", "Employment Contract", etc.
  contractParty: string; // Other party in the contract
  companyId?: string; // Link to company if applicable
  contactId?: string; // Link to contact if applicable
  expirationDate?: string;
  renewalDate?: string;
  signedDate?: string;
  status: 'Draft' | 'Pending Signature' | 'Signed' | 'Expired' | 'Terminated';
  // Document storage
  fileUrl?: string; // Direct upload URL (Firebase Storage or base64)
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  // Google Drive integration
  googleDriveFileId?: string;
  googleDriveWebViewLink?: string;
  googleDriveDownloadLink?: string;
  googleDriveIconUrl?: string;
  isGoogleDriveLinked: boolean;
  // E-signature
  requiresSignature: boolean;
  signatureStatus?: 'Not Required' | 'Pending' | 'Completed';
  googleDocsSignatureLink?: string; // Link to Google Doc for signature
  signedBy?: string[]; // Array of user IDs who signed
  // Metadata
  description?: string;
  tags?: string[];
  userId: string; // Creator/owner
  createdAt?: string;
  updatedAt?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
  description: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  type: 'lead' | 'deal' | 'task' | 'payment' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  inApp: boolean;
  email: boolean;
}

// Lead Source Management
export interface LeadSource {
  id: string;
  name: string;
  type: 'scanner' | 'manual' | 'import' | 'api';
  description: string;
  active: boolean;
  icon: string; // Icon name (lucide-react)
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // User ID who created this
}

// Scanner Data Models
export interface ExtractedFieldData {
  value: string;
  confidence: number; // 0-100
}

export interface ExtractedData {
  name: ExtractedFieldData;
  title: ExtractedFieldData;
  email: ExtractedFieldData;
  phone: ExtractedFieldData;
  company: ExtractedFieldData;
  website: ExtractedFieldData;
  linkedin: ExtractedFieldData;
}

export interface LinkedInProfile {
  name: string;
  headline: string;
  currentRole: string;
  currentCompany: string;
  email: string | null;
  phone: string | null;
  profileImageUrl: string;
  companyWebsite: string;
  industry: string;
  location?: string;
  about?: string;
}

export interface ScanSuggestions {
  existingContact: Contact | null;
  existingCompany: Company | null;
  createNewCompany: boolean;
}
