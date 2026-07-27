import { createApiClient } from '../../../api/apiClient.js'
import { normalizeDraft } from '../model/miniSiteModel.js'

const configuredPublicSiteBaseUrl = import.meta.env.VITE_PUBLIC_SITE_BASE_URL ?? 'https://links.shibinthomas.com'
const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
const configuredApiHost = configuredApiBaseUrl ? new URL(configuredApiBaseUrl).hostname : ''
const isLocalWorkerShell = loopbackHosts.has(globalThis.location?.hostname)
  && loopbackHosts.has(configuredApiHost)
export const publicSiteBaseUrl = isLocalWorkerShell
  ? globalThis.location.origin
  : configuredPublicSiteBaseUrl

export function publicMiniSiteUrl(slug) {
  const baseUrl = publicSiteBaseUrl.replace(/\/+$/, '')
  return slug ? `${baseUrl}/${encodeURIComponent(slug)}` : baseUrl
}

function segment(value) {
  return encodeURIComponent(String(value))
}

function siteDraft(value) {
  const normalized = normalizeDraft(value)
  const siteId = value?.siteId ?? value?.id
  return { ...normalized, id: siteId, siteId }
}

function publishedSite(value) {
  return value ? normalizeDraft(value) : null
}

function apiSite(response) {
  return siteDraft(response?.site ?? response)
}

export function createMiniSiteRepository(apiClient, { publicApi = apiClient } = {}) {
  if (!apiClient) throw new TypeError('An API client is required.')

  return {
    async listSites(uid) {
      void uid
      const response = await apiClient.get('/v1/sites')
      return (response?.sites ?? []).map((site) => ({
        ...siteDraft(site),
        analytics: site.analytics ?? { totalViews: 0, totalClicks: 0 },
      }))
    },

    async getDraft(_uid, siteId) {
      return apiSite(await apiClient.get(`/v1/sites/${segment(siteId)}`))
    },

    async saveDraft(_uid, siteId, draft, expectedRevision) {
      const response = await apiClient.put(`/v1/sites/${segment(siteId)}`, {
        expectedRevision,
        draft: normalizeDraft(draft),
      })
      return apiSite(response)
    },

    async getPublished(slug) {
      try {
        const response = await publicApi.get(`/v1/public/sites/${segment(slug)}`)
        return publishedSite(response?.site ?? response)
      } catch (error) {
        if (error?.code === 'not_found' || error?.status === 404) return null
        throw error
      }
    },

    async createSite(input) {
      return apiSite(await apiClient.post('/v1/sites', input))
    },

    async duplicateSite({ sourceSiteId, ...input }) {
      return apiSite(await apiClient.post(`/v1/sites/${segment(sourceSiteId)}/duplicate`, input))
    },

    async changeSlug({ siteId, slug }) {
      return apiSite(await apiClient.put(`/v1/sites/${segment(siteId)}/slug`, { slug }))
    },

    async publishSite(siteId) {
      const response = await apiClient.post(`/v1/sites/${segment(siteId)}/publish`, {})
      return response?.publication ?? response
    },

    async unpublishSite(siteId) {
      const response = await apiClient.post(`/v1/sites/${segment(siteId)}/unpublish`, {})
      return response?.publication ?? response
    },

    deleteSite({ siteId, confirmationName }) {
      return apiClient.delete(`/v1/sites/${segment(siteId)}`, { confirmationName })
    },

    async recordEvent({ slug, ...event }) {
      try {
        return await publicApi.post(`/v1/public/sites/${segment(slug)}/events`, event)
      } catch {
        return null
      }
    },

    async uploadDraftAsset({ siteId, file }) {
      const form = new FormData()
      form.set('file', file)
      const response = await apiClient.upload(`/v1/sites/${segment(siteId)}/assets`, form)
      return response?.asset ?? response
    },

    async getAnalytics(_uid, siteId) {
      const response = await apiClient.get(`/v1/sites/${segment(siteId)}/analytics`)
      return response?.analytics ?? response
    },
  }
}

const managementApi = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'https://api.shibinthomas.com',
})
const publicApi = createApiClient({
  baseUrl: publicSiteBaseUrl,
})

export const miniSiteRepository = createMiniSiteRepository(managementApi, { publicApi })
