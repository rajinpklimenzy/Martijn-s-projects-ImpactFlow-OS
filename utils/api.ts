
import { simulateApi } from './apiSimulator.ts';

/**
 * API CONFIGURATION
 * Default: https://node-server.impact24x7.com/api/v1/impactOS (live API)
 * For local development, set API_BASE_URL=http://localhost:8050/api/v1/impactOS in .env
 */
const getApiBase = () => {
  // Check if API_BASE_URL is set in environment (highest priority)
  // This allows overriding for local development
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  
  // Default to live/production API URL
  return 'https://node-server.impact24x7.com/api/v1/impactOS';
};

const API_BASE = getApiBase();

// Log which API base URL is being used (only once on module load)
if (typeof window !== 'undefined') {
  console.log(`[API] Using API Base URL: ${API_BASE}`);
}

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

  // Debug logging
  console.log(`[API] Request: ${options.method || 'GET'} ${url}`);

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
    
    console.log(`[API] Response status: ${response.status} ${response.statusText}`);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // If server returns 404, check if it's the specific "Account not found" message
      const errorMessage = data.message || data.error?.message || `Server Error ${response.status}`;
      console.error(`[API] Error response:`, { status: response.status, data, errorMessage });
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).code = data.error?.code;
      throw error;
    }
    
    console.log(`[API] Success response:`, data);

    return data;
  } catch (err: any) {
    // If it's a network failure or a 5xx error, engage simulation
    // If it's a 403/404 returned by the server explicitly, DO NOT simulate, just re-throw to show error
    const isNetworkError = err.name === 'TypeError' || err.message.includes('Failed to fetch');
    const isServiceUnavailable = err.status >= 500;
    const isClientError = err.status >= 400 && err.status < 500; // 4xx errors should not use simulator

    if (isNetworkError || (isServiceUnavailable && !isClientError)) {
      console.info(`[SYSTEM] Production API unreachable. Engaging Virtual Engine fallback.`);
      return simulateApi(cleanEndpoint, options);
    }

    throw err;
  }
};

/**
 * REQUEST ACCESS CODE (OTP)
 */
export const apiRequestCode = (data: { email: string; name?: string }) =>
  apiFetch('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email: data.email })
  });

/**
 * VERIFY ACCESS CODE
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
    console.error('Logout API error:', err);
  } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }
};

/**
 * USER MANAGEMENT
 */
export const apiGetUsers = (search?: string) => {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch(`/users${query}`);
};

export const apiCreateUser = (userData: any) =>
  apiFetch('/users', { method: 'POST', body: JSON.stringify(userData) });

export const apiUpdateUser = (userId: string, userData: any) =>
  apiFetch(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(userData) });

export const apiDeleteUser = (userId: string) =>
  apiFetch(`/users/${userId}`, { method: 'DELETE' });

// Fix: Add missing apiUpdateUserProfile export
export const apiUpdateUserProfile = (userId: string, data: any) =>
  apiFetch(`/users/${userId}/profile`, { method: 'PUT', body: JSON.stringify(data) });

/**
 * CRM & PIPELINE
 */
