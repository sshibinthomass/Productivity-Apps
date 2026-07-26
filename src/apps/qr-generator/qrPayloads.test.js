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

describe('contact and connectivity payloads', () => {
  it('builds a vCard and escapes content characters', () => {
    const result = buildQrPayload('vcard', {
      firstName: 'Ada',
      lastName: 'Lovelace',
      organization: 'Analytical, Engines',
      role: 'Founder',
      phone: '+44 1234',
      email: 'ada@example.com',
      website: 'https://example.com',
      street: '1 Engine Lane',
      city: 'London',
      region: '',
      postalCode: 'N1',
      country: 'UK',
      note: 'First line\nSecond; line',
    })

    expect(result.errors).toEqual({})
    expect(result.payload).toBe(
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Lovelace;Ada;;;',
        'FN:Ada Lovelace',
        'ORG:Analytical\\, Engines',
        'TITLE:Founder',
        'TEL:+44 1234',
        'EMAIL:ada@example.com',
        'URL:https://example.com',
        'ADR:;;1 Engine Lane;London;;N1;UK',
        'NOTE:First line\\nSecond\\; line',
        'END:VCARD',
      ].join('\r\n'),
    )
  })

  it('requires a name for a contact card', () => {
    expect(buildQrPayload('vcard', {}).errors.firstName).toBe(
      'Enter at least a first or last name.',
    )
  })

  it('builds email, phone, SMS, and WhatsApp links', () => {
    expect(
      buildQrPayload('email', {
        to: 'hello@example.com',
        subject: 'Hello there',
        body: 'Line one\nLine two',
      }).payload,
    ).toBe(
      'mailto:hello@example.com?subject=Hello+there&body=Line+one%0ALine+two',
    )
    expect(buildQrPayload('phone', { number: '+49 30 123' }).payload).toBe(
      'tel:+4930123',
    )
    expect(
      buildQrPayload('sms', {
        number: '+49 30 123',
        message: 'Meet at 10?',
      }).payload,
    ).toBe('sms:+4930123?body=Meet+at+10%3F')
    expect(
      buildQrPayload('whatsapp', {
        number: '+49 30 123',
        message: 'Hello Ada',
      }).payload,
    ).toBe('https://wa.me/4930123?text=Hello+Ada')
  })

  it('builds protected and open Wi-Fi payloads with escaped credentials', () => {
    expect(
      buildQrPayload('wifi', {
        ssid: 'Studio;5G',
        security: 'WPA',
        password: 'pass:word',
        hidden: true,
      }).payload,
    ).toBe('WIFI:T:WPA;S:Studio\\;5G;P:pass\\:word;H:true;;')

    expect(
      buildQrPayload('wifi', {
        ssid: 'Guest',
        security: 'nopass',
        password: 'ignored',
        hidden: false,
      }).payload,
    ).toBe('WIFI:T:nopass;S:Guest;H:false;;')
  })

  it('requires credentials only when the communication type needs them', () => {
    expect(buildQrPayload('email', { to: '' }).errors.to).toBe(
      'Enter a recipient email address.',
    )
    expect(buildQrPayload('phone', { number: '' }).errors.number).toBe(
      'Enter a phone number.',
    )
    expect(
      buildQrPayload('wifi', {
        ssid: 'Studio',
        security: 'WPA',
        password: '',
      }).errors.password,
    ).toBe('Enter the network password.')
  })
})

