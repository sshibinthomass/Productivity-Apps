function pad(value) {
  return String(value).padStart(2, '0')
}

export function createJsonFilename(date = new Date()) {
  const datePart = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-')
  const timePart = [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')

  return `formatted-${datePart}-${timePart}.json`
}

export function downloadJson(
  text,
  {
    date = new Date(),
    documentRef = document,
    urlApi = URL,
    BlobCtor = Blob,
  } = {},
) {
  const filename = createJsonFilename(date)
  const blob = new BlobCtor([text], { type: 'application/json' })
  const objectUrl = urlApi.createObjectURL(blob)
  const anchor = documentRef.createElement('a')

  anchor.href = objectUrl
  anchor.download = filename
  anchor.style.display = 'none'
  documentRef.body.append(anchor)

  try {
    anchor.click()
  } finally {
    anchor.remove()
    urlApi.revokeObjectURL(objectUrl)
  }

  return filename
}
