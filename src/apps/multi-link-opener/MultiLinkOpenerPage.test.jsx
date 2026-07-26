import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MultiLinkOpenerPage, { ResultPanel } from './MultiLinkOpenerPage.jsx'

describe('MultiLinkOpenerPage', () => {
  it('renders an accessible multiline link form in its empty state', () => {
    const markup = renderToStaticMarkup(<MultiLinkOpenerPage />)

    expect(markup).toContain('Arvenilo Network')
    expect(markup).toContain('Multi Link Opener')
    expect(markup).toContain('Open every link in one controlled pass.')
    expect(markup.indexOf('class="link-form"')).toBeLessThan(
      markup.indexOf('class="link-guide"'),
    )
    expect(markup).toContain('for="link-list"')
    expect(markup).toContain('id="link-list"')
    expect(markup).toContain('<textarea')
    expect(markup).toContain('One link per line')
    expect(markup).toContain('for="link-delay"')
    expect(markup).toContain('id="link-delay"')
    expect(markup).toContain('type="number"')
    expect(markup).toContain('min="0"')
    expect(markup).toContain('max="60"')
    expect(markup).toContain('step="1"')
    expect(markup).toContain('value="0"')
    expect(markup).toContain('First link opens immediately')
    expect(markup).toContain('Open links')
    expect(markup).toContain('disabled=""')
  })

})

describe('ResultPanel', () => {
  it('explains invalid entries and adjusted links', () => {
    const result = {
      validUrls: ['https://example.com/'],
      invalidEntries: [
        { value: 'person@example.com', reason: 'email-address' },
      ],
      adjustedEntries: [
        { original: 'example.com', normalized: 'https://example.com/' },
      ],
      duplicateCount: 0,
      entryCount: 2,
      limitError: null,
      openedCount: 1,
      blockedCount: 0,
      delaySeconds: 0,
    }

    const markup = renderToStaticMarkup(<ResultPanel result={result} />)

    expect(markup).toContain('person@example.com')
    expect(markup).toContain(
      'This looks like an email address, not a web link.',
    )
    expect(markup).toContain('Adjusted 1 link')
    expect(markup).toContain('example.com')
    expect(markup).toContain('changed to')
    expect(markup).toContain('https://example.com/')
    expect(markup).toContain('<details')
  })

  it('shows the limit error in a warning panel without opened tabs', () => {
    const result = {
      validUrls: [],
      invalidEntries: [],
      adjustedEntries: [],
      duplicateCount: 0,
      entryCount: 101,
      limitError: 'You can open up to 100 links at a time.',
      openedCount: 0,
      blockedCount: 0,
      delaySeconds: 0,
    }

    const markup = renderToStaticMarkup(<ResultPanel result={result} />)

    expect(markup).toContain('You can open up to 100 links at a time.')
    expect(markup).toContain('result-panel--warning')
    expect(markup).toContain('No links opened')
  })

  it('uses the generic message for an unknown invalid reason', () => {
    const result = {
      validUrls: [],
      invalidEntries: [{ value: 'invalid', reason: 'unknown-reason' }],
      adjustedEntries: [],
      duplicateCount: 0,
      entryCount: 1,
      limitError: null,
      openedCount: 0,
      blockedCount: 0,
      delaySeconds: 0,
    }

    const markup = renderToStaticMarkup(<ResultPanel result={result} />)

    expect(markup).toContain('This is not a valid web address.')
  })
})
