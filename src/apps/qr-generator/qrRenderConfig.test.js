import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QR_DESIGN,
  createQrOptions,
  normalizeQrDesign,
} from './qrRenderConfig.js'

describe('QR renderer configuration', () => {
  it('maps the default application design to qr-code-styling options', () => {
    expect(createQrOptions('hello', DEFAULT_QR_DESIGN)).toMatchObject({
      type: 'svg',
      width: 512,
      height: 512,
      data: 'hello',
      margin: 46,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: 'M',
      },
      dotsOptions: {
        color: '#081D21',
        type: 'rounded',
      },
      cornersSquareOptions: {
        color: '#081D21',
        type: 'extra-rounded',
      },
      cornersDotOptions: {
        color: '#081D21',
        type: 'dot',
      },
      backgroundOptions: {
        color: '#FFFFFF',
      },
    })
  })

  it('maps transparent backgrounds and local logos', () => {
    const options = createQrOptions('hello', {
      ...DEFAULT_QR_DESIGN,
      transparent: true,
      logoDataUrl: 'data:image/png;base64,abc',
      logoScale: 0.22,
      logoPlate: false,
      errorCorrection: 'H',
    })

    expect(options).toMatchObject({
      image: 'data:image/png;base64,abc',
      imageOptions: {
        imageSize: 0.22,
        hideBackgroundDots: true,
        margin: 0,
        saveAsBlob: true,
      },
      backgroundOptions: { color: '#00000000' },
      qrOptions: { errorCorrectionLevel: 'H' },
    })
  })

  it('clamps unsafe or unsupported design values', () => {
    expect(
      normalizeQrDesign({
        ...DEFAULT_QR_DESIGN,
        size: 9000,
        quietZone: 1,
        logoScale: 0.8,
        errorCorrection: 'invalid',
        dotStyle: 'invalid',
      }),
    ).toMatchObject({
      size: 4096,
      quietZone: 4,
      logoScale: 0.25,
      errorCorrection: 'M',
      dotStyle: 'rounded',
    })
  })
})
