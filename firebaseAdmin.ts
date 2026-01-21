import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import admin from 'firebase-admin';

if (admin.apps.length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    console.error('[FIREBASE] Missing FIREBASE_PROJECT_ID environment variable');
    throw new Error('Firebase configuration is incomplete: FIREBASE_PROJECT_ID is required');
  }

  try {
    // Check if service account credentials are provided
    if (!clientEmail || !privateKey || privateKey === 'your-private-key-here' || clientEmail === 'your-service-account@project.iam.gserviceaccount.com') {
      console.error('[FIREBASE] Service account credentials not configured.');
      console.error('[FIREBASE] Please set up Firebase service account credentials:');
      console.error('  1. Go to Firebase Console: https://console.firebase.google.com/');
      console.error('  2. Select your project:', projectId);
      console.error('  3. Go to Project Settings -> Service Accounts');
      console.error('  4. Click "Generate new private key"');
      console.error('  5. Download the JSON file');
      console.error('  6. Update .env.local with:');
      console.error('     - FIREBASE_CLIENT_EMAIL (from "client_email" in JSON)');
      console.error('     - FIREBASE_PRIVATE_KEY (from "private_key" in JSON)');
      throw new Error('Firebase service account credentials are required. Please configure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local');
    } else {
      // Use service account credentials
      if (privateKey) {
        // Robust cleaning: handles literal newlines, escaped \n, and accidental quotes
        privateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '').trim();
        if (!privateKey.includes('---')) {
          console.error('[FIREBASE] Private key format looks invalid (missing headers)');
          throw new Error('FIREBASE_PRIVATE_KEY must be a valid PEM-formatted private key');
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        })
      });
      console.log('[FIREBASE] Admin SDK Initialized for project:', projectId);
    }
  } catch (error: any) {
    console.error('[FIREBASE] Initialization Error:', error.message || error);
    if (error.message?.includes('Could not load the default credentials')) {
      console.error('[FIREBASE] Application Default Credentials not found.');
      console.error('[FIREBASE] Please set up service account credentials:');
      console.error('  1. Go to Firebase Console -> Project Settings -> Service Accounts');
      console.error('  2. Click "Generate new private key"');
      console.error('  3. Update .env.local with FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY');
    } else {
      console.error('[FIREBASE] Please check your Firebase credentials in .env.local');
      console.error('[FIREBASE] The private key should start with "-----BEGIN PRIVATE KEY-----"');
    }
    throw new Error('Firebase initialization failed. Please check your credentials.');
  }
}

// Only export if Firebase is initialized
let auth: admin.auth.Auth;
let db: admin.firestore.Firestore;

try {
  auth = admin.auth();
  db = admin.firestore();
} catch (error: any) {
  console.error('[FIREBASE] Failed to access Firebase services:', error.message || error);
  throw new Error('Firebase services not available. Check Firebase initialization.');
}

export { auth, db };
