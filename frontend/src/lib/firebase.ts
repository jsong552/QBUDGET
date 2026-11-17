import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
}
export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
export function getFirebaseAuth() {
  if (!firebaseConfigured) throw new Error('Fill in frontend/.env and restart the development server.')
  return getAuth(getApps().length ? getApp() : initializeApp(config))
}
