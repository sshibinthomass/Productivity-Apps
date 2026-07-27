function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function escapeJson(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029',
  })[character])
}

function metaTag(property, content) {
  return `<meta property="${escapeHtml(property)}" content="${escapeHtml(content)}">`
}

export function renderPublicPage({ document, site, origin }) {
  const title = site.seo?.title || site.slug
  const description = site.seo?.description || ''
  const canonical = `${origin}/${encodeURIComponent(site.slug)}`
  const socialImage = site.seo?.socialImageUrl
  const head = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    metaTag('og:title', title), metaTag('og:description', description), metaTag('og:url', canonical),
    socialImage ? metaTag('og:image', socialImage) : '',
  ].join('')
  const bootstrap = `<template id="mini-site-bootstrap">${escapeJson(site)}</template>`
  const withoutTitle = document.replace(/<title[^>]*>[\s\S]*?<\/title>/i, '')
  if (/<\/head>/i.test(withoutTitle) && /<\/body>/i.test(withoutTitle)) {
    return withoutTitle.replace(/<\/head>/i, `${head}</head>`).replace(/<\/body>/i, `${bootstrap}</body>`)
  }
  return `<!doctype html><html><head>${head}</head><body>${bootstrap}</body></html>`
}