describe('place, event, profile, and app payloads', () => {
  it('builds a labeled location and validates coordinate boundaries', () => {
    expect(
      buildQrPayload('location', {
        latitude: '52.52',
        longitude: '13.405',
        label: 'Berlin',
      }).payload,
    ).toBe('geo:52.52,13.405?q=52.52%2C13.405%28Berlin%29')

    expect(
      buildQrPayload('location', {
        latitude: '91',
        longitude: '13',
      }).errors.latitude,
    ).toBe('Latitude must be between -90 and 90.')
    expect(
      buildQrPayload('location', {
        latitude: '45',
        longitude: '-181',
      }).errors.longitude,
    ).toBe('Longitude must be between -180 and 180.')
  })

  it('serializes a timed calendar event deterministically', () => {
    const result = buildQrPayload('event', {
      title: 'Studio review',
      allDay: false,
      start: '2026-07-26T10:30',
      end: '2026-07-26T11:45',
      location: 'Berlin; Lab',
      description: 'Review\nQR work',
      url: 'https://example.com/review',
    })

    expect(result.payload).toBe(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Arvenilo//QR Studio//EN',
        'BEGIN:VEVENT',
        'SUMMARY:Studio review',
        'DTSTART:20260726T103000',
        'DTEND:20260726T114500',
        'LOCATION:Berlin\\; Lab',
        'DESCRIPTION:Review\\nQR work',
        'URL:https://example.com/review',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
    )
  })

  it('serializes all-day events and rejects an end before the start', () => {
    expect(
      buildQrPayload('event', {
        title: 'Launch day',
        allDay: true,
        start: '2026-08-01',
        end: '2026-08-02',
      }).payload,
    ).toContain('DTSTART;VALUE=DATE:20260801\r\nDTEND;VALUE=DATE:20260802')

    expect(
      buildQrPayload('event', {
        title: 'Backwards',
        allDay: false,
        start: '2026-08-02T12:00',
        end: '2026-08-02T11:00',
      }).errors.end,
    ).toBe('End must be after the start.')
  })

  it('normalizes known social usernames and preserves explicit profile URLs', () => {
    expect(
      buildQrPayload('social', {
        provider: 'instagram',
        value: '@arvenilo',
      }).payload,
    ).toBe('https://www.instagram.com/arvenilo')
    expect(
      buildQrPayload('social', {
        provider: 'github',
        value: 'https://github.com/arvenilo',
      }).payload,
    ).toBe('https://github.com/arvenilo')
  })

  it('accepts complete store, universal, and app links without guessing', () => {
    expect(
      buildQrPayload('app', { link: 'myapp://projects/42' }).payload,
    ).toBe('myapp://projects/42')
    expect(buildQrPayload('app', { link: 'apps/42' }).errors.link).toBe(
      'Enter a complete app or store link including its scheme.',
    )
  })
})

describe('payment payloads', () => {
  it('builds a UPI payment request', () => {
    expect(
      buildQrPayload('upi', {
        payee: 'hello@upi',
        name: 'Arvenilo',
        amount: '12.50',
        currency: 'INR',
        note: 'QR test',
        reference: 'INV-42',
      }).payload,
    ).toBe(
      'upi://pay?pa=hello%40upi&pn=Arvenilo&am=12.50&cu=INR&tn=QR+test&tr=INV-42',
    )
  })

  it('builds PayPal handle and complete payment URLs', () => {
    expect(
      buildQrPayload('paypal', {
        value: '@arvenilo',
        amount: '25.00',
      }).payload,
    ).toBe('https://paypal.me/arvenilo/25.00')
    expect(
      buildQrPayload('paypal', {
        value: 'https://www.paypal.com/paypalme/arvenilo',
        amount: '',
      }).payload,
    ).toBe('https://www.paypal.com/paypalme/arvenilo')
  })

  it('builds Bitcoin and Ethereum payment URIs', () => {
    expect(
      buildQrPayload('bitcoin', {
        address: 'bc1example',
        amount: '0.001',
        label: 'Arvenilo',
        message: 'Invoice 42',
      }).payload,
    ).toBe(
      'bitcoin:bc1example?amount=0.001&label=Arvenilo&message=Invoice+42',
    )
    expect(
      buildQrPayload('ethereum', {
        address: '0xabc123',
        chainId: '1',
        value: '1000000000000000',
        tokenContract: '',
      }).payload,
    ).toBe('ethereum:0xabc123@1?value=1000000000000000')
  })

  it('builds token transfer and generic payment URIs', () => {
    expect(
      buildQrPayload('ethereum', {
        address: '0xrecipient',
        chainId: '137',
        value: '1500000',
        tokenContract: '0xtoken',
      }).payload,
    ).toBe(
      'ethereum:0xtoken@137/transfer?address=0xrecipient&uint256=1500000',
    )
    expect(
      buildQrPayload('payment', {
        scheme: 'litecoin',
        address: 'ltc1example',
        parameters: 'amount=1.5&label=Arvenilo',
      }).payload,
    ).toBe('litecoin:ltc1example?amount=1.5&label=Arvenilo')
  })

  it('rejects non-positive amounts and incomplete payment fields', () => {
    expect(
      buildQrPayload('upi', {
        payee: 'hello@upi',
        amount: '-1',
        currency: 'INR',
      }).errors.amount,
    ).toBe('Enter a positive decimal amount.')
    expect(buildQrPayload('bitcoin', { address: '' }).errors.address).toBe(
      'Enter a Bitcoin address.',
    )
    expect(
      buildQrPayload('payment', {
        scheme: 'not a scheme',
        address: 'abc',
      }).errors.scheme,
    ).toBe('Use a valid URI scheme such as bitcoin or litecoin.')
  })
})
