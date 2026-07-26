const SOCIAL_OPTIONS = [
  ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'],
  ['github', 'GitHub'],
  ['x', 'X'],
  ['facebook', 'Facebook'],
  ['youtube', 'YouTube'],
  ['tiktok', 'TikTok'],
  ['other', 'Other / complete URL'],
]

const FIELD_SETS = {
  url: [
    {
      name: 'url',
      label: 'Website URL',
      type: 'url',
      placeholder: 'https://arvenilo.com/tools',
      help: 'Include https:// or another complete scheme.',
      wide: true,
    },
  ],
  text: [
    {
      name: 'text',
      label: 'Text to encode',
      control: 'textarea',
      placeholder: 'Write or paste any text',
      wide: true,
    },
  ],
  raw: [
    {
      name: 'payload',
      label: 'Custom payload',
      control: 'textarea',
      placeholder: 'otpauth://, market://, or any complete payload',
      help: 'Encoded exactly as entered.',
      wide: true,
    },
  ],
  vcard: [
    { name: 'firstName', label: 'First name', autoComplete: 'given-name' },
    { name: 'lastName', label: 'Last name', autoComplete: 'family-name' },
    {
      name: 'organization',
      label: 'Organization',
      autoComplete: 'organization',
    },
    { name: 'role', label: 'Role or title', autoComplete: 'organization-title' },
    { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
    { name: 'website', label: 'Website', type: 'url', wide: true },
    { name: 'street', label: 'Street address', wide: true },
    { name: 'city', label: 'City' },
    { name: 'region', label: 'Region or state' },
    { name: 'postalCode', label: 'Postal code' },
    { name: 'country', label: 'Country' },
    {
      name: 'note',
      label: 'Note',
      control: 'textarea',
      wide: true,
    },
  ],
  email: [
    { name: 'to', label: 'Recipient email', type: 'email', wide: true },
    { name: 'subject', label: 'Subject', wide: true },
    {
      name: 'body',
      label: 'Message',
      control: 'textarea',
      wide: true,
    },
  ],
  phone: [{ name: 'number', label: 'Phone number', type: 'tel', wide: true }],
  sms: [
    { name: 'number', label: 'Phone number', type: 'tel', wide: true },
    {
      name: 'message',
      label: 'Message',
      control: 'textarea',
      wide: true,
    },
  ],
  whatsapp: [
    {
      name: 'number',
      label: 'WhatsApp phone number',
      type: 'tel',
      help: 'Use the international number including country code.',
      wide: true,
    },
    {
      name: 'message',
      label: 'Prefilled message',
      control: 'textarea',
      wide: true,
    },
  ],
  wifi: [
    {
      name: 'ssid',
      label: 'Network name (SSID)',
      autoComplete: 'off',
      wide: true,
    },
    {
      name: 'security',
      label: 'Security',
      control: 'select',
      options: [
        ['WPA', 'WPA / WPA2 / WPA3'],
        ['WEP', 'WEP'],
        ['nopass', 'Open network'],
      ],
    },
    {
      name: 'password',
      label: 'Network password',
      type: 'text',
      autoComplete: 'off',
      hiddenWhen: (values) => values.security === 'nopass',
    },
    {
      name: 'hidden',
      label: 'Hidden network',
      control: 'checkbox',
      wide: true,
    },
  ],
  location: [
    {
      name: 'latitude',
      label: 'Latitude',
      type: 'number',
      step: 'any',
      placeholder: '52.5200',
    },
    {
      name: 'longitude',
      label: 'Longitude',
      type: 'number',
      step: 'any',
      placeholder: '13.4050',
    },
    { name: 'label', label: 'Place label', wide: true },
  ],
  event: [
    {
      name: 'title',
      label: 'Event title',
      wide: true,
    },
    {
      name: 'allDay',
      label: 'All-day event',
      control: 'checkbox',
      wide: true,
    },
    {
      name: 'start',
      label: 'Starts',
      dynamicType: (values) => (values.allDay ? 'date' : 'datetime-local'),
    },
    {
      name: 'end',
      label: 'Ends',
      dynamicType: (values) => (values.allDay ? 'date' : 'datetime-local'),
    },
    { name: 'location', label: 'Location', wide: true },
    {
      name: 'description',
      label: 'Description',
      control: 'textarea',
      wide: true,
    },
    { name: 'url', label: 'Event URL', type: 'url', wide: true },
  ],
  social: [
    {
      name: 'provider',
      label: 'Profile service',
      control: 'select',
      options: SOCIAL_OPTIONS,
    },
    {
      name: 'value',
      label: 'Username or profile URL',
      wide: true,
    },
  ],
  app: [
    {
      name: 'link',
      label: 'App or store link',
      placeholder: 'https://apps.apple.com/… or myapp://…',
      help: 'Include the complete scheme.',
      wide: true,
    },
  ],
  upi: [
    { name: 'payee', label: 'UPI ID', placeholder: 'name@bank', wide: true },
    { name: 'name', label: 'Payee name' },
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
      step: '0.01',
      min: '0',
    },
    { name: 'currency', label: 'Currency', readOnly: true },
    { name: 'reference', label: 'Reference' },
    { name: 'note', label: 'Payment note', wide: true },
  ],
  paypal: [
    {
      name: 'value',
      label: 'PayPal.Me handle or payment URL',
      wide: true,
    },
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
      step: '0.01',
      min: '0',
    },
  ],
  bitcoin: [
    { name: 'address', label: 'Bitcoin address', wide: true },
    {
      name: 'amount',
      label: 'BTC amount',
      type: 'number',
      step: 'any',
      min: '0',
    },
    { name: 'label', label: 'Label' },
    { name: 'message', label: 'Message', wide: true },
  ],
  ethereum: [
    { name: 'address', label: 'Recipient address', wide: true },
    { name: 'chainId', label: 'Chain ID', inputMode: 'numeric' },
    {
      name: 'value',
      label: 'Amount in base units',
      inputMode: 'numeric',
    },
    { name: 'tokenContract', label: 'Token contract (optional)', wide: true },
  ],
  payment: [
    {
      name: 'scheme',
      label: 'Payment scheme',
      placeholder: 'litecoin',
    },
    { name: 'address', label: 'Address or path', wide: true },
    {
      name: 'parameters',
      label: 'Query parameters',
      placeholder: 'amount=1.5&label=Arvenilo',
      help: 'Enter the query without a leading question mark.',
      wide: true,
    },
  ],
}

