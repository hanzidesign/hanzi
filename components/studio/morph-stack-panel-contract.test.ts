import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components/studio')

describe('MorphStackPanel contract', () => {
  it('replaces the empty Morph Stack accordion with active row controls', async () => {
    const controlsSource = await readFile(join(studioDir, 'StudioControls.tsx'), 'utf8')
    const panelSource = await readFile(join(studioDir, 'MorphStackPanel.tsx'), 'utf8')

    expect(controlsSource).toContain('MorphStackPanel')
    expect(controlsSource).not.toContain("{ value: 'morph', title: 'Morph Stack', content: null }")
    expect(panelSource).toContain('morphStack.layers')
    expect(panelSource).toContain('addMorphLayer')
    expect(panelSource).toContain('removeMorphLayer')
    expect(panelSource).toContain('reorderMorphLayer')
    expect(panelSource).toContain('replaceMorphStackLayers')
    expect(panelSource).toContain('updateMorphLayerParam')
    expect(panelSource).toContain('setMorphLayerLocked')
    expect(panelSource).toContain('enabled')
    expect(panelSource).toContain('intensity')
    expect(panelSource).toContain('definitionId')
    expect(panelSource).toContain('Move Morph Layer Up')
    expect(panelSource).toContain('Move Morph Layer Down')
  })
})
