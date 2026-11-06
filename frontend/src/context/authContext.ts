import { createContext } from 'react'
import type { Session, SignInRequest, User } from '../types'

export interface AuthContextValue {
  session: Session | null
  /** True in development builds (unless VITE_AUTH_BYPASS=false): the demo entry is available. */
  demoEnabled: boolean
  /** Signs in and stores the session. Rejects if the request fails. */
  signIn: (request: SignInRequest) => Promise<void>
  /** Creates an account and stores the session. Rejects if the request fails. */
  signUp: (request: SignInRequest) => Promise<void>
  /** Clears the session, even if the sign-out request fails. Never rejects. */
  signOut: () => Promise<void>
  /** Stores the mock demo session. Rejects if the request fails. */
  continueAsDemo: () => Promise<void>
  /** Replaces the signed-in user, e.g. after the profile is saved. */
  updateUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
