const DOT_STYLES = [
  ['square', 'Square'],
  ['rounded', 'Rounded'],
  ['dots', 'Dots'],
  ['classy-rounded', 'Soft diamond'],
]

export default function QrDesignControls({
  design,
  onChange,
  onLogo,
  onRemoveLogo,
  logoName,
  logoError,
}) {
  return (
    <div className="qr-design-controls">
      <div className="qr-color-control">
        <label htmlFor="qr-foreground-text">Module color value</label>
        <div>
          <input
            aria-label="Module color"
            type="color"
            value={design.foreground}
            onChange={(event) => onChange('foreground', event.target.value)}
          />
          <input
            id="qr-foreground-text"
            value={design.foreground}
            onChange={(event) => onChange('foreground', event.target.value)}
          />
        </div>
      </div>

      <div className="qr-color-control">
        <label htmlFor="qr-background-text">Background color value</label>
        <div>
          <input
            aria-label="Background color"
            type="color"
            value={design.background}
            disabled={design.transparent}
            onChange={(event) => onChange('background', event.target.value)}
          />
          <input
            id="qr-background-text"
            value={design.background}
            disabled={design.transparent}
            onChange={(event) => onChange('background', event.target.value)}
          />
        </div>
      </div>

      <label className="qr-control">
        <span>Module style</span>
        <select
          value={design.dotStyle}
          onChange={(event) => onChange('dotStyle', event.target.value)}
        >
          {DOT_STYLES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="qr-control">
        <span>Outer corners</span>
        <select
          value={design.outerCornerStyle}
          onChange={(event) =>
            onChange('outerCornerStyle', event.target.value)
          }
        >
          <option value="square">Square</option>
          <option value="dot">Rounded</option>
          <option value="extra-rounded">Extra rounded</option>
        </select>
      </label>

      <label className="qr-control">
        <span>Inner corners</span>
        <select
          value={design.innerCornerStyle}
          onChange={(event) =>
            onChange('innerCornerStyle', event.target.value)
          }
        >
          <option value="square">Square</option>
          <option value="dot">Dot</option>
        </select>
      </label>

      <label className="qr-control">
        <span>Output size</span>
        <select
          value={design.size}
          onChange={(event) => onChange('size', Number(event.target.value))}
        >
          {[256, 512, 1024, 2048].map((size) => (
            <option key={size} value={size}>
              {size} × {size} px
            </option>
          ))}
        </select>
      </label>

      <label className="qr-control">
        <span>Error correction</span>
        <select
          aria-label="Error correction"
          value={design.errorCorrection}
          onChange={(event) =>
            onChange('errorCorrection', event.target.value)
          }
        >
          <option value="L">L — 7%</option>
          <option value="M">M — 15%</option>
          <option value="Q">Q — 25%</option>
          <option value="H">H — 30%</option>
        </select>
      </label>

      <label className="qr-control qr-control--range">
        <span>Quiet zone: {design.quietZone} modules</span>
        <input
          type="range"
          min="4"
          max="12"
          step="1"
          value={design.quietZone}
          onChange={(event) =>
            onChange('quietZone', Number(event.target.value))
          }
        />
      </label>

      <label className="qr-check-control">
        <input
          type="checkbox"
          checked={design.transparent}
          onChange={(event) => onChange('transparent', event.target.checked)}
        />
        <span>Transparent background</span>
      </label>

      <div className="qr-logo-control">
        <label htmlFor="qr-center-logo">Center logo</label>
        <input
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          id="qr-center-logo"
          type="file"
          onChange={(event) => onLogo(event.target.files?.[0])}
        />
        <p>PNG, JPEG, WebP, GIF, or safe SVG · 5 MB maximum</p>
        {logoError && (
          <p className="qr-field__error" role="alert">
            {logoError}
          </p>
        )}
        {design.logoDataUrl && (
          <div className="qr-logo-control__active">
            <img alt="" src={design.logoDataUrl} />
            <span>{logoName}</span>
            <button type="button" onClick={onRemoveLogo}>
              Remove logo
            </button>
          </div>
        )}
      </div>

      {design.logoDataUrl && (
        <>
          <label className="qr-control qr-control--range">
            <span>Logo size: {Math.round(design.logoScale * 100)}%</span>
            <input
              type="range"
              min="0.1"
              max="0.25"
              step="0.01"
              value={design.logoScale}
              onChange={(event) =>
                onChange('logoScale', Number(event.target.value))
              }
            />
          </label>
          <label className="qr-check-control">
            <input
              type="checkbox"
              checked={design.logoPlate}
              onChange={(event) =>
                onChange('logoPlate', event.target.checked)
              }
            />
            <span>Light backing plate</span>
          </label>
        </>
      )}
    </div>
  )
}
