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

function withQuery(base, entries) {
  const params = new URLSearchParams()

  entries.forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      params.set(key, String(value))
    }
  })

  const query = params.toString()
  return query ? `${base}?${query}` : base
}

function escapeVCard(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/([;,])/g, '\\$1')
}

function buildVCard(values) {
  const firstName = values.firstName?.trim() ?? ''
  const lastName = values.lastName?.trim() ?? ''

  if (!firstName && !lastName) {
    return errorResult('firstName', 'Enter at least a first or last name.')
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`,
    `FN:${escapeVCard(fullName)}`,
  ]
  const optionalLines = [
    ['ORG', values.organization],
    ['TITLE', values.role],
    ['TEL', values.phone],
    ['EMAIL', values.email],
    ['URL', values.website],
  ]

  optionalLines.forEach(([label, value]) => {
    if (value?.trim()) {
      lines.push(`${label}:${escapeVCard(value.trim())}`)
    }
  })

  const address = [
    '',
    '',
    values.street,
    values.city,
    values.region,
    values.postalCode,
    values.country,
  ]

  if (address.some((value) => value?.trim())) {
    lines.push(
      `ADR:${address.map((value) => escapeVCard(value?.trim() ?? '')).join(';')}`,
    )
  }

  if (values.note?.trim()) {
    lines.push(`NOTE:${escapeVCard(values.note.trim())}`)
  }

  lines.push('END:VCARD')
  return { payload: lines.join('\r\n'), errors: {} }
}

function buildEmail(values) {
  const to = values.to?.trim() ?? ''

  if (!to) {
    return errorResult('to', 'Enter a recipient email address.')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return errorResult('to', 'Enter a valid recipient email address.')
  }

  return {
    payload: withQuery(`mailto:${to}`, [
      ['subject', values.subject?.trim() ?? ''],
      ['body', values.body ?? ''],
    ]),
    errors: {},
  }
}

function normalizePhone(value) {
  return String(value ?? '').replace(/[\s()-]/g, '')
}

function validPhone(value) {
  return /^\+?[\d.*#]{3,}$/.test(value)
}

function buildPhone(values) {
  const number = normalizePhone(values.number)

  if (!number) {
    return errorResult('number', 'Enter a phone number.')
  }

  if (!validPhone(number)) {
    return errorResult('number', 'Enter a valid phone number.')
  }

  return { payload: `tel:${number}`, errors: {} }
}

function buildSms(values) {
  const number = normalizePhone(values.number)

  if (!number) {
    return errorResult('number', 'Enter a phone number.')
  }

  if (!validPhone(number)) {
    return errorResult('number', 'Enter a valid phone number.')
  }

  return {
    payload: withQuery(`sms:${number}`, [
      ['body', values.message ?? ''],
    ]),
    errors: {},
  }
}

function buildWhatsApp(values) {
  const number = normalizePhone(values.number).replace(/^\+/, '')

  if (!number) {
    return errorResult('number', 'Enter a WhatsApp phone number.')
  }

  if (!/^\d{6,15}$/.test(number)) {
    return errorResult(
      'number',
      'Use an international number with 6 to 15 digits.',
    )
  }

  return {
    payload: withQuery(`https://wa.me/${number}`, [
      ['text', values.message ?? ''],
    ]),
    errors: {},
  }
}

