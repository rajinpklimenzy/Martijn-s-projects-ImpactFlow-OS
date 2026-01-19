
import React from 'react';
import { 
  Inbox, Users, Building2, LayoutGrid, FolderKanban, 
  CheckSquare, FileText, Settings, Zap, UserPlus, 
  Search, Bell, Plus, Filter, MoreVertical, 
  MessageSquare, Star, Mail, Phone, Calendar,
  ArrowRight, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { User, Contact, Company, Deal, Project, Task, Thread, Invoice, AutomationRule, Notification, NotificationPreference, CalendarEvent } from './types.ts';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-5 h-5" /> },
  { id: 'schedule', label: 'Daily Schedule', icon: <Calendar className="w-5 h-5" /> },
  { id: 'inbox', label: 'Shared Inbox', icon: <Inbox className="w-5 h-5" /> },
  { id: 'crm', label: 'Contacts & Companies', icon: <Users className="w-5 h-5" /> },
  { id: 'pipeline', label: 'Deal Pipeline', icon: <Building2 className="w-5 h-5" /> },
  { id: 'projects', label: 'Projects', icon: <FolderKanban className="w-5 h-5" /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" /> },
  { id: 'invoices', label: 'Invoicing', icon: <FileText className="w-5 h-5" /> },
  { id: 'automation', label: 'Automations', icon: <Zap className="w-5 h-5" /> },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alex Rivera', email: 'alex@impact247.com', role: 'Admin', avatar: 'https://picsum.photos/seed/u1/100/100', active: true },
  { id: 'u2', name: 'Sarah Chen', email: 'sarah@impact247.com', role: 'Manager', avatar: 'https://picsum.photos/seed/u2/100/100', active: true },
  { id: 'u3', name: 'Michael Scott', email: 'michael@impact247.com', role: 'Staff', avatar: 'https://picsum.photos/seed/u3/100/100', active: true },
];

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'e1', title: 'Strategy Meeting: Global Logistics', start: '09:00', end: '10:30', type: 'meeting', location: 'Zoom', participants: ['Alex Rivera', 'John Doe'] },
  { id: 'e2', title: 'Warehouse Tech Review', start: '13:00', end: '14:00', type: 'meeting', location: 'Office Room A' },
  { id: 'e3', title: 'TMS Implementation Sync', start: '15:30', end: '16:30', type: 'deadline', location: 'Conference Call' },
];

export const MOCK_COMPANIES: Company[] = [
  { id: 'c1', name: 'Global Logistics Corp', industry: 'Shipping', website: 'globallogistics.com', logo: 'https://picsum.photos/seed/c1/100/100' },
  { id: 'c2', name: 'SwiftWare Solutions', industry: 'Warehouse Tech', website: 'swiftware.io', logo: 'https://picsum.photos/seed/c2/100/100' },
  { id: 'c3', name: 'EuroFreight Ltd', industry: 'Haulage', website: 'eurofreight.com', logo: 'https://picsum.photos/seed/c3/100/100' },
];

export const MOCK_CONTACTS: Contact[] = [
  { id: 'ct1', name: 'John Doe', email: 'john.doe@globallogistics.com', companyId: 'c1', role: 'COO', phone: '+1 555-0123', lastContacted: '2024-05-15' },
  { id: 'ct2', name: 'Jane Smith', email: 'jane.smith@swiftware.io', companyId: 'c2', role: 'Operations Manager', phone: '+1 555-0456', lastContacted: '2024-05-18' },
];

export const MOCK_THREADS: Thread[] = [
  { id: 't1', subject: 'Inquiry: Warehouse API Integration', sender: 'John Doe', email: 'john.doe@globallogistics.com', lastMessage: 'Following up on our call regarding the API docs...', timestamp: '10:45 AM', status: 'open', isStarred: true },
  { id: 't2', subject: 'New RFQ - TMS Digitalization', sender: 'Jane Smith', email: 'jane.smith@swiftware.io', lastMessage: 'Please find the attached requirements for the TMS project.', timestamp: 'Yesterday', status: 'assigned', assigneeId: 'u1' },
  { id: 't3', subject: 'Question regarding Invoice #2024-012', sender: 'Marcus Vane', email: 'marcus.vane@eurofreight.com', lastMessage: 'The tax calculation seems slightly off.', timestamp: '2 days ago', status: 'resolved' },
];

