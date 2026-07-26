import { betterAuth } from 'better-auth'
import { createEmailSender } from './email.js'

export function createAuth(env, dependencies = {}) {
  const email = dependencies.email ?? createEmailSender({
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    appOrigin: env.APP_ORIGIN,
  })

  return betterAuth({
    baseURL: env.API_ORIGIN,
    basePath: '/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: [env.APP_ORIGIN, env.DEV_ORIGIN].filter(Boolean),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => email.sendPasswordReset({ user, url }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) => email.sendVerification({ user, url }),
    },
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: '.shibinthomas.com',
      },
    },
  })
}
