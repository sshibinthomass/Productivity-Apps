import { ApiError } from './errors.js'

export async function readBoundedBytes(request, { maxBytes, message = 'Request body is too large.' } = {}) {
  const declared = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(declared) && declared > maxBytes) throw new ApiError('request_too_large', message, 413)
  if (!request.body) return new Uint8Array()

  const reader = request.body.getReader()
  const chunks = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxBytes) {
        await reader.cancel()
        throw new ApiError('request_too_large', message, 413)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength }
  return result
}

export async function readBoundedJson(request, options) {
  const bytes = await readBoundedBytes(request, options)
  const text = new TextDecoder().decode(bytes)
  if (!text.trim()) throw new ApiError('invalid_argument', 'Request body must contain a JSON object.', 400)
  try { return JSON.parse(text) } catch { throw new ApiError('invalid_argument', 'Request body must contain valid JSON.', 400) }
}

export async function readBoundedFormData(request, options) {
  const bytes = await readBoundedBytes(request, options)
  return new Request(request.url, { method: request.method, headers: request.headers, body: bytes }).formData()
}
