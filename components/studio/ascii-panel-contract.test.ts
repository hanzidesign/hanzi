import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Phase 5C ASCII panel contract', () => {
  it('adds ASCII and ASCII Style controls to the right workbench panel', async () => {
    const controlsSource = await readFile(join(studioDir, 'StudioControls.tsx'), 'utf8')
    const asciiPanelSource = await readFile(join(studioDir, 'AsciiPanel.tsx'), 'utf8')
    const asciiStylePanelSource = await readFile(join(studioDir, 'AsciiStylePanel.tsx'), 'utf8')

    expect(controlsSource).toContain('AsciiPanel')
    expect(controlsSource).toContain('AsciiStylePanel')
    expect(controlsSource).toContain("title: 'ASCII'")
    expect(controlsSource).toContain("title: 'ASCII Style'")
    expect(controlsSource).toContain("placement: 'right'")
    expect(asciiPanelSource).toContain('setAsciiControl')
    expect(asciiPanelSource).toContain('cellSize')
    expect(asciiPanelSource).toContain('density')
    expect(asciiPanelSource).toContain('contrast')
    expect(asciiStylePanelSource).toContain('charsetStyle')
    expect(asciiStylePanelSource).toContain('palette')
    expect(asciiStylePanelSource).toContain('scanlineAmount')
  })
})
