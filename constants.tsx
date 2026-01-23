import { User, Contact, Company, Deal, Project, Task, Thread, Invoice, AutomationRule, Notification, NotificationPreference, CalendarEvent } from './types.ts';
import { Zap, Home, Calendar, Users, Briefcase, CheckSquare, Mail, Bell, Settings, FileText, DollarSign, Sparkles } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
  { id: 'schedule', label: 'Daily Schedule', icon: <Calendar className="w-5 h-5" /> },
  { id: 'crm', label: 'CRM', icon: <Users className="w-5 h-5" /> },
  { id: 'pipeline', label: 'Deal Pipeline', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'projects', label: 'Projects', icon: <FileText className="w-5 h-5" /> },
  { id: 'tasks', label: 'My Tasks', icon: <CheckSquare className="w-5 h-5" /> },
  { id: 'inbox', label: 'Shared Inbox', icon: <Mail className="w-5 h-5" /> },
  // Use 'invoices' id so sidebar maps correctly to the Invoicing tab in App.tsx
  { id: 'invoices', label: 'Billing & Invoicing', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'automation', label: 'Automations', icon: <Zap className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'Admin', avatar: 'https://picsum.photos/seed/john/100/100', active: true },
  { id: 'u2', name: 'Jane Smith', email: 'jane@example.com', role: 'Manager', avatar: 'https://picsum.photos/seed/jane/100/100', active: true },
];

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'e1', title: 'Team Meeting', start: '2024-05-15T10:00:00', end: '2024-05-15T11:00:00', type: 'meeting' },
  { id: 'e2', title: 'Project Deadline', start: '2024-05-20T17:00:00', end: '2024-05-20T17:00:00', type: 'deadline' },
];

export const MOCK_COMPANIES: Company[] = [
  { id: 'c1', name: 'Acme Corp', industry: 'Technology', website: 'https://acme.com', email: 'contact@acme.com' },
  { id: 'c2', name: 'Global Logistics', industry: 'Logistics', website: 'https://globallogistics.com', email: 'info@globallogistics.com' },
];

export const MOCK_CONTACTS: Contact[] = [
  { id: 'ct1', name: 'Alice Johnson', email: 'alice@acme.com', phone: '+1 555-0101', companyId: 'c1', role: 'CEO' },
  { id: 'ct2', name: 'Bob Williams', email: 'bob@globallogistics.com', phone: '+1 555-0102', companyId: 'c2', role: 'Manager' },
];

export const MOCK_DEALS: Deal[] = [
  { id: 'd1', title: 'Enterprise Automation', companyId: 'c1', value: 50000, stage: 'Proposal', ownerId: 'u1', expectedCloseDate: '2024-06-01' },
  { id: 'd2', title: 'Warehouse Automation Audit', companyId: 'c2', value: 12500, stage: 'Won', ownerId: 'u2', expectedCloseDate: '2024-05-20' },
];

export const MOCK_PROJECTS: Project[] = [
  { id: 'p1', title: 'SwiftWare Automation Phase 1', companyId: 'c2', status: 'Active', dealId: 'd2', progress: 65 },
];

export const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Review proposal', priority: 'high', dueDate: '2024-05-18', assigneeId: 'u1', status: 'Todo', projectId: 'p1' },
  { id: 't2', title: 'Client meeting prep', priority: 'medium', dueDate: '2024-05-16', assigneeId: 'u2', status: 'In Progress', projectId: 'p1' },
];

export const MOCK_THREADS: Thread[] = [
  { id: 'th1', subject: 'Project Update', from: 'alice@acme.com', snippet: 'Here is the latest update...', timestamp: '2 hours ago', unread: true },
];

export const MOCK_INVOICES: Invoice[] = [
  { id: 'inv1', number: 'INV-2024-0001', companyId: 'c1', amount: 5000, status: 'Sent', dueDate: '2024-06-01' },
];

export const MOCK_AUTOMATIONS: AutomationRule[] = [
  { id: 'a1', name: 'New inquiry auto-response', trigger: 'Incoming email to support@', action: 'Send Template: Welcome/Quick Inquiry', active: true, description: 'Instantly acknowledges logistics inquiries with a brochure.' },
  { id: 'a2', name: 'Follow-up after meeting', trigger: 'Calendar event ends', action: 'Send Template: Meeting Summary/Next Steps', active: true, description: 'Prompts users to send summary after meetings with clients.' },
  { id: 'a3', name: 'Project Kickoff Creation', trigger: 'Deal Status -> Won', action: 'Create Project & Notify Manager', active: true, description: 'Automatically scaffolds a new project workspace when a deal is closed.' },
  { id: 'a4', name: 'Overdue Payment Reminder', trigger: 'Invoice Overdue > 3 days', action: 'Send Email: Gentle Reminder', active: false, description: 'Reminds clients about unpaid digital transformation milestones.' },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'lead', title: 'New Lead', message: 'New lead from Acme Corp', timestamp: '5 minutes ago', read: false },
  { id: 'n5', type: 'system', title: 'Automation Triggered', message: 'Auto-response sent to Global Logistics Corp.', timestamp: '1 day ago', read: true },
];

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  { id: 'new-lead', label: 'New Lead', inApp: true, email: true },
  { id: 'deal-update', label: 'Deal Update', inApp: true, email: false },
  { id: 'task-assigned', label: 'Task Assigned', inApp: true, email: true },
  { id: 'project-update', label: 'Project Update', inApp: false, email: true },
];

