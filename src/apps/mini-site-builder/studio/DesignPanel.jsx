const FONT_OPTIONS = ['Sora Variable', 'Inter Variable', 'Georgia', 'Arial']

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="mini-studio__field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="mini-design__color">
      <span>{label}</span>
      <span>
        <input
          aria-label={label}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <code>{value}</code>
      </span>
    </label>
  )
}

export default function DesignPanel({ theme, onChange }) {
  const update = (group, patch) =>
    onChange({
      ...theme,
      [group]: { ...theme[group], ...patch },
    })

  return (
    <section className="mini-studio__wide-panel">
      <header>
        <span>Visual system</span>
        <h2>Design</h2>
        <p>Shape a recognizable page with a restrained set of safe controls.</p>
      </header>

      <fieldset>
        <legend>Canvas</legend>
        <SelectField
          label="Background style"
          value={theme.background.type}
          onChange={(type) => update('background', { type })}
        >
          <option value="solid">Solid</option>
          <option value="gradient">Gradient</option>
        </SelectField>
        <div className="mini-design__colors">
          <ColorField
            label="Page background"
            value={theme.background.value}
            onChange={(value) => update('background', { value })}
          />
          <ColorField
            label="Gradient end"
            value={theme.background.secondary}
            onChange={(secondary) =>
              update('background', { secondary })
            }
          />
          <ColorField
            label="Page text"
            value={theme.colors.text}
            onChange={(text) => update('colors', { text })}
          />
          <ColorField
            label="Muted text"
            value={theme.colors.muted}
            onChange={(muted) => update('colors', { muted })}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Links</legend>
        <div className="mini-design__colors">
          <ColorField
            label="Button color"
            value={theme.colors.button}
            onChange={(button) => update('colors', { button })}
          />
          <ColorField
            label="Button text"
            value={theme.colors.buttonText}
            onChange={(buttonText) => update('colors', { buttonText })}
          />
          <ColorField
            label="Button border"
            value={theme.colors.buttonBorder}
            onChange={(buttonBorder) =>
              update('colors', { buttonBorder })
            }
          />
        </div>
        <label className="mini-studio__field">
          <span>Button corners</span>
          <input
            aria-label="Button corners"
            type="range"
            min="0"
            max="40"
            value={Math.min(40, theme.button.radius)}
            onChange={(event) =>
              update('button', { radius: Number(event.target.value) })
            }
          />
          <small>{theme.button.radius}px</small>
        </label>
      </fieldset>

      <fieldset className="mini-design__grid">
        <legend>Typography & layout</legend>
        <SelectField
          label="Display font"
          value={theme.fonts.display}
          onChange={(display) => update('fonts', { display })}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font}>{font}</option>
          ))}
        </SelectField>
        <SelectField
          label="Body font"
          value={theme.fonts.body}
          onChange={(body) => update('fonts', { body })}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font}>{font}</option>
          ))}
        </SelectField>
        <SelectField
          label="Content width"
          value={theme.layout.width}
          onChange={(width) => update('layout', { width })}
        >
          <option value="narrow">Narrow</option>
          <option value="medium">Medium</option>
          <option value="wide">Wide</option>
        </SelectField>
        <SelectField
          label="Alignment"
          value={theme.layout.alignment}
          onChange={(alignment) => update('layout', { alignment })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
        </SelectField>
        <SelectField
          label="Spacing"
          value={theme.layout.density}
          onChange={(density) => update('layout', { density })}
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="spacious">Spacious</option>
        </SelectField>
        <SelectField
          label="Profile image"
          value={theme.profile.shape}
          onChange={(shape) => update('profile', { shape })}
        >
          <option value="circle">Circle</option>
          <option value="square">Rounded square</option>
        </SelectField>
      </fieldset>
    </section>
  )
}
