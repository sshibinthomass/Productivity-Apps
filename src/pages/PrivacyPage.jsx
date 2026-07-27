import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <article className="legal-page" aria-labelledby="privacy-title">
      <p className="eyebrow">Account / privacy</p>
      <h1 id="privacy-title">Privacy for creator accounts.</h1>
      <p>This notice needs owner and legal review before production launch.</p>
      <h2>What we store</h2>
      <p>We store account details, account security records, mini-site drafts and published content, uploaded assets, and limited event analytics for public pages.</p>
      <h2>Processors and visibility</h2>
      <p>Cloudflare processes the application, database, assets, and analytics. Resend processes transactional account emails. Account and draft data stay private; content and assets on a published mini-site are public.</p>
      <h2>Data requests</h2>
      <p>For access, correction, or deletion requests, contact the published contact channel of this site&apos;s owner. We will review requests under the applicable law.</p>
      <p><Link to="/login">Back to account access</Link></p>
    </article>
  )
}
