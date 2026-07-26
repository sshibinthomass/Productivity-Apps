export const JSON_SAMPLE = `{
  "app": "JSON Formatter",
  "version": 1,
  "features": [
    "live formatting",
    "safe repair",
    "deep repair"
  ],
  "settings": {
    "repairMode": "safe",
    "indentation": 2
  },
  "ready": true
}`

const REPAIR_MESSAGES = {
  comments: 'Removed JavaScript-style comments.',
  'single-quotes': 'Converted single-quoted strings to JSON strings.',
  'unquoted-keys': 'Added quotes around object keys.',
  'python-literals': 'Converted True, False, and None to JSON values.',
  'trailing-commas': 'Removed trailing commas.',
  'missing-commas': 'Inserted missing commas between adjacent values.',
  'closing-delimiters': 'Completed unambiguous braces and brackets.',
}

function normalizeIndent(indent) {
  const numericIndent = Number(indent)
  return numericIndent === 4 ? 4 : 2
}

function coordinatesFromPosition(text, position) {
  const safePosition = Math.max(0, Math.min(position, text.length))
  const beforeError = text.slice(0, safePosition)
  const lines = beforeError.split('\n')

  return {
    line: lines.length,
    column: lines.at(-1).length + 1,
    position: safePosition,
  }
}

function positionFromCoordinates(text, line, column) {
  const lines = text.split('\n')
  let position = 0

  for (let index = 0; index < Math.max(0, line - 1); index += 1) {
    position += (lines[index]?.length ?? 0) + 1
  }

  return Math.min(text.length, position + Math.max(0, column - 1))
}

function locateJsonError(error, text) {
  const rawMessage = error instanceof Error ? error.message : String(error)
  const positionMatch = rawMessage.match(/position\s+(\d+)/i)
  const coordinatesMatch = rawMessage.match(
    /line\s+(\d+)\s+column\s+(\d+)/i,
  )
  const line = coordinatesMatch ? Number(coordinatesMatch[1]) : null
  const column = coordinatesMatch ? Number(coordinatesMatch[2]) : null
  const position = positionMatch
    ? Number(positionMatch[1])
    : line && column
      ? positionFromCoordinates(text, line, column)
      : text.length
  const coordinates = coordinatesFromPosition(text, position)
  const message =
    rawMessage
      .replace(/\s+in JSON at position\s+\d+.*$/i, '')
      .replace(/\s+at position\s+\d+.*$/i, '')
      .replace(/\s+\(line\s+\d+\s+column\s+\d+\).*$/i, '')
      .trim() || 'JSON syntax is invalid.'

  return {
    message,
    line: line ?? coordinates.line,
    column: column ?? coordinates.column,
    position,
  }
}

export function parseJson(text, indent = 2) {
  if (!text.trim()) {
    return {
      status: 'empty',
      value: null,
      formatted: '',
      error: null,
    }
  }

  try {
    const value = JSON.parse(text)

    return {
      status: 'valid',
      value,
      formatted: JSON.stringify(value, null, normalizeIndent(indent)),
      error: null,
    }
  } catch (error) {
    return {
      status: 'invalid',
      value: null,
      formatted: '',
      error: locateJsonError(error, text),
    }
  }
}

function transformComments(text) {
  let output = ''
  let quote = null
  let escaped = false
  let changed = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const next = text[index + 1]

    if (quote) {
      output += character

      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === quote) {
        quote = null
      }

      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      output += character
      continue
    }

    if (character === '/' && next === '/') {
      changed = true
      index += 2

      while (index < text.length && text[index] !== '\n') {
        index += 1
      }

      if (index < text.length) {
        output += '\n'
      }

      continue
    }

    if (character === '/' && next === '*') {
      changed = true
      index += 2

      while (
        index < text.length &&
        !(text[index] === '*' && text[index + 1] === '/')
      ) {
        output += text[index] === '\n' ? '\n' : ' '
        index += 1
      }

      if (index < text.length) {
        index += 1
      }

      continue
    }

    output += character
  }

  return { text: output, changed }
}

