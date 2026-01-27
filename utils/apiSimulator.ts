
import { MOCK_USERS } from '../constants.tsx';

/**
 * VIRTUAL BACKEND SIMULATOR
 */

const virtualDb = {
  codes: new Map<string, { code: string, expires: number }>(),
  users: [...MOCK_USERS]
};

export const simulateApi = async (endpoint: string, options: any = {}) => {
  await new Promise(resolve => setTimeout(resolve, 600));

  const body = options.body ? JSON.parse(options.body) : {};
  const method = (options.method || 'GET').toUpperCase();

  console.info(`[VIRTUAL SERVER] ${method} ${endpoint}`, body);

  // Handle Auth Request OTP
  if (endpoint === '/auth/send-otp' || endpoint === '/auth/request-code') {
    const email = body.email?.toLowerCase().trim();
    
    console.warn(`[VIRTUAL SERVER] ⚠️  Using simulator fallback - this should only happen if the real API is unreachable`);
    console.warn(`[VIRTUAL SERVER] ⚠️  Email: ${email} - Checking MOCK_USERS only`);
    
    // Strict lookup: vipin@impact24x7.com is NOT in MOCK_USERS (which uses impact247.com)
    // Any email not explicitly in the list must fail
    const userExists = MOCK_USERS.some(u => u.email.toLowerCase().trim() === email);

    if (!userExists) {
      console.warn(`[VIRTUAL SERVER] ACCESS DENIED for: ${email}`);
      console.warn(`[VIRTUAL SERVER] ⚠️  NOTE: This is simulator fallback. Check if real API is reachable.`);
      return { 
        status: 404, 
        message: 'Account not found - contact your Administrator', 
        success: false 
      };
    }

    console.info(`[VIRTUAL SERVER] SUCCESS for: ${email}. Code 123456 generated.`);
    const code = '123456';
    virtualDb.codes.set(email, { code, expires: Date.now() + 600000 });
    return { success: true, message: 'Simulated OTP sent' };
  }

  // Handle Auth Verify OTP
  if (endpoint === '/auth/verify-otp' || endpoint === '/auth/verify') {
    const email = body.email?.toLowerCase().trim();
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email) || {
      id: 'u-gen',
      name: 'Impact Member',
      email: body.email,
      role: 'Staff',
      avatar: `https://picsum.photos/seed/${body.email}/100/100`,
      active: true
    };
    return { success: true, token: 'v-token-123', user };
  }

  // Handle all other routes
  if (method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
    return { status: 'ok', message: 'Simulated success', simulated: true };
  }

  switch (endpoint) {
    case '/me':
    case '/auth/me':
      return virtualDb.users[0];

    case '/google-calendar/status':
      return { connected: false, simulated: true };

    default:
      // Return empty list for most GET requests to avoid leaking dummy data
      return { data: [], status: 'ok', simulated: true };
  }
};
