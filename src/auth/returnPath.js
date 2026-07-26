export function getSafeReturnPath(value) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /^\/login(?:[/?#]|$)/.test(value)
  ) {
    return '/'
  }

  return value
}