// Comprehensive timezone list
export const TIMEZONES = [
  { value: 'UTC-12', label: 'UTC-12 (Baker Island Time)' },
  { value: 'UTC-11', label: 'UTC-11 (Hawaii-Aleutian Standard Time)' },
  { value: 'UTC-10', label: 'UTC-10 (Hawaii Standard Time)' },
  { value: 'UTC-9:30', label: 'UTC-9:30 (Marquesas Time)' },
  { value: 'UTC-9', label: 'UTC-9 (Alaska Standard Time)' },
  { value: 'UTC-8', label: 'UTC-8 (Pacific Standard Time - PST)' },
  { value: 'UTC-7', label: 'UTC-7 (Mountain Standard Time - MST)' },
  { value: 'UTC-6', label: 'UTC-6 (Central Standard Time - CST)' },
  { value: 'UTC-5', label: 'UTC-5 (Eastern Standard Time - EST)' },
  { value: 'UTC-4', label: 'UTC-4 (Atlantic Standard Time - AST)' },
  { value: 'UTC-3:30', label: 'UTC-3:30 (Newfoundland Standard Time)' },
  { value: 'UTC-3', label: 'UTC-3 (Argentina Time)' },
  { value: 'UTC-2', label: 'UTC-2 (South Georgia Time)' },
  { value: 'UTC-1', label: 'UTC-1 (Cape Verde Time)' },
  { value: 'UTC+0', label: 'UTC+0 (Greenwich Mean Time - GMT)' },
  { value: 'UTC+1', label: 'UTC+1 (Central European Time - CET)' },
  { value: 'UTC+2', label: 'UTC+2 (Eastern European Time - EET)' },
  { value: 'UTC+3', label: 'UTC+3 (Moscow Time - MSK)' },
  { value: 'UTC+3:30', label: 'UTC+3:30 (Iran Standard Time)' },
  { value: 'UTC+4', label: 'UTC+4 (Gulf Standard Time)' },
  { value: 'UTC+4:30', label: 'UTC+4:30 (Afghanistan Time)' },
  { value: 'UTC+5', label: 'UTC+5 (Pakistan Standard Time)' },
  { value: 'UTC+5:30', label: 'UTC+5:30 (India Standard Time - IST)' },
  { value: 'UTC+5:45', label: 'UTC+5:45 (Nepal Time)' },
  { value: 'UTC+6', label: 'UTC+6 (Bangladesh Standard Time)' },
  { value: 'UTC+6:30', label: 'UTC+6:30 (Myanmar Time)' },
  { value: 'UTC+7', label: 'UTC+7 (Indochina Time)' },
  { value: 'UTC+8', label: 'UTC+8 (China Standard Time - CST)' },
  { value: 'UTC+8:45', label: 'UTC+8:45 (Australian Central Western Time)' },
  { value: 'UTC+9', label: 'UTC+9 (Japan Standard Time - JST)' },
  { value: 'UTC+9:30', label: 'UTC+9:30 (Australian Central Standard Time)' },
  { value: 'UTC+10', label: 'UTC+10 (Australian Eastern Standard Time)' },
  { value: 'UTC+10:30', label: 'UTC+10:30 (Lord Howe Standard Time)' },
  { value: 'UTC+11', label: 'UTC+11 (Solomon Islands Time)' },
  { value: 'UTC+12', label: 'UTC+12 (New Zealand Standard Time)' },
  { value: 'UTC+12:45', label: 'UTC+12:45 (Chatham Standard Time)' },
  { value: 'UTC+13', label: 'UTC+13 (Tonga Time)' },
  { value: 'UTC+14', label: 'UTC+14 (Line Islands Time)' },
];

// Comprehensive language list
export const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish (Español)' },
  { value: 'French', label: 'French (Français)' },
  { value: 'German', label: 'German (Deutsch)' },
  { value: 'Italian', label: 'Italian (Italiano)' },
  { value: 'Portuguese', label: 'Portuguese (Português)' },
  { value: 'Russian', label: 'Russian (Русский)' },
  { value: 'Chinese', label: 'Chinese (中文)' },
  { value: 'Japanese', label: 'Japanese (日本語)' },
  { value: 'Korean', label: 'Korean (한국어)' },
  { value: 'Arabic', label: 'Arabic (العربية)' },
  { value: 'Hindi', label: 'Hindi (हिन्दी)' },
  { value: 'Dutch', label: 'Dutch (Nederlands)' },
  { value: 'Polish', label: 'Polish (Polski)' },
  { value: 'Turkish', label: 'Turkish (Türkçe)' },
  { value: 'Vietnamese', label: 'Vietnamese (Tiếng Việt)' },
  { value: 'Thai', label: 'Thai (ไทย)' },
  { value: 'Indonesian', label: 'Indonesian (Bahasa Indonesia)' },
  { value: 'Swedish', label: 'Swedish (Svenska)' },
  { value: 'Norwegian', label: 'Norwegian (Norsk)' },
  { value: 'Danish', label: 'Danish (Dansk)' },
  { value: 'Finnish', label: 'Finnish (Suomi)' },
  { value: 'Greek', label: 'Greek (Ελληνικά)' },
  { value: 'Hebrew', label: 'Hebrew (עברית)' },
  { value: 'Czech', label: 'Czech (Čeština)' },
  { value: 'Romanian', label: 'Romanian (Română)' },
  { value: 'Hungarian', label: 'Hungarian (Magyar)' },
  { value: 'Ukrainian', label: 'Ukrainian (Українська)' },
  { value: 'Malay', label: 'Malay (Bahasa Melayu)' },
  { value: 'Tagalog', label: 'Tagalog (Filipino)' },
];
