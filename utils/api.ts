import { simulateApi } from './apiSimulator.ts';

/**
 * API CONFIGURATION
 */
const getApiBase = () => {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  return 'https://node-server.impact24x7.com/api/v1/impactOS';
};

const API_BASE = getApiBase();

if (typeof window !== 'undefined') {
  console.log(`[API] Initializing with Base: ${API_BASE}`);
}

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

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
      // Fallback to simulation for 404s on all main entities to support local testing
      const entities = ['feedback', 'deals', 'projects', 'tasks', 'invoices', 'companies', 'contacts', 'automations', 'notifications', 'events', 'expenses', 'expense-categories'];
      const isEntityEndpoint = entities.some(e => cleanEndpoint.includes(e));
      
      if (response.status === 404 && isEntityEndpoint) {
        console.warn(`[SYSTEM] Live endpoint ${cleanEndpoint} not found. Engaging Virtual Engine fallback.`);
        return simulateApi(cleanEndpoint, options);
      }

      const errorMessage = data.message || data.error?.message || `Server Error ${response.status}`;
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).code = data.error?.code;
      throw error;
    }
    
    return data;
  } catch (err: any) {
    // Catch-all for network failures or 5xx errors
    const isNetworkError = err.name === 'TypeError' || err.message.includes('Failed to fetch');
    const isServiceUnavailable = err.status >= 500;
    const isClientError = err.status >= 400 && err.status < 500;

    // We allow simulation on network errors or 5xx
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

export const apiUpdateUserProfile = (userId: string, data: any) =>
  apiFetch(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });

/**
 * CRM & PIPELINE
 */
export const apiGetCompanies = (search?: string) => apiFetch(`/companies${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const apiCreateCompany = (data: any) => apiFetch('/companies', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateCompany = (id: string, data: any) => apiFetch(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteCompany = (id: string) => apiFetch(`/companies/${id}`, { method: 'DELETE' });

// Fix: Support both search and companyId filtering for contacts
export const apiGetContacts = (search?: string, companyId?: string) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (companyId) params.append('companyId', companyId);
  const query = params.toString();
  return apiFetch(`/contacts${query ? `?${query}` : ''}`);
};

export const apiCreateContact = (data: any) => apiFetch('/contacts', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateContact = (id: string, data: any) => apiFetch(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteContact = (id: string) => apiFetch(`/contacts/${id}`, { method: 'DELETE' });

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
export const apiBulkImportTasks = (tasks: any[]) => apiFetch('/tasks/bulk-import', { method: 'POST', body: JSON.stringify({ tasks }) });

/**
 * INVOICING & REVENUE
 */
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

// Notification Preferences
export const apiGetNotificationPreferences = (userId: string) => apiFetch(`/users/${userId}/notification-preferences`);
export const apiUpdateNotificationPreferences = (userId: string, preferences: any[]) => apiFetch(`/users/${userId}/notification-preferences`, { method: 'PUT', body: JSON.stringify({ preferences }) });

/**
 * PIPELINE MANAGEMENT
 */
export const apiGetAllPipelines = () => apiFetch('/pipelines');
export const apiGetPipelineById = (id: string) => apiFetch(`/pipelines/${id}`);
export const apiGetActivePipelineByType = (type: 'sales' | 'operations') => apiFetch(`/pipelines/active/${type}`);
export const apiCreatePipeline = (data: { name: string; type: 'sales' | 'operations'; stages: string[] }) => apiFetch('/pipelines', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdatePipeline = (id: string, data: { name?: string; stages?: string[]; isActive?: boolean }) => apiFetch(`/pipelines/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeletePipeline = (id: string) => apiFetch(`/pipelines/${id}`, { method: 'DELETE' });

/**
 * FEEDBACK & ROADMAP
 */
export const apiGetFeedback = () => apiFetch('/feedback');
export const apiCreateFeedback = (data: any) => apiFetch('/feedback', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateFeedback = (id: string, data: any) => apiFetch(`/feedback/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const apiDeleteFeedback = (id: string) => apiFetch(`/feedback/${id}`, { method: 'DELETE' });

// Expense APIs
export const apiGetExpenses = (params?: { companyId?: string; userId?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.companyId) queryParams.append('companyId', params.companyId);
  if (params?.userId) queryParams.append('userId', params.userId);
  const query = queryParams.toString();
  return apiFetch(`/expenses${query ? `?${query}` : ''}`);
};
export const apiGetExpenseById = (id: string) => apiFetch(`/expenses/${id}`);
export const apiCreateExpense = (data: any) => apiFetch('/expenses', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateExpense = (id: string, data: any) => apiFetch(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const apiDeleteExpense = (id: string) => apiFetch(`/expenses/${id}`, { method: 'DELETE' });

// Expense Category APIs
export const apiGetExpenseCategories = () => apiFetch('/expense-categories');
export const apiCreateExpenseCategory = (data: { name: string }) => apiFetch('/expense-categories', { method: 'POST', body: JSON.stringify(data) });
export const apiDeleteExpenseCategory = (id: string) => apiFetch(`/expense-categories/${id}`, { method: 'DELETE' });

/**
 * EXTERNAL SYNC
 */
export const apiGetGoogleCalendarStatus = (userId: string) => apiFetch(`/google-calendar/status?userId=${userId}`);
export const apiGetGoogleCalendarAuthUrl = (userId: string) => apiFetch(`/google-calendar/auth-url?userId=${userId}`);
export const apiGetGoogleCalendarEvents = (start: string, end: string, userId: string) => apiFetch(`/google-calendar/events?userId=${userId}&startDate=${start}&endDate=${end}`);
export const apiDisconnectGoogleCalendar = (userId: string) => apiFetch('/google-calendar/disconnect', { method: 'POST', body: JSON.stringify({ userId }) });
export const apiGetSharedInboxEmails = (userId: string) => apiFetch(`/shared-inbox/emails?userId=${userId}`);

export const apiGetExcludedDomains = () => apiFetch('/settings/excluded-domains');
export const apiAddExcludedDomain = (domain: string) => apiFetch('/settings/excluded-domains', { method: 'POST', body: JSON.stringify({ domain }) });
export const apiRemoveExcludedDomain = (id: string) => apiFetch(`/settings/excluded-domains/${id}`, { method: 'DELETE' });

/**
 * EVENTS
 */
export const apiCreateEvent = (data: any) => apiFetch('/events', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateEvent = (id: string, data: any) => apiFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
