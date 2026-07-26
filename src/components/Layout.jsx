import { Link, useLocation } from 'react-router-dom'
import AuthControls from './AuthControls.jsx'

export default function Layout({ children }) {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="product-mark" to="/" aria-label="Productivity Apps home">
          <span className="product-mark__symbol" aria-hidden="true">
            P/
          </span>
          <span>Productivity Apps</span>
        </Link>
        <nav
          className="site-header__actions"
          aria-label="Account and app navigation"
        >
          {!isHome && (
            <Link className="all-apps-link" to="/">
              <span aria-hidden="true">←</span> All apps
            </Link>
          )}
          <AuthControls />
        </nav>
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <p>Small tools. Less friction.</p>
        <p>Built for focused work.</p>
      </footer>
    </div>
  )
}
