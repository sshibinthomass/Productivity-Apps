import { describe, expect, it } from 'vitest'
import {
  JSON_SAMPLE,
  parseJson,
  repairJson,
} from './jsonUtils.js'

describe('parseJson', () => {
  it('formats valid JSON with the requested indentation', () => {
    expect(parseJson('{"name":"Arvenilo","active":true}', 4)).toMatchObject({
      status: 'valid',
      formatted:
        '{\n    "name": "Arvenilo",\n    "active": true\n}',
      error: null,
    })
  })

  it('preserves valid top-level primitive values', () => {
    expect(parseJson('false')).toMatchObject({
      status: 'valid',
      value: false,
      formatted: 'false',
    })
  })

  it('returns a neutral result for blank input', () => {
    expect(parseJson(' \n ')).toEqual({
      status: 'empty',
      value: null,
      formatted: '',
      error: null,
    })
  })

  it('reports a one-based line and column for invalid JSON', () => {
    const result = parseJson('{\n  "name": "Arvenilo",\n  bad\n}')

    expect(result.status).toBe('invalid')
    expect(result.error).toMatchObject({
      line: 3,
      position: expect.any(Number),
    })
    expect(result.error.column).toBeGreaterThan(0)
    expect(result.error.message).not.toBe('')
  })
})

describe('repairJson', () => {
  it('safe-fixes unambiguous JavaScript and Python-style syntax', () => {
    const source = `{
  // profile shown in the network
  name: 'Arvenilo',
  active: True,
  note: None,
}`
    const result = repairJson(source, 'safe')

    expect(result.success).toBe(true)
    expect(result.value).toEqual({
      name: 'Arvenilo',
      active: true,
      note: null,
    })
    expect(result.repairs.map(({ code }) => code)).toEqual([
      'comments',
      'single-quotes',
      'unquoted-keys',
      'python-literals',
      'trailing-commas',
    ])
  })

  it('does not alter comment-like text or Python words inside strings', () => {
    const source =
      "{url: 'https://arvenilo.com/a//b', note: 'True /* text */',}"
    const result = repairJson(source, 'safe')

    expect(result.success).toBe(true)
    expect(result.value).toEqual({
      url: 'https://arvenilo.com/a//b',
      note: 'True /* text */',
    })
  })

  it('converts escaped apostrophes in single-quoted strings', () => {
    const result = repairJson("{message: 'Arvenilo\\'s tool'}", 'safe')

    expect(result.success).toBe(true)
    expect(result.value).toEqual({ message: "Arvenilo's tool" })
  })

  it('does not guess a missing comma in safe mode', () => {
    const source = '{"a": 1\n"b": 2}'
    const result = repairJson(source, 'safe')

    expect(result.success).toBe(false)
    expect(result.text).toBe(source)
    expect(result.error.line).toBe(2)
  })

  it('deep-fixes common missing commas and end delimiters', () => {
    const source = `{
  "name": "Arvenilo"
  "tools": [
    "formatter"
    "opener"`
    const result = repairJson(source, 'deep')

    expect(result.success).toBe(true)
    expect(result.value).toEqual({
      name: 'Arvenilo',
      tools: ['formatter', 'opener'],
    })
    expect(result.repairs.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['missing-commas', 'closing-delimiters']),
    )
  })

  it('deep-fixes adjacent object and array values across lines', () => {
    const source = `[
  {"id": 1}
  {"id": 2}
  true
  null
]`

    expect(repairJson(source, 'deep').value).toEqual([
      { id: 1 },
      { id: 2 },
      true,
      null,
    ])
  })

  it('deep-fixes an unambiguous mismatched closing delimiter', () => {
    const result = repairJson('{"items": [1, 2}}', 'deep')

    expect(result.success).toBe(true)
    expect(result.value).toEqual({ items: [1, 2] })
    expect(result.repairs.map(({ code }) => code)).toContain(
      'closing-delimiters',
    )
  })

  it('preserves ambiguous invalid input when deep repair cannot validate it', () => {
    const source = '{"value": one two}'
    const result = repairJson(source, 'deep')

    expect(result.success).toBe(false)
    expect(result.text).toBe(source)
    expect(result.value).toBeNull()
  })
})

describe('JSON_SAMPLE', () => {
  it('is a valid document that demonstrates nested data', () => {
    const result = parseJson(JSON_SAMPLE)

    expect(result.status).toBe('valid')
    expect(result.value).toMatchObject({
      app: 'JSON Formatter',
      settings: { repairMode: 'safe' },
    })
    expect(result.value.features.length).toBeGreaterThan(1)
  })
})
