import { describe, expect, it } from 'vitest'
import { appRegistry } from './appRegistry.jsx'

describe('appRegistry', () => {
  it('registers the multi link opener at its clean route', () => {
    expect(appRegistry).toHaveLength(1)
    expect(appRegistry[0]).toMatchObject({
      id: 'multi-link-opener',
      title: 'Multi Link Opener',
      path: '/multi-link-opener',
      accent: 'violet',
    })
    expect(typeof appRegistry[0].component).toBe('function')
    expect(typeof appRegistry[0].icon).toBe('function')
  })

  it('uses unique ids and paths', () => {
    const ids = appRegistry.map((app) => app.id)
    const paths = appRegistry.map((app) => app.path)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
  })
})
