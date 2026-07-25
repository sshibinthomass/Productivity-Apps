import AppCard from '../components/AppCard.jsx'
import { appRegistry } from '../config/appRegistry.jsx'

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="eyebrow">Your utility shelf</p>
          <h1>
            Useful tools,
            <span> ready when work starts.</span>
          </h1>
          <p className="home-hero__intro">
            A growing collection of focused apps for the repetitive parts of
            your day.
          </p>
        </div>
        <div className="tab-stack" aria-hidden="true">
          <span className="tab-stack__tab tab-stack__tab--back">notes</span>
          <span className="tab-stack__tab tab-stack__tab--middle">tasks</span>
          <span className="tab-stack__tab tab-stack__tab--front">links</span>
          <span className="tab-stack__surface">
            <i />
            <i />
            <i />
          </span>
        </div>
      </section>

      <section className="app-library" aria-labelledby="app-library-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">App library</p>
            <h2 id="app-library-title">Pick a tool</h2>
          </div>
          <p>{appRegistry.length} available</p>
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
