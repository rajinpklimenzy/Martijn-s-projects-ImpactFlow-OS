
import { MOCK_USERS } from '../constants.tsx';

/**
 * VIRTUAL BACKEND SIMULATOR
 * This mimics the behavior of server.ts for environments where 
 * a background Node.js process cannot be started.
 */

const STORAGE_KEYS = {
  USERS: 'impact_virtual_users',
  CODES: 'impact_virtual_codes',
  SESSION: 'auth_token'
};

// Simple in-memory session store for the demo
const virtualDb = {
  codes: new Map<string, { code: string, expires: number }>(),
  users: [...MOCK_USERS]
};

export const simulateApi = async (endpoint: string, options: any = {}) => {
  // Artificial delay to mimic network
  await new Promise(resolve => setTimeout(resolve, 800));

  const body = options.body ? JSON.parse(options.body) : {};

  switch (endpoint) {
    case '/auth/request-code':
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      virtualDb.codes.set(body.email, { 
        code, 
        expires: Date.now() + 600000 
      });
      console.log(`[VIRTUAL SERVER] Verification code for ${body.email}: ${code}`);
      return { success: true };

    case '/auth/verify':
      const stored = virtualDb.codes.get(body.email);
      // In simulator mode, we accept the real code OR '123456' for convenience
      if (stored && (stored.code === body.verificationCode || body.verificationCode === '123456')) {
        const user = virtualDb.users.find(u => u.email === body.email) || {
          id: 'u-new',
          name: 'New Impact Member',
          email: body.email,
          role: 'User',
          avatar: `https://picsum.photos/seed/${body.email}/100/100`,
          active: true
        };
        const token = `v-token-${btoa(body.email)}`;
        return { success: true, token, user };
      }
      throw new Error("Invalid verification code. Try 123456 in Simulator Mode.");

    case '/me':
      const authHeader = options.headers?.Authorization;
      if (!authHeader) throw new Error("Unauthorized");
      // Just return the first mock user for the simulator session
      return virtualDb.users[0];

    default:
      console.warn(`[VIRTUAL SERVER] No simulator route for ${endpoint}`);
      return { status: 'ok', simulated: true };
  }
};
