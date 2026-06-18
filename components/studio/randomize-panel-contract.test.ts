import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components/studio')

describe('RandomizePanel contract', () => {
  it('adds family-scoped randomization controls to StudioControls', async () => {
    const controlsSource = await readFile(join(studioDir, 'StudioControls.tsx'), 'utf8')
    const panelSource = await readFile(join(studioDir, 'RandomizePanel.tsx'), 'utf8')

    expect(controlsSource).toContain('RandomizePanel')
    expect(controlsSource).toContain("value: 'randomize'")
    expect(panelSource).toContain('randomSeed')
    expect(panelSource).toContain('randomizeMorphPreset')
    expect(panelSource).toContain('includeExperimental')
    expect(panelSource).toContain('presetId')
    expect(panelSource).toContain('Graphite Relief')
    expect(panelSource).toContain('Chrome Glass')
    expect(panelSource).toContain('families')
    expect(panelSource).toContain('morph')
    expect(panelSource).toContain('shaders')
    expect(panelSource).toContain('patterns')
  })
})