export const apiGetCompanies = (search?: string) => apiFetch(`/companies${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const apiCreateCompany = (data: any) => apiFetch('/companies', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateCompany = (id: string, data: any) => apiFetch(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteCompany = (id: string) => apiFetch(`/companies/${id}`, { method: 'DELETE' });

export const apiGetContacts = (search?: string) => apiFetch(`/contacts${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const apiCreateContact = (data: any) => apiFetch('/contacts', { method: 'POST', body: JSON.stringify(data) });
export const apiDeleteContact = (id: string) => apiFetch(`/contacts/${id}`, { method: 'DELETE' });

// Fix: Update apiGetDeals to support multiple parameters as used in useDeals hook
export const apiGetDeals = (userId?: string, stage?: string, companyId?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (stage) params.append('stage', stage);
  if (companyId) params.append('companyId', companyId);
  const query = params.toString();
  return apiFetch(`/deals${query ? `?${query}` : ''}`);
};

export const apiCreateDeal = (data: any) => apiFetch('/deals', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateDeal = (id: string, data: any) => apiFetch(`/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteDeal = (id: string) => apiFetch(`/deals/${id}`, { method: 'DELETE' });

/**
 * PROJECTS & TASKS
 */
// Fix: Update apiGetProjects to support multiple parameters as used in useProjects hook
export const apiGetProjects = (userId?: string, companyId?: string, status?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (companyId) params.append('companyId', companyId);
  if (status) params.append('status', status);
  const query = params.toString();
  return apiFetch(`/projects${query ? `?${query}` : ''}`);
};

export const apiGetProject = (id: string) => apiFetch(`/projects/${id}`);
export const apiCreateProject = (data: any) => apiFetch('/projects', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateProject = (id: string, data: any) => apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteProject = (id: string) => apiFetch(`/projects/${id}`, { method: 'DELETE' });

// Fix: Update apiGetTasks to support multiple parameters as used in useTasks hook
export const apiGetTasks = (userId?: string, projectId?: string, status?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (projectId) params.append('projectId', projectId);
  if (status) params.append('status', status);
  const query = params.toString();
  return apiFetch(`/tasks${query ? `?${query}` : ''}`);
};

export const apiCreateTask = (data: any) => apiFetch('/tasks', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateTask = (id: string, data: any) => apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteTask = (id: string) => apiFetch(`/tasks/${id}`, { method: 'DELETE' });

/**
 * INVOICING & REVENUE
 */
// Fix: Update apiGetInvoices to support multiple parameters as used in useInvoices hook
export const apiGetInvoices = (userId?: string, companyId?: string, status?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId);
  if (companyId) params.append('companyId', companyId);
  if (status) params.append('status', status);
  const query = params.toString();
  return apiFetch(`/invoices${query ? `?${query}` : ''}`);
};

export const apiCreateInvoice = (data: any) => apiFetch('/invoices', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateInvoice = (id: string, data: any) => apiFetch(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteInvoice = (id: string) => apiFetch(`/invoices/${id}`, { method: 'DELETE' });
export const apiSendInvoiceEmail = (id: string) => apiFetch(`/invoices/${id}/send`, { method: 'POST' });
export const apiGetRevenueVelocity = (userId: string, timeframe: string) => apiFetch(`/invoices/revenue-velocity?userId=${userId}&timeframe=${timeframe}`);

/**
 * AUTOMATIONS & NOTIFICATIONS
 */
export const apiGetAutomations = (userId?: string) => apiFetch(`/automations${userId ? `?userId=${userId}` : ''}`);
export const apiCreateAutomation = (data: any) => apiFetch('/automations', { method: 'POST', body: JSON.stringify(data) });
export const apiToggleAutomation = (id: string) => apiFetch(`/automations/${id}/toggle`, { method: 'PATCH' });
export const apiDeleteAutomation = (id: string) => apiFetch(`/automations/${id}`, { method: 'DELETE' });

export const apiGetNotifications = (userId: string, limitNum: number) => apiFetch(`/notifications?userId=${userId}&limitNum=${limitNum}`);
export const apiCreateNotification = (data: any) => apiFetch('/notifications', { method: 'POST', body: JSON.stringify(data) });
export const apiMarkNotificationAsRead = (id: string, userId: string) => apiFetch(`/notifications/${id}/read`, { method: 'POST', body: JSON.stringify({ userId }) });
export const apiMarkAllNotificationsAsRead = (userId: string) => apiFetch('/notifications/mark-all-read', { method: 'POST', body: JSON.stringify({ userId }) });

/**
 * EXTERNAL SYNC
 */
export const apiGetGoogleCalendarStatus = (userId: string) => apiFetch(`/google-calendar/status?userId=${userId}`);
export const apiGetGoogleCalendarAuthUrl = (userId: string) => apiFetch(`/google-calendar/auth-url?userId=${userId}`);
export const apiGetGoogleCalendarEvents = (start: string, end: string, userId: string) => apiFetch(`/google-calendar/events?userId=${userId}&startDate=${start}&endDate=${end}`);
export const apiDisconnectGoogleCalendar = (userId: string) => apiFetch('/google-calendar/disconnect', { method: 'POST', body: JSON.stringify({ userId }) });
export const apiGetSharedInboxEmails = (userId: string) => apiFetch(`/shared-inbox/emails?userId=${userId}`);

// Fix: Add missing settings and domain exports
export const apiGetExcludedDomains = () => apiFetch('/settings/excluded-domains');
export const apiAddExcludedDomain = (domain: string) => apiFetch('/settings/excluded-domains', { method: 'POST', body: JSON.stringify({ domain }) });
export const apiRemoveExcludedDomain = (id: string) => apiFetch(`/settings/excluded-domains/${id}`, { method: 'DELETE' });

/**
 * EVENTS
 */
// Fix: Add missing apiCreateEvent and apiUpdateEvent exports
export const apiCreateEvent = (data: any) => apiFetch('/events', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateEvent = (id: string, data: any) => apiFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
