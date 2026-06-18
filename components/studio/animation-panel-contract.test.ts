import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components/studio')

describe('AnimationPanel contract', () => {
  it('exposes freeze-safe animation controls in StudioControls', async () => {
    const panelSource = await readFile(join(studioDir, 'AnimationPanel.tsx'), 'utf8')
    const controlsSource = await readFile(join(studioDir, 'StudioControls.tsx'), 'utf8')

    expect(controlsSource).toContain("value: 'animation'")
    expect(panelSource).toContain('animation.playing')
    expect(panelSource).toContain('animation.speed')
    expect(panelSource).toContain('timeOffset')
    expect(panelSource).toContain('animateMorph')
    expect(panelSource).toContain('animateShaders')
    expect(panelSource).toContain('animatePatterns')
    expect(panelSource).toContain('animatePost')
  })
})
