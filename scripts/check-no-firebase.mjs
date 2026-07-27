import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const directoryRoots = ['src', 'worker', '.github/workflows', 'build', 'scripts']
const fileRoots = [
  'package.json',
  'package-lock.json',
  '.env.example',
  '.dev.vars.example',
  'vite.config.js',
  'wrangler.jsonc',
]
const ignoredDirectories = new Set(['node_modules', 'dist', '.git', '.wrangler'])
const ignoredFiles = new Set([
  'scripts/check-no-firebase.mjs',
  'scripts/check-no-firebase.test.js',
])
const patterns = [
  /(?:from\s+|import\s+|import\s*\(\s*|require\s*\()\s*['"](?:@firebase|firebase)(?:\/[^'"]*)?['"]/i,
  /['"](?:@firebase|firebase)(?:\/[^'"]*)?['"]\s*:/i,
  /['"]node_modules\/(?:@firebase(?:\/[^'"]*)?|firebase)['"]/i,
  /\bfirebase-(?:functions|admin)\b/i,
  /\b(?:VITE_)?FIREBASE_[A-Z0-9_]*\b/i,
  /\b(?:firebaseConfig|firebaseapp\.com|firebasestorage\.app)\b/i,
]

function toRepositoryPath(target) {
  return target.split(path.sep).join('/')
}

function isIgnored(target) {
  if (ignoredFiles.has(toRepositoryPath(target))) return true
  return target.split(path.sep).some((segment) => ignoredDirectories.has(segment))
}

async function collect(cwd, directory, files) {
  let entries
  try {
    entries = await readdir(path.join(cwd, directory), { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }

  for (const entry of entries) {
    const target = path.join(directory, entry.name)
    if (isIgnored(target)) continue
    if (entry.isDirectory()) await collect(cwd, target, files)
    else files.add(toRepositoryPath(target))
  }
}

async function readIfPresent(cwd, target) {
  try {
    return await readFile(path.join(cwd, target), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export async function findFirebaseReferences({ cwd = process.cwd() } = {}) {
  const files = new Set(fileRoots)
  for (const directory of directoryRoots) await collect(cwd, directory, files)

  const matches = []
  for (const file of [...files].sort()) {
    if (isIgnored(file)) continue
    const text = await readIfPresent(cwd, file)
    if (text !== null && patterns.some((pattern) => pattern.test(text))) matches.push(file)
  }
  return matches
}

async function main() {
  const matches = await findFirebaseReferences()
  if (matches.length) {
    console.error(matches.join('\n'))
    process.exitCode = 1
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
