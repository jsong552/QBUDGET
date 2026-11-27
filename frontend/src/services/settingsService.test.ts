import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: { credential: vi.fn((email: string, password: string) => ({ email, password })) },
  sendPasswordResetEmail: vi.fn(),
  // Also imported by authService, whose error messages settingsService reuses.
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onIdTokenChanged: vi.fn(),
}))
/** What happened, in order: confirming the password, refreshing the login token, deleting the account. */
const steps = vi.hoisted(() => [] as string[])
const auth = vi.hoisted(() => ({ currentUser: null as null | { email: string | null; getIdToken: (force?: boolean) => Promise<string> } }))
const backend = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn(), put: vi.fn(), patch: vi.fn() }))
vi.mock('firebase/auth', () => sdk)
vi.mock('../lib/firebase', () => ({ firebaseConfigured: true, getFirebaseAuth: () => auth }))
vi.mock('../lib/apiClient', () => ({ apiClient: backend }))
import { deleteAccount } from './settingsService'

beforeEach(() => {
  vi.clearAllMocks()
  steps.length = 0
  auth.currentUser = {
    email: 'alex@example.com',
    getIdToken: async (force?: boolean) => {
      steps.push(force ? 'refresh login token' : 'read login token')
      return 'fresh-token'
    },
  }
  sdk.reauthenticateWithCredential.mockImplementation(async () => {
    steps.push('confirm password')
  })
  backend.delete.mockImplementation(async () => {
    steps.push('delete account')
  })
})

describe('deleteAccount', () => {
  it('confirms the password, refreshes the login, then deletes the account', async () => {
    await deleteAccount(' pass word ')
    expect(sdk.EmailAuthProvider.credential).toHaveBeenCalledWith('alex@example.com', ' pass word ')
    expect(sdk.reauthenticateWithCredential).toHaveBeenCalledWith(auth.currentUser, { email: 'alex@example.com', password: ' pass word ' })
    expect(backend.delete).toHaveBeenCalledWith('/me')
    expect(steps).toEqual(['confirm password', 'refresh login token', 'delete account'])
  })

  it('never contacts Firebase or the server for a blank password', async () => {
    await expect(deleteAccount('')).rejects.toThrow('Enter your password to confirm.')
    expect(steps).toEqual([])
    expect(sdk.reauthenticateWithCredential).not.toHaveBeenCalled()
  })

  it.each(['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'])(
    'a wrong password (%s) says so and deletes nothing',
    async (code) => {
      sdk.reauthenticateWithCredential.mockRejectedValueOnce({ code })
      await expect(deleteAccount('nope')).rejects.toThrow('That password is incorrect.')
      expect(steps).toEqual([])
      expect(backend.delete).not.toHaveBeenCalled()
    },
  )

  it('other sign-in problems use the usual messages and delete nothing', async () => {
    sdk.reauthenticateWithCredential.mockRejectedValueOnce({ code: 'auth/too-many-requests' })
    await expect(deleteAccount('x')).rejects.toThrow('Too many attempts. Please try again later.')
    expect(backend.delete).not.toHaveBeenCalled()
  })

  it('passes on a server error, such as Firestore rules that were not republished', async () => {
    backend.delete.mockRejectedValueOnce(new Error('Firestore denied access. Publish firestore.rules for this Firebase project.'))
    await expect(deleteAccount('x')).rejects.toThrow('Firestore denied access')
  })

  it('asks to sign in first when nobody is signed in', async () => {
    auth.currentUser = null
    await expect(deleteAccount('x')).rejects.toThrow('Sign in first.')
    expect(backend.delete).not.toHaveBeenCalled()
  })
})
