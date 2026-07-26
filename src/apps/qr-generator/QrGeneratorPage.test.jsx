import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QrGeneratorPage from './QrGeneratorPage.jsx'

function createRenderer() {
  const node = document.createElement('div')
  node.dataset.testid = 'qr-rendered'

  return {
    append: vi.fn((host) => host.append(node)),
    update: vi.fn(),
    download: vi.fn().mockResolvedValue(undefined),
    getRawData: vi
      .fn()
      .mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
  }
}

function renderPage(overrides = {}) {
  const renderer = createRenderer()
  const createQrCode = vi.fn(() => renderer)
  const clipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue(undefined),
  }
  const props = {
    createQrCode,
    clipboard,
    createClipboardItem: vi.fn((items) => items),
    printPage: vi.fn(),
    processLogo: vi
      .fn()
      .mockResolvedValue('data:image/png;base64,processed'),
    ...overrides,
  }

  return {
    ...render(<QrGeneratorPage {...props} />),
    renderer,
    createQrCode,
    clipboard,
    props,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('QrGeneratorPage content flow', () => {
  it('starts with the guided URL template and a local-only empty preview', () => {
    const { createQrCode } = renderPage()

    expect(
      screen.getByRole('heading', {
        name: 'Make one code. Use it anywhere.',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Website URL/ }).getAttribute(
        'aria-pressed',
      ),
    ).toBe('true')
    expect(screen.getByLabelText('Website URL')).toBeTruthy()
    expect(screen.getByText('Your data stays in this browser.')).toBeTruthy()
    expect(createQrCode).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Download PNG' }).disabled).toBe(
      true,
    )
  })

  it('renders and inspects a valid payload live', async () => {
    const { createQrCode, renderer } = renderPage()

    fireEvent.change(screen.getByLabelText('Website URL'), {
      target: { value: 'https://arvenilo.com/tools' },
    })

    await waitFor(() => expect(createQrCode).toHaveBeenCalledTimes(1))
    expect(createQrCode).toHaveBeenCalledWith(
      expect.objectContaining({ data: 'https://arvenilo.com/tools' }),
    )
    expect(renderer.append).toHaveBeenCalled()
    expect(screen.getByText('https://arvenilo.com/tools')).toBeTruthy()
    expect(screen.getByText('Strong')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Download PNG' }).disabled).toBe(
      false,
    )
  })

  it('shows contextual fields and restores values when switching types', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Website URL'), {
      target: { value: 'https://arvenilo.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Wi-Fi/ }))
    expect(screen.getByLabelText('Network name (SSID)')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Network name (SSID)'), {
      target: { value: 'Arvenilo Studio' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Contact card/ }))
    expect(screen.getByLabelText('First name')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Wi-Fi/ }))
    expect(screen.getByLabelText('Network name (SSID)').value).toBe(
      'Arvenilo Studio',
    )
    fireEvent.click(screen.getByRole('button', { name: /Website URL/ }))
    expect(screen.getByLabelText('Website URL').value).toBe(
      'https://arvenilo.com',
    )
  })

  it('shows actionable validation without rendering invalid content', () => {
    const { createQrCode } = renderPage()

    fireEvent.change(screen.getByLabelText('Website URL'), {
      target: { value: 'arvenilo.com' },
    })

    expect(
      screen.getByText('Enter a complete URL including its scheme.'),
    ).toBeTruthy()
    expect(createQrCode).not.toHaveBeenCalled()
  })

  it('copies the exact encoded payload and resets all content', async () => {
    const { clipboard } = renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Plain text/ }))
    fireEvent.change(screen.getByLabelText('Text to encode'), {
      target: { value: 'Hello 🌍' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy payload' }))

    await waitFor(() =>
      expect(clipboard.writeText).toHaveBeenCalledWith('Hello 🌍'),
    )
    expect(screen.getByText('Payload copied')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }))
    expect(screen.getByLabelText('Website URL').value).toBe('')
  })
})

describe('QrGeneratorPage design and output flow', () => {
  it('updates renderer design options and reports risky contrast', async () => {
    const { renderer } = renderPage()

    fireEvent.change(screen.getByLabelText('Website URL'), {
      target: { value: 'https://arvenilo.com' },
    })
    await waitFor(() => expect(renderer.append).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('Module color value'), {
      target: { value: '#888888' },
    })
    fireEvent.change(screen.getByLabelText('Background color value'), {
      target: { value: '#777777' },
    })

    await waitFor(() =>
      expect(renderer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          dotsOptions: expect.objectContaining({ color: '#888888' }),
        }),
      ),
    )
    expect(screen.getByText('At risk')).toBeTruthy()
    expect(
      screen.getByText(
        'Increase contrast between the modules and background.',
      ),
    ).toBeTruthy()
  })

  it('processes a local logo, recommends high correction, and removes it', async () => {
    const processLogo = vi
      .fn()
      .mockResolvedValue('data:image/png;base64,processed')
    renderPage({ processLogo })

    fireEvent.change(screen.getByLabelText('Website URL'), {
      target: { value: 'https://arvenilo.com' },
    })
    const file = new File(['logo'], 'mark.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Center logo'), {
      target: { files: [file] },
    })

    await waitFor(() => expect(processLogo).toHaveBeenCalledWith(file))
    expect(screen.getByText('mark.png')).toBeTruthy()
    expect(screen.getByLabelText('Error correction').value).toBe('H')

    fireEvent.click(screen.getByRole('button', { name: 'Remove logo' }))
    expect(screen.queryByText('mark.png')).toBeNull()
  })

  it('surfaces logo-processing failures without losing the QR', async () => {
    renderPage({
      processLogo: vi.fn().mockRejectedValue(new Error('Image is too large.')),
    })
    fireEvent.change(screen.getByLabelText('Website URL'), {
      target: { value: 'https://arvenilo.com' },
    })
    fireEvent.change(screen.getByLabelText('Center logo'), {
      target: {
        files: [new File(['logo'], 'mark.png', { type: 'image/png' })],
      },
    })

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Image is too large.',
    )
  })

  it('downloads PNG and SVG, copies the image, and prints', async () => {
    const { renderer, clipboard, props } = renderPage()
    fireEvent.change(screen.getByLabelText('Website URL'), {
      target: { value: 'https://arvenilo.com' },
    })
    await waitFor(() => expect(renderer.append).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }))
    fireEvent.click(screen.getByRole('button', { name: 'Download SVG' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy image' }))
    fireEvent.click(screen.getByRole('button', { name: 'Print QR' }))

    await waitFor(() => {
      expect(renderer.download).toHaveBeenCalledWith(
        expect.objectContaining({ extension: 'png' }),
      )
      expect(renderer.download).toHaveBeenCalledWith(
        expect.objectContaining({ extension: 'svg' }),
      )
      expect(clipboard.write).toHaveBeenCalled()
    })
    expect(props.printPage).toHaveBeenCalledTimes(1)
  })

  it('opens a full-size preview, closes on Escape, and restores focus', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Website URL'), {
      target: { value: 'https://arvenilo.com' },
    })
    const trigger = screen.getByRole('button', {
      name: 'Open full-size preview',
    })
    fireEvent.click(trigger)

    expect(screen.getByRole('dialog', { name: 'Full-size QR preview' })).toBe(
      document.activeElement.closest('[role="dialog"]'),
    )
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Full-size QR preview' }),
      ).toBeNull(),
    )
    expect(document.activeElement).toBe(trigger)
  })
})
