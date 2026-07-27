function apiError({ code, message, status, cause }) {
  const error = new Error(message)
  error.code = code
  error.status = status
  if (cause) error.cause = cause
  return error
}

function urlFor(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`
}

async function responseJson(response) {
  if (response.status === 204) return null
  try {
    return await response.json()
  } catch (cause) {
    throw apiError({
      code: 'invalid_response',
      message: 'The server returned an invalid response.',
      status: 502,
      cause,
    })
  }
}

export function createApiClient({ baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 15_000 } = {}) {
  if (!baseUrl) throw new TypeError('An API base URL is required.')
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.')

  async function request(path, { method = 'GET', body, headers } = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
    const requestHeaders = headers ?? (body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : undefined)
    const requestBody = body === undefined || isFormData ? body : JSON.stringify(body)

    try {
      const response = await fetchImpl(urlFor(baseUrl, path), {
        method,
        credentials: 'include',
        signal: controller.signal,
        headers: requestHeaders,
        body: requestBody,
      })
      if (!response.ok) {
        let payload = null
        try {
          payload = await response.json()
        } catch {
          // Error bodies are not trusted API data and may be plain text.
        }
        const detail = payload?.error
        throw apiError({
          code: detail?.code ?? 'request_failed',
          message: detail?.message ?? 'The request could not be completed.',
          status: response.status,
        })
      }
      return responseJson(response)
    } catch (error) {
      if (controller.signal.aborted || error?.name === 'AbortError') {
        throw apiError({ code: 'timeout', message: 'The request timed out. Please try again.', status: 408, cause: error })
      }
      if (error?.code) throw error
      throw apiError({ code: 'network_error', message: 'Unable to reach the service. Check your connection and try again.', status: 0, cause: error })
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    get: (path) => request(path),
    post: (path, body = {}) => request(path, { method: 'POST', body }),
    put: (path, body = {}) => request(path, { method: 'PUT', body }),
    delete: (path, body = undefined) => request(path, { method: 'DELETE', body }),
    upload: (path, body) => request(path, { method: 'POST', body }),
  }
}
