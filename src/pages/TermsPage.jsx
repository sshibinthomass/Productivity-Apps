import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <article className="legal-page" aria-labelledby="terms-title">
      <p className="eyebrow">Account / terms</p>
      <h1 id="terms-title">Terms for creator accounts.</h1>
      <p>These terms need owner and legal review before production launch.</p>
      <h2>Using the service</h2>
      <p>Use your account and sites lawfully. Do not publish content that infringes rights, is deceptive, harmful, or attempts to disrupt the service.</p>
      <h2>Your sites</h2>
      <p>Each creator account may create up to five mini-sites. Published pages are public and may be indexed, shared, and viewed by anyone. Keep account credentials private.</p>
      <h2>Availability</h2>
      <p>The service is provided as available. Features, limits, and availability can change as the service evolves. You are responsible for keeping copies of important content.</p>
      <p><Link to="/login">Back to account access</Link></p>
    </article>
  )
}
