export class ApiError extends Error {
  constructor(code, message, status) {
    super(message)
    this.code = code
    this.status = status
  }
}

export function errorResponse(error) {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    )
  }

  return Response.json(
    { error: { code: 'internal_error', message: 'An unexpected error occurred.' } },
    { status: 500 },
  )
}
