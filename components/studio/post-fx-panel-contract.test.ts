import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components/studio')

describe('PostFxPanel contract', () => {
  it('exposes compact Post FX rows with intensity and effect schema', async () => {
    const panelSource = await readFile(join(studioDir, 'PostFxPanel.tsx'), 'utf8')
    const controlsSource = await readFile(join(studioDir, 'StudioControls.tsx'), 'utf8')

    expect(controlsSource).toContain("value: 'post'")
    expect(panelSource).toContain('postFx.layers')
    expect(panelSource).toContain('PostFxLayerRow')
    expect(panelSource).toContain('Intensity')
    expect(panelSource).toContain('Noise')
    expect(panelSource).toContain('Bloom')
    expect(panelSource).toContain('Vignette')
    expect(panelSource).toContain('Brightness / Contrast')
    expect(panelSource).toContain('Hue / Saturation')
  })
})
