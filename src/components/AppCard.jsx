import { Link } from 'react-router'

export default function AppCard({ app, index = 0 }) {
  const Icon = app.icon
  const isAvailable = app.status === 'available'
  const content = (
    <>
      <span className="app-card__topline">
        <span className="app-card__number" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="app-card__status">
          {isAvailable ? 'AVAILABLE NOW' : 'COMING SOON'}
        </span>
      </span>
      <span className="app-card__icon" aria-hidden="true">
        <Icon size={28} />
      </span>
      <span className="app-card__copy">
        <span className="app-card__category">{app.category}</span>
        <strong>{app.title}</strong>
        <span>{app.description}</span>
      </span>
      <span className="app-card__action">
        {isAvailable ? 'Open application' : 'Announced for the network'}
        {isAvailable && <span aria-hidden="true">↗</span>}
      </span>
    </>
  )

  if (isAvailable) {
    return (
      <Link
        className={`app-card app-card--${app.accent} app-card--available`}
        to={app.path}
        aria-label={`Open ${app.title}`}
      >
        {content}
      </Link>
    )
  }

  return (
    <article
      className={`app-card app-card--${app.accent} app-card--coming-soon`}
      aria-label={`${app.title}, coming soon`}
    >
      {content}
    </article>
  )
}
