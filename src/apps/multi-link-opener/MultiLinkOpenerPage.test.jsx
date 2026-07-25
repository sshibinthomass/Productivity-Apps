import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MultiLinkOpenerPage from './MultiLinkOpenerPage.jsx'

describe('MultiLinkOpenerPage', () => {
  it('renders an accessible multiline link form in its empty state', () => {
    const markup = renderToStaticMarkup(<MultiLinkOpenerPage />)

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
