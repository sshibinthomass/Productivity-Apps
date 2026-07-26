const worker = {
  async fetch(request) {
    const { hostname, pathname } = new URL(request.url)
    if (hostname === 'api.shibinthomas.com' && pathname === '/v1/health') {
      return Response.json({ ok: true })
    }
    return Response.json(
      { error: { code: 'not_found', message: 'Not found.' } },
      { status: 404 },
    )
  },
}

export default worker
