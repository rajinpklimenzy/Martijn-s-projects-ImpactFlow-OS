
import { User, Contact, Company, Deal, Project, Task, Thread, Invoice, Expense, AutomationRule, Notification, NotificationPreference, CalendarEvent } from './types.ts';
import { Zap, Home, Calendar, Users, Briefcase, CheckSquare, Mail, Bell, Settings, FileText, DollarSign, Sparkles, Share2, Map, Receipt, PieChart, FileSignature, Star, BookOpen } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
  { id: 'schedule', label: 'Schedule', icon: <Calendar className="w-5 h-5" /> },
  { id: 'inbox', label: 'Shared Inbox', icon: <Mail className="w-5 h-5" /> },
  { id: 'crm', label: 'CRM', icon: <Users className="w-5 h-5" /> },
  { id: 'pipeline', label: 'Deal Pipeline', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'projects', label: 'Projects', icon: <FileText className="w-5 h-5" /> },
  { id: 'playbooks', label: 'Playbooks', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'satisfaction', label: 'Client Satisfaction', icon: <Star className="w-5 h-5" /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" /> },
  { id: 'invoices', label: 'Billing & Invoicing', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-5 h-5" /> },
  { id: 'budget', label: 'Budget Management', icon: <PieChart className="w-5 h-5" /> },
  { id: 'contracts', label: 'Contracts & Legal', icon: <FileSignature className="w-5 h-5" /> },
  { id: 'roadmap', label: 'Roadmap', icon: <Map className="w-5 h-5" /> },
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
  { id: 'task-comment', label: 'Task Comment/Note Added', description: 'Alerts when someone posts in the Notes & Comments section of a task you\'re assigned to or involved in', inApp: true, email: false },
  { id: 'task-mention', label: 'Task @Mention', description: 'Alerts when someone uses @ to mention you in a task comment', inApp: true, email: true },
  { id: 'task-status-changed', label: 'Task Status Changed', description: 'Alerts when a task you\'re assigned to or created moves between statuses', inApp: true, email: false },
  { id: 'task-due-date-reminder', label: 'Task Due Date Reminder', description: 'Alert before a task is due', inApp: true, email: true },
  { id: 'project-update', label: 'Project Update', description: 'Alerts when milestone or status updates occur', inApp: false, email: true },
  { id: 'company-update', label: 'Company Update', description: 'Alerts when company information or details are updated', inApp: true, email: false },
  { id: 'contact-update', label: 'Contact Update', description: 'Alerts when contact information or details are updated', inApp: true, email: false },
  { id: 'email-routing', label: 'Email Auto-Assigned', description: 'Alerts when an email is automatically assigned to you via routing rules', inApp: true, email: true },
  { id: 'email-assigned', label: 'Email Assigned', description: 'Alerts when an email is manually assigned to you', inApp: true, email: false },
  { id: 'email-mention', label: 'Email Mentions', description: 'Alerts when you are mentioned in an email note', inApp: true, email: true },
  { id: 'new-email', label: 'New Email', description: 'Alerts when a new email is received in shared inbox', inApp: false, email: false },
];

/**
 * Parse timezone offset string to decimal hours
 * Examples: "UTC+5" -> 5, "UTC-3:30" -> -3.5, "UTC+5:30" -> 5.5
 */
const parseTimezoneOffset = (timezone: string): number => {
  const match = timezone.match(/UTC([+-]?)(\d+)(?::(\d+))?/);
  if (!match) return 0;
  
  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  
  return sign * (hours + minutes / 60);
};

/**
 * Comprehensive list of all timezones
 */
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

/**
 * Get system timezone in UTC offset format
 * Returns the closest matching timezone from our list
 */
export const getSystemTimezone = (): string => {
  try {
    const offsetMinutes = -new Date().getTimezoneOffset(); // Offset in minutes
    const offsetHours = offsetMinutes / 60;
    const offsetMinutesRemainder = offsetMinutes % 60;
    
    // Handle fractional hours (e.g., 5.5 hours = 5:30)
    if (offsetMinutesRemainder === 0) {
      // Whole hour offset
      const sign = offsetHours >= 0 ? '+' : '';
      const timezone = `UTC${sign}${offsetHours}`;
      
      // Check if this exact timezone exists in our list
      if (TIMEZONES.find(tz => tz.value === timezone)) {
        return timezone;
      }
    } else {
      // Fractional hour offset (e.g., 5:30, 3:30, etc.)
      const hours = Math.floor(Math.abs(offsetHours));
      const minutes = Math.abs(offsetMinutesRemainder);
      const sign = offsetHours >= 0 ? '+' : '-';
      const timezone = `UTC${sign}${hours}:${minutes}`;
      
      // Check if this exact timezone exists in our list
      if (TIMEZONES.find(tz => tz.value === timezone)) {
        return timezone;
      }
    }
    
    // If exact match not found, find closest match
    const offsetDecimal = offsetHours;
    let closestTimezone = 'UTC+0'; // Default fallback
    let minDiff = Infinity;
    
    TIMEZONES.forEach(tz => {
      const tzOffset = parseTimezoneOffset(tz.value);
      const diff = Math.abs(tzOffset - offsetDecimal);
      if (diff < minDiff) {
        minDiff = diff;
        closestTimezone = tz.value;
      }
    });
    
    return closestTimezone;
  } catch (error) {
    return 'UTC+0'; // Fallback to GMT
  }
};

export const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish (Español)' },
  { value: 'French', label: 'French (Français)' },
];
