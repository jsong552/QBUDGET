import { createContext } from 'react'
import type { Session } from '../types'

export interface AuthContextValue {
  session: Session | null
  /** True when VITE_AUTH_BYPASS=true and the demo entry is available. */
  demoEnabled: boolean
  startDemo: () => Promise<void>
  endSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
