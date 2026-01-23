
import { simulateApi } from './apiSimulator.ts';

/**
 * PRODUCTION API CONFIGURATION
 * Directing traffic to the ImpactFlow OS Backend Cluster
 */
const API_BASE = process.env.API_BASE_URL || 'https://node-server.impact24x7.com/api/v1/impactOS';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

  // Debug logging to verify the correct URL is being used
  console.log('[API] Request URL:', url);
  console.log('[API] Endpoint:', cleanEndpoint);
  console.log('[API] Base URL:', API_BASE);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Handle specific error messages from the server
      // Check for nested error object first (backend error format)
      const errorMessage = data.error?.message || data.message || `Server Error ${response.status}`;
      const error = new Error(errorMessage);
      // Preserve error code if available
      if (data.error?.code) {
        (error as any).code = data.error.code;
      }
      throw error;
    }

    return data;
  } catch (err: any) {
    // Check if we should fallback to simulation
    const isNetworkError = err.name === 'TypeError' || err.message.includes('Failed to fetch');
    const isServiceUnavailable = err.message.includes('503') || err.message.includes('502');

    if (isNetworkError || isServiceUnavailable) {
      console.info(`[SYSTEM] Production API at ${url} unreachable. Engaging Virtual Engine fallback.`);
      window.dispatchEvent(new CustomEvent('impact_backend_mode', { detail: 'virtual' }));
      return simulateApi(cleanEndpoint, options);
    }

    throw err;
  }
};

/**
 * REQUEST ACCESS CODE (OTP)
 * Sends a POST request to trigger the email service
 */
export const apiRequestCode = (data: { email: string; name?: string }) =>
  apiFetch('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email: data.email })
  });

/**
 * VERIFY ACCESS CODE
 * Validates the OTP and returns a session token
 */
export const apiVerify = (data: { email: string; verificationCode: string }) =>
  apiFetch('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      otp: data.verificationCode
    })
  });

export const apiMe = () => apiFetch('/auth/me');

export const apiLogout = async () => {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (err) {
    // Continue with logout even if API call fails
    console.error('Logout API error:', err);
  } finally {
    // Always clear local storage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  }
};

/**
 * CALENDAR EVENT API FUNCTIONS
 */

// Get events for date range
export const apiGetEvents = (startDate: string, endDate: string, userId?: string) => {
  const params = new URLSearchParams({ startDate, endDate });
  if (userId) params.append('userId', userId);
  return apiFetch(`/calendar/events?${params.toString()}`);
};

// Get single event by ID
export const apiGetEvent = (id: string) => apiFetch(`/calendar/events/${id}`);

// Create new event
export const apiCreateEvent = (eventData: Partial<import('../types').CalendarEvent>) =>
  apiFetch('/calendar/events', {
    method: 'POST',
    body: JSON.stringify(eventData)
  });

// Update existing event
export const apiUpdateEvent = (id: string, eventData: Partial<import('../types').CalendarEvent>) =>
  apiFetch(`/calendar/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(eventData)
  });

// Delete event
export const apiDeleteEvent = (id: string) =>
  apiFetch(`/calendar/events/${id}`, { method: 'DELETE' });

// Search events
export const apiSearchEvents = (query: string, filters?: { type?: string; userId?: string }) => {
  const params = new URLSearchParams({ query });
  if (filters?.type) params.append('type', filters.type);
  if (filters?.userId) params.append('userId', filters.userId);
  return apiFetch(`/calendar/events/search?${params.toString()}`);
};

// Get upcoming events
export const apiGetUpcomingEvents = (limit: number = 10, userId?: string) => {
  const params = new URLSearchParams({ limitNum: limit.toString() });
  if (userId) params.append('userId', userId);
  return apiFetch(`/calendar/events/upcoming?${params.toString()}`);
};

// Duplicate event
export const apiDuplicateEvent = (id: string, newStart?: string, newEnd?: string) =>
  apiFetch(`/calendar/events/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ start: newStart, end: newEnd })
  });

/**
 * GOOGLE CALENDAR API FUNCTIONS
 */

// Get Google Calendar OAuth URL
export const apiGetGoogleCalendarAuthUrl = (userId: string) =>
  apiFetch(`/google-calendar/auth-url?userId=${userId}`);

