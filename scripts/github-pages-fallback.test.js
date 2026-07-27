import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { expect, it } from 'vitest'

it('redirects a deep link through the GitHub Pages repository root', () => {
  const document = readFileSync(resolve('public/404.html'), 'utf8')
  const script = document.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  const redirects = []

  vm.runInNewContext(script, {
    window: {
      location: {
        pathname: '/Productivity-Apps/mini-sites/new',
        search: '?template=creator',
        hash: '#details',
        replace(url) {
          redirects.push(url)
        },
      },
    },
  })

  expect(redirects).toEqual([
    '/Productivity-Apps/?route=%2FProductivity-Apps%2Fmini-sites%2Fnew%3Ftemplate%3Dcreator%23details',
  ])
})
