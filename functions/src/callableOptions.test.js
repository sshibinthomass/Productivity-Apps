import { describe, expect, it } from 'vitest'
import { createCallableOptions } from './callableOptions.js'

describe('createCallableOptions', () => {
  it('enforces App Check outside the emulator', () => {
    expect(createCallableOptions({})).toEqual({
      region: 'europe-west1',
      enforceAppCheck: true,
    })
  })

  it('allows local emulator calls without App Check tokens', () => {
    expect(createCallableOptions({ FUNCTIONS_EMULATOR: 'true' })).toEqual({
      region: 'europe-west1',
      enforceAppCheck: false,
    })
  })
})
