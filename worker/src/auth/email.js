import { Resend } from 'resend'
import { ApiError } from '../http/errors.js'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function messageHtml({ email, url, action, appOrigin }) {
  return `<!doctype html>
<html lang="en">
  <body>
    <p>Hello,</p>
    <p>Use the link below to ${action} for your Arvenilo account.</p>
    <p><a href="${escapeHtml(url)}">${escapeHtml(action)}</a></p>
    <p>This message was sent to ${escapeHtml(email)}. If you did not request this, you can ignore it.</p>
    <p><a href="${escapeHtml(appOrigin)}">Arvenilo</a></p>
  </body>
</html>`
}

function messageText({ email, url, action, appOrigin }) {
  return `Hello,\n\nUse this link to ${action} for your Arvenilo account:\n${url}\n\nThis message was sent to ${email}. If you did not request this, you can ignore it.\n\n${appOrigin}`
}

export function createEmailSender({ apiKey, from, appOrigin, resendClient }) {
  const client = resendClient ?? new Resend(apiKey)

  async function sendAccountEmail({ user, url, subject, action }) {
    try {
      const result = await client.emails.send({
        from,
        to: user.email,
        subject,
        html: messageHtml({ email: user.email, url, action, appOrigin }),
        text: messageText({ email: user.email, url, action, appOrigin }),
      })

      if (result.error) {
        throw new ApiError('email_unavailable', 'Email could not be sent. Try again.', 503)
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError('email_unavailable', 'Email could not be sent. Try again.', 503)
    }
  }

  return {
    sendVerification({ user, url }) {
      return sendAccountEmail({
        user,
        url,
        subject: 'Verify your Arvenilo account',
        action: 'verify your email address',
      })
    },
    sendPasswordReset({ user, url }) {
      return sendAccountEmail({
        user,
        url,
        subject: 'Reset your Arvenilo password',
        action: 'reset your password',
      })
    },
  }
}
