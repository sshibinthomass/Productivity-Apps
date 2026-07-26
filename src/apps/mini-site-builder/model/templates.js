const creatorTheme = {
  background: {
    type: 'gradient',
    value: '#e9e5ff',
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
  layout: { alignment: 'center', width: 'medium', density: 'comfortable' },
  button: { style: 'solid', radius: 16, shadow: 'soft' },
  profile: { shape: 'circle', size: 'medium' },
}

const profileBlock = (displayName, bio) => ({
  type: 'profile',
  visible: true,
  content: { avatarUrl: '', displayName, bio, alt: '' },
})

const linkBlock = (label, url = '') => ({
  type: 'link',
  visible: true,
  content: { label, url, supportingText: '', icon: '' },
})

export const TEMPLATES = [
  {
    id: 'creator',
    name: 'Creator',
    description: 'Friendly color and generous rounded links.',
    theme: creatorTheme,
    blocks: [
      profileBlock('Your name', 'Creator, maker, and curious human.'),
      linkBlock('My latest work'),
      linkBlock('Say hello'),
    ],
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Editorial hierarchy with room for selected work.',
    theme: {
      ...creatorTheme,
      background: {
        type: 'solid',
        value: '#f4fbfa',
        secondary: '#f4fbfa',
        imageUrl: '',
      },
      colors: {
        text: '#081d21',
        muted: '#4d6265',
        button: '#ffffff',
        buttonText: '#081d21',
        buttonBorder: '#9bb5b2',
      },
      layout: { alignment: 'left', width: 'wide', density: 'spacious' },
      button: { style: 'outline', radius: 8, shadow: 'none' },
    },
    blocks: [
      profileBlock('Your portfolio', 'Selected work and useful links.'),
      { type: 'heading', visible: true, content: { text: 'Selected work', level: 2 } },
      linkBlock('View project'),
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Quiet neutrals and compact outlined controls.',
    theme: {
      ...creatorTheme,
      background: {
        type: 'solid',
        value: '#ffffff',
        secondary: '#ffffff',
        imageUrl: '',
      },
      colors: {
        text: '#162326',
        muted: '#667477',
        button: '#ffffff',
        buttonText: '#162326',
        buttonBorder: '#cad6d4',
      },
      layout: { alignment: 'center', width: 'narrow', density: 'compact' },
      button: { style: 'outline', radius: 999, shadow: 'none' },
    },
    blocks: [
      profileBlock('Your name', 'A short introduction goes here.'),
      linkBlock('Featured link'),
    ],
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'High contrast, oversized type, and sharp geometry.',
    theme: {
      ...creatorTheme,
      background: {
        type: 'solid',
        value: '#171033',
        secondary: '#171033',
        imageUrl: '',
      },
      colors: {
        text: '#ffffff',
        muted: '#c9c1ed',
        button: '#f4b942',
        buttonText: '#171033',
        buttonBorder: '#f4b942',
      },
      layout: { alignment: 'left', width: 'wide', density: 'comfortable' },
      button: { style: 'solid', radius: 2, shadow: 'strong' },
      profile: { shape: 'square', size: 'large' },
    },
    blocks: [
      profileBlock('Make it unmistakable', 'Put the strongest idea first.'),
      linkBlock('Explore the work'),
    ],
  },
  {
    id: 'blank',
    name: 'Start from scratch',
    description: 'Neutral foundations with every design control available.',
    theme: {
      ...creatorTheme,
      background: {
        type: 'solid',
        value: '#f4fbfa',
        secondary: '#f4fbfa',
        imageUrl: '',
      },
    },
    blocks: [profileBlock('', ''), linkBlock('')],
  },
]

export function getTemplate(templateId) {
  return TEMPLATES.find(({ id }) => id === templateId) ??
    TEMPLATES.find(({ id }) => id === 'blank')
}

export function cloneTemplate(templateId) {
  return structuredClone(getTemplate(templateId))
}
