import { describe, expect, it } from 'vitest'
import {
  QR_TYPES,
  buildQrPayload,
  createInitialValues,
} from './qrPayloads.js'

describe('QR payload essentials', () => {
  it('exposes every supported template with unique ids', () => {
    expect(QR_TYPES.map(({ id }) => id)).toEqual([
      'url',
      'text',
      'raw',
      'vcard',
      'email',
      'phone',
      'sms',
      'whatsapp',
      'wifi',
      'location',
      'event',
      'social',
      'app',
      'upi',
      'paypal',
      'bitcoin',
      'ethereum',
      'payment',
    ])
    expect(new Set(QR_TYPES.map(({ id }) => id)).size).toBe(QR_TYPES.length)
  })

  it('preserves complete URLs', () => {
    expect(
      buildQrPayload('url', { url: 'https://arvenilo.com/tools' }),
    ).toMatchObject({
      payload: 'https://arvenilo.com/tools',
      errors: {},
    })
  })

  it('does not guess a missing URL scheme', () => {
    expect(buildQrPayload('url', { url: 'arvenilo.com' }).errors.url).toBe(
      'Enter a complete URL including its scheme.',
    )
  })

  it('preserves Unicode and multiline plain text', () => {
    const text = 'Hello 🌍\nSecond line'

    expect(buildQrPayload('text', { text })).toMatchObject({
      payload: text,
      errors: {},
      byteLength: 22,
    })
  })

  it('preserves a custom payload without normalization', () => {
    const payload = 'otpauth://totp/Test?secret=ABC'

    expect(buildQrPayload('raw', { payload }).payload).toBe(payload)
  })

  it('returns field errors for blank essential content', () => {
    expect(buildQrPayload('url', { url: '  ' }).errors.url).toBe(
      'Enter a website or link.',
    )
    expect(buildQrPayload('text', { text: '' }).errors.text).toBe(
      'Enter text to encode.',
    )
    expect(buildQrPayload('raw', { payload: '' }).errors.payload).toBe(
      'Enter a payload to encode.',
    )
  })

  it('creates independent initial values for every template', () => {
    const first = createInitialValues()
    const second = createInitialValues()

    expect(first.url).toEqual({ url: '' })
    expect(first.wifi).toMatchObject({
      ssid: '',
      security: 'WPA',
      password: '',
      hidden: false,
    })
    expect(first).not.toBe(second)
    expect(first.url).not.toBe(second.url)
  })

  it('rejects an unknown content type', () => {
    expect(buildQrPayload('unknown', {})).toMatchObject({
      payload: '',
      errors: { type: 'Choose a supported content type.' },
      byteLength: 0,
    })
  })
})