function escapeWifi(value) {
  return String(value).replace(/([\\;,:"'])/g, '\\$1')
}

function buildWifi(values) {
  const ssid = values.ssid?.trim() ?? ''
  const security = ['WPA', 'WEP', 'nopass'].includes(values.security)
    ? values.security
    : 'WPA'

  if (!ssid) {
    return errorResult('ssid', 'Enter the network name.')
  }

  if (security !== 'nopass' && !values.password) {
    return errorResult('password', 'Enter the network password.')
  }

  const passwordPart =
    security === 'nopass' ? '' : `P:${escapeWifi(values.password)};`

  return {
    payload: `WIFI:T:${security};S:${escapeWifi(ssid)};${passwordPart}H:${Boolean(values.hidden)};;`,
    errors: {},
  }
}

function buildLocation(values) {
  const latitude = Number(values.latitude)
  const longitude = Number(values.longitude)

  if (
    values.latitude === '' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    return errorResult('latitude', 'Latitude must be between -90 and 90.')
  }

  if (
    values.longitude === '' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return errorResult(
      'longitude',
      'Longitude must be between -180 and 180.',
    )
  }

  const coordinate = `${values.latitude},${values.longitude}`
  const label = values.label?.trim() ?? ''
  const query = encodeURIComponent(`${coordinate}(${label})`)
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
  const payload = label
    ? `geo:${coordinate}?q=${query}`
    : `geo:${coordinate}`

  return { payload, errors: {} }
}

function escapeCalendar(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/([;,])/g, '\\$1')
}

function formatCalendarDate(value, allDay) {
  const compact = String(value).replace(/[-:]/g, '')

  if (allDay) {
    return compact
  }

  return compact.length === 13 ? `${compact}00` : compact
}

function buildEvent(values) {
  const title = values.title?.trim() ?? ''
  const start = values.start ?? ''
  const end = values.end ?? ''

  if (!title) {
    return errorResult('title', 'Enter an event title.')
  }

  if (!start) {
    return errorResult('start', 'Choose a start date and time.')
  }

  if (!end) {
    return errorResult('end', 'Choose an end date and time.')
  }

  if (end <= start) {
    return errorResult('end', 'End must be after the start.')
  }

  const datePrefix = values.allDay ? ';VALUE=DATE' : ''
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arvenilo//QR Studio//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${escapeCalendar(title)}`,
    `DTSTART${datePrefix}:${formatCalendarDate(start, values.allDay)}`,
    `DTEND${datePrefix}:${formatCalendarDate(end, values.allDay)}`,
  ]

  ;[
    ['LOCATION', values.location],
    ['DESCRIPTION', values.description],
    ['URL', values.url],
  ].forEach(([label, value]) => {
    if (value?.trim()) {
      lines.push(`${label}:${escapeCalendar(value.trim())}`)
    }
  })

  lines.push('END:VEVENT', 'END:VCALENDAR')
  return { payload: lines.join('\r\n'), errors: {} }
}

const SOCIAL_BASES = {
  instagram: 'https://www.instagram.com/',
  linkedin: 'https://www.linkedin.com/in/',
  github: 'https://github.com/',
  x: 'https://x.com/',
  facebook: 'https://www.facebook.com/',
  youtube: 'https://www.youtube.com/@',
  tiktok: 'https://www.tiktok.com/@',
}

function isCompleteUrl(value) {
  try {
    const parsed = new URL(value)
    return Boolean(parsed.protocol)
  } catch {
    return false
  }
}

function buildSocial(values) {
  const value = values.value?.trim() ?? ''

  if (!value) {
    return errorResult('value', 'Enter a username or profile URL.')
  }

  if (isCompleteUrl(value)) {
    return { payload: value, errors: {} }
  }

  const base = SOCIAL_BASES[values.provider]

  if (!base) {
    return errorResult('value', 'Enter a complete profile URL.')
  }

  const username = value.replace(/^@/, '')
  return { payload: `${base}${encodeURIComponent(username)}`, errors: {} }
}

function buildApp(values) {
  const link = values.link?.trim() ?? ''

  if (!link) {
    return errorResult('link', 'Enter an app or store link.')
  }

  if (!isCompleteUrl(link)) {
    return errorResult(
      'link',
      'Enter a complete app or store link including its scheme.',
    )
  }

  return { payload: link, errors: {} }
}

function isPositiveDecimal(value) {
  return /^\d+(?:\.\d+)?$/.test(value) && Number(value) > 0
}

function invalidOptionalAmount(value) {
  return value !== '' && !isPositiveDecimal(value)
}

function buildUpi(values) {
  const payee = values.payee?.trim() ?? ''
  const amount = values.amount?.trim() ?? ''

  if (!payee) {
    return errorResult('payee', 'Enter a UPI ID.')
  }

  if (invalidOptionalAmount(amount)) {
    return errorResult('amount', 'Enter a positive decimal amount.')
  }

  return {
    payload: withQuery('upi://pay', [
      ['pa', payee],
      ['pn', values.name?.trim() ?? ''],
      ['am', amount],
      ['cu', values.currency?.trim() || 'INR'],
      ['tn', values.note?.trim() ?? ''],
      ['tr', values.reference?.trim() ?? ''],
    ]),
    errors: {},
  }
}

function buildPaypal(values) {
  const value = values.value?.trim() ?? ''
  const amount = values.amount?.trim() ?? ''

  if (!value) {
    return errorResult('value', 'Enter a PayPal.Me handle or payment URL.')
  }

  if (invalidOptionalAmount(amount)) {
    return errorResult('amount', 'Enter a positive decimal amount.')
  }

  if (isCompleteUrl(value)) {
    return { payload: value, errors: {} }
  }

  const handle = value.replace(/^@/, '').replace(/^paypal\.me\//i, '')

  if (!/^[a-zA-Z0-9._-]+$/.test(handle)) {
    return errorResult('value', 'Enter a valid PayPal.Me handle.')
  }

  return {
    payload: `https://paypal.me/${handle}${amount ? `/${amount}` : ''}`,
    errors: {},
  }
}

function buildBitcoin(values) {
  const address = values.address?.trim() ?? ''
  const amount = values.amount?.trim() ?? ''

  if (!address) {
    return errorResult('address', 'Enter a Bitcoin address.')
  }

  if (invalidOptionalAmount(amount)) {
    return errorResult('amount', 'Enter a positive decimal amount.')
  }

  return {
    payload: withQuery(`bitcoin:${address}`, [
      ['amount', amount],
      ['label', values.label?.trim() ?? ''],
      ['message', values.message?.trim() ?? ''],
    ]),
    errors: {},
  }
}

function buildEthereum(values) {
  const address = values.address?.trim() ?? ''
  const tokenContract = values.tokenContract?.trim() ?? ''
  const chainId = values.chainId?.trim() ?? ''
  const value = values.value?.trim() ?? ''

  if (!address) {
    return errorResult('address', 'Enter an Ethereum address.')
  }

  if (chainId && !/^\d+$/.test(chainId)) {
    return errorResult('chainId', 'Enter a numeric chain ID.')
  }

  if (value && (!/^\d+$/.test(value) || BigInt(value) <= 0n)) {
    return errorResult('value', 'Enter a positive amount in base units.')
  }

  const chain = chainId ? `@${chainId}` : ''

  if (tokenContract) {
    return {
      payload: withQuery(`ethereum:${tokenContract}${chain}/transfer`, [
        ['address', address],
        ['uint256', value],
      ]),
      errors: {},
    }
  }

  return {
    payload: withQuery(`ethereum:${address}${chain}`, [['value', value]]),
    errors: {},
  }
}

function buildPayment(values) {
  const scheme = values.scheme?.trim().toLowerCase() ?? ''
  const address = values.address?.trim() ?? ''
  const parameters = values.parameters?.trim().replace(/^\?/, '') ?? ''

  if (!/^[a-z][a-z0-9+.-]*$/.test(scheme)) {
    return errorResult(
      'scheme',
      'Use a valid URI scheme such as bitcoin or litecoin.',
    )
  }

  if (!address) {
    return errorResult('address', 'Enter a payment address or path.')
  }

  return {
    payload: `${scheme}:${address}${parameters ? `?${parameters}` : ''}`,
    errors: {},
  }
}

const builders = {
  url: buildUrl,
  text: buildText,
  raw: buildRaw,
  vcard: buildVCard,
  email: buildEmail,
  phone: buildPhone,
  sms: buildSms,
  whatsapp: buildWhatsApp,
  wifi: buildWifi,
  location: buildLocation,
  event: buildEvent,
  social: buildSocial,
  app: buildApp,
  upi: buildUpi,
  paypal: buildPaypal,
  bitcoin: buildBitcoin,
  ethereum: buildEthereum,
  payment: buildPayment,
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
