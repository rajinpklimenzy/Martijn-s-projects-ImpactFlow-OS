
import { MOCK_USERS } from '../constants.tsx';

/**
 * VIRTUAL BACKEND SIMULATOR with LocalStorage Persistence
 */

const getStoredData = (key: string, fallback: any = []) => {
  if (typeof window === 'undefined') return fallback;
  const stored = localStorage.getItem(`impactflow_sim_${key}`);
  return stored ? JSON.parse(stored) : fallback;
};

const setStoredData = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`impactflow_sim_${key}`, JSON.stringify(data));
};

export const simulateApi = async (endpoint: string, options: any = {}) => {
  // Artificial latency for realism
  await new Promise(resolve => setTimeout(resolve, 600));

  const body = options.body ? JSON.parse(options.body) : {};
  const method = (options.method || 'GET').toUpperCase();

  console.info(`[VIRTUAL SERVER] ${method} ${endpoint}`, body);

  // Handle Auth Request OTP
  if (endpoint === '/auth/send-otp' || endpoint === '/auth/request-code') {
    const email = body.email?.toLowerCase().trim();
    console.warn(`[VIRTUAL SERVER] Simulator fallback active for AUTH`);
    
    const userExists = MOCK_USERS.some(u => u.email.toLowerCase().trim() === email);
    if (!userExists) {
      return { 
        status: 404, 
        message: 'Account not found - contact your Administrator', 
        success: false 
      };
    }
    return { success: true, message: 'Simulated OTP sent to ' + email };
  }

  // Handle Auth Verify OTP
  if (endpoint === '/auth/verify-otp' || endpoint === '/auth/verify') {
    const email = body.email?.toLowerCase().trim();
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email) || {
      id: 'u-gen',
      name: 'Impact Member',
      email: body.email,
      role: 'User',
      avatar: `https://picsum.photos/seed/${body.email}/100/100`,
      active: true
    };
    return { success: true, token: 'v-token-123', user };
  }

  // Persistent Feedback Registry
  if (endpoint.includes('feedback')) {
    let feedback = getStoredData('feedback', []);
    
    if (method === 'POST') {
      const newItem = {
        id: `fb-${Date.now()}`,
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      feedback.unshift(newItem);
      setStoredData('feedback', feedback);
      return { success: true, data: newItem, simulated: true };
    }
    
    if (method === 'PATCH' || method === 'PUT') {
      const id = endpoint.split('/').pop();
      feedback = feedback.map((item: any) => item.id === id ? { ...item, ...body, updatedAt: new Date().toISOString() } : item);
      setStoredData('feedback', feedback);
      return { success: true, simulated: true };
    }

    if (method === 'DELETE') {
      const id = endpoint.split('/').pop();
      feedback = feedback.filter((item: any) => item.id !== id);
      setStoredData('feedback', feedback);
      return { success: true, simulated: true };
    }

    return { success: true, data: feedback, simulated: true };
  }

  // Standard CRUD persistence for other entities
  const entities = ['deals', 'projects', 'tasks', 'invoices', 'companies', 'contacts', 'expenses', 'expense-categories'];
  const entityMatch = entities.find(e => endpoint.includes(e));

  if (entityMatch) {
    let data = getStoredData(entityMatch, []);
    
    if (method === 'POST') {
      const newItem = { id: `sim-${entityMatch}-${Date.now()}`, ...body, createdAt: new Date().toISOString() };
      data.unshift(newItem);
      setStoredData(entityMatch, data);
      return { success: true, data: newItem, simulated: true };
    }
    
    if (method === 'GET' && endpoint.split('/').length > 2) {
      const id = endpoint.split('/').pop();
      const item = data.find((i: any) => i.id === id);
      return { success: true, data: item, simulated: true };
    }

    return { success: true, data: data, simulated: true };
  }

  // Data Hygiene (admin) – return empty when backend not available
  if (endpoint.includes('data-hygiene')) {
    if (endpoint.includes('duplicate-companies')) return { success: true, data: { groups: [], totalDuplicates: 0 }, simulated: true };
    if (endpoint.includes('duplicate-contacts')) return { success: true, data: { groups: [], totalDuplicates: 0 }, simulated: true };
    if (endpoint.includes('incomplete-records')) return { success: true, data: { companies: [], contacts: [], deals: [], projects: [], invoices: [] }, simulated: true };
    if (endpoint.includes('domain-mismatches')) return { success: true, data: { mismatches: [], count: 0 }, simulated: true };
  }

  // Shared inbox fallbacks (when backend unreachable) – return shapes matching real API
  if (endpoint.startsWith('/shared-inbox/labels')) {
    return { success: true, labels: [], simulated: true };
  }
  if (endpoint.startsWith('/shared-inbox/senders')) {
    return { success: true, data: [], simulated: true };
  }
  if (endpoint.startsWith('/shared-inbox/emails') && method === 'GET' && !endpoint.match(/\/emails\/[^/]+$/)) {
    return { data: [], success: true, simulated: true };
  }

  switch (endpoint) {
    case '/me':
    case '/auth/me':
      return MOCK_USERS[0];
    case '/google-calendar/status':
      return { connected: false, simulated: true };
    default:
      return { data: [], status: 'ok', simulated: true };
  }
};
