
const API_BASE = '/api';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); 

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Error ${response.status}`);
    }

    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Connection timed out. Please try again.');
    throw err;
  }
};

export const apiRequestCode = (data: { email: string; name?: string }) => 
  apiFetch('/auth/request-code', { method: 'POST', body: JSON.stringify(data) });

export const apiVerify = (data: { email: string; verificationCode: string }) =>
  apiFetch('/auth/verify', { method: 'POST', body: JSON.stringify(data) });

export const apiMe = () => apiFetch('/me');

export const apiLogout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  return apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
};
