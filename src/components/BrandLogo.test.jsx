import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import BrandLogo from './BrandLogo.jsx'

describe('BrandLogo', () => {
  it('renders the approved Arvenilo Network identity accessibly', () => {
    const markup = renderToStaticMarkup(<BrandLogo />)

    expect(markup).toContain('alt="Arvenilo Network"')
    expect(markup).toContain('arvenilo-network-lockup.png')
  })

  it('supports the compact approved symbol', () => {
    const markup = renderToStaticMarkup(<BrandLogo variant="symbol" />)

    expect(markup).toContain('arvenilo-network-symbol.png')
  })
})
