import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components/studio')

describe('PatternLayerPanel contract', () => {
  it('replaces the empty Pattern Layers accordion with active row controls', async () => {
    const controlsSource = await readFile(join(studioDir, 'StudioControls.tsx'), 'utf8')
    const panelSource = await readFile(join(studioDir, 'PatternLayerPanel.tsx'), 'utf8')

    expect(controlsSource).toContain('PatternLayerPanel')
    expect(controlsSource).not.toContain("{ value: 'pattern', title: 'Pattern Layers', content: null }")
    expect(panelSource).toContain('patternLayers')
    expect(panelSource).toContain('addPatternLayer')
    expect(panelSource).toContain('updatePatternLayer')
    expect(panelSource).toContain('removePatternLayer')
    expect(panelSource).toContain('reorderPatternLayer')
    expect(panelSource).toContain('setPatternLayerLocked')
    expect(panelSource).toContain('enabled')
    expect(panelSource).toContain('intensity')
    expect(panelSource).toContain('blendMode')
    expect(panelSource).toContain('target')
    expect(panelSource).toContain('Move Pattern Layer Up')
    expect(panelSource).toContain('Move Pattern Layer Down')
  })
})
