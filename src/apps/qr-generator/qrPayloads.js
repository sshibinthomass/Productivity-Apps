export const QR_TYPES = [
  {
    id: 'url',
    category: 'Essentials',
    label: 'Website URL',
    description: 'Open a website, document, or complete link.',
  },
  {
    id: 'text',
    category: 'Essentials',
    label: 'Plain text',
    description: 'Share a message or any readable text.',
  },
  {
    id: 'raw',
    category: 'Essentials',
    label: 'Custom payload',
    description: 'Encode a complete scheme or raw payload unchanged.',
  },
  {
    id: 'vcard',
    category: 'Contact',
    label: 'Contact card',
    description: 'Save a person or organization to contacts.',
  },
  {
    id: 'email',
    category: 'Contact',
    label: 'Email',
    description: 'Compose an email with an optional subject and message.',
  },
  {
    id: 'phone',
    category: 'Contact',
    label: 'Phone',
    description: 'Start a call to a phone number.',
  },
  {
    id: 'sms',
    category: 'Contact',
    label: 'SMS',
    description: 'Open a text message with an optional message.',
  },
  {
    id: 'whatsapp',
    category: 'Contact',
    label: 'WhatsApp',
    description: 'Start a WhatsApp conversation.',
  },
  {
    id: 'wifi',
    category: 'Connectivity',
    label: 'Wi-Fi',
    description: 'Join a protected, hidden, or open network.',
  },
  {
    id: 'location',
    category: 'Place & time',
    label: 'Location',
    description: 'Open geographic coordinates in a map.',
  },
  {
    id: 'event',
    category: 'Place & time',
    label: 'Calendar event',
    description: 'Add a dated or all-day event to a calendar.',
  },
  {
    id: 'social',
    category: 'Profiles & apps',
    label: 'Social profile',
    description: 'Open a public profile on a selected service.',
  },
  {
    id: 'app',
    category: 'Profiles & apps',
    label: 'App or deep link',
    description: 'Open an app store page, universal link, or app URI.',
  },
  {
    id: 'upi',
    category: 'Payments',
    label: 'UPI payment',
    description: 'Prepare a UPI payment request.',
  },
  {
    id: 'paypal',
    category: 'Payments',
    label: 'PayPal',
    description: 'Open a PayPal payment page.',
  },
  {
    id: 'bitcoin',
    category: 'Payments',
    label: 'Bitcoin',
    description: 'Prepare a Bitcoin payment request.',
  },
  {
    id: 'ethereum',
    category: 'Payments',
    label: 'Ethereum',
    description: 'Prepare an Ethereum payment request.',
  },
  {
    id: 'payment',
    category: 'Payments',
    label: 'Other payment URI',
    description: 'Build another wallet or payment scheme.',
  },
]

const INITIAL_VALUES = {
  url: { url: '' },
  text: { text: '' },
  raw: { payload: '' },
  vcard: {
    firstName: '',
    lastName: '',
    organization: '',
    role: '',
    phone: '',
    email: '',
    website: '',
    street: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
    note: '',
  },
  email: { to: '', subject: '', body: '' },
  phone: { number: '' },
  sms: { number: '', message: '' },
  whatsapp: { number: '', message: '' },
  wifi: { ssid: '', security: 'WPA', password: '', hidden: false },
  location: { latitude: '', longitude: '', label: '' },
  event: {
    title: '',
    allDay: false,
    start: '',
    end: '',
    location: '',
    description: '',
    url: '',
  },
  social: { provider: 'instagram', value: '' },
  app: { link: '' },
  upi: {
    payee: '',
    name: '',
    amount: '',
    currency: 'INR',
    note: '',
    reference: '',
  },
  paypal: { value: '', amount: '' },
  bitcoin: { address: '', amount: '', label: '', message: '' },
  ethereum: {
    address: '',
    chainId: '',
    value: '',
    tokenContract: '',
  },
  payment: { scheme: '', address: '', parameters: '' },
}

function errorResult(field, message) {
  return { payload: '', errors: { [field]: message } }
}

function buildUrl(values) {
  const value = values.url?.trim() ?? ''

  if (!value) {
    return errorResult('url', 'Enter a website or link.')
  }

  try {
    const url = new URL(value)

    if (!url.protocol) {
      throw new Error('Missing scheme')
    }
  } catch {
    return errorResult('url', 'Enter a complete URL including its scheme.')
  }

  return { payload: value, errors: {} }
}

function buildText(values) {
  const value = values.text ?? ''

  return value.trim()
    ? { payload: value, errors: {} }
    : errorResult('text', 'Enter text to encode.')
}

function buildRaw(values) {
  const value = values.payload ?? ''

  return value.trim()
    ? { payload: value, errors: {} }
    : errorResult('payload', 'Enter a payload to encode.')
}

const builders = {
  url: buildUrl,
  text: buildText,
  raw: buildRaw,
}

export function createInitialValues() {
  return Object.fromEntries(
    Object.entries(INITIAL_VALUES).map(([type, values]) => [
      type,
      { ...values },
    ]),
  )
}

export function buildQrPayload(type, values = {}) {
  const result = builders[type]?.(values) ?? {
    payload: '',
    errors: { type: 'Choose a supported content type.' },
  }

  return {
    ...result,
    byteLength: result.payload
      ? new TextEncoder().encode(result.payload).length
      : 0,
  }
}
