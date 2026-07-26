import { diffChars, diffLines, diffWordsWithSpace } from 'diff'

export const MAX_TEXT_LENGTH = 100_000

const MODES = new Set(['words', 'characters'])

function splitChunkLines(value) {
  const withoutFinalNewline = value.endsWith('\n') ? value.slice(0, -1) : value

  return withoutFinalNewline.split('\n')
}

function changedTokenCount(value, mode) {
  if (mode === 'characters') {
    return Array.from(value).length
  }

  return value.match(/[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]/gu)?.length ?? 0
}

function compareLine(leftValue, rightValue, mode) {
  const parts =
    mode === 'characters'
      ? diffChars(leftValue, rightValue)
      : diffWordsWithSpace(leftValue, rightValue)

  return {
    left: parts
      .filter((part) => !part.added)
      .map((part) => ({
        type: part.removed ? 'removed' : 'unchanged',
        value: part.value,
      })),
    right: parts
      .filter((part) => !part.removed)
      .map((part) => ({
        type: part.added ? 'added' : 'unchanged',
        value: part.value,
      })),
  }
}

function unchangedRows(value) {
  return splitChunkLines(value).map((line) => ({
    changed: false,
    left: {
      placeholder: false,
      segments: [{ type: 'unchanged', value: line }],
    },
    right: {
      placeholder: false,
      segments: [{ type: 'unchanged', value: line }],
    },
  }))
}

function changedRows(removedLines, addedLines, mode) {
  const rowCount = Math.max(removedLines.length, addedLines.length)

  return Array.from({ length: rowCount }, (_, index) => {
    const removedLine = removedLines[index]
    const addedLine = addedLines[index]

    if (removedLine === undefined) {
      return {
        changed: true,
        left: { placeholder: true, segments: [] },
        right: {
          placeholder: false,
          segments: [{ type: 'added', value: addedLine }],
        },
      }
    }

    if (addedLine === undefined) {
      return {
        changed: true,
        left: {
          placeholder: false,
          segments: [{ type: 'removed', value: removedLine }],
        },
        right: { placeholder: true, segments: [] },
      }
    }

    const segments = compareLine(removedLine, addedLine, mode)

    return {
      changed: true,
      left: { placeholder: false, segments: segments.left },
      right: { placeholder: false, segments: segments.right },
    }
  })
}

function alignRows(original, revised, mode) {
  const changes = diffLines(original, revised, { stripTrailingCr: true })
  const rows = []

  for (let index = 0; index < changes.length; index += 1) {
    const change = changes[index]

    if (!change.added && !change.removed) {
      rows.push(...unchangedRows(change.value))
      continue
    }

    const removedLines = []
    const addedLines = []

    while (
      index < changes.length &&
      (changes[index].added || changes[index].removed)
    ) {
      const changedBlock = changes[index]
      const target = changedBlock.removed ? removedLines : addedLines
      target.push(...splitChunkLines(changedBlock.value))
      index += 1
    }

    index -= 1
    rows.push(...changedRows(removedLines, addedLines, mode))
  }

  return rows.map((row, index) => ({
    id: `row-${index + 1}`,
    ...row,
  }))
}

function countChanges(rows, mode, type) {
  return rows.reduce((total, row) => {
    const side = type === 'removed' ? row.left : row.right

    return (
      total +
      side.segments.reduce(
        (sideTotal, segment) =>
          sideTotal +
          (segment.type === type
            ? changedTokenCount(segment.value, mode)
            : 0),
        0,
      )
    )
  }, 0)
}

export function compareTexts(original, revised, mode) {
  if (!MODES.has(mode)) {
    throw new TypeError('Comparison mode must be words or characters.')
  }

  if (
    original.length > MAX_TEXT_LENGTH ||
    revised.length > MAX_TEXT_LENGTH
  ) {
    throw new RangeError('Each text must be 100,000 characters or fewer.')
  }

  const rows = alignRows(original, revised, mode)

  return {
    status: original === revised ? 'identical' : 'different',
    mode,
    rows,
    addedCount: countChanges(rows, mode, 'added'),
    removedCount: countChanges(rows, mode, 'removed'),
  }
}
