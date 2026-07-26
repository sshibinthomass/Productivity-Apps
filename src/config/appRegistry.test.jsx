import { describe, expect, it } from 'vitest'
import { appRegistry, availableApps } from './appRegistry.jsx'

describe('appRegistry', () => {
  it('models the available and announced Arvenilo Network applications', () => {
    expect(appRegistry).toHaveLength(4)
    expect(appRegistry.filter((app) => app.status === 'available')).toHaveLength(
      1,
    )
    expect(
      appRegistry.filter((app) => app.status === 'coming-soon'),
    ).toHaveLength(3)
    expect(appRegistry.map((app) => app.title)).toEqual([
      'Multi Link Opener',
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

  it('exposes routes only for complete available applications', () => {
    expect(availableApps).toHaveLength(1)
    expect(availableApps[0]).toMatchObject({
      title: 'Multi Link Opener',
      path: '/multi-link-opener',
      status: 'available',
    })
    expect(typeof availableApps[0].component).toBe('function')
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
