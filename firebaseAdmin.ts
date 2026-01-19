
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Robust cleaning: handles literal newlines, escaped \n, and accidental quotes
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '').trim();
    if (!privateKey.includes('---')) {
      console.error('[FIREBASE] Private key format looks invalid (missing headers)');
    }
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      })
    });
    console.log('[FIREBASE] Admin SDK Initialized for project:', projectId);
  } catch (error) {
    console.error('[FIREBASE] Initialization Error:', error);
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
