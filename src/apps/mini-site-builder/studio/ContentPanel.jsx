function Field({ label, children }) {
  return (
    <label className="mini-studio__field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function TextField({ label, value = '', onChange, type = 'text' }) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

function TextArea({ label, value = '', onChange }) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows="4"
      />
    </Field>
  )
}

function UploadField({ label, busy, onUpload }) {
  return (
    <label className="mini-studio__upload">
      <span>{busy ? 'Uploading…' : label}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={busy}
        onChange={(event) => onUpload(event.target.files?.[0])}
      />
    </label>
  )
}

function BlockFields({
  block,
  onContentChange,
  onUpload,
  uploadBusy,
}) {
  const update = (key) => (value) => onContentChange({ [key]: value })
  const content = block.content

  switch (block.type) {
    case 'profile':
      return (
        <>
          <UploadField
            label="Upload avatar"
            busy={uploadBusy}
            onUpload={onUpload}
          />
          <TextField
            label="Display name"
            value={content.displayName}
            onChange={update('displayName')}
          />
          <TextArea label="Bio" value={content.bio} onChange={update('bio')} />
          <TextField
            label="Avatar URL"
            value={content.avatarUrl}
            onChange={update('avatarUrl')}
            type="url"
          />
          <TextField
            label="Avatar description"
            value={content.alt}
            onChange={update('alt')}
          />
        </>
      )
    case 'link':
      return (
        <>
          <UploadField
            label="Upload image"
            busy={uploadBusy}
            onUpload={onUpload}
          />
          <TextField
            label="Link label"
            value={content.label}
            onChange={update('label')}
          />
          <TextField
            label="URL"
            value={content.url}
            onChange={update('url')}
            type="url"
          />
          <TextField
            label="Supporting text"
            value={content.supportingText}
            onChange={update('supportingText')}
          />
        </>
      )
    case 'heading':
      return (
        <>
          <TextField
            label="Heading text"
            value={content.text}
            onChange={update('text')}
          />
          <Field label="Heading level">
            <select
              value={content.level ?? 2}
              onChange={(event) =>
                update('level')(Number(event.target.value))
              }
            >
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
              <option value="4">Heading 4</option>
            </select>
          </Field>
        </>
      )
    case 'paragraph':
      return (
        <TextArea
          label="Paragraph"
          value={content.text}
          onChange={update('text')}
        />
      )
    case 'image':
      return (
        <>
          <TextField
            label="Image URL"
            value={content.url}
            onChange={update('url')}
            type="url"
          />
          <TextField
            label="Image description"
            value={content.alt}
            onChange={update('alt')}
          />
          <TextField
            label="Caption"
            value={content.caption}
            onChange={update('caption')}
          />
          <label className="mini-studio__check">
            <input
              type="checkbox"
              checked={content.decorative === true}
              onChange={(event) => update('decorative')(event.target.checked)}
            />
            Decorative image
          </label>
        </>
      )
    case 'socials':
      return (
        <TextArea
          label="Social links (one per line: Label | URL)"
          value={(content.links ?? [])
            .map(({ label, url }) => `${label} | ${url}`)
            .join('\n')}
          onChange={(value) =>
            update('links')(
              value
                .split('\n')
                .map((line) => {
                  const [label, ...url] = line.split('|')
                  return {
                    network: label.trim().toLowerCase(),
                    label: label.trim(),
                    url: url.join('|').trim(),
                  }
                })
                .filter(({ label, url }) => label || url),
            )
          }
        />
      )
    case 'divider':
      return (
        <>
          <Field label="Line style">
            <select
              value={content.style ?? 'solid'}
              onChange={(event) => update('style')(event.target.value)}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </Field>
          <Field label="Width">
            <select
              value={content.width ?? 'full'}
              onChange={(event) => update('width')(event.target.value)}
            >
              <option value="full">Full</option>
              <option value="half">Half</option>
            </select>
          </Field>
        </>
      )
    case 'spacer':
      return (
        <Field label="Space">
          <select
            value={content.size ?? 'medium'}
            onChange={(event) => update('size')(event.target.value)}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </Field>
      )
    default:
      return null
  }
}

export default function ContentPanel({
  block,
  blockIndex,
  blockCount,
  onContentChange,
  onMove,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  onUpload,
  uploadState = {},
}) {
  if (!block) {
    return (
      <div className="mini-studio__empty-editor">
        <span>01</span>
        <h2>Select a block</h2>
        <p>Choose a page block to edit its content and settings.</p>
      </div>
    )
  }

  return (
    <section className="mini-studio__block-editor" aria-label="Block editor">
      <header>
        <div>
          <span>Block {String(blockIndex + 1).padStart(2, '0')}</span>
          <h2>Edit {block.type}</h2>
        </div>
        <button
          type="button"
          className="mini-studio__icon-button"
          onClick={onToggleVisibility}
          aria-label={block.visible === false ? 'Show block' : 'Hide block'}
        >
          {block.visible === false ? '○' : '●'}
        </button>
      </header>
      <div className="mini-studio__fields">
        <BlockFields
          block={block}
          onContentChange={onContentChange}
          onUpload={onUpload}
          uploadBusy={uploadState.status === 'uploading'}
        />
        {uploadState.error && <p role="alert">{uploadState.error}</p>}
      </div>
      <footer>
        <div>
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={blockIndex === 0}
            aria-label="Move block up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={blockIndex === blockCount - 1}
            aria-label="Move block down"
          >
            ↓
          </button>
          <button type="button" onClick={onDuplicate}>
            Duplicate block
          </button>
        </div>
        <button type="button" className="is-danger" onClick={onDelete}>
          Delete block
        </button>
      </footer>
    </section>
  )
}
