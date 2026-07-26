import { describe, expect, it, vi } from 'vitest'
import {
  createExportFilename,
  processLogoFile,
  sanitizeSvgText,
  validateLogoFile,
} from './qrMedia.js'

describe('logo validation and processing', () => {
  it('accepts supported image types up to five megabytes', () => {
    expect(
      validateLogoFile({
        type: 'image/png',
        size: 5 * 1024 * 1024,
      }),
    ).toEqual({ valid: true, error: '' })
  })

  it('rejects unsupported and oversized files', () => {
    expect(
      validateLogoFile({ type: 'image/bmp', size: 20 }),
    ).toMatchObject({
      valid: false,
      error: 'Choose a PNG, JPEG, WebP, GIF, or SVG image.',
    })
    expect(
      validateLogoFile({
        type: 'image/png',
        size: 5 * 1024 * 1024 + 1,
      }),
    ).toMatchObject({
      valid: false,
      error: 'Choose an image no larger than 5 MB.',
    })
  })

  it('rejects active or externally linked SVG content', () => {
    expect(() =>
      sanitizeSvgText('<svg><script>alert(1)</script></svg>'),
    ).toThrow('SVG contains active or external content.')
    expect(() =>
      sanitizeSvgText(
        '<svg><image href="https://example.com/logo.png"/></svg>',
      ),
    ).toThrow('SVG contains active or external content.')
    expect(sanitizeSvgText('<svg><path d="M0 0h2v2z"/></svg>')).toBe(
      '<svg><path d="M0 0h2v2z"/></svg>',
    )
  })

  it('passes validated local image content to the rasterizer', async () => {
    const file = new File(['image'], 'logo.png', { type: 'image/png' })
    const rasterize = vi
      .fn()
      .mockResolvedValue('data:image/png;base64,encoded')

    await expect(processLogoFile(file, { rasterize })).resolves.toBe(
      'data:image/png;base64,encoded',
    )
    expect(rasterize).toHaveBeenCalledWith(file)
  })

  it('sanitizes SVG before passing it to the rasterizer', async () => {
    const file = new File(
      ['<svg><path d="M0 0h2v2z"/></svg>'],
      'logo.svg',
      { type: 'image/svg+xml' },
    )
    const rasterize = vi
      .fn()
      .mockResolvedValue('data:image/png;base64,encoded')

    await processLogoFile(file, { rasterize })

    const rasterSource = rasterize.mock.calls[0][0]
    expect(rasterSource).toBeInstanceOf(Blob)
    await expect(rasterSource.text()).resolves.toBe(
      '<svg><path d="M0 0h2v2z"/></svg>',
    )
  })
})

describe('createExportFilename', () => {
  it('builds deterministic, readable names', () => {
    expect(
      createExportFilename('wifi', 'svg', new Date('2026-07-26T10:00:00Z')),
    ).toBe('arvenilo-qr-wifi-2026-07-26.svg')
  })
})
