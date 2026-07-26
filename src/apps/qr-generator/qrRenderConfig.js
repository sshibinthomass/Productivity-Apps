export const DEFAULT_QR_DESIGN = Object.freeze({
  foreground: '#081D21',
  background: '#FFFFFF',
  transparent: false,
  dotStyle: 'rounded',
  outerCornerStyle: 'extra-rounded',
  innerCornerStyle: 'dot',
  size: 512,
  quietZone: 4,
  errorCorrection: 'M',
  logoDataUrl: '',
  logoScale: 0.2,
  logoPlate: true,
})

const DOT_STYLES = new Set([
  'square',
  'rounded',
  'dots',
  'classy-rounded',
])
const OUTER_CORNER_STYLES = new Set(['square', 'dot', 'extra-rounded'])
const INNER_CORNER_STYLES = new Set(['square', 'dot'])
const ERROR_CORRECTION_LEVELS = new Set(['L', 'M', 'Q', 'H'])

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function normalizeQrDesign(design = DEFAULT_QR_DESIGN) {
  const size = Number(design.size)
  const quietZone = Number(design.quietZone)
  const logoScale = Number(design.logoScale)

  return {
    ...DEFAULT_QR_DESIGN,
    ...design,
    size: clamp(Number.isFinite(size) ? Math.round(size) : 512, 128, 4096),
    quietZone: clamp(
      Number.isFinite(quietZone) ? Math.round(quietZone) : 4,
      4,
      12,
    ),
    logoScale: clamp(
      Number.isFinite(logoScale) ? logoScale : 0.2,
      0.1,
      0.25,
    ),
    dotStyle: DOT_STYLES.has(design.dotStyle)
      ? design.dotStyle
      : DEFAULT_QR_DESIGN.dotStyle,
    outerCornerStyle: OUTER_CORNER_STYLES.has(design.outerCornerStyle)
      ? design.outerCornerStyle
      : DEFAULT_QR_DESIGN.outerCornerStyle,
    innerCornerStyle: INNER_CORNER_STYLES.has(design.innerCornerStyle)
      ? design.innerCornerStyle
      : DEFAULT_QR_DESIGN.innerCornerStyle,
    errorCorrection: ERROR_CORRECTION_LEVELS.has(design.errorCorrection)
      ? design.errorCorrection
      : DEFAULT_QR_DESIGN.errorCorrection,
  }
}

export function createQrOptions(payload, design = DEFAULT_QR_DESIGN) {
  const normalized = normalizeQrDesign(design)
  const margin = Math.round(
    (normalized.size * normalized.quietZone) / 45,
  )
  const options = {
    type: 'svg',
    width: normalized.size,
    height: normalized.size,
    data: payload,
    margin,
    qrOptions: {
      typeNumber: 0,
      mode: 'Byte',
      errorCorrectionLevel: normalized.errorCorrection,
    },
    dotsOptions: {
      color: normalized.foreground,
      type: normalized.dotStyle,
      roundSize: true,
    },
    cornersSquareOptions: {
      color: normalized.foreground,
      type: normalized.outerCornerStyle,
    },
    cornersDotOptions: {
      color: normalized.foreground,
      type: normalized.innerCornerStyle,
    },
    backgroundOptions: {
      color: normalized.transparent
        ? '#00000000'
        : normalized.background,
    },
  }

  if (normalized.logoDataUrl) {
    options.image = normalized.logoDataUrl
    options.imageOptions = {
      imageSize: normalized.logoScale,
      hideBackgroundDots: true,
      margin: normalized.logoPlate
        ? Math.max(2, Math.round(normalized.size * 0.012))
        : 0,
      saveAsBlob: true,
      crossOrigin: 'anonymous',
    }
  }

  return options
}
