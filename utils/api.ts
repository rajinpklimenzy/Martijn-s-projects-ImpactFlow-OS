
import { simulateApi } from './apiSimulator.ts';

/**
 * PRODUCTION API CONFIGURATION
 * Directing traffic to the ImpactFlow OS Backend Cluster
 */
const API_BASE = 'https://node-server-architect-595659839658.us-west1.run.app/api/v1/impactOS';

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
      // Handle specific error messages from the server
      throw new Error(data.message || `Server Error ${response.status}`);
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

export const apiLogout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  return apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
};
