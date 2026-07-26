import { themeToCssVariables } from '../model/themeCss.js'
import { validateLinkUrl } from '../model/validation.js'
import './MiniSiteRenderer.css'

function safeLink(value) {
  const result = validateLinkUrl(value)
  return result.valid ? result.value : null
}

function externalAttributes(url) {
  return /^https?:/i.test(url)
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}
}

function ProfileBlock({ content }) {
  return (
    <header className="mini-site__profile">
      {content.avatarUrl && (
        <img
          className="mini-site__avatar"
          src={content.avatarUrl}
          alt={content.alt ?? ''}
        />
      )}
      <h1>{content.displayName || 'Untitled mini-site'}</h1>
      {content.bio && <p>{content.bio}</p>}
    </header>
  )
}

function LinkBlock({ block, onLinkClick }) {
  const url = safeLink(block.content.url)
  if (!url) return null

  return (
    <a
      className="mini-site__link"
      href={url}
      {...externalAttributes(url)}
      onClick={() => onLinkClick?.(block.id)}
    >
      <span>
        <strong>{block.content.label}</strong>
        {block.content.supportingText && (
          <small>{block.content.supportingText}</small>
        )}
      </span>
      <span aria-hidden="true">↗</span>
    </a>
  )
}

function HeadingBlock({ content }) {
  const level = [2, 3, 4].includes(Number(content.level))
    ? Number(content.level)
    : 2
  const Heading = `h${level}`
  return <Heading className="mini-site__heading">{content.text}</Heading>
}

function ImageBlock({ content }) {
  if (!content.url) return null
  return (
    <figure className="mini-site__image">
      <img
        src={content.url}
        alt={content.decorative ? '' : content.alt ?? ''}
      />
      {content.caption && <figcaption>{content.caption}</figcaption>}
    </figure>
  )
}

function SocialsBlock({ content, onLinkClick, blockId }) {
  const links = (content.links ?? [])
    .map((link) => ({ ...link, safeUrl: safeLink(link.url) }))
    .filter(({ safeUrl }) => safeUrl)
  if (links.length === 0) return null

  return (
    <nav className="mini-site__socials" aria-label="Social links">
      {links.map((link) => (
        <a
          key={`${link.network}-${link.safeUrl}`}
          href={link.safeUrl}
          aria-label={link.label || link.network}
          {...externalAttributes(link.safeUrl)}
          onClick={() => onLinkClick?.(blockId)}
        >
          {link.label || link.network}
        </a>
      ))}
    </nav>
  )
}

function MiniSiteBlock({ block, onLinkClick }) {
  switch (block.type) {
    case 'profile':
      return <ProfileBlock content={block.content} />
    case 'link':
      return <LinkBlock block={block} onLinkClick={onLinkClick} />
    case 'heading':
      return <HeadingBlock content={block.content} />
    case 'paragraph':
      return <p className="mini-site__paragraph">{block.content.text}</p>
    case 'image':
      return <ImageBlock content={block.content} />
    case 'socials':
      return (
        <SocialsBlock
          content={block.content}
          blockId={block.id}
          onLinkClick={onLinkClick}
        />
      )
    case 'divider':
      return (
        <hr
          className={`mini-site__divider mini-site__divider--${block.content.width ?? 'full'}`}
          style={{ borderTopStyle: block.content.style ?? 'solid' }}
        />
      )
    case 'spacer':
      return (
        <div
          className={`mini-site__spacer mini-site__spacer--${block.content.size ?? 'medium'}`}
          aria-hidden="true"
        />
      )
    default:
      return null
  }
}

export function MiniSiteRenderer({
  site,
  mode = 'public',
  onLinkClick,
}) {
  const backgroundType = ['solid', 'gradient', 'image'].includes(
    site.theme?.background?.type,
  )
    ? site.theme.background.type
    : 'solid'

  return (
    <div
      className={`mini-site mini-site--${backgroundType} mini-site--${mode}`}
      style={themeToCssVariables(site.theme)}
    >
      <main className="mini-site__content">
        {(site.blocks ?? [])
          .filter(({ visible }) => visible !== false)
          .map((block) => (
            <MiniSiteBlock
              key={block.id}
              block={block}
              onLinkClick={onLinkClick}
            />
          ))}
      </main>
    </div>
  )
}
