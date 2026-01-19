
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
  title: string;
  start: string; // ISO string or time format
  end: string;
  type: 'meeting' | 'task' | 'deadline';
  location?: string;
  participants?: string[];
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
}

export interface Project {
  id: string;
  title: string;
  companyId: string;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed';
  dealId?: string;
  progress: number;
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
