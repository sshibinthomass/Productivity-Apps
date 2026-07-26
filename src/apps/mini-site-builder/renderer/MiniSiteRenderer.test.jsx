import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MiniSiteRenderer } from './MiniSiteRenderer.jsx'

function createSite() {
  return {
    slug: 'maya-studio',
    theme: {
      background: {
        type: 'gradient',
        value: '#ffffff',
        secondary: '#d8f8f2',
        imageUrl: '',
      },
      colors: {
        text: '#081d21',
        muted: '#4d6265',
        button: '#081d21',
        buttonText: '#ffffff',
        buttonBorder: '#081d21',
      },
      fonts: { display: 'Sora Variable', body: 'Inter Variable' },
      layout: { alignment: 'left', width: 'medium', density: 'comfortable' },
      button: { style: 'solid', radius: 16, shadow: 'soft' },
      profile: { shape: 'circle', size: 'medium' },
    },
    seo: { title: 'Maya Studio', description: '' },
    blocks: [
      {
        id: 'profile',
        type: 'profile',
        visible: true,
        content: {
          avatarUrl: 'https://images.example/avatar.webp',
          displayName: 'Maya Studio',
          bio: 'Objects with a quiet pulse.',
          alt: 'Maya in her studio',
        },
      },
      {
        id: 'heading',
        type: 'heading',
        visible: true,
        content: { text: 'Selected work', level: 2 },
      },
      {
        id: 'paragraph',
        type: 'paragraph',
        visible: true,
        content: { text: '<strong>Plain text only</strong>' },
      },
      {
        id: 'image',
        type: 'image',
        visible: true,
        content: {
          url: 'https://images.example/work.webp',
          alt: 'Blue ceramic vessel',
          caption: 'Form study',
          decorative: false,
        },
      },
      {
        id: 'link',
        type: 'link',
        visible: true,
        content: {
          label: 'Portfolio',
          url: 'https://example.com/work',
          supportingText: 'Selected projects',
          icon: '',
        },
      },
      {
        id: 'socials',
        type: 'socials',
        visible: true,
        content: {
          links: [
            {
              network: 'instagram',
              label: 'Instagram',
              url: 'https://instagram.com/maya',
            },
          ],
        },
      },
      {
        id: 'divider',
        type: 'divider',
        visible: true,
        content: { style: 'solid', width: 'full' },
      },
      {
        id: 'spacer',
        type: 'spacer',
        visible: true,
        content: { size: 'medium' },
      },
      {
        id: 'hidden',
        type: 'paragraph',
        visible: false,
        content: { text: 'Do not render' },
      },
    ],
  }
}

describe('MiniSiteRenderer', () => {
  it('renders all supported visible blocks as semantic plain content', () => {
    const { container } = render(<MiniSiteRenderer site={createSite()} />)

    expect(screen.getByRole('heading', { name: 'Maya Studio', level: 1 }))
      .toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Selected work', level: 2 }))
      .toBeTruthy()
    expect(screen.getByAltText('Maya in her studio')).toBeTruthy()
    expect(screen.getByAltText('Blue ceramic vessel')).toBeTruthy()
    expect(screen.getByText('Form study')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Portfolio/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Instagram' })).toBeTruthy()
    expect(screen.queryByText('Do not render')).toBeNull()
    expect(
      container.querySelector('.mini-site__paragraph strong'),
    ).toBeNull()
    expect(screen.getByText('<strong>Plain text only</strong>')).toBeTruthy()
    expect(container.querySelector('.mini-site__divider')).toBeTruthy()
    expect(container.querySelector('.mini-site__spacer')).toBeTruthy()
  })

  it('uses safe external-link attributes and reports the clicked block', () => {
    const onLinkClick = vi.fn()
    render(
      <MiniSiteRenderer site={createSite()} onLinkClick={onLinkClick} />,
    )

    const link = screen.getByRole('link', { name: /Portfolio/ })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    fireEvent.click(link)
    expect(onLinkClick).toHaveBeenCalledWith('link')
  })

  it('drops unsafe destinations and arbitrary theme keys', () => {
    const site = createSite()
    site.blocks[4].content.url = 'javascript:alert(1)'
    site.theme['--danger'] = 'url(javascript:alert(1))'
    const { container } = render(<MiniSiteRenderer site={site} />)

    expect(screen.queryByRole('link', { name: /Portfolio/ })).toBeNull()
    expect(container.firstChild.style.getPropertyValue('--danger')).toBe('')
    expect(container.firstChild.style.getPropertyValue('--mini-text')).toBe(
      '#081d21',
    )
  })
})