// Get Google Calendar connection status
export const apiGetGoogleCalendarStatus = (userId: string) =>
  apiFetch(`/google-calendar/status?userId=${userId}`);

// Get Google Calendar events
export const apiGetGoogleCalendarEvents = (startDate: string, endDate: string, userId: string) =>
  apiFetch(`/google-calendar/events?userId=${userId}&startDate=${startDate}&endDate=${endDate}`);

// Disconnect Google Calendar
export const apiDisconnectGoogleCalendar = (userId: string) =>
  apiFetch('/google-calendar/disconnect', {
    method: 'POST',
    body: JSON.stringify({ userId })
  });

// User Management APIs
export const apiGetUsers = (search?: string) => {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch(`/users${query}`);
};

export const apiGetUser = (userId: string) =>
  apiFetch(`/users/${userId}`);

export const apiCreateUser = (userData: { email: string; name: string; role?: string }) =>
  apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });

export const apiUpdateUser = (userId: string, userData: { email?: string; name?: string; role?: string; active?: boolean; avatar?: string }) =>
  apiFetch(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });

export const apiDeleteUser = (userId: string) =>
  apiFetch(`/users/${userId}`, {
    method: 'DELETE'
  });

/**
 * EMAIL SYNC FILTER API FUNCTIONS
 */

// Get excluded domains
export const apiGetExcludedDomains = (userId: string) =>
  apiFetch(`/email-sync-filter?userId=${userId}`);

// Add excluded domain
export const apiAddExcludedDomain = (userId: string, domain: string) =>
  apiFetch('/email-sync-filter', {
    method: 'POST',
    body: JSON.stringify({ userId, domain })
  });

// Remove excluded domain
export const apiRemoveExcludedDomain = (domainId: string, userId: string) =>
  apiFetch(`/email-sync-filter/${domainId}?userId=${userId}`, {
    method: 'DELETE'
  });

/**
 * SHARED INBOX API FUNCTIONS
 */

// Sync Gmail emails
export const apiSyncGmailEmails = (userId: string) =>
  apiFetch(`/shared-inbox/sync?userId=${userId}`, {
    method: 'POST'
  });

// Get shared inbox emails
export const apiGetSharedInboxEmails = (userId: string, search?: string, status?: string) => {
  const params = new URLSearchParams();
  params.append('userId', userId);
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  return apiFetch(`/shared-inbox/emails?${params.toString()}`);
};

// Get email details
export const apiGetEmailDetails = (emailId: string, userId: string) =>
  apiFetch(`/shared-inbox/emails/${emailId}?userId=${userId}`);

