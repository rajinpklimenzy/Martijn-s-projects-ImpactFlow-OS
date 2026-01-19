import express from 'express';
import cors from 'cors';
import path from 'path';
import { auth, db } from './firebaseAdmin.ts';
import { sendWelcomeEmail, sendVerificationCodeEmail } from './emailService.ts';
import * as admin from 'firebase-admin';

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
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[AUTH] Creating verification entry for ${email}`);
    
    await withTimeout(
      db.collection('verificationCodes').doc(email).set({
        code,
        name,
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
      }),
      5000,
      'Firestore'
    );
    
    console.log(`[AUTH] Sending email code to ${email}`);
    const emailResult = await withTimeout(
      sendVerificationCodeEmail(email, code),
      7000,
      'Resend'
    );
    
    if (!emailResult.success) throw new Error('Mail server rejected the request.');

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[AUTH ERROR]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

apiRouter.post('/auth/verify', async (req, res) => {
  const { email, verificationCode } = req.body;
  const apiKey = process.env.FIREBASE_CLIENT_API_KEY;

  try {
    if (!apiKey) throw new Error('Missing FIREBASE_CLIENT_API_KEY on server');

    // Fix: Explicitly type codeDoc to any to avoid "unknown" type error from withTimeout
    const codeDoc: any = await withTimeout(
      db.collection('verificationCodes').doc(email).get(),
      5000,
      'Firestore Read'
    );

    if (!codeDoc.exists) return res.status(400).json({ message: 'Code expired or not found. Please request a new one.' });
    const data = codeDoc.data();

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        // Auto-provision user on first valid code use
        userRecord = await auth.createUser({ email, displayName: data.name });
        await db.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          name: data.name,
          email,
          role: 'Staff',
          active: true,
          createdAt: new Date().toISOString(),
        });
        await sendWelcomeEmail(email, data.name);
      } else throw e;
    }

    const customToken = await auth.createCustomToken(userRecord.uid);
    
    console.log(`[VERIFY] Exchanging token with Google...`);
    const idTokenResponse = await withTimeout(
      fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      }),
      6000,
      'Identity API'
    );

    if (!idTokenResponse.ok) {
      const err = await idTokenResponse.json();
      console.error('[IDENTITY API ERROR]', err);
      throw new Error(err.error?.message || 'Identity verification failed');
    }

    const idTokenData: any = await idTokenResponse.json();
    // Fix: Explicitly type userDoc to any to ensure Firestore DocumentSnapshot properties like .data() are accessible
    const userDoc: any = await db.collection('users').doc(userRecord.uid).get();
    
    await db.collection('verificationCodes').doc(email).delete();

    res.json({ success: true, token: idTokenData.idToken, user: userDoc.data() });
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

app.use('/api', apiRouter);
app.use('/', apiRouter);
app.use(express.static('.') as any);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'API Route Not Found' });
  res.sendFile(path.resolve('index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`ImpactFlow running on port ${PORT}`));