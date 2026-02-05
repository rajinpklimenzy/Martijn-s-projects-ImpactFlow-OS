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
      const entities = ['feedback', 'deals', 'projects', 'tasks', 'invoices', 'companies', 'contacts', 'automations', 'notifications', 'events', 'expenses', 'expense-categories', 'data-hygiene'];
      const isEntityEndpoint = entities.some(e => cleanEndpoint.includes(e));
      
      if (response.status === 404 && isEntityEndpoint) {
        console.warn(`[SYSTEM] Live endpoint ${cleanEndpoint} not found. Engaging Virtual Engine fallback.`);
        return simulateApi(cleanEndpoint, options);
      }

      // Safely extract error message
      let errorMessage = `Server Error ${response.status}`;
      try {
        if (data && typeof data === 'object') {
          errorMessage = data.message || data.error?.message || errorMessage;
        }
      } catch {
        // If extraction fails, use default
      }
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      if (data?.error?.code && typeof data.error.code === 'string') {
        (error as any).code = data.error.code;
      }
      throw error;
    }
    
    return data;
  } catch (err: any) {
    // Catch-all for network failures or 5xx errors
    // Safely extract error info without circular references
    let errorMessage = 'Unknown error';
    let errorName = 'Error';
    let errorStatus: number | undefined;
    let errorCode: string | undefined;
    
    try {
      if (err && typeof err === 'object') {
        errorMessage = err.message || String(err) || errorMessage;
        errorName = err.name || errorName;
        errorStatus = typeof err.status === 'number' ? err.status : undefined;
        errorCode = typeof err.code === 'string' ? err.code : undefined;
      } else if (err) {
        errorMessage = String(err);
      }
    } catch {
      // If extraction fails, use defaults
    }
    
    const isNetworkError = errorName === 'TypeError' || errorMessage.includes('Failed to fetch');
    const isServiceUnavailable = errorStatus !== undefined && errorStatus >= 500;
    const isClientError = errorStatus !== undefined && errorStatus >= 400 && errorStatus < 500;

    // We allow simulation on network errors or 5xx
    if (isNetworkError || (isServiceUnavailable && !isClientError)) {
      console.info(`[SYSTEM] Production API unreachable. Engaging Virtual Engine fallback.`);
      return simulateApi(cleanEndpoint, options);
    }

    // Create a completely clean error object without any circular references
    const cleanError = new Error(errorMessage);
    if (errorStatus !== undefined) {
      (cleanError as any).status = errorStatus;
    }
    if (errorCode) {
      (cleanError as any).code = errorCode;
    }
    throw cleanError;
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

export const apiGetDashboardLayout = (userId: string) =>
  apiFetch(`/users/${userId}/dashboard-layout`);

export const apiUpdateDashboardLayout = (userId: string, layout: any[]) =>
  apiFetch(`/users/${userId}/dashboard-layout`, { method: 'PUT', body: JSON.stringify({ layout }) });

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

export const apiGetTaskCategories = () => apiFetch('/tasks/categories');

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

// Budget APIs
export const apiGetBudgets = (params?: { year?: number; department?: string }) => {
  const queryString = params ? '?' + new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : '';
  return apiFetch(`/budgets${queryString}`);
};
export const apiGetBudget = (id: string) => apiFetch(`/budgets/${id}`);
export const apiCreateBudget = (data: any) => apiFetch('/budgets', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateBudget = (id: string, data: any) => apiFetch(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteBudget = (id: string) => apiFetch(`/budgets/${id}`, { method: 'DELETE' });
export const apiGetBudgetTracking = (params: { year: number; department?: string }) => {
  const queryString = '?' + new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
  return apiFetch(`/budgets/tracking${queryString}`);
};
export const apiGetDepartments = () => apiFetch('/budgets/departments');

// Contract APIs
export const apiGetContracts = (params?: { userId?: string; companyId?: string; status?: string; documentType?: string }) => {
  const queryString = params ? '?' + new URLSearchParams(Object.entries(params).filter(([_, v]) => v)).toString() : '';
  return apiFetch(`/contracts${queryString}`);
};
export const apiGetContract = (id: string) => apiFetch(`/contracts/${id}`);
export const apiCreateContract = (data: any) => apiFetch('/contracts', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateContract = (id: string, data: any) => apiFetch(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteContract = (id: string) => apiFetch(`/contracts/${id}`, { method: 'DELETE' });
export const apiMarkContractAsSigned = (id: string, data: { signedBy: string; signedDate?: string }) => 
  apiFetch(`/contracts/${id}/sign`, { method: 'POST', body: JSON.stringify(data) });

// Contract Document Types APIs
export const apiGetContractDocumentTypes = () => apiFetch('/contracts/document-types');
export const apiCreateContractDocumentType = (data: { name: string }) => 
  apiFetch('/contracts/document-types', { method: 'POST', body: JSON.stringify(data) });

// Contract Google Drive APIs
export const apiGetGoogleDriveFile = (params: { fileId: string; userId: string }) => {
  const queryString = '?' + new URLSearchParams(Object.entries(params)).toString();
  return apiFetch(`/contracts/google-drive/file${queryString}`);
};
export const apiGetGoogleDriveAccessToken = (params: { userId: string }) => {
  const queryString = '?' + new URLSearchParams(Object.entries(params)).toString();
  return apiFetch(`/contracts/google-drive/access-token${queryString}`);
};
export const apiListGoogleDriveFiles = (params: { userId: string; query?: string; pageToken?: string; maxResults?: number }) => {
  const queryString = '?' + new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])).toString();
  return apiFetch(`/contracts/google-drive/files${queryString}`);
};
export const apiUploadToGoogleDrive = (data: { fileName: string; fileContent: string; fileMimeType?: string; userId: string; folderId?: string }) =>
  apiFetch('/contracts/google-drive/upload', { method: 'POST', body: JSON.stringify(data) });
export const apiCreateGoogleDocForSignature = (data: { contractId: string; userId: string; title: string }) =>
  apiFetch('/contracts/signature/create-doc', { method: 'POST', body: JSON.stringify(data) });

// Merge APIs
export const apiMergeCompanies = (primaryId: string, secondaryId: string) => 
  apiFetch('/merge/companies', { method: 'POST', body: JSON.stringify({ primaryId, secondaryId }) });
export const apiMergeContacts = (primaryId: string, secondaryId: string) => 
  apiFetch('/merge/contacts', { method: 'POST', body: JSON.stringify({ primaryId, secondaryId }) });

// Data Hygiene APIs
export const apiGetDuplicateCompanies = () => apiFetch('/data-hygiene/duplicate-companies');
export const apiGetDuplicateContacts = () => apiFetch('/data-hygiene/duplicate-contacts');
export const apiGetIncompleteRecords = () => apiFetch('/data-hygiene/incomplete-records');
export const apiGetDomainMismatches = () => apiFetch('/data-hygiene/domain-mismatches');

/**
 * EXTERNAL SYNC
 */
export const apiGetGoogleCalendarStatus = (userId: string) => apiFetch(`/google-calendar/status?userId=${userId}`);
export const apiGetGoogleCalendarAuthUrl = (userId: string) => apiFetch(`/google-calendar/auth-url?userId=${userId}`);
export const apiGetGoogleCalendarEvents = (start: string, end: string, userId: string) => apiFetch(`/google-calendar/events?userId=${userId}&startDate=${start}&endDate=${end}`);
export const apiDisconnectGoogleCalendar = (userId: string) => apiFetch('/google-calendar/disconnect', { method: 'POST', body: JSON.stringify({ userId }) });

/** Shared Inbox – uses already connected Gmail (Google Calendar OAuth) */
export const apiSyncSharedInbox = (userId: string, accountEmail?: string) => {
  const params = new URLSearchParams({ userId });
  if (accountEmail) params.append('accountEmail', accountEmail);
  return apiFetch(`/shared-inbox/sync?${params.toString()}`, { method: 'POST' });
};
export const apiGetConnectedGmailAccounts = (userId: string) =>
  apiFetch(`/shared-inbox/accounts?userId=${userId}`);
export const apiDisconnectGmailAccount = (userId: string, accountEmail: string) =>
  apiFetch('/shared-inbox/accounts', {
    method: 'DELETE',
    body: JSON.stringify({ userId, accountEmail })
  });
export const apiGetSharedInboxEmails = (userId: string, search?: string, status?: string) => {
  const params = new URLSearchParams({ userId });
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  return apiFetch(`/shared-inbox/emails?${params.toString()}`);
};
export const apiGetSharedInboxEmailDetails = (emailId: string, userId: string) =>
  apiFetch(`/shared-inbox/emails/${emailId}?userId=${userId}`);
export const apiMarkSharedInboxEmailRead = (emailId: string, read: boolean, userId: string) =>
  apiFetch(`/shared-inbox/emails/${emailId}/read`, { method: 'PUT', body: JSON.stringify({ read, userId }) });
export const apiAssignSharedInboxEmail = (emailId: string, assignedToUserId: string, sharedByUserId: string) =>
  apiFetch(`/shared-inbox/emails/${emailId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ emailId, assignedToUserId, sharedByUserId })
  });
export const apiUnassignSharedInboxEmail = (emailId: string) =>
  apiFetch(`/shared-inbox/emails/${emailId}/assign`, { method: 'DELETE' });
export const apiToggleSharedInboxEmailStarred = (emailId: string, isStarred: boolean) =>
  apiFetch(`/shared-inbox/emails/${emailId}/star`, { method: 'PUT', body: JSON.stringify({ isStarred }) });

/** Shared Inbox Notes */
export const apiAddEmailNote = (data: { emailId: string; userId: string; userName: string; message: string; imageUrl?: string; imageName?: string }) =>
  apiFetch('/shared-inbox/notes', { method: 'POST', body: JSON.stringify(data) });
export const apiGetEmailNotes = (emailId: string) =>
  apiFetch(`/shared-inbox/notes/${emailId}`);
export const apiDeleteEmailNote = (noteId: string, userId: string) =>
  apiFetch(`/shared-inbox/notes/${noteId}`, { method: 'DELETE', body: JSON.stringify({ userId }) });

/** Shared Inbox AI Drafting */
export const apiGenerateAIDraft = (emailId: string, userId: string, templateId?: string) =>
  apiFetch('/shared-inbox/ai-draft', { method: 'POST', body: JSON.stringify({ emailId, userId, templateId }) });

/** Email Templates */
export const apiCreateEmailTemplate = (data: { name: string; content: string; userId: string; category: string }) =>
  apiFetch('/shared-inbox/templates', { method: 'POST', body: JSON.stringify(data) });
export const apiGetEmailTemplates = (userId: string) =>
  apiFetch(`/shared-inbox/templates?userId=${userId}`);
export const apiUpdateEmailTemplate = (templateId: string, data: { name?: string; content?: string }) =>
  apiFetch(`/shared-inbox/templates/${templateId}`, { method: 'PUT', body: JSON.stringify(data) });
export const apiDeleteEmailTemplate = (templateId: string, userId: string) =>
  apiFetch(`/shared-inbox/templates/${templateId}`, { method: 'DELETE', body: JSON.stringify({ userId }) });

/** Email Sending */
export const apiSendEmail = (data: { userId: string; accountEmail?: string; to: string | string[]; cc?: string | string[]; bcc?: string | string[]; subject: string; body: string; replyToMessageId?: string; replyToThreadId?: string; attachments?: Array<{ filename: string; content: string; type: string }> }) =>
  apiFetch('/shared-inbox/send-email', { method: 'POST', body: JSON.stringify(data) });
export const apiReplyEmail = (data: { emailId: string; userId: string; accountEmail?: string; body: string; replyAll?: boolean; attachments?: Array<{ filename: string; content: string; type: string }> }) =>
  apiFetch('/shared-inbox/reply-email', { method: 'POST', body: JSON.stringify(data) });
export const apiForwardEmail = (data: { emailId: string; userId: string; accountEmail?: string; to: string | string[]; cc?: string | string[]; bcc?: string | string[]; body: string; attachments?: Array<{ filename: string; content: string; type: string }> }) =>
  apiFetch('/shared-inbox/forward-email', { method: 'POST', body: JSON.stringify(data) });

/** Email Signatures */
export const apiGetSignatures = (userId: string) =>
  apiFetch(`/shared-inbox/signatures?userId=${userId}`);
export const apiCreateSignature = (data: { userId: string; name: string; content: string; isDefault?: boolean }) =>
  apiFetch('/shared-inbox/signatures', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateSignature = (signatureId: string, data: { userId: string; name?: string; content?: string; isDefault?: boolean }) =>
  apiFetch(`/shared-inbox/signatures/${signatureId}`, { method: 'PUT', body: JSON.stringify(data) });

/** Migration */
export const apiMigrateEmailRecords = () =>
  apiFetch('/shared-inbox/migrate', { method: 'POST' });

/** Update Email Metadata */
export const apiUpdateEmailMetadata = (emailId: string, data: { userId: string; priority?: 'high' | 'medium' | 'low'; threadStatus?: 'active' | 'archived' | 'resolved' | 'pending'; owner?: string | null; linkedRecords?: { contactId?: string; companyId?: string; dealId?: string; projectId?: string; contractId?: string } }) =>
  apiFetch(`/shared-inbox/emails/${emailId}`, { method: 'PUT', body: JSON.stringify(data) });

/** Download Attachment */
export const apiDownloadAttachment = (emailId: string, attachmentId: string, userId: string) => {
  const API_BASE = getApiBase();
  return fetch(`${API_BASE}/shared-inbox/emails/${emailId}/attachments/${attachmentId}?userId=${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(async (response) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to download attachment' }));
      throw new Error(error.message || 'Failed to download attachment');
    }
    return response.blob();
  });
};

export const apiGetExcludedDomains = () => apiFetch('/settings/excluded-domains');
export const apiAddExcludedDomain = (domain: string) => apiFetch('/settings/excluded-domains', { method: 'POST', body: JSON.stringify({ domain }) });
export const apiRemoveExcludedDomain = (id: string) => apiFetch(`/settings/excluded-domains/${id}`, { method: 'DELETE' });

/** Sync Queue */
export const apiProcessSyncQueue = (limit?: number) => 
  apiFetch(`/shared-inbox/sync-queue/process${limit ? `?limit=${limit}` : ''}`, { method: 'POST' });
export const apiGetSyncQueueStatus = () => 
  apiFetch('/shared-inbox/sync-queue/status');
export const apiRetryFailedSyncs = () => 
  apiFetch('/shared-inbox/sync-queue/retry', { method: 'POST' });

/** Sync Configuration */
export const apiGetSyncConfiguration = (userId: string) => 
  apiFetch(`/shared-inbox/sync-config?userId=${userId}`);
export const apiUpdateSyncConfiguration = (data: { userId: string; syncScopeDays?: number; syncFrequencyMinutes?: number; autoSyncEnabled?: boolean; syncLabelFilters?: string[] }) => 
  apiFetch('/shared-inbox/sync-config', { method: 'PUT', body: JSON.stringify(data) });

/** Gmail Labels */


export const apiGetGmailLabels = (userId: string) => 
  apiFetch(`/shared-inbox/labels?userId=${userId}`);
export const apiCreateGmailLabel = (data: { userId: string; accountEmail: string; labelName: string; messageListVisibility?: string; labelListVisibility?: string }) => 
  apiFetch('/shared-inbox/labels', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateEmailLabels = (emailId: string, data: { addLabelIds?: string[]; removeLabelIds?: string[] }) => 
  apiFetch(`/shared-inbox/emails/${emailId}/labels`, { method: 'PUT', body: JSON.stringify(data) });
export const apiRemoveEmailLabel = (emailId: string, labelId: string) => 
  apiFetch(`/shared-inbox/emails/${emailId}/labels/${labelId}`, { method: 'DELETE' });

/**
 * EVENTS
 */
export const apiCreateEvent = (data: any) => apiFetch('/events', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateEvent = (id: string, data: any) => apiFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
