import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from 'firebase/auth'

const sdk = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(), createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(), onIdTokenChanged: vi.fn(),
}))
const auth = vi.hoisted(() => ({ currentUser: null as User | null }))
vi.mock('firebase/auth', () => sdk)
vi.mock('../lib/firebase', () => ({ firebaseConfigured: true, getFirebaseAuth: () => auth }))
const profile = { id: 'user-1', email: 'alex@example.com', fullName: 'alex', firstName: 'alex', initials: 'A', studentId: null }
const backend = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../lib/apiClient', () => ({ apiClient: backend }))
import { signIn, signUp, signOut, observeSession, getCurrentToken, toSession, authErrorMessage } from './authService'

function user(uid = 'user-1', token = Promise.resolve('token-1')) {
  return { uid, email: 'alex@example.com', displayName: null, getIdToken: vi.fn(() => token) } as unknown as User
}
beforeEach(() => { vi.clearAllMocks(); backend.get.mockResolvedValue(profile); auth.currentUser = null })

describe('Firebase authentication', () => {
  it('sends credentials to Firebase and preserves password whitespace', async () => {
    await signIn({ email: ' alex@example.com ', password: ' secret ' })
    expect(sdk.signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'alex@example.com', ' secret ')
    await signUp({ email: ' alex@example.com ', password: ' secret ' })
    expect(sdk.createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'alex@example.com', ' secret ')
  })
  it('propagates failed login instead of creating a mock session', async () => {
    sdk.signInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/invalid-credential' })
    await expect(signIn({ email: 'alex@example.com', password: 'bad' })).rejects.toEqual({ code: 'auth/invalid-credential' })
  })
  it('maps the backend profile and email into the session', async () => {
    expect(await toSession(user())).toEqual({ token: 'token-1', user: {
      id: 'user-1', email: 'alex@example.com', fullName: 'alex', firstName: 'alex', initials: 'A', studentId: null,
    } })
  })
  it('asks the SDK for the current token on each request and clears it after logout', async () => {
    const current = user()
    auth.currentUser = current
    vi.mocked(current.getIdToken).mockResolvedValueOnce('old').mockResolvedValueOnce('refreshed')
    expect(await getCurrentToken()).toBe('old')
    expect(await getCurrentToken()).toBe('refreshed')
    await signOut()
    expect(sdk.signOut).toHaveBeenCalledWith(auth)
    auth.currentUser = null
    expect(await getCurrentToken()).toBeNull()
  })
  it('does not restore a stale user when token resolution finishes after logout', async () => {
    let resolve!: (token: string) => void
    const pending = new Promise<string>((done) => { resolve = done })
    const unsubscribe = vi.fn()
    sdk.onIdTokenChanged.mockReturnValue(unsubscribe)
    const changed = vi.fn()
    const stop = observeSession(changed, vi.fn())
    const callback = sdk.onIdTokenChanged.mock.calls[0][1]
    callback(user('old-user', pending))
    callback(null)
    resolve('stale-token')
    await pending
    await Promise.resolve()
    expect(changed.mock.calls).toEqual([[null]])
    stop()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
  it('restores sessions and updates them when Firebase emits a refreshed token', async () => {
    sdk.onIdTokenChanged.mockReturnValue(vi.fn())
    const changed = vi.fn()
    const stop = observeSession(changed, vi.fn())
    const callback = sdk.onIdTokenChanged.mock.calls[0][1]
    callback(user())
    await vi.waitFor(() => expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ token: 'token-1' })))
    callback(user('user-1', Promise.resolve('refreshed')))
    await vi.waitFor(() => expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ token: 'refreshed' })))
    stop()
  })
  it('gives useful errors without exposing raw Firebase errors', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe('The email or password is incorrect.')
    expect(authErrorMessage({ code: 'auth/operation-not-allowed' })).toContain('Enable email/password')
    expect(authErrorMessage(new Error('internal details'))).not.toContain('internal details')
  })
})
