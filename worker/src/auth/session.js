import { ApiError } from '../http/errors.js'

export async function getSession(auth, request) {
  return auth.api.getSession({ headers: request.headers })
}

export async function requireUser(auth, request) {
  const session = await getSession(auth, request)
  if (!session) {
    throw new ApiError('unauthenticated', 'Sign in is required.', 401)
  }

  return { id: session.user.id, email: session.user.email }
}
