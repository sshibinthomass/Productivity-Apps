import { describe, expect, it } from 'vitest'
import {
  assertAuthenticated,
  parseCreateInput,
  parseEventInput,
  sanitizeSnapshot,
  validatePublishableDraft,
} from './domain.js'

describe('function domain validation', () => {
  it('requires authentication for management actions', () => {
    expect(() => assertAuthenticated(null)).toThrowError(
      expect.objectContaining({ code: 'unauthenticated' }),
    )
    expect(assertAuthenticated({ uid: 'user-1' })).toBe('user-1')
  })

  it('accepts a valid site creation request', () => {
    expect(
      parseCreateInput({
        name: 'Maya Studio',
        slug: 'maya-studio',
        templateId: 'creator',
      }),
    ).toEqual({
      name: 'Maya Studio',
      slug: 'maya-studio',
      templateId: 'creator',
    })
  })

  it.each([
    [{ name: '', slug: 'maya-studio', templateId: 'creator' }],
    [{ name: 'Maya', slug: 'ab', templateId: 'creator' }],
    [{ name: 'Maya', slug: 'admin', templateId: 'creator' }],
    [{ name: 'Maya', slug: 'maya-studio', templateId: 'unknown' }],
  ])('rejects invalid site creation input', (input) => {
    expect(() => parseCreateInput(input)).toThrowError(
      expect.objectContaining({ code: 'invalid-argument' }),
    )
  })

  it('accepts only supported analytics events', () => {
    expect(
      parseEventInput({
        slug: 'maya-studio',
        type: 'link_click',
        blockId: 'block-1',
        eventId: 'event-12345678',
      }),
    ).toEqual({
      slug: 'maya-studio',
      type: 'link_click',
      blockId: 'block-1',
      eventId: 'event-12345678',
    })
    expect(() =>
      parseEventInput({
        slug: 'maya-studio',
        type: 'signup',
        eventId: 'event-12345678',
      }),
    ).toThrowError(expect.objectContaining({ code: 'invalid-argument' }))
  })

  it('sanitizes a draft into an allowlisted public snapshot', () => {
    const snapshot = sanitizeSnapshot({
      siteId: 'site-1',
      slug: 'maya-studio',
      draftRevision: 3,
      blocks: [
        {
          id: 'link-1',
          type: 'link',
          visible: true,
          content: {
            label: 'Portfolio',
            url: 'https://example.com',
            supportingText: '',
            icon: '',
            secret: 'remove',
          },
        },
        {
          id: 'hidden',
          type: 'paragraph',
          visible: false,
          content: { text: 'private draft note' },
        },
      ],
      theme: {
        background: { type: 'solid', value: '#ffffff' },
        colors: { text: '#000000' },
        injected: 'remove',
      },
      seo: {
        title: 'Maya Studio',
        description: 'Selected work',
        socialImagePath: null,
        secret: 'remove',
      },
      ownerEmail: 'private@example.com',
    })

    expect(snapshot).toEqual({
      schemaVersion: 1,
      siteId: 'site-1',
      slug: 'maya-studio',
      revision: 3,
      blocks: [
        {
          id: 'link-1',
          type: 'link',
          visible: true,
          content: {
            label: 'Portfolio',
            url: 'https://example.com/',
            supportingText: '',
            icon: '',
          },
        },
      ],
      theme: {
        background: {
          type: 'solid',
          value: '#ffffff',
          secondary: '#ffffff',
          imageUrl: '',
        },
        colors: {
          text: '#000000',
          muted: '#4d6265',
          button: '#081d21',
          buttonText: '#ffffff',
          buttonBorder: '#081d21',
        },
        fonts: { display: 'Sora Variable', body: 'Inter Variable' },
        layout: {
          alignment: 'center',
          width: 'medium',
          density: 'comfortable',
        },
        button: { style: 'solid', radius: 16, shadow: 'soft' },
        profile: { shape: 'circle', size: 'medium' },
      },
      seo: {
        title: 'Maya Studio',
        description: 'Selected work',
        socialImagePath: null,
      },
    })
    expect(snapshot.ownerEmail).toBeUndefined()
  })

  it('rejects incomplete visible blocks before publishing', () => {
    expect(() =>
      validatePublishableDraft({
        name: 'Maya Studio',
        slug: 'maya-studio',
        blocks: [
          {
            id: 'link-1',
            type: 'link',
            visible: true,
            content: { label: 'Portfolio', url: '' },
          },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: 'invalid-argument' }))
  })
})
