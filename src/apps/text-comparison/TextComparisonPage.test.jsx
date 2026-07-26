import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MAX_TEXT_LENGTH } from './diffUtils.js'
import TextComparisonPage from './TextComparisonPage.jsx'

function enterBothTexts(
  original = 'Hello world',
  revised = 'Hello team',
) {
  fireEvent.change(screen.getByLabelText('Text 1 / Original'), {
    target: { value: original },
  })
  fireEvent.change(screen.getByLabelText('Text 2 / Revised'), {
    target: { value: revised },
  })
}

describe('TextComparisonPage', () => {
  it('renders an accessible empty workbench with words selected', () => {
    render(<TextComparisonPage />)

    expect(
      screen.getByRole('heading', { name: 'See exactly what changed.' }),
    ).toBeTruthy()
    expect(screen.getByLabelText('Text 1 / Original')).toBeTruthy()
    expect(screen.getByLabelText('Text 2 / Revised')).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Words' }).checked).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Compare texts' }).disabled,
    ).toBe(true)
  })

  it('compares both values and clears stale output after editing', () => {
    render(<TextComparisonPage />)
    enterBothTexts()
    fireEvent.click(screen.getByRole('button', { name: 'Compare texts' }))

    expect(
      screen.getByRole('heading', { name: 'Differences found' }),
    ).toBeTruthy()
    expect(screen.getByText('world').tagName).toBe('DEL')
    expect(screen.getByText('team').tagName).toBe('INS')

    fireEvent.change(screen.getByLabelText('Text 2 / Revised'), {
      target: { value: 'Hello everyone' },
    })

    expect(
      screen.queryByRole('heading', { name: 'Differences found' }),
    ).toBeNull()
  })

  it('switches to exact character comparison', () => {
    render(<TextComparisonPage />)
    enterBothTexts('color', 'colour')
    fireEvent.click(screen.getByRole('radio', { name: 'Characters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Compare texts' }))

    expect(screen.getByText('1 added')).toBeTruthy()
    expect(screen.getByText('Character comparison')).toBeTruthy()
  })

  it('clears a stale result when the comparison mode changes', () => {
    render(<TextComparisonPage />)
    enterBothTexts()
    fireEvent.click(screen.getByRole('button', { name: 'Compare texts' }))

    fireEvent.click(screen.getByRole('radio', { name: 'Characters' }))

    expect(
      screen.queryByRole('heading', { name: 'Differences found' }),
    ).toBeNull()
  })

  it('clears both editors, mode, and results', () => {
    render(<TextComparisonPage />)
    enterBothTexts()
    fireEvent.click(screen.getByRole('radio', { name: 'Characters' }))
    fireEvent.click(screen.getByRole('button', { name: 'Compare texts' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(screen.getByLabelText('Text 1 / Original').value).toBe('')
    expect(screen.getByLabelText('Text 2 / Revised').value).toBe('')
    expect(screen.getByRole('radio', { name: 'Words' }).checked).toBe(true)
    expect(
      screen.queryByRole('heading', { name: 'Differences found' }),
    ).toBeNull()
  })

  it('reports identical input without hiding it', () => {
    render(<TextComparisonPage />)
    enterBothTexts('same', 'same')
    fireEvent.click(screen.getByRole('button', { name: 'Compare texts' }))

    expect(
      screen.getByRole('heading', { name: 'No differences found' }),
    ).toBeTruthy()
    const resultRegion = screen.getByRole('region', {
      name: 'Side-by-side comparison results',
    })

    expect(within(resultRegion).getAllByText('same')).toHaveLength(2)
  })

  it('retains both inputs when comparison rejects an oversized value', () => {
    render(<TextComparisonPage />)
    const oversized = 'a'.repeat(MAX_TEXT_LENGTH + 1)
    enterBothTexts(oversized, 'small')
    fireEvent.click(screen.getByRole('button', { name: 'Compare texts' }))

    expect(screen.getByRole('alert').textContent).toContain(
      'Your text is still here',
    )
    expect(screen.getByLabelText('Text 1 / Original').value).toBe(oversized)
    expect(screen.getByLabelText('Text 2 / Revised').value).toBe('small')
  })
})
