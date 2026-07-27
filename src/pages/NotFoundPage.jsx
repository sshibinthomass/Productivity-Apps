import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="eyebrow">404 / NETWORK BOUNDARY</p>
      <h1>This application is outside the network.</h1>
      <p>
        The address may be outdated, or this application has not been
        announced.
      </p>
      <Link className="button button--primary" to="/">
        Return to network
      </Link>
    </section>
  )
}
