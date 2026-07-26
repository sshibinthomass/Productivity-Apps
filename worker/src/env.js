const requiredStringBindings = [
  'APP_ORIGIN',
  'API_ORIGIN',
  'PUBLIC_SITE_ORIGIN',
  'EMAIL_FROM',
  'BETTER_AUTH_SECRET',
  'TURNSTILE_SECRET_KEY',
  'RESEND_API_KEY',
]

export function validateEnv(env) {
  const normalized = { ...env }

  for (const name of requiredStringBindings) {
    if (typeof env[name] !== 'string' || env[name].trim() === '') {
      throw new Error(`Missing required environment variable: ${name}`)
    }
    normalized[name] = env[name].trim()
  }

  return normalized
}
