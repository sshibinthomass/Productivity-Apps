import { QR_TYPES } from './qrPayloads.js'

const QUICK_TYPE_IDS = ['url', 'text', 'vcard', 'wifi']

function groupTypes(types) {
  return types.reduce((groups, type) => {
    const existingGroup = groups.find(
      ({ category }) => category === type.category,
    )

    if (existingGroup) {
      existingGroup.types.push(type)
    } else {
      groups.push({ category: type.category, types: [type] })
    }

    return groups
  }, [])
}

const QUICK_TYPES = QUICK_TYPE_IDS.map((id) =>
  QR_TYPES.find((type) => type.id === id),
)
const TYPE_GROUPS = groupTypes(QR_TYPES)

export default function QrTypePicker({ selectedType, onChange }) {
  const selected =
    QR_TYPES.find((type) => type.id === selectedType) ?? QR_TYPES[0]

  return (
    <div className="qr-type-picker">
      <div>
        <p className="qr-type-picker__label">Quick picks</p>
        <div
          aria-label="Quick picks"
          className="qr-type-picker__quick"
          role="group"
        >
          {QUICK_TYPES.map((type) => (
            <button
              aria-pressed={selected.id === type.id}
              className="qr-type-button"
              key={type.id}
              onClick={() => onChange(type.id)}
              type="button"
            >
              <span>{type.label}</span>
              <small>{type.description}</small>
            </button>
          ))}
        </div>
      </div>

      <label className="qr-type-picker__select" htmlFor="qr-type-select">
        <span>All QR types</span>
        <select
          id="qr-type-select"
          onChange={(event) => onChange(event.target.value)}
          value={selected.id}
        >
          {TYPE_GROUPS.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div aria-live="polite" className="qr-type-picker__summary" role="status">
        <p className="eyebrow">{selected.category}</p>
        <h3>{selected.label}</h3>
        <p>{selected.description}</p>
      </div>
    </div>
  )
}
