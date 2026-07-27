import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const roots = ['src', 'worker', '.github/workflows']
const files = ['package.json']
const patterns = [
  /firebase\//i,
  /firebase-functions/i,
  /firebase-admin/i,
  /VITE_FIREBASE_/,
]

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) await collect(target)
    else files.push(target)
  }
}

for (const root of roots) await collect(root)
const matches = []
for (const file of files) {
  const text = await readFile(file, 'utf8')
  if (patterns.some((pattern) => pattern.test(text))) matches.push(file)
}
if (matches.length) {
  console.error(matches.join('\n'))
  process.exitCode = 1
}
