import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="eyebrow">404 / Off the shelf</p>
      <h1>This tool is not here.</h1>
      <p>The link may be outdated, or the app has not been added yet.</p>
      <Link className="button button--primary" to="/">
        Back to all apps
      </Link>
    </section>
  )
}
