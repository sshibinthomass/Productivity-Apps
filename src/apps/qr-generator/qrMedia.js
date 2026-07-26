const MAX_LOGO_SIZE = 5 * 1024 * 1024
const LOGO_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])

export function validateLogoFile(file) {
  if (!LOGO_TYPES.has(file?.type)) {
    return {
      valid: false,
      error: 'Choose a PNG, JPEG, WebP, GIF, or SVG image.',
    }
  }

  if (file.size > MAX_LOGO_SIZE) {
    return {
      valid: false,
      error: 'Choose an image no larger than 5 MB.',
    }
  }

  return { valid: true, error: '' }
}

export function sanitizeSvgText(text) {
  const activeContent =
    /<\s*(?:script|foreignObject)\b|on[a-z]+\s*=|(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|\/\/)|url\(\s*["']?\s*(?:https?:|\/\/)/i

  if (activeContent.test(text)) {
    throw new Error('SVG contains active or external content.')
  }

  return text
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The image could not be decoded.'))
    image.src = source
  })
}

async function rasterizeInBrowser(blob) {
  const objectUrl = URL.createObjectURL(blob)

  try {
    const image = await loadImage(objectUrl)
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight)

    if (!longestSide) {
      throw new Error('The image has no readable dimensions.')
    }

    const scale = Math.min(1, 1024 / longestSide)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('This browser cannot process the image.')
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function processLogoFile(
  file,
  { rasterize = rasterizeInBrowser } = {},
) {
  const validation = validateLogoFile(file)

  if (!validation.valid) {
    throw new Error(validation.error)
  }

  let source = file

  if (file.type === 'image/svg+xml') {
    const sanitized = sanitizeSvgText(await file.text())
    source = new Blob([sanitized], { type: 'image/svg+xml' })
  }

  return rasterize(source)
}

export function createExportFilename(type, extension, date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `arvenilo-qr-${type}-${year}-${month}-${day}.${extension}`
}
