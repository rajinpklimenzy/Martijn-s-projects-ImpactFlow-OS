
export type Status = 'open' | 'assigned' | 'resolved' | 'closed';

export interface User {
  id: string;
  name: string;
  email: string;
  // Role model simplified: only Admin or User across the app
  role: 'Admin' | 'User';
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
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
  };
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

export interface Contact {
  id: string;
  name: string;
  email: string;
  companyId: string;
  role: string;
  phone: string;
  lastContacted: string;
  linkedin?: string;
  notes?: string;
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
}

export interface Deal {
  id: string;
  title: string;
  companyId: string | null; // Can be null for standalone/direct deals
  value: number;
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
  title: string;
  companyId: string | null; // Can be null for standalone/general projects
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed';
  dealId?: string;
  progress: number;
  ownerId?: string;
  description?: string;
  assignedUserIds?: string[];
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  projectId?: string; // Optional for standalone tasks
  title: string;
  description: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  assigneeId: string;
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
  companyId: string;
  amount: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  dueDate: string;
  description?: string;
  userId?: string;
  items?: InvoiceItem[];
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
