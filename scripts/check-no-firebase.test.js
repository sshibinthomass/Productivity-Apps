import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import * as guard from './check-no-firebase.mjs'

const workspaces = []

async function fixture(files) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'no-firebase-'))
  workspaces.push(directory)

  await Promise.all(
    Object.entries(files).map(async ([relativePath, content]) => {
      const target = path.join(directory, relativePath)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, content)
    }),
  )

  return directory
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('Firebase removal guard', () => {
  it('rejects Firebase package specifiers and configuration markers in active surfaces', async () => {
    expect(guard.findFirebaseReferences).toBeTypeOf('function')

    const directory = await fixture({
      'src/client.js': "import { initializeApp } from 'firebase'",
      'worker/src/index.js': "import 'firebase/functions'",
      '.github/workflows/deploy.yml': 'VITE_FIREBASE_API_KEY: value',
      'build/plugin.js': "import 'firebase-admin'",
      'scripts/deploy.mjs': "import 'firebase-functions'",
      'package.json': '{"dependencies":{"firebase":"1.0.0"}}',
      'package-lock.json': '{"packages":{"":{"dependencies":{"firebase":"1.0.0"}}}}',
      '.env.example': 'VITE_FIREBASE_PROJECT_ID=project',
      '.dev.vars.example': 'FIREBASE_PROJECT_ID=project',
      'vite.config.js': 'const firebaseConfig = {}',
      'wrangler.jsonc': 'https://example.firebaseapp.com',
    })

    await expect(guard.findFirebaseReferences({ cwd: directory })).resolves.toEqual(
      expect.arrayContaining([
        'src/client.js',
        'worker/src/index.js',
        '.github/workflows/deploy.yml',
        'build/plugin.js',
        'scripts/deploy.mjs',
        'package.json',
        'package-lock.json',
        '.env.example',
        '.dev.vars.example',
        'vite.config.js',
        'wrangler.jsonc',
      ]),
    )
  })

  it('excludes historical, generated, dependency, and guard-test files', async () => {
    expect(guard.findFirebaseReferences).toBeTypeOf('function')

    const directory = await fixture({
      'docs/migration-history.md': "import 'firebase'",
      'dist/app.js': "import 'firebase'",
      'node_modules/firebase/index.js': "import 'firebase'",
      'scripts/check-no-firebase.mjs': "import 'firebase'",
      'scripts/check-no-firebase.test.js': "import 'firebase'",
      'package.json': '{"name":"fixture"}',
    })

    await expect(guard.findFirebaseReferences({ cwd: directory })).resolves.toEqual([])
  })
})
