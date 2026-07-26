import { describe, expect, it } from 'vitest'
import { appRegistry, availableApps } from './appRegistry.jsx'

describe('appRegistry', () => {
  it('models the available and announced Arvenilo Network applications', () => {
    expect(appRegistry).toHaveLength(8)
    expect(appRegistry.filter((app) => app.status === 'available')).toHaveLength(
      5,
    )
    expect(
      appRegistry.filter((app) => app.status === 'coming-soon'),
    ).toHaveLength(3)
    expect(appRegistry.map((app) => app.title)).toEqual([
      'Multi Link Opener',
      'JSON Formatter',
      'Text Comparison',
      'Mini-Site Builder',
      'QR Generator',
      'Text Formatter',
      'Focus Timer',
      'Quick Notes',
    ])
  })

  it('registers the multi link opener at its clean route', () => {
    expect(appRegistry[0]).toMatchObject({
      id: 'multi-link-opener',
      title: 'Multi Link Opener',
      path: '/multi-link-opener',
      accent: 'mint',
      category: 'Browser workflow',
      status: 'available',
      requiresAuth: false,
    })
    expect(typeof appRegistry[0].component).toBe('function')
    expect(typeof appRegistry[0].icon).toBe('function')
  })

  it('registers JSON Formatter as a public developer utility', () => {
    expect(appRegistry[1]).toMatchObject({
      id: 'json-formatter',
      title: 'JSON Formatter',
      path: '/json-formatter',
      accent: 'gold',
      category: 'Developer utility',
      status: 'available',
      requiresAuth: false,
    })
    expect(typeof appRegistry[1].component).toBe('function')
    expect(typeof appRegistry[1].icon).toBe('function')
  })

  it('registers Text Comparison as a public developer utility', () => {
    expect(appRegistry[2]).toMatchObject({
      id: 'text-comparison',
      title: 'Text Comparison',
      path: '/text-comparison',
      accent: 'violet',
      category: 'Developer utility',
      status: 'available',
      requiresAuth: false,
    })
    expect(typeof appRegistry[2].component).toBe('function')
    expect(typeof appRegistry[2].icon).toBe('function')
  })

  it('registers Mini-Site Builder as an authenticated creator tool', () => {
    expect(appRegistry[3]).toMatchObject({
      id: 'mini-site-builder',
      title: 'Mini-Site Builder',
      path: '/mini-sites',
      accent: 'mint',
      category: 'Creator utility',
      status: 'available',
      requiresAuth: true,
    })
    expect(typeof appRegistry[3].component).toBe('function')
    expect(typeof appRegistry[3].icon).toBe('function')
  })

  it('registers QR Generator as a public creation utility', () => {
    expect(appRegistry[4]).toMatchObject({
      id: 'qr-generator',
      title: 'QR Generator',
      path: '/qr-generator',
      accent: 'mint',
      category: 'Creation utility',
      status: 'available',
      requiresAuth: false,
    })
    expect(typeof appRegistry[4].component).toBe('function')
    expect(typeof appRegistry[4].icon).toBe('function')
  })

  it('exposes routes only for complete available applications', () => {
    expect(availableApps).toHaveLength(5)
    expect(availableApps[0]).toMatchObject({
      title: 'Multi Link Opener',
      path: '/multi-link-opener',
      status: 'available',
    })
    expect(typeof availableApps[0].component).toBe('function')
    expect(availableApps[1]).toMatchObject({
      title: 'JSON Formatter',
      path: '/json-formatter',
      status: 'available',
    })
    expect(typeof availableApps[1].component).toBe('function')
    expect(availableApps[2]).toMatchObject({
      title: 'Text Comparison',
      path: '/text-comparison',
      status: 'available',
    })
    expect(typeof availableApps[2].component).toBe('function')
    expect(availableApps[3]).toMatchObject({
      title: 'Mini-Site Builder',
      path: '/mini-sites',
      status: 'available',
      requiresAuth: true,
    })
    expect(typeof availableApps[3].component).toBe('function')
    expect(availableApps[4]).toMatchObject({
      title: 'QR Generator',
      path: '/qr-generator',
      status: 'available',
    })
    expect(typeof availableApps[4].component).toBe('function')
  })

  it('uses unique ids and paths', () => {
    const ids = appRegistry.map((app) => app.id)
    const paths = appRegistry
      .map((app) => app.path)
      .filter((path) => typeof path === 'string')

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('requires every app to declare whether authentication is needed', () => {
    expect(
      appRegistry.every((app) => typeof app.requiresAuth === 'boolean'),
    ).toBe(true)
  })
})
