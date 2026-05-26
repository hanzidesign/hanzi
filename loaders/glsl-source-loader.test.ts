import { createRequire } from 'node:module'

import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

describe('glsl source loader', () => {
  it('emits shader text as a JavaScript default export', () => {
    const loadGlslSource = require('./glsl-source-loader.cjs') as (
      source: string | Buffer,
    ) => string
    const source = 'uniform float u_time;\nvoid main() {}\n'

    expect(loadGlslSource(source)).toBe(
      `const source = ${JSON.stringify(source)}\nexport default source\n`,
    )
  })

  it('normalizes buffer loader input before emitting source', () => {
    const loadGlslSource = require('./glsl-source-loader.cjs') as (
      source: string | Buffer,
    ) => string
    const source = 'void main() {\n  gl_FragColor = vec4(1.0);\n}\n'

    expect(loadGlslSource(Buffer.from(source))).toBe(
      `const source = ${JSON.stringify(source)}\nexport default source\n`,
    )
  })
})
