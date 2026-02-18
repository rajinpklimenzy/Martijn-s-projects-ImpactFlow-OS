
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
  source?: 'google' | 'local' | 'firestore';
  googleEventId?: string;
  htmlLink?: string;
  /** Google Calendar event status */
  status?: 'confirmed' | 'tentative' | 'cancelled';
  /** Video/conference link from Google (Meet, etc.) */
  conferenceData?: {
    entryPoints?: Array<{ uri: string; entryPointType?: string; label?: string }>;
  };
  /** Attendees with RSVP (backend returns this for Google events) */
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    organizer?: boolean;
  }>;
  /** Phase 3 – multi-calendar */
  calendarId?: string;
  calendarName?: string;
  calendarColor?: string;
}

/** Google Calendar list item (Phase 3) */
export interface GoogleCalendarListItem {
  id: string;
  summary: string;
  backgroundColor: string;
  foregroundColor: string;
  accessRole: string;
  primary: boolean;
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
  companyId: string | null; // Can be null if not linked to company
  role: string;
  phone: string;
  lastContacted: string;
  linkedin?: string;
  notes?: Note[]; // Changed from string to Note array
  legacyNotes?: string; // Keep old notes field for backward compatibility
  // Phase 1: Tags and custom fields
  tags?: string[]; // Array of tag IDs
  tagsSearchable?: string[]; // Array of lowercase tag names (for filtering)
  customProperties?: Record<string, any>; // Map of custom property keys to values (alias: customFields)
  customFields?: Record<string, any>; // Legacy alias for customProperties
  domain?: string | null; // Email domain (null if free provider)
  searchIndex?: string; // Lowercase concatenation of searchable fields
  lastActivityAt?: string; // ISO timestamp
  assigneeId?: string; // Assignee/Owner ID
  assignee?: string; // Legacy field name (maps to assigneeId)
  organization?: string; // Company name (denormalized from companyId)
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
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
  // Deprecated fields (to be removed in migration)
  dueDate?: string; // DEPRECATED - Remove in migration
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
  accountManager?: string; // Legacy field name (maps to ownerId)
  isTargetAccount?: boolean; // DEPRECATED - Migrate to tag system
  socialSignals?: SocialSignal[];
  notes?: Note[];
  // Phase 1: Tags and custom fields
  tags?: string[]; // Array of tag IDs
  tagsSearchable?: string[]; // Array of lowercase tag names (for filtering)
  customProperties?: Record<string, any>; // Map of custom property keys to values (alias: customFields)
  customFields?: Record<string, any>; // Legacy alias for customProperties
  contactCount?: number; // Denormalized count of contacts
  region?: string;
  status?: string;
  npsScore?: number;
  domain?: string | null; // Website domain (e.g., "techcorp.com")
  searchIndex?: string; // Lowercase concatenation of searchable fields
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  // Scanner-specific fields
  createdSource?: string; // "business_card_scanner" | "linkedin_scanner" | "manual"
  createdFromContactId?: string; // If auto-created from contact
  linkedinCompanyUrl?: string; // Company LinkedIn page
  // Deprecated fields (to be removed in migration)
  dueDate?: string; // DEPRECATED - Remove in migration
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
  type: 'lead' | 'deal' | 'task' | 'payment' | 'system' | 'email-routing' | 'email-assigned' | 'email-mention' | 'new-email' | 'note-marked';
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

// Client Satisfaction Module Types
export type SurveyQuestionType = 'nps' | 'multiple_choice' | 'free_text';
export type SurveyRecipientStatus = 'pending' | 'opened' | 'completed';
export type SurveyStatus = 'sent' | 'completed' | 'expired';
export type SatisfactionStatus = 'awaiting_response' | 'completed' | 'not_yet_sent';
export type NPSCategory = 'Promoter' | 'Passive' | 'Detractor';

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  text: string;
  required: boolean;
  options?: string[]; // For multiple choice questions
  order: number;
}

export interface SurveyTemplate {
  id: string;
  workspaceId: string;
  name: string;
  questions: SurveyQuestion[];
  isDefault: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface SatisfactionRecord {
  id: string;
  companyId: string;
  createdAt: string;
  createdBy: string;
  source: 'manual' | 'deal_won';
}

export interface SurveyRecipient {
  id: string;
  surveyId: string;
  contactId: string;
  email: string;
  status: SurveyRecipientStatus;
  respondedAt?: string;
  openedAt?: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  contactId: string;
  companyId: string;
  npsScore: number; // 0-10
  answers: Array<{
    questionId: string;
    questionText: string;
    answer: string | number;
  }>;
  submittedAt: string;
}

export interface Survey {
  id: string;
  satisfactionRecordId: string;
  templateSnapshot: SurveyQuestion[]; // Snapshot of template at time of sending
  sentAt: string;
  sentBy: string; // User ID
  status: SurveyStatus;
  deliveryMethod: 'email' | 'link';
  surveyUrl?: string; // Unique URL for link-based surveys
  recipients: SurveyRecipient[];
  responses: SurveyResponse[];
}

// Phase 1: Tag and Custom Property types
export interface Tag {
  id: string;
  name: string;
  color: string; // Hex color code (e.g., "#4F46E5")
  entityTypes: ('contact' | 'company')[]; // Which entity types this tag applies to
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CustomProperty {
  id: string;
  name: string;
  key: string; // Slug (unique per entityType)
  entityType: 'contact' | 'company' | 'both';
  type: 'text' | 'number' | 'dropdown_single' | 'dropdown_multi' | 'date' | 'checkbox' | 'url';
  options?: string[]; // For dropdown types
  required: boolean;
  defaultValue?: any; // Default value for the property
  order: number; // Display order (alias: sortOrder)
  sortOrder?: number; // Legacy alias for order
  isVisible: boolean; // Show in table by default
  createdAt?: string;
  updatedAt?: string;
}

// Phase 1: Saved View type
export interface SavedView {
  id: string;
  name: string;
  entityType: 'contact' | 'company';
  filters: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  filterLogic: 'AND' | 'OR';
  sortField: string;
  sortDirection: 'asc' | 'desc';
  visibleColumns: string[]; // Ordered array of column keys
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  isDefault?: boolean;
}

export interface CompanySatisfactionSummary {
  companyId: string;
  companyName: string;
  latestNpsScore?: number;
  npsCategory?: NPSCategory;
  accountManagerId?: string;
  accountManagerName?: string;
  lastSurveyDate?: string;
  status: SatisfactionStatus;
  satisfactionRecordId: string;
}