function transformSingleQuotedStrings(text) {
  let output = ''
  let changed = false
  let inDoubleString = false
  let escaped = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (inDoubleString) {
      output += character

      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inDoubleString = false
      }

      continue
    }

    if (character === '"') {
      inDoubleString = true
      output += character
      continue
    }

    if (character !== "'") {
      output += character
      continue
    }

    changed = true
    output += '"'

    for (index += 1; index < text.length; index += 1) {
      const stringCharacter = text[index]
      const next = text[index + 1]

      if (stringCharacter === '\\' && next === "'") {
        output += "'"
        index += 1
      } else if (stringCharacter === '\\') {
        output += stringCharacter

        if (next !== undefined) {
          output += next
          index += 1
        }
      } else if (stringCharacter === '"') {
        output += '\\"'
      } else if (stringCharacter === "'") {
        output += '"'
        break
      } else {
        output += stringCharacter
      }
    }
  }

  return { text: output, changed }
}

function transformUnquotedKeys(text) {
  let output = ''
  let inString = false
  let escaped = false
  let changed = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (inString) {
      output += character

      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }

      continue
    }

    if (character === '"') {
      inString = true
      output += character
      continue
    }

    if (character !== '{' && character !== ',') {
      output += character
      continue
    }

    output += character
    let cursor = index + 1

    while (/\s/.test(text[cursor] ?? '')) {
      output += text[cursor]
      cursor += 1
    }

    const identifierMatch = text
      .slice(cursor)
      .match(/^([A-Za-z_$][A-Za-z0-9_$-]*)/)

    if (!identifierMatch) {
      index = cursor - 1
      continue
    }

    const identifier = identifierMatch[1]
    let afterIdentifier = cursor + identifier.length

    while (/\s/.test(text[afterIdentifier] ?? '')) {
      afterIdentifier += 1
    }

    if (text[afterIdentifier] !== ':') {
      index = cursor - 1
      continue
    }

    changed = true
    output += `"${identifier}"`
    output += text.slice(cursor + identifier.length, afterIdentifier + 1)
    index = afterIdentifier
  }

  return { text: output, changed }
}

function transformPythonLiterals(text) {
  const replacements = {
    True: 'true',
    False: 'false',
    None: 'null',
  }
  let output = ''
  let inString = false
  let escaped = false
  let changed = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (inString) {
      output += character

      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }

      continue
    }

    if (character === '"') {
      inString = true
      output += character
      continue
    }

    const tokenMatch = text.slice(index).match(/^(True|False|None)\b/)

    if (!tokenMatch) {
      output += character
      continue
    }

    changed = true
    output += replacements[tokenMatch[1]]
    index += tokenMatch[1].length - 1
  }

  return { text: output, changed }
}

function transformTrailingCommas(text) {
  let output = ''
  let inString = false
  let escaped = false
  let changed = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (inString) {
      output += character

      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }

      continue
    }

    if (character === '"') {
      inString = true
      output += character
      continue
    }

    if (character === ',') {
      let cursor = index + 1

      while (/\s/.test(text[cursor] ?? '')) {
        cursor += 1
      }

      if (text[cursor] === '}' || text[cursor] === ']') {
        changed = true
        continue
      }
    }

    output += character
  }

  return { text: output, changed }
}

function delimiterStackAt(text, endPosition) {
  const stack = []
  let inString = false
  let escaped = false

  for (let index = 0; index < endPosition; index += 1) {
    const character = text[index]

    if (inString) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }

      continue
    }

    if (character === '"') {
      inString = true
    } else if (character === '{' || character === '[') {
      stack.push(character)
    } else if (
      (character === '}' && stack.at(-1) === '{') ||
      (character === ']' && stack.at(-1) === '[')
    ) {
      stack.pop()
    }
  }

  return stack
}

