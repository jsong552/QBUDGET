import { createContext } from 'react'
import type { Session, SignInRequest, User } from '../types'

export interface AuthContextValue {
  session: Session | null
  loading: boolean
  error: string | null
  /** Signs in and stores the session. Rejects if the request fails. */
  signIn: (request: SignInRequest) => Promise<void>
  /** Creates an account and stores the session. Rejects if the request fails. */
  signUp: (request: SignInRequest) => Promise<void>
  /** Signs out of Firebase; exposes failures through error. */
  signOut: () => Promise<void>
  /** Replaces the signed-in user, e.g. after the profile is saved. */
  updateUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