// Assign email to user
export const apiAssignEmail = (emailId: string, assignedToUserId: string, sharedByUserId: string) =>
  apiFetch(`/shared-inbox/emails/${emailId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ emailId, assignedToUserId, sharedByUserId })
  });

// Unassign email
export const apiUnassignEmail = (emailId: string) =>
  apiFetch(`/shared-inbox/emails/${emailId}/assign`, {
    method: 'DELETE'
  });

// Toggle email starred status
export const apiToggleEmailStarred = (emailId: string, isStarred: boolean) =>
  apiFetch(`/shared-inbox/emails/${emailId}/star`, {
    method: 'PUT',
    body: JSON.stringify({ isStarred })
  });

/**
 * DEAL API FUNCTIONS
 */

// Get all deals
export const apiGetDeals = (userId?: string, stage?: string, companyId?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (stage) params.append('stage', stage);
  if (companyId) params.append('companyId', companyId);
  const queryString = params.toString();
  return apiFetch(`/deals${queryString ? `?${queryString}` : ''}`);
};

// Get deal by ID
export const apiGetDeal = (dealId: string) =>
  apiFetch(`/deals/${dealId}`);

// Create deal
export const apiCreateDeal = (dealData: {
  title: string;
  companyId: string;
  value: number;
  stage?: 'Discovery' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  ownerId: string;
  expectedCloseDate?: string;
  description?: string;
}) =>
  apiFetch('/deals', {
    method: 'POST',
    body: JSON.stringify(dealData)
  });

// Update deal
export const apiUpdateDeal = (dealId: string, dealData: Partial<import('../types').Deal>) =>
  apiFetch(`/deals/${dealId}`, {
    method: 'PUT',
    body: JSON.stringify(dealData)
  });

// Delete deal
export const apiDeleteDeal = (dealId: string) =>
  apiFetch(`/deals/${dealId}`, {
    method: 'DELETE'
  });

// Search deals
export const apiSearchDeals = (query: string, userId?: string) => {
  const params = new URLSearchParams();
  params.append('query', query);
  if (userId) params.append('userId', userId);
  return apiFetch(`/deals/search?${params.toString()}`);
};

/**
 * COMPANY API FUNCTIONS
 */

// Get all companies
export const apiGetCompanies = (search?: string) => {
  const params = new URLSearchParams();
  if (search && search.trim()) params.append('search', search.trim());
  const queryString = params.toString();
  return apiFetch(`/companies${queryString ? `?${queryString}` : ''}`);
};

// Get single company by ID
export const apiGetCompany = (id: string) => apiFetch(`/companies/${id}`);

// Create new company
export const apiCreateCompany = (companyData: Partial<import('../types').Company>) =>
  apiFetch('/companies', {
    method: 'POST',
    body: JSON.stringify(companyData)
  });

// Update company
export const apiUpdateCompany = (id: string, companyData: Partial<import('../types').Company>) =>
  apiFetch(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(companyData)
  });

// Delete company
export const apiDeleteCompany = (id: string) =>
  apiFetch(`/companies/${id}`, { method: 'DELETE' });

// Search companies
export const apiSearchCompanies = (query: string) =>
  apiFetch(`/companies/search?query=${encodeURIComponent(query)}`);

/**
 * CONTACT API FUNCTIONS
 */

// Get all contacts
export const apiGetContacts = (search?: string, companyId?: string) => {
  const params = new URLSearchParams();
  if (search && search.trim()) params.append('search', search.trim());
  if (companyId) params.append('companyId', companyId);
  const queryString = params.toString();
  return apiFetch(`/contacts${queryString ? `?${queryString}` : ''}`);
};

// Get single contact by ID
export const apiGetContact = (id: string) => apiFetch(`/contacts/${id}`);

// Create new contact
export const apiCreateContact = (contactData: Partial<import('../types').Contact> & { companyId: string; name: string }) =>
  apiFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify(contactData)
  });

// Update contact
export const apiUpdateContact = (id: string, contactData: Partial<import('../types').Contact>) =>
  apiFetch(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(contactData)
  });

// Delete contact
export const apiDeleteContact = (id: string) =>
  apiFetch(`/contacts/${id}`, { method: 'DELETE' });

// Search contacts
export const apiSearchContacts = (query: string) =>
  apiFetch(`/contacts/search?query=${encodeURIComponent(query)}`);

/**
 * PROJECT API FUNCTIONS
 */

// Get all projects
export const apiGetProjects = (userId?: string, companyId?: string, status?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (companyId) params.append('companyId', companyId);
  if (status) params.append('status', status);
  const queryString = params.toString();
  return apiFetch(`/projects${queryString ? `?${queryString}` : ''}`);
};

// Get single project by ID
export const apiGetProject = (id: string) => apiFetch(`/projects/${id}`);

// Create new project
export const apiCreateProject = (projectData: Partial<import('../types').Project>) =>
  apiFetch('/projects', {
    method: 'POST',
    body: JSON.stringify(projectData)
  });

// Update project
export const apiUpdateProject = (id: string, projectData: Partial<import('../types').Project>) =>
  apiFetch(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(projectData)
  });

// Delete project
export const apiDeleteProject = (id: string) =>
  apiFetch(`/projects/${id}`, { method: 'DELETE' });

// Search projects
export const apiSearchProjects = (query: string, userId?: string) => {
  const params = new URLSearchParams({ query });
  if (userId) params.append('userId', userId);
  return apiFetch(`/projects/search?${params.toString()}`);
};

/**
 * TASK API FUNCTIONS
 */

// Get all tasks
export const apiGetTasks = (userId?: string, projectId?: string, status?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (projectId) params.append('projectId', projectId);
  if (status) params.append('status', status);
  const queryString = params.toString();
  return apiFetch(`/tasks${queryString ? `?${queryString}` : ''}`);
};

// Get single task by ID
export const apiGetTask = (id: string) => apiFetch(`/tasks/${id}`);

// Create new task
export const apiCreateTask = (taskData: Partial<import('../types').Task>) =>
  apiFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData)
  });

// Update task
export const apiUpdateTask = (id: string, taskData: Partial<import('../types').Task>) =>
  apiFetch(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(taskData)
  });

// Delete task
export const apiDeleteTask = (id: string) =>
  apiFetch(`/tasks/${id}`, { method: 'DELETE' });

// Search tasks
export const apiSearchTasks = (query: string, userId?: string, projectId?: string) => {
  const params = new URLSearchParams({ query });
  if (userId) params.append('userId', userId);
  if (projectId) params.append('projectId', projectId);
  return apiFetch(`/tasks/search?${params.toString()}`);
};

/**
 * USER PROFILE API FUNCTIONS
 */

// Update user profile
export const apiUpdateUserProfile = (userId: string, userData: { 
  name?: string; 
  email?: string; 
  avatar?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}) =>
  apiFetch(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });

/**
 * INVOICE API FUNCTIONS
 */

// Get all invoices
export const apiGetInvoices = (userId?: string, companyId?: string, status?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (companyId) params.append('companyId', companyId);
  if (status) params.append('status', status);
  const queryString = params.toString();
  return apiFetch(`/invoices${queryString ? `?${queryString}` : ''}`);
};

// Get invoice by ID
export const apiGetInvoice = (invoiceId: string) =>
  apiFetch(`/invoices/${invoiceId}`);

// Create invoice
export const apiCreateInvoice = (invoiceData: any) =>
  apiFetch('/invoices', {
    method: 'POST',
    body: JSON.stringify(invoiceData)
  });

// Update invoice
export const apiUpdateInvoice = (invoiceId: string, invoiceData: any) =>
  apiFetch(`/invoices/${invoiceId}`, {
    method: 'PUT',
    body: JSON.stringify(invoiceData)
  });

// Delete invoice
export const apiDeleteInvoice = (invoiceId: string) =>
  apiFetch(`/invoices/${invoiceId}`, {
    method: 'DELETE'
  });

// Search invoices
export const apiSearchInvoices = (query: string) =>
  apiFetch(`/invoices/search?q=${encodeURIComponent(query)}`);

// Send invoice via email
export const apiSendInvoiceEmail = (invoiceId: string) =>
  apiFetch('/invoices/send-email', {
    method: 'POST',
    body: JSON.stringify({ invoiceId })
  });

/**
 * AUTOMATION API FUNCTIONS
 */

// Get all automations
export const apiGetAutomations = (userId?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  const queryString = params.toString();
  return apiFetch(`/automations${queryString ? `?${queryString}` : ''}`);
};

// Get automation by ID
export const apiGetAutomation = (automationId: string) =>
  apiFetch(`/automations/${automationId}`);

// Create automation
export const apiCreateAutomation = (automationData: any) =>
  apiFetch('/automations', {
    method: 'POST',
    body: JSON.stringify(automationData)
  });

// Update automation
export const apiUpdateAutomation = (automationId: string, automationData: any) =>
  apiFetch(`/automations/${automationId}`, {
    method: 'PUT',
    body: JSON.stringify(automationData)
  });

// Toggle automation active status
export const apiToggleAutomation = (automationId: string) =>
  apiFetch(`/automations/${automationId}/toggle`, {
    method: 'PATCH'
  });

// Delete automation
export const apiDeleteAutomation = (automationId: string) =>
  apiFetch(`/automations/${automationId}`, {
    method: 'DELETE'
  });

// Search automations
export const apiSearchAutomations = (query: string) =>
  apiFetch(`/automations/search?q=${encodeURIComponent(query)}`);

/**
 * NOTIFICATIONS
 */

// Get notifications for a user
export const apiGetNotifications = (userId: string, limitNum = 20) =>
  apiFetch(`/notifications?userId=${encodeURIComponent(userId)}&limitNum=${limitNum}`);

// Create a notification
export const apiCreateNotification = (payload: {
  userId: string;
  type: 'lead' | 'deal' | 'task' | 'payment' | 'system';
  title: string;
  message: string;
  link?: string | null;
}) =>
  apiFetch('/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// Mark a single notification as read
export const apiMarkNotificationAsRead = (id: string, userId: string) =>
  apiFetch(`/notifications/${id}/read`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });

// Mark all notifications as read for a user
export const apiMarkAllNotificationsAsRead = (userId: string) =>
  apiFetch('/notifications/mark-all-read', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
