
export type Status = 'open' | 'assigned' | 'resolved' | 'closed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Staff';
  avatar: string;
  active: boolean;
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
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  logo: string;
}

export interface Deal {
  id: string;
  title: string;
  companyId: string;
  value: number;
  stage: 'Discovery' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  ownerId: string;
  expectedCloseDate: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  title: string;
  companyId: string;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed';
  dealId?: string;
  progress: number;
  ownerId?: string;
  description?: string;
  assignedUserIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  assigneeId: string;
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

export interface Invoice {
  id: string;
  number: string;
  companyId: string;
  amount: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  dueDate: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
  description: string;
}

export interface Notification {
  id: string;
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
