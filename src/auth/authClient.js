import { createAuthClient as createBetterAuthClient } from 'better-auth/react'

const consentVersion = '2026-07-26'

function normalizeUser(user) {
  if (!user) return null

  return {
    uid: user.id,
    displayName: user.name || '',
    email: user.email,
    photoURL: user.image || null,
    emailVerified: user.emailVerified,
  }
}

function headersFor({ turnstileToken, consentAccepted = false }) {
  const headers = {}
  if (turnstileToken) headers['X-Turnstile-Token'] = turnstileToken
  if (consentAccepted) headers['X-Consent-Version'] = consentVersion
  return Object.keys(headers).length ? { headers } : undefined
}

function unwrap(result) {
  if (result?.error) {
    const error = new Error(result.error.message || 'Authentication request failed.')
    error.code = result.error.code
    error.status = result.error.status
    throw error
  }

  return result?.data ?? result
}

function userResult(result) {
  const data = unwrap(result)
  return { user: normalizeUser(data?.user) }
}

export function createAppAuthClient({
  baseUrl,
  clientFactory = createBetterAuthClient,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    return {
      configurationError: 'Email and password sign-in is not configured.',
    }
  }

  const apiBaseUrl = baseUrl.replace(/\/$/, '')
  const client = clientFactory({
    baseURL: `${apiBaseUrl}/auth`,
    fetchOptions: { credentials: 'include' },
  })

  return {
    async getSession() {
      const response = await fetchImpl(`${apiBaseUrl}/v1/session`, {
        credentials: 'include',
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        const error = new Error(body?.error?.message || 'Unable to restore your session.')
        error.code = body?.error?.code
        error.status = response.status
        throw error
      }
      return { user: normalizeUser(body?.user) }
    },

    async signInEmail({ email, password, turnstileToken }) {
      return userResult(await client.signIn.email({
        email,
        password,
        ...(headersFor({ turnstileToken }) && {
          fetchOptions: headersFor({ turnstileToken }),
        }),
      }))
    },

    async registerEmail({
      name,
      email,
      password,
      turnstileToken,
      consentAccepted,
    }) {
      if (!consentAccepted) {
        const error = new Error('Accept the terms and privacy policy to continue.')
        error.code = 'invalid_consent'
        throw error
      }

      return userResult(await client.signUp.email({
        name,
        email,
        password,
        ...(headersFor({ turnstileToken, consentAccepted: true }) && {
          fetchOptions: headersFor({ turnstileToken, consentAccepted: true }),
        }),
      }))
    },

    async resendVerification({ email, turnstileToken, callbackURL }) {
      return unwrap(await client.sendVerificationEmail({
        email,
        ...(callbackURL && { callbackURL }),
        ...(headersFor({ turnstileToken }) && {
          fetchOptions: headersFor({ turnstileToken }),
        }),
      }))
    },

    async requestPasswordReset({ email, turnstileToken, redirectTo }) {
      return unwrap(await client.requestPasswordReset({
        email,
        ...(redirectTo && { redirectTo }),
        ...(headersFor({ turnstileToken }) && {
          fetchOptions: headersFor({ turnstileToken }),
        }),
      }))
    },

    async resetPassword({ token, newPassword }) {
      return unwrap(await client.resetPassword({ token, newPassword }))
    },

    async changePassword({ currentPassword, newPassword }) {
      return unwrap(await client.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      }))
    },

    async signOut() {
      return unwrap(await client.signOut())
    },
  }
}

export const authClient = createAppAuthClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
})
