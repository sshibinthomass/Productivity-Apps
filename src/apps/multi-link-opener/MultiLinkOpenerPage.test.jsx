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
    expect(markup).toContain('Open links')
    expect(markup).toContain('disabled=""')
  })
})
