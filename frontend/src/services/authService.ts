import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, onIdTokenChanged, type User as FirebaseUser } from 'firebase/auth'
import { firebaseConfigured, getFirebaseAuth } from '../lib/firebase'
import { apiClient } from '../lib/apiClient'
import type { Session, SignInRequest } from '../types'

export async function toSession(user: FirebaseUser): Promise<Session> {
  const token = await user.getIdToken()
  const profile = await apiClient.get<Session['user']>('/me')
  return { token, user: profile }
}
export async function signIn(request: SignInRequest): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), request.email.trim(), request.password)
}
export async function signUp(request: SignInRequest): Promise<void> {
  await createUserWithEmailAndPassword(getFirebaseAuth(), request.email.trim(), request.password)
}
export async function signOut(): Promise<void> {
  if (firebaseConfigured) await firebaseSignOut(getFirebaseAuth())
}
// Ignore stale token results after account changes or unmount.
export function observeSession(onSession: (session: Session | null) => void, onError: (error: unknown) => void) {
  let generation = 0
  const unsubscribe = onIdTokenChanged(getFirebaseAuth(), (user) => {
    const current = ++generation
    if (!user) { onSession(null); return }
    void toSession(user).then((session) => {
      if (current === generation) onSession(session)
    }).catch((error: unknown) => {
      if (current === generation) onError(error)
    })
  }, onError)
  return () => { generation++; unsubscribe() }
}
export async function getCurrentToken(): Promise<string | null> {
  if (!firebaseConfigured) return null
  return getFirebaseAuth().currentUser?.getIdToken() ?? null
}
export function authErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/user-not-found': 'The email or password is incorrect.',
    'auth/wrong-password': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/missing-password': 'Enter your password.',
    'auth/weak-password': 'Choose a stronger password (at least 6 characters).',
    'auth/password-does-not-meet-requirements': 'Your password does not meet this app’s password requirements.',
    'auth/email-already-in-use': 'An account already exists with this email. Try signing in.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Could not connect. Check your internet connection and try again.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'Enable email/password sign-in in Firebase Authentication.',
    'auth/invalid-api-key': 'Check the Firebase API key in frontend/.env and restart the server.',
  }
  if (!firebaseConfigured) return 'Firebase is not configured. Fill in frontend/.env and restart the development server.'
  if (error instanceof Error && error.name === 'ApiError') return error.message
  return messages[code] ?? 'Could not complete authentication. Please try again.'
}
