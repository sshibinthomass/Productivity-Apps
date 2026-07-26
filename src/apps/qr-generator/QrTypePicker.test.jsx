import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import QrTypePicker from './QrTypePicker.jsx'

describe('QrTypePicker', () => {
  it('offers four quick picks and every QR type in one categorized select', () => {
    const onChange = vi.fn()
    render(<QrTypePicker selectedType="url" onChange={onChange} />)

    const quickPicks = screen.getByRole('group', { name: 'Quick picks' })
    const quickButtons = within(quickPicks).getAllByRole('button')
    expect(quickButtons).toHaveLength(4)
    expect(
      within(quickPicks)
        .getByRole('button', { name: /Website URL/ })
        .getAttribute('aria-pressed'),
    ).toBe('true')

    const typeSelect = screen.getByLabelText('All QR types')
    expect(within(typeSelect).getAllByRole('option')).toHaveLength(18)

    fireEvent.click(
      within(quickPicks).getByRole('button', { name: /Wi-Fi/ }),
    )
    expect(onChange).toHaveBeenLastCalledWith('wifi')

    fireEvent.change(typeSelect, { target: { value: 'event' } })
    expect(onChange).toHaveBeenLastCalledWith('event')
  })

  it('shows a non-quick selection without pressing a quick card', () => {
    render(<QrTypePicker selectedType="event" onChange={vi.fn()} />)

    expect(screen.getByLabelText('All QR types').value).toBe('event')
    expect(
      within(screen.getByRole('group', { name: 'Quick picks' }))
        .getAllByRole('button')
        .every((button) => button.getAttribute('aria-pressed') === 'false'),
    ).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('Calendar event')
    expect(screen.getByRole('status').textContent).toContain('Place & time')
  })
})
