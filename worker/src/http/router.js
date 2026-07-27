import { ApiError, errorResponse } from './errors.js'

export function createRouter() {
  const routes = new Map()
  const router = {
    get: register('GET'),
    post: register('POST'),
    put: register('PUT'),
    delete: register('DELETE'),
    async handle(request, env, context) {
      const { pathname } = new URL(request.url)
      const handler = routes.get(`${request.method} ${pathname}`)

      if (!handler) {
        return errorResponse(new ApiError('not_found', 'Not found.', 404))
      }

      try {
        return await handler(request, env, context)
      } catch (error) {
        return errorResponse(error)
      }
    },
  }

  function register(method) {
    return (path, handler) => {
      routes.set(`${method} ${path}`, handler)
      return router
    }
  }

  return router
}