export const MOCK_DEALS: Deal[] = [
  { id: 'd1', title: 'TMS Implementation', companyId: 'c1', value: 45000, stage: 'Negotiation', ownerId: 'u1', expectedCloseDate: '2024-06-30' },
  { id: 'd2', title: 'Warehouse Automation Audit', companyId: 'c2', value: 12500, stage: 'Won', ownerId: 'u2', expectedCloseDate: '2024-05-20' },
  { id: 'd3', title: 'Supply Chain Visibility Dashboard', companyId: 'c3', value: 28000, stage: 'Proposal', ownerId: 'u1', expectedCloseDate: '2024-07-15' },
];

export const MOCK_PROJECTS: Project[] = [
  { id: 'p1', title: 'SwiftWare Automation Phase 1', companyId: 'c2', status: 'Active', dealId: 'd2', progress: 65 },
  { id: 'p2', title: 'EuroFreight Cloud Migration', companyId: 'c3', status: 'Planning', progress: 10 },
];

export const MOCK_TASKS: Task[] = [
  { id: 'tk1', projectId: 'p1', title: 'Review API endpoints', description: 'Validate JSON response formats', dueDate: '2024-05-25', priority: 'High', status: 'In Progress', assigneeId: 'u1' },
  { id: 'tk2', projectId: 'p1', title: 'Hardware Inventory', description: 'Document all existing scanner units', dueDate: '2024-05-28', priority: 'Medium', status: 'Todo', assigneeId: 'u2' },
];

export const MOCK_INVOICES: Invoice[] = [
  { id: 'iv1', number: 'INV-2024-001', companyId: 'c1', amount: 5000, status: 'Paid', dueDate: '2024-05-10' },
  { id: 'iv2', number: 'INV-2024-002', companyId: 'c2', amount: 12500, status: 'Overdue', dueDate: '2024-05-15' },
  { id: 'iv3', number: 'INV-2024-003', companyId: 'c3', amount: 8000, status: 'Sent', dueDate: '2024-06-01' },
];

export const MOCK_AUTOMATIONS: AutomationRule[] = [
  { id: 'a1', name: 'New inquiry auto-response', trigger: 'Incoming email to support@', action: 'Send Template: Welcome/Quick Inquiry', active: true, description: 'Instantly acknowledges logistics inquiries with a brochure.' },
  { id: 'a2', name: 'Follow-up after meeting', trigger: 'Calendar event ends', action: 'Send Template: Meeting Summary/Next Steps', active: true, description: 'Prompts users to send summary after meetings with clients.' },
  { id: 'a3', name: 'Project Kickoff Creation', trigger: 'Deal Status -> Won', action: 'Create Project & Notify Manager', active: true, description: 'Automatically scaffolds a new project workspace when a deal is closed.' },
  { id: 'a4', name: 'Overdue Payment Reminder', trigger: 'Invoice Overdue > 3 days', action: 'Send Email: Gentle Reminder', active: false, description: 'Reminds clients about unpaid digital transformation milestones.' },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'lead', title: 'New Lead Assigned', message: 'You have been assigned to Freight Forwarders Inc.', timestamp: '2 mins ago', read: false },
  { id: 'n2', type: 'deal', title: 'New Comment', message: 'Sarah Chen commented on the TMS Implementation deal.', timestamp: '1 hour ago', read: false },
  { id: 'n3', type: 'task', title: 'Task Completed', message: 'The Hardware Inventory task has been completed by Michael Scott.', timestamp: '3 hours ago', read: true },
  { id: 'n4', type: 'payment', title: 'Payment Reminder', message: 'Invoice #INV-2024-002 for SwiftWare Solutions is now 3 days overdue.', timestamp: 'Yesterday', read: false },
  { id: 'n5', type: 'system', title: 'Automation Triggered', message: 'Auto-response sent to Global Logistics Corp.', timestamp: '1 day ago', read: true },
];

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  { id: 'np1', label: 'Lead Assignments', description: 'When a new lead is assigned to you', inApp: true, email: true },
  { id: 'np2', label: 'Deal Activity', description: 'Comments and status updates on your deals', inApp: true, email: false },
  { id: 'np3', label: 'Task Updates', description: 'Completions and reminders for your tasks', inApp: true, email: true },
  { id: 'np4', label: 'Invoicing & Payments', description: 'Payment reminders and overdue alerts', inApp: true, email: true },
  { id: 'np5', label: 'Internal Mentions', description: 'When someone @mentions you in notes', inApp: true, email: true },
];
