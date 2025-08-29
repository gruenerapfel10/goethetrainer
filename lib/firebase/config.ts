import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore'

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Log config status (without exposing sensitive keys)
console.log('[Firebase Config] Initializing with:', {
  hasApiKey: !!firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
  hasAppId: !!firebaseConfig.appId,
});

// Validate required config
if (!firebaseConfig.apiKey) {
  console.error('[Firebase Config] Missing API Key!');
}
if (!firebaseConfig.projectId) {
  console.error('[Firebase Config] Missing Project ID!');
}

let app: FirebaseApp
let auth: Auth
let db: Firestore

if (!getApps().length) {
  console.log('[Firebase Config] Initializing new Firebase app');
  app = initializeApp(firebaseConfig)
} else {
  console.log('[Firebase Config] Using existing Firebase app');
  app = getApps()[0]
}

auth = getAuth(app)
db = getFirestore(app)

// Log successful initialization
console.log('[Firebase Config] Firebase initialized successfully:', {
  authReady: !!auth,
  firestoreReady: !!db,
  appName: app.name,
  projectId: app.options.projectId
});

export { app, auth, db }