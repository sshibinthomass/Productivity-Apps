import { Link, useLocation } from 'react-router-dom'
import AuthControls from './AuthControls.jsx'
import BrandLogo from './BrandLogo.jsx'

export default function Layout({ children }) {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="product-mark" to="/" aria-label="Arvenilo Network home">
          <BrandLogo />
        </Link>
        <nav
          className="site-header__actions"
          aria-label="Account and app navigation"
        >
          {!isHome && (
            <Link className="all-apps-link" to="/">
              <span aria-hidden="true">←</span> Network index
            </Link>
          )}
          <AuthControls />
        </nav>
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <p>Where Intelligence Meets Reality.</p>
        <p>Arvenilo Network</p>
      </footer>
    </div>
  )
}
