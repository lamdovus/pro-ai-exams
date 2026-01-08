import { initializeApp } from 'firebase/app';
import { getAuth, OAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, onAuthStateChanged as _onAuthStateChanged, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig as any);
const auth = getAuth(app);

// Ensure session persistence across reloads and tabs
setPersistence(auth, browserLocalPersistence).catch(() => { /* ignore */ });

export const initFirebase = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    // ignore
  }
};

export const signInWithMicrosoft = async () => {
  const provider = new OAuthProvider('microsoft.com');
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const signOutFirebase = async () => {
  try { await signOut(auth); } catch (e) { /* ignore */ }
};

export const onAuthStateChanged = (cb: (u: any) => void) => _onAuthStateChanged(auth, cb);

export { auth };
