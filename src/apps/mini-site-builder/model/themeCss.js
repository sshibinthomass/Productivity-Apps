const color = (value, fallback) =>
  /^#[0-9a-f]{6}$/i.test(value ?? '') ? value : fallback

export function themeToCssVariables(theme = {}) {
  const background = theme.background ?? {}
  const colors = theme.colors ?? {}
  const fonts = theme.fonts ?? {}
  const layout = theme.layout ?? {}
  const button = theme.button ?? {}
  const profile = theme.profile ?? {}

  return {
    '--mini-bg': color(background.value, '#f4fbfa'),
    '--mini-bg-secondary': color(
      background.secondary,
      color(background.value, '#f4fbfa'),
    ),
    '--mini-background-image':
      background.type === 'image' && background.imageUrl
        ? `url("${String(background.imageUrl).replaceAll('"', '%22')}")`
        : 'none',
    '--mini-text': color(colors.text, '#081d21'),
    '--mini-muted': color(colors.muted, '#4d6265'),
    '--mini-button': color(colors.button, '#081d21'),
    '--mini-button-text': color(colors.buttonText, '#ffffff'),
    '--mini-button-border': color(colors.buttonBorder, '#081d21'),
    '--mini-display-font': `"${fonts.display ?? 'Sora Variable'}"`,
    '--mini-body-font': `"${fonts.body ?? 'Inter Variable'}"`,
    '--mini-align': ['left', 'center'].includes(layout.alignment)
      ? layout.alignment
      : 'center',
    '--mini-content-width': {
      narrow: '30rem',
      medium: '40rem',
      wide: '52rem',
    }[layout.width] ?? '40rem',
    '--mini-gap': {
      compact: '0.65rem',
      comfortable: '1rem',
      spacious: '1.5rem',
    }[layout.density] ?? '1rem',
    '--mini-button-radius': `${Math.min(
      999,
      Math.max(0, Number(button.radius) || 0),
    )}px`,
    '--mini-profile-radius': profile.shape === 'square' ? '18%' : '50%',
    '--mini-profile-size': {
      small: '4.5rem',
      medium: '6rem',
      large: '8rem',
    }[profile.size] ?? '6rem',
  }
}
