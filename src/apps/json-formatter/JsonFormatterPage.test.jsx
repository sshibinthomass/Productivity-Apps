import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JsonFormatterPage from './JsonFormatterPage.jsx'

describe('JsonFormatterPage', () => {
  let writeText

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders an accessible empty workbench', () => {
    render(<JsonFormatterPage />)

    expect(screen.getByRole('heading', { name: /repair the syntax/i }))
      .toBeTruthy()
    expect(screen.getByLabelText('Input JSON')).toBeTruthy()
    expect(screen.getByLabelText('Formatted JSON')).toBeTruthy()
    expect(screen.getByText('Ready for JSON')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy JSON' }).disabled).toBe(
      true,
    )
  })

  it('formats valid source into the formatted editor', () => {
    render(<JsonFormatterPage />)

    fireEvent.change(screen.getByLabelText('Input JSON'), {
      target: { value: '{"name":"Arvenilo"}' },
    })

    expect(screen.getByLabelText('Formatted JSON').value).toBe(
      '{\n  "name": "Arvenilo"\n}',
    )
    expect(screen.getByText('Valid JSON')).toBeTruthy()
  })

  it('keeps the last formatted value while input is temporarily invalid', () => {
    render(<JsonFormatterPage />)
    const input = screen.getByLabelText('Input JSON')
    const output = screen.getByLabelText('Formatted JSON')

    fireEvent.change(input, { target: { value: '{"valid":true}' } })
    const lastValid = output.value
    fireEvent.change(input, { target: { value: '{"valid":' } })

    expect(output.value).toBe(lastValid)
    expect(screen.getByText('Invalid JSON')).toBeTruthy()
    expect(screen.getByText(/Line 1, column/i)).toBeTruthy()
  })

  it('mirrors formatted-editor edits back to input without cursor rewriting', () => {
    render(<JsonFormatterPage />)
    const input = screen.getByLabelText('Input JSON')
    const output = screen.getByLabelText('Formatted JSON')

    fireEvent.change(output, {
      target: { value: '{"ready":true}' },
    })

    expect(input.value).toBe('{"ready":true}')
    expect(output.value).toBe('{"ready":true}')
    expect(screen.getByText('Valid JSON')).toBeTruthy()

    fireEvent.change(output, {
      target: { value: '{"ready":' },
    })

    expect(input.value).toBe('{"ready":')
    expect(output.value).toBe('{"ready":')
    expect(screen.getByText('Invalid JSON')).toBeTruthy()
  })

  it('offers safe and deep repair as separate actions', () => {
    render(<JsonFormatterPage />)
    const input = screen.getByLabelText('Input JSON')

    fireEvent.change(input, {
      target: { value: "{name: 'Arvenilo', active: True,}" },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Safe fix' }))

    expect(JSON.parse(input.value)).toEqual({
      name: 'Arvenilo',
      active: true,
    })
    expect(screen.getByText('4 safe fixes applied')).toBeTruthy()

    fireEvent.change(input, {
      target: { value: '{"a": 1\n"b": 2' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Deep fix' }))

    expect(JSON.parse(input.value)).toEqual({ a: 1, b: 2 })
    expect(screen.getByText(/deep fixes applied/i)).toBeTruthy()
  })

  it('preserves ambiguous input when a repair cannot make it valid', () => {
    render(<JsonFormatterPage />)
    const input = screen.getByLabelText('Input JSON')
    const source = '{"value": one two}'

    fireEvent.change(input, { target: { value: source } })
    fireEvent.click(screen.getByRole('button', { name: 'Deep fix' }))

    expect(input.value).toBe(source)
    expect(screen.getByText('Still needs attention')).toBeTruthy()
  })

  it('reformats valid JSON when indentation changes', () => {
    render(<JsonFormatterPage />)

    fireEvent.change(screen.getByLabelText('Input JSON'), {
      target: { value: '{"nested":{"value":1}}' },
    })
    fireEvent.change(screen.getByLabelText('Indentation'), {
      target: { value: '4' },
    })

    expect(screen.getByLabelText('Formatted JSON').value).toContain(
      '    "nested"',
    )
  })

  it('loads the sample and clears both editors', () => {
    render(<JsonFormatterPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Load sample' }))

    expect(screen.getByLabelText('Input JSON').value).toContain(
      '"app": "JSON Formatter"',
    )
    expect(screen.getByText('Valid JSON')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(screen.getByLabelText('Input JSON').value).toBe('')
    expect(screen.getByLabelText('Formatted JSON').value).toBe('')
    expect(screen.getByText('Ready for JSON')).toBeTruthy()
  })

  it('copies valid formatted JSON and reports success', async () => {
    render(<JsonFormatterPage />)

    fireEvent.change(screen.getByLabelText('Input JSON'), {
      target: { value: '{"copy":true}' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }))

    expect(writeText).toHaveBeenCalledWith('{\n  "copy": true\n}')
    expect(await screen.findByText('JSON copied')).toBeTruthy()
  })

  it('reports when browser copying fails', async () => {
    writeText.mockRejectedValueOnce(new Error('Permission denied'))
    render(<JsonFormatterPage />)

    fireEvent.change(screen.getByLabelText('Input JSON'), {
      target: { value: '{"copy":true}' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy JSON' }))

    expect(
      await screen.findByText('Copy failed. Select the JSON and copy it.'),
    ).toBeTruthy()
  })

  it('edits in full screen and returns focus after Escape closes it', async () => {
    render(<JsonFormatterPage />)
    const trigger = screen.getByRole('button', { name: 'Full screen' })

    fireEvent.change(screen.getByLabelText('Input JSON'), {
      target: { value: '{"view":"large"}' },
    })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', {
      name: 'Formatted JSON full screen',
    })
    const fullScreenEditor = screen.getByLabelText(
      'Formatted JSON full-screen editor',
    )

    expect(dialog).toBeTruthy()
    fireEvent.change(fullScreenEditor, {
      target: { value: '{"view":"edited"}' },
    })
    expect(screen.getByLabelText('Input JSON').value).toBe(
      '{"view":"edited"}',
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
