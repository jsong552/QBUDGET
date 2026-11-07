import { mockUser } from '../data/mockData'
import type { Session, SignInRequest } from '../types'
import { mockMutation, mockResponse } from './mock'

// BACKEND: sign in with Firebase, then GET /api/me with the ID token as `Authorization: Bearer <token>`
export function signIn(request: SignInRequest): Promise<Session> {
  console.info('[mock] signIn', { email: request.email })
  return mockResponse({ user: mockUser, token: null })
}

// BACKEND: create the Firebase account, then POST /api/me (Bearer token) to create the QBudget profile
export function signUp(request: SignInRequest): Promise<Session> {
  console.info('[mock] signUp', { email: request.email })
  return mockResponse({ user: mockUser, token: null })
}

// BACKEND: POST /api/auth/sign-out
export function signOut(): Promise<void> {
  return mockMutation('signOut')
}

/** Demo session used by the "Continue to demo" button in development. */
// BACKEND: replaced by GET /api/auth/session once sign-in is live
export function getDemoSession(): Promise<Session> {
  return mockResponse({ user: mockUser, token: null })
}
