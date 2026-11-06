import { mockUser } from '../data/mockData'
import type { Session, SignInRequest } from '../types'
import { mockMutation, mockResponse } from './mock'

// BACKEND: POST /api/auth/sign-in
export function signIn(request: SignInRequest): Promise<void> {
  return mockMutation('signIn', { email: request.email })
}

// BACKEND: POST /api/auth/sign-up
export function signUp(request: SignInRequest): Promise<void> {
  return mockMutation('signUp', { email: request.email })
}

// BACKEND: POST /api/auth/sign-out
export function signOut(): Promise<void> {
  return mockMutation('signOut')
}

/** Demo session used when VITE_AUTH_BYPASS=true. */
// BACKEND: replaced by GET /api/auth/session once sign-in is live
export function getDemoSession(): Promise<Session> {
  return mockResponse({ user: mockUser })
}
