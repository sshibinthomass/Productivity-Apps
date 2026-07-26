import AppCard from '../components/AppCard.jsx'
import NetworkSignal from '../components/NetworkSignal.jsx'
import { appRegistry } from '../config/appRegistry.jsx'

export default function HomePage() {
  const availableCount = appRegistry.filter(
    (app) => app.status === 'available',
  ).length
  const comingSoonCount = appRegistry.filter(
    (app) => app.status === 'coming-soon',
  ).length

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="network-title">
        <div className="home-hero__copy">
          <p className="eyebrow">
            ARVENILO NETWORK / PRODUCTIVITY SYSTEM
          </p>
          <h1 id="network-title">
            Small tools.{' '}
            <span>Connected work.</span>
          </h1>
          <p className="home-hero__intro">
            A growing network of focused applications for the repetitive parts
            of your day. Choose one task, finish it clearly, and keep moving.
          </p>
          <div className="network-status" aria-label="Application availability">
            <span>
              <strong>{availableCount}</strong> available now
            </span>
            <span>
              <strong>{comingSoonCount}</strong> coming soon
            </span>
          </div>
        </div>
        <NetworkSignal />
      </section>

      <section className="app-library" aria-labelledby="app-library-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Application network</p>
            <h2 id="app-library-title">Choose a focused utility</h2>
          </div>
          <p>{appRegistry.length} network nodes</p>
        </div>
        <div className="app-grid">
          {appRegistry.map((app, index) => (
            <AppCard app={app} index={index} key={app.id} />
          ))}
        </div>
      </section>
    </div>
  )
}
