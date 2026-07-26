import {
  BLOCK_LIMIT,
  BLOCK_TYPES,
  LINK_BLOCK_LIMIT,
} from '../model/miniSiteModel.js'

const TYPE_LABELS = {
  profile: 'Profile',
  link: 'Link',
  heading: 'Heading',
  paragraph: 'Paragraph',
  image: 'Image',
  socials: 'Socials',
  divider: 'Divider',
  spacer: 'Spacer',
}

function blockLabel(block) {
  return (
    block.content.displayName ||
    block.content.label ||
    block.content.text ||
    block.content.caption ||
    TYPE_LABELS[block.type]
  )
}

export default function BlockList({
  blocks,
  selectedId,
  onSelect,
  onAdd,
  addOpen,
  onToggleAdd,
}) {
  const atBlockLimit = blocks.length >= BLOCK_LIMIT
  const linkCount = blocks.filter(({ type }) => type === 'link').length

  return (
    <div className="mini-studio__block-list">
      <div className="mini-studio__block-heading">
        <div>
          <h2>Page blocks</h2>
          <span>{blocks.length}/{BLOCK_LIMIT}</span>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={onToggleAdd}
          aria-expanded={addOpen}
          disabled={atBlockLimit}
        >
          Add block
        </button>
      </div>
      {addOpen && (
        <div className="mini-studio__add-grid">
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onAdd(type)}
              disabled={type === 'link' && linkCount >= LINK_BLOCK_LIMIT}
            >
              <span aria-hidden="true">＋</span>
              Add {TYPE_LABELS[type].toLowerCase()}
            </button>
          ))}
        </div>
      )}
      <ol>
        {blocks.map((block, index) => (
          <li
            key={block.id}
            className={[
              selectedId === block.id ? 'is-selected' : '',
              block.visible === false ? 'is-hidden' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-testid="studio-block"
          >
            <button
              type="button"
              onClick={() => onSelect(block.id)}
              aria-label={`Edit ${blockLabel(block)}`}
            >
              <span className="mini-studio__block-index">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>
                <small>{TYPE_LABELS[block.type]}</small>
                <strong>{blockLabel(block)}</strong>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
