import { describe, expect, it, vi } from 'vitest'
import { createAppAuthClient } from './authClient.js'

const rawUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  image: 'https://example.com/ada.png',
  emailVerified: true,
}

function createBetterClient() {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { user: rawUser } }),
    signIn: {
      email: vi.fn().mockResolvedValue({ data: { user: rawUser } }),
    },
    signUp: {
      email: vi.fn().mockResolvedValue({ data: { user: rawUser } }),
    },
    signOut: vi.fn().mockResolvedValue({ data: { success: true } }),
    sendVerificationEmail: vi.fn().mockResolvedValue({ data: { status: true } }),
    requestPasswordReset: vi.fn().mockResolvedValue({ data: { status: true } }),
    resetPassword: vi.fn().mockResolvedValue({ data: { status: true } }),
    changePassword: vi.fn().mockResolvedValue({ data: { status: true } }),
  }
}

describe('createAppAuthClient', () => {
  it('configures Better Auth for the API auth base URL and cookie sessions', () => {
    const clientFactory = vi.fn(() => createBetterClient())

    createAppAuthClient({
      baseUrl: 'https://api.shibinthomas.com',
      clientFactory,
    })

    expect(clientFactory).toHaveBeenCalledWith({
      baseURL: 'https://api.shibinthomas.com/auth',
      fetchOptions: { credentials: 'include' },
    })
  })

  it('restores the normalized cookie session from the dedicated API endpoint without persisting a token', async () => {
    const rawClient = createBetterClient()
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ user: rawUser }))
    const authClient = createAppAuthClient({
      baseUrl: 'https://api.shibinthomas.com',
      clientFactory: () => rawClient,
      fetchImpl,
    })

    await expect(authClient.getSession()).resolves.toEqual({
      user: {
        uid: 'user-1',
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
        photoURL: 'https://example.com/ada.png',
        emailVerified: true,
      },
    })
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.shibinthomas.com/v1/session',
      { credentials: 'include' },
    )
    expect(rawClient.getSession).not.toHaveBeenCalled()
  })

  it('forwards email sign-in and registration with Turnstile and consent headers', async () => {
    const rawClient = createBetterClient()
    const authClient = createAppAuthClient({
      baseUrl: 'https://api.shibinthomas.com',
      clientFactory: () => rawClient,
    })

    await authClient.signInEmail({
      email: 'ada@example.com',
      password: 'long-password',
      turnstileToken: 'turnstile-token',
    })
    await authClient.registerEmail({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'long-password',
      turnstileToken: 'turnstile-token',
      consentAccepted: true,
    })

    expect(rawClient.signIn.email).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'long-password',
      fetchOptions: {
        headers: { 'X-Turnstile-Token': 'turnstile-token' },
      },
    })
    expect(rawClient.signUp.email).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'long-password',
      fetchOptions: {
        headers: {
          'X-Turnstile-Token': 'turnstile-token',
          'X-Consent-Version': '2026-07-26',
        },
      },
    })
  })

  it('uses Better Auth email recovery, password, and sign-out methods', async () => {
    const rawClient = createBetterClient()
    const authClient = createAppAuthClient({
      baseUrl: 'https://api.shibinthomas.com',
      clientFactory: () => rawClient,
    })

    await authClient.resendVerification({
      email: 'ada@example.com',
      turnstileToken: 'turnstile-token',
    })
    await authClient.requestPasswordReset({
      email: 'ada@example.com',
      turnstileToken: 'turnstile-token',
      redirectTo: 'https://shibinthomas.com/reset-password',
    })
    await authClient.resetPassword({ token: 'opaque', newPassword: 'new-password' })
    await authClient.changePassword({
      currentPassword: 'long-password',
      newPassword: 'new-password',
    })
    await authClient.signOut()

    expect(rawClient.sendVerificationEmail).toHaveBeenCalledWith({
      email: 'ada@example.com',
      fetchOptions: { headers: { 'X-Turnstile-Token': 'turnstile-token' } },
    })
    expect(rawClient.requestPasswordReset).toHaveBeenCalledWith({
      email: 'ada@example.com',
      redirectTo: 'https://shibinthomas.com/reset-password',
      fetchOptions: { headers: { 'X-Turnstile-Token': 'turnstile-token' } },
    })
    expect(rawClient.resetPassword).toHaveBeenCalledWith({
      token: 'opaque',
      newPassword: 'new-password',
    })
    expect(rawClient.changePassword).toHaveBeenCalledWith({
      currentPassword: 'long-password',
      newPassword: 'new-password',
      revokeOtherSessions: true,
    })
    expect(rawClient.signOut).toHaveBeenCalledOnce()
  })
})
