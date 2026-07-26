import { describe, expect, it } from 'vitest'
import { analyzeQrSafety } from './qrSafety.js'
import { DEFAULT_QR_DESIGN } from './qrRenderConfig.js'

describe('analyzeQrSafety', () => {
  it('rates the default design as strong', () => {
    expect(
      analyzeQrSafety({
        design: DEFAULT_QR_DESIGN,
        byteLength: 40,
      }),
    ).toEqual({
      level: 'strong',
      label: 'Strong',
      issues: [],
    })
  })

  it('reports low contrast and inverted colors as scan risks', () => {
    const result = analyzeQrSafety({
      design: {
        ...DEFAULT_QR_DESIGN,
        foreground: '#888888',
        background: '#777777',
      },
      byteLength: 40,
    })

    expect(result.level).toBe('risk')
    expect(result.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['low-contrast', 'light-modules']),
    )
  })

  it('warns when a logo is not paired with high error correction', () => {
    const result = analyzeQrSafety({
      design: {
        ...DEFAULT_QR_DESIGN,
        logoDataUrl: 'data:image/png;base64,abc',
        errorCorrection: 'M',
      },
      byteLength: 40,
    })

    expect(result.level).toBe('review')
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'logo-correction' }),
    )
  })

  it('reports undersized output for dense payloads', () => {
    const result = analyzeQrSafety({
      design: { ...DEFAULT_QR_DESIGN, size: 256 },
      byteLength: 1800,
    })

    expect(result.level).toBe('risk')
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'dense-output' }),
    )
  })

  it('warns about transparent backgrounds and decorative dense codes', () => {
    const result = analyzeQrSafety({
      design: {
        ...DEFAULT_QR_DESIGN,
        transparent: true,
        dotStyle: 'classy-rounded',
      },
      byteLength: 700,
    })

    expect(result.level).toBe('review')
    expect(result.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['transparent-background', 'decorative-density']),
    )
  })

  it('reports unsafe quiet-zone and logo values supplied programmatically', () => {
    const result = analyzeQrSafety({
      design: {
        ...DEFAULT_QR_DESIGN,
        quietZone: 2,
        logoDataUrl: 'data:image/png;base64,abc',
        logoScale: 0.3,
      },
      byteLength: 40,
    })

    expect(result.level).toBe('risk')
    expect(result.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['quiet-zone', 'logo-size']),
    )
  })
})
