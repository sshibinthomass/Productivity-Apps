import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DiffResult from './DiffResult.jsx'

const differentResult = {
  status: 'different',
  mode: 'words',
  addedCount: 1,
  removedCount: 1,
  rows: [
    {
      id: 'row-1',
      changed: true,
      left: {
        placeholder: false,
        segments: [
          { type: 'unchanged', value: 'Hello ' },
          { type: 'removed', value: 'world' },
        ],
      },
      right: {
        placeholder: false,
        segments: [
          { type: 'unchanged', value: 'Hello ' },
          { type: 'added', value: 'team' },
        ],
      },
    },
  ],
}

describe('DiffResult', () => {
  it('renders summary, legends, and semantic changes', () => {
    render(<DiffResult result={differentResult} />)

    expect(
      screen.getByRole('heading', { name: 'Differences found' }),
    ).toBeTruthy()
    expect(screen.getByText('1 added')).toBeTruthy()
    expect(screen.getByText('1 removed')).toBeTruthy()
    expect(screen.getByText('Word comparison')).toBeTruthy()
    expect(screen.getByText('Added')).toBeTruthy()
    expect(screen.getByText('Removed')).toBeTruthy()
    expect(screen.getByText('world').tagName).toBe('DEL')
    expect(screen.getByText('team').tagName).toBe('INS')
  })

  it('provides a keyboard-focusable comparison region', () => {
    render(<DiffResult result={differentResult} />)

    expect(
      screen.getByRole('region', {
        name: 'Side-by-side comparison results',
      }).tabIndex,
    ).toBe(0)
  })

  it('labels an empty aligned side without rendering fake text', () => {
    const result = {
      ...differentResult,
      rows: [
        {
          id: 'row-1',
          changed: true,
          left: { placeholder: true, segments: [] },
          right: {
            placeholder: false,
            segments: [{ type: 'added', value: 'new line' }],
          },
        },
      ],
    }

    render(<DiffResult result={result} />)

    expect(
      screen.getByLabelText('No corresponding line in Text 1'),
    ).toBeTruthy()
    expect(screen.getByText('new line').tagName).toBe('INS')
  })

  it('announces identical input and keeps the unchanged text visible', () => {
    render(
      <DiffResult
        result={{
          status: 'identical',
          mode: 'characters',
          addedCount: 0,
          removedCount: 0,
          rows: [
            {
              id: 'row-1',
              changed: false,
              left: {
                placeholder: false,
                segments: [{ type: 'unchanged', value: 'same' }],
              },
              right: {
                placeholder: false,
                segments: [{ type: 'unchanged', value: 'same' }],
              },
            },
          ],
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'No differences found' }),
    ).toBeTruthy()
    expect(screen.getByText('Character comparison')).toBeTruthy()
    expect(screen.getAllByText('same')).toHaveLength(2)
  })
})