function canInsertComma(text, position) {
  let current = Math.max(0, Math.min(position, text.length - 1))

  while (current < text.length && /\s/.test(text[current])) {
    current += 1
  }

  let previous = current - 1

  while (previous >= 0 && /\s/.test(text[previous])) {
    previous -= 1
  }

  if (
    previous < 0 ||
    !text.slice(previous + 1, current).includes('\n') ||
    !['{', '['].includes(delimiterStackAt(text, current).at(-1))
  ) {
    return null
  }

  const previousCharacter = text[previous]
  const currentCharacter = text[current]
  const previousCompletesValue =
    /["}\]0-9eElL]/.test(previousCharacter) ||
    text.slice(Math.max(0, previous - 4), previous + 1).endsWith('true') ||
    text.slice(Math.max(0, previous - 5), previous + 1).endsWith('false') ||
    text.slice(Math.max(0, previous - 4), previous + 1).endsWith('null')
  const currentBeginsValue = /["{[0-9tfn-]/.test(currentCharacter)

  return previousCompletesValue && currentBeginsValue ? previous + 1 : null
}

function transformMissingCommas(text) {
  let output = text
  let changed = false

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const parsed = parseJson(output)

    if (parsed.status !== 'invalid') {
      break
    }

    const insertPosition = canInsertComma(output, parsed.error.position)

    if (insertPosition === null) {
      break
    }

    output = `${output.slice(0, insertPosition)},${output.slice(insertPosition)}`
    changed = true
  }

  return { text: output, changed }
}

function transformClosingDelimiters(text) {
  const stack = []
  let output = ''
  let inString = false
  let escaped = false
  let changed = false
  const closerFor = { '{': '}', '[': ']' }
  const openerFor = { '}': '{', ']': '[' }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (inString) {
      output += character

      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }

      continue
    }

    if (character === '"') {
      inString = true
      output += character
    } else if (character === '{' || character === '[') {
      stack.push(character)
      output += character
    } else if (character === '}' || character === ']') {
      if (stack.at(-1) === openerFor[character]) {
        stack.pop()
        output += character
      } else if (stack.includes(openerFor[character]) && stack.length > 0) {
        output += closerFor[stack.pop()]
        changed = true
      } else {
        output += character
      }
    } else {
      output += character
    }
  }

  if (!inString && stack.length > 0) {
    changed = true

    while (stack.length > 0) {
      output += closerFor[stack.pop()]
    }
  }

  return { text: output, changed }
}

function applyTransform(text, transform, code, repairs) {
  const result = transform(text)

  if (result.changed && !repairs.some((repair) => repair.code === code)) {
    repairs.push({ code, message: REPAIR_MESSAGES[code] })
  }

  return result.text
}

export function repairJson(text, mode = 'safe', indent = 2) {
  const originalResult = parseJson(text, indent)

  if (originalResult.status === 'empty') {
    return {
      success: false,
      text,
      value: null,
      repairs: [],
      error: null,
    }
  }

  if (originalResult.status === 'valid') {
    return {
      success: true,
      text: originalResult.formatted,
      value: originalResult.value,
      repairs: [],
      error: null,
    }
  }

  const repairs = []
  let candidate = text

  candidate = applyTransform(candidate, transformComments, 'comments', repairs)
  candidate = applyTransform(
    candidate,
    transformSingleQuotedStrings,
    'single-quotes',
    repairs,
  )
  candidate = applyTransform(
    candidate,
    transformUnquotedKeys,
    'unquoted-keys',
    repairs,
  )
  candidate = applyTransform(
    candidate,
    transformPythonLiterals,
    'python-literals',
    repairs,
  )
  candidate = applyTransform(
    candidate,
    transformTrailingCommas,
    'trailing-commas',
    repairs,
  )

  if (mode === 'deep') {
    candidate = applyTransform(
      candidate,
      transformMissingCommas,
      'missing-commas',
      repairs,
    )
    candidate = applyTransform(
      candidate,
      transformClosingDelimiters,
      'closing-delimiters',
      repairs,
    )
    candidate = applyTransform(
      candidate,
      transformMissingCommas,
      'missing-commas',
      repairs,
    )
  }

  const repairedResult = parseJson(candidate, indent)

  if (repairedResult.status === 'valid') {
    return {
      success: true,
      text: repairedResult.formatted,
      value: repairedResult.value,
      repairs,
      error: null,
    }
  }

  return {
    success: false,
    text,
    value: null,
    repairs,
    error: repairedResult.error,
  }
}