function Field({ field, values, error, onChange, type }) {
  const id = `qr-${type}-${field.name}`
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const value = values[field.name]
  const describedBy = [field.help ? helpId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ')
  const className = `qr-field${field.wide ? ' qr-field--wide' : ''}${
    field.control === 'checkbox' ? ' qr-field--checkbox' : ''
  }`

  if (field.hiddenWhen?.(values)) {
    return null
  }

  if (field.control === 'checkbox') {
    return (
      <div className={className}>
        <label htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(field.name, event.target.checked)}
          />
          <span>{field.label}</span>
        </label>
        {error && (
          <p className="qr-field__error" id={errorId}>
            {error}
          </p>
        )}
      </div>
    )
  }

  const sharedProps = {
    id,
    name: field.name,
    value: value ?? '',
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy || undefined,
    onChange: (event) => onChange(field.name, event.target.value),
  }

  return (
    <div className={className}>
      <label htmlFor={id}>{field.label}</label>
      {field.control === 'textarea' ? (
        <textarea {...sharedProps} placeholder={field.placeholder} rows="4" />
      ) : field.control === 'select' ? (
        <select {...sharedProps}>
          {field.options.map(([optionValue, label]) => (
            <option key={optionValue} value={optionValue}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...sharedProps}
          autoComplete={field.autoComplete ?? 'off'}
          inputMode={field.inputMode}
          min={field.min}
          placeholder={field.placeholder}
          readOnly={field.readOnly}
          step={field.step}
          type={field.dynamicType?.(values) ?? field.type ?? 'text'}
        />
      )}
      {field.help && (
        <p className="qr-field__help" id={helpId}>
          {field.help}
        </p>
      )}
      {error && (
        <p className="qr-field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}

export default function QrContentForm({
  type,
  values,
  errors,
  onChange,
}) {
  const fields = FIELD_SETS[type] ?? []

  return (
    <div className="qr-content-form">
      {fields.map((field) => (
        <Field
          error={errors[field.name]}
          field={field}
          key={field.name}
          onChange={onChange}
          type={type}
          values={values}
        />
      ))}
    </div>
  )
}
