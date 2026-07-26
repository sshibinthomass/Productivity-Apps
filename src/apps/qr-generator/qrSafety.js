function hexToRgb(hex) {
  const normalized = String(hex).replace('#', '')
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => character.repeat(2))
          .join('')
      : normalized.slice(0, 6)

  if (!/^[\da-f]{6}$/i.test(expanded)) {
    return { red: 0, green: 0, blue: 0 }
  }

  return {
    red: Number.parseInt(expanded.slice(0, 2), 16),
    green: Number.parseInt(expanded.slice(2, 4), 16),
    blue: Number.parseInt(expanded.slice(4, 6), 16),
  }
}

function relativeLuminance(hex) {
  const channels = Object.values(hexToRgb(hex)).map((channel) => {
    const value = channel / 255
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  })

  return (
    channels[0] * 0.2126 +
    channels[1] * 0.7152 +
    channels[2] * 0.0722
  )
}

function contrastRatio(first, second) {
  const light = Math.max(first, second)
  const dark = Math.min(first, second)
  return (light + 0.05) / (dark + 0.05)
}

export function analyzeQrSafety({ design, byteLength }) {
  const issues = []
  const foregroundLuminance = relativeLuminance(design.foreground)
  const backgroundLuminance = relativeLuminance(design.background)
  const contrast = contrastRatio(
    foregroundLuminance,
    backgroundLuminance,
  )

  if (contrast < 3) {
    issues.push({
      code: 'low-contrast',
      severity: 'risk',
      message: 'Increase contrast between the modules and background.',
    })
  } else if (contrast < 4.5) {
    issues.push({
      code: 'moderate-contrast',
      severity: 'review',
      message: 'More contrast will improve scanning in difficult light.',
    })
  }

  if (!design.transparent && foregroundLuminance >= backgroundLuminance) {
    issues.push({
      code: 'light-modules',
      severity: 'risk',
      message: 'Use dark modules on a lighter background.',
    })
  }

  if (Number(design.quietZone) < 4) {
    issues.push({
      code: 'quiet-zone',
      severity: 'risk',
      message: 'Keep at least four clear modules around the code.',
    })
  }

  if (design.logoDataUrl && Number(design.logoScale) > 0.25) {
    issues.push({
      code: 'logo-size',
      severity: 'risk',
      message: 'Reduce the logo to 25% of the QR width or less.',
    })
  }

  if (design.logoDataUrl && design.errorCorrection !== 'H') {
    issues.push({
      code: 'logo-correction',
      severity: 'review',
      message: 'Use high error correction when a logo covers modules.',
    })
  }

  if (design.transparent) {
    issues.push({
      code: 'transparent-background',
      severity: 'review',
      message: 'Place transparent exports on a plain, light surface.',
    })
  }

  if (
    byteLength > 1400 &&
    Number(design.size) < 512
  ) {
    issues.push({
      code: 'dense-output',
      severity: 'risk',
      message: 'Increase output size for this dense payload.',
    })
  } else if (byteLength > 700 && Number(design.size) < 512) {
    issues.push({
      code: 'dense-output',
      severity: 'review',
      message: 'A larger output will make this payload easier to scan.',
    })
  }

  if (byteLength > 500 && design.dotStyle === 'classy-rounded') {
    issues.push({
      code: 'decorative-density',
      severity: 'review',
      message: 'Use simpler modules for a dense payload.',
    })
  }

  const level = issues.some(({ severity }) => severity === 'risk')
    ? 'risk'
    : issues.length > 0
      ? 'review'
      : 'strong'

  return {
    level,
    label:
      level === 'risk' ? 'At risk' : level === 'review' ? 'Review' : 'Strong',
    issues,
  }
}
