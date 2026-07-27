import { betterAuth } from 'better-auth'
import { createEmailSender } from './email.js'
import { ApiError } from '../http/errors.js'
import { configuredOrigins } from '../http/cors.js'

const consentVersion = '2026-07-26'

async function requireRecordedConsent(db, user) {
  const consent = await db.prepare(
    'SELECT user_id FROM user_consents WHERE user_id = ? AND terms_version = ? AND privacy_version = ?',
  )
    .bind(user.id, consentVersion, consentVersion)
    .first()
  if (!consent) {
    throw new ApiError('invalid_consent', 'Accept the current terms and privacy policy to continue.', 400)
  }
}

export function createAuth(env, dependencies = {}) {
  const email = dependencies.email ?? createEmailSender({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    appOrigin: env.APP_ORIGIN,
  })
  const requireConsent = dependencies.requireConsent
    ?? ((user) => requireRecordedConsent(env.DB, user))

  return betterAuth({
    baseURL: env.API_ORIGIN,
    basePath: '/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: configuredOrigins(env),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => email.sendPasswordReset({ user, url }),
    },
    emailVerification: {
      sendOnSignUp: false,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      beforeEmailVerification: (user) => requireConsent(user),
      sendVerificationEmail: async ({ user, url }) => {
        await requireConsent(user)
        return email.sendVerification({ user, url })
      },
    },
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: '.shibinthomas.com',
      },
    },
  })
}
