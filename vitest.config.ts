import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  plugins: [
    {
      name: 'raw-glsl-loader',
      async load(id) {
        if (!id.endsWith('.glsl')) {
          return null
        }

        const source = await readFile(id, 'utf8')

        return `export default ${JSON.stringify(source)}`
      },
    },
  ],
})
