
import { User, Contact, Company, Deal, Project, Task, Thread, Invoice, AutomationRule, Notification, NotificationPreference, CalendarEvent } from './types.ts';
import { Zap, Home, Calendar, Users, Briefcase, CheckSquare, Mail, Bell, Settings, FileText, DollarSign, Sparkles, Share2 } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
  { id: 'schedule', label: 'Daily Schedule', icon: <Calendar className="w-5 h-5" /> },
  { id: 'crm', label: 'CRM', icon: <Users className="w-5 h-5" /> },
  { id: 'pipeline', label: 'Deal Pipeline', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'projects', label: 'Projects', icon: <FileText className="w-5 h-5" /> },
  { id: 'tasks', label: 'My Tasks', icon: <CheckSquare className="w-5 h-5" /> },
  { id: 'inbox', label: 'Shared Inbox', icon: <Mail className="w-5 h-5" /> },
  { id: 'invoices', label: 'Billing & Invoicing', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'automation', label: 'Automations', icon: <Zap className="w-5 h-5" /> },
  { id: 'integrations', label: 'Integrations', icon: <Share2 className="w-5 h-5" /> },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alex Rivera', email: 'alex@impact247.com', role: 'Admin', avatar: 'https://picsum.photos/seed/alex/100/100', active: true },
];

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [];
export const MOCK_COMPANIES: Company[] = [];
export const MOCK_CONTACTS: Contact[] = [];
export const MOCK_DEALS: Deal[] = [];
export const MOCK_PROJECTS: Project[] = [];
export const MOCK_TASKS: Task[] = [];
export const MOCK_THREADS: Thread[] = [];
export const MOCK_INVOICES: Invoice[] = [];
export const MOCK_AUTOMATIONS: AutomationRule[] = [];
export const MOCK_NOTIFICATIONS: Notification[] = [];

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  { id: 'new-lead', label: 'New Lead', description: 'Alerts when a new lead is assigned to you', inApp: true, email: true },
  { id: 'deal-update', label: 'Deal Update', description: 'Alerts when a deal status or stage changes', inApp: true, email: false },
  { id: 'task-assigned', label: 'Task Assigned', description: 'Alerts when a teammate assigns a task to you', inApp: true, email: true },
  { id: 'project-update', label: 'Project Update', description: 'Alerts when milestone or status updates occur', inApp: false, email: true },
];

export const TIMEZONES = [
  { value: 'UTC-8', label: 'UTC-8 (Pacific Standard Time - PST)' },
  { value: 'UTC-5', label: 'UTC-5 (Eastern Standard Time - EST)' },
  { value: 'UTC+0', label: 'UTC+0 (Greenwich Mean Time - GMT)' },
];

export const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish (Español)' },
  { value: 'French', label: 'French (Français)' },
];
