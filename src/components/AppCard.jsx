import { Link } from 'react-router-dom'

export default function AppCard({ app, index }) {
  const Icon = app.icon

  return (
    <Link
      className={`app-card app-card--${app.accent}`}
      to={app.path}
      aria-label={`Open ${app.title}`}
    >
      <span className="app-card__number" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="app-card__icon">
        <Icon size={28} />
      </span>
      <span className="app-card__copy">
        <strong>{app.title}</strong>
        <span>{app.description}</span>
      </span>
      <span className="app-card__arrow" aria-hidden="true">
        ↗
      </span>
    </Link>
  )
}
