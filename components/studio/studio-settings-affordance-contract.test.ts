import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Studio Settings affordances', () => {
  it('does not present static setting groups as collapsible', async () => {
    const terminalRows = await readFile(join(studioDir, 'TerminalRows.tsx'), 'utf8')

    expect(terminalRows).not.toContain('groupChevron')
    expect(terminalRows).not.toContain('⌄')
  })
})
