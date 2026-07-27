import { Link, useLocation } from 'react-router-dom'

export default function TermsPage() {
  const location = useLocation()
  const creatingAccount = location.state?.authMode === 'register'
  return <article className="legal-page" aria-labelledby="terms-title">
    <p className="eyebrow">Account / terms</p><h1 id="terms-title">Terms for creator accounts.</h1><p><strong>Effective 2026-07-26.</strong> These terms need owner and legal review before production launch.</p>
    <h2>Using the service</h2><p>Use your account and sites lawfully. Do not publish content that infringes rights, is deceptive, harmful, or attempts to disrupt the service.</p>
    <h2>Your sites</h2><p>Each creator account may create up to five mini-sites. Published pages are public and may be indexed, shared, and viewed by anyone. Keep account credentials private.</p>
    <h2>Availability</h2><p>The service is provided as available. Features, limits, and availability can change as the service evolves. You are responsible for keeping copies of important content.</p>
    <p>Questions: <a href="https://shibinthomas.com/">site owner’s published contact channel</a>.</p><p><Link to="/login" state={creatingAccount ? { authMode: 'register' } : undefined}>{creatingAccount ? 'Back to account creation' : 'Back to account access'}</Link></p>
  </article>
}
