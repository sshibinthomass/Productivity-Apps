import { describe, expect, it, vi } from 'vitest'
import { createEmailSender } from '../src/auth/email.js'

function createSender(send) {
  return createEmailSender({
    apiKey: 'test',
    from: 'Arvenilo <no-reply@shibinthomas.com>',
    appOrigin: 'https://app.shibinthomas.com',
    resendClient: { emails: { send } },
  })
}

describe('account email sender', () => {
  it('sends verification mail from the configured domain', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })
    const sender = createSender(send)

    await sender.sendVerification({
      user: { email: 'person@example.com' },
      url: 'https://api.shibinthomas.com/auth/verify-email?token=opaque',
    })

    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Arvenilo <no-reply@shibinthomas.com>',
      to: 'person@example.com',
      subject: 'Verify your Arvenilo account',
    }))
  })

  it('escapes dynamic values in the verification HTML and supplies plain text', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })
    const sender = createSender(send)

    await sender.sendVerification({
      user: { email: 'person+<script>@example.com' },
      url: 'https://app.shibinthomas.com/verify?token=a&next=<script>',
    })

    const message = send.mock.calls[0][0]
    expect(message.html).toContain('person+&lt;script&gt;@example.com')
    expect(message.html).toContain('token=a&amp;next=&lt;script&gt;')
    expect(message.html).not.toContain('<script>')
    expect(message.text).toContain('https://app.shibinthomas.com/verify?token=a&next=<script>')
  })

  it('sends the password reset subject', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })
    const sender = createSender(send)

    await sender.sendPasswordReset({
      user: { email: 'person@example.com' },
      url: 'https://api.shibinthomas.com/auth/reset-password?token=opaque',
    })

    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'Reset your Arvenilo password',
    }))
  })

  it('maps a Resend error to the stable email service error', async () => {
    const send = vi.fn().mockResolvedValue({ data: null, error: { message: 'Invalid API key' } })
    const sender = createSender(send)

    await expect(
      sender.sendVerification({
        user: { email: 'person@example.com' },
        url: 'https://app.shibinthomas.com/verify?token=opaque',
      }),
    ).rejects.toMatchObject({
      code: 'email_unavailable',
      message: 'Email could not be sent. Try again.',
      status: 503,
    })
  })
})
