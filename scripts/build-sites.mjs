import { build } from 'vite'

process.env.SITES_BUILD = 'true'

await build()
