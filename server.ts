import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';
import cors from 'cors';
import path from 'path';
import { existsSync } from 'fs';
import { auth, db } from './firebaseAdmin.ts';
import { sendWelcomeEmail, sendVerificationCodeEmail } from './emailService.ts';
import admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const app = express();

// Helper to prevent hanging promises
const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} operation timed out after ${ms}ms`)), ms)
    )
  ]);
};

// Advanced Startup Diagnostics
console.log('--- [IMPACTFLOW] SYSTEM PRE-FLIGHT CHECK ---');
const required = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_API_KEY',
  'RESEND_API_KEY'
];

required.forEach(key => {
  const value = process.env[key];
  if (!value) {
    console.error(`[CRITICAL] Missing Environment Variable: ${key}`);
  } else {
    const masked = value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : '***';
    console.log(`[OK] ${key} is set (${masked})`);
  }
});
console.log('--------------------------------------------');

app.use(cors() as any);
app.use(express.json() as any);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const apiRouter = express.Router();

// Config Health Check for CTO
apiRouter.get('/check-config', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    env: {
      projectId: process.env.FIREBASE_PROJECT_ID ? 'Configured' : 'Missing',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'Configured' : 'Missing',
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'Configured' : 'Missing',
      firebaseApiKey: process.env.FIREBASE_CLIENT_API_KEY ? 'Configured' : 'Missing',
      resendKey: process.env.RESEND_API_KEY ? 'Configured' : 'Missing',
    }
  });
});
apiRouter.post('/auth/request-code', async (req, res) => {
  const { email, name = 'Impact Team Member' } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  try {
    console.log(`[AUTH] Requesting OTP for ${email}`);

    const externalResponse = await withTimeout(
      fetch(`${process.env.API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      }),
      10000,
      'External OTP API'
    );

    if (!externalResponse.ok) {
      const errorData = await externalResponse.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `External API error: ${externalResponse.status}`;
      console.error('[AUTH ERROR] External API failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const responseData = await externalResponse.json().catch(() => ({ success: true }));
    console.log(`[AUTH] OTP sent successfully to ${email}`);

    res.status(200).json({ success: true, ...responseData });
  } catch (error: any) {
    console.error('[AUTH ERROR]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

apiRouter.post('/auth/verify', async (req, res) => {
  const { email, verificationCode } = req.body;

  if (!email || !verificationCode) {
    return res.status(400).json({ message: 'Email and verification code are required' });
  }

  try {
    console.log(`[VERIFY] Verifying OTP for ${email}`);

    const externalResponse = await withTimeout(
      fetch(`${process.env.API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: verificationCode
        }),
      }),
      10000,
      'External Verify OTP API'
    );

    if (!externalResponse.ok) {
      const errorData = await externalResponse.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `Verification failed: ${externalResponse.status}`;
      console.error('[VERIFY ERROR] External API failed:', errorMessage);
      return res.status(externalResponse.status).json({ success: false, message: errorMessage });
    }

    const responseData = await externalResponse.json().catch(() => ({}));
    console.log(`[VERIFY] OTP verified successfully for ${email}`);

    // Map the external API response to match what the frontend expects
    // The external API should return token and user data
    // If it doesn't, we'll use the response as-is and let the frontend handle it
    res.json({
      success: true,
      token: responseData.token || responseData.accessToken || responseData.idToken,
      user: responseData.user || responseData.data || { email, ...responseData }
    });
  } catch (error: any) {
    console.error('[VERIFY ERROR]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

apiRouter.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).send('Unauthorized');
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    // Fix: Explicitly type userDoc to any to ensure .data() is accessible
    const userDoc: any = await db.collection('users').doc(decodedToken.uid).get();
    res.json(userDoc.data());
  } catch (error) {
    res.status(401).send('Invalid session');
  }
});

// Determine the static directory (dist for production, current dir for dev)
const isProduction = process.env.NODE_ENV === 'production';
const staticDir = isProduction ? path.resolve(process.cwd(), 'dist') : process.cwd();
const indexPath = path.resolve(staticDir, 'index.html');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: isProduction ? 'production' : 'development',
    staticDir,
    indexPath,
    indexExists: existsSync(indexPath),
    cwd: process.cwd()
  });
});

// API routes - must come before static file serving
app.use('/api', apiRouter);

console.log(`[SERVER] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`[SERVER] Static directory: ${staticDir}`);
console.log(`[SERVER] Index file: ${indexPath}`);

// Serve static files (JS, CSS, images, etc.)
// This will serve files like .js, .css, .png, etc. but won't serve index.html automatically
app.use(express.static(staticDir, { 
  index: false, // Don't serve index.html automatically
  dotfiles: 'ignore',
  fallthrough: true // Continue to next middleware if file not found
}));

// Catch-all handler for SPA routing (MUST be last)
// Handle ALL HTTP methods (GET, POST, etc.) to serve index.html for SPA routes
app.all('*', (req, res) => {
  // Skip API routes (shouldn't reach here, but safety check)
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API Route Not Found' });
  }
  
  // Skip requests for actual files (with extensions) - these should have been served by static middleware
  if (req.path.match(/\.(js|mjs|css|ts|tsx|jsx|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|map)$/)) {
    return res.status(404).send('File not found');
  }
  
  // Skip Vite dev server specific paths (only relevant in dev)
  if (!isProduction && (
    req.path.startsWith('/@') || 
    req.path.startsWith('/node_modules') ||
    req.path.startsWith('/src')
  )) {
    return res.status(404).send('Not found');
  }
  
  // Serve index.html for all SPA routes (/privacy-policy, /help, /, etc.)
  console.log(`[SERVER] ${req.method} ${req.path} - Serving index.html`);
  
  // Check if index.html exists
  if (!existsSync(indexPath)) {
    console.error('[SERVER] ERROR: index.html not found at:', indexPath);
    console.error('[SERVER] Current working directory:', process.cwd());
    console.error('[SERVER] Static directory:', staticDir);
    return res.status(500).send(`Error: index.html not found at ${indexPath}`);
  }
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('[SERVER] Error serving index.html:', err);
      console.error('[SERVER] Attempted path:', indexPath);
      console.error('[SERVER] Current working directory:', process.cwd());
      console.error('[SERVER] File exists:', existsSync(indexPath));
      res.status(500).send('Error loading application');
    }
  });
});

const PORT = 8020;
app.listen(PORT, () => console.log(`ImpactFlow running on port ${PORT}`));
