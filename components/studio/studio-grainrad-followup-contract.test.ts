import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')
const appStudioDir = join(process.cwd(), 'app', 'studio')

const grainradEffects = [
  'ASCII',
  'Dithering',
  'Halftone',
  'Matrix Rain',
  'Dots',
  'Contour',
  'Pixel Sort',
  'Blockify',
  'Threshold',
  'Edge Detection',
  'Crosshatch',
  'Wave Lines',
  'Noise Field',
  'Voronoi',
  'VHS',
]

const characterSetOptions = [
  'STANDARD',
  'BLOCKS',
  'BINARY',
  'DETAILED',
  'MINIMAL',
  'ALPHABETIC',
  'NUMERIC',
  'MATH',
  'SYMBOLS',
  'CUSTOM',
]

const liveDropdownOptionLabels = [
  'Atkinson',
  'Jarvis-Judice-Ninke',
  'Stucki',
  'Burkes',
  'Sierra Two-Row',
  'Sierra Lite',
  'Bayer 16x16',
  'Clustered Dot',
  'Blue Noise',
  'Interleaved Gradient',
  'Crosshatch',
  '16x16 (Very Fine)',
  'Line',
  'Hexagonal Grid',
  'Diagonal',
  'Shaded',
  'Grayscale',
  'Worley',
  'Darkened',
  'Center Sample',
  'Gradient',
]

describe('Phase 5D Grainrad follow-up parity contract', () => {
  it('matches Grainrad left panel catalogue and replaces Presets with Animation', async () => {
    const leftPanel = await readFile(join(studioDir, 'StudioLeftPanel.tsx'), 'utf8')
    const mobileTabs = await readFile(join(studioDir, 'StudioMobileTabs.tsx'), 'utf8')
    const effects = await readFile(join(studioDir, 'grainrad-effects.ts'), 'utf8')

    for (const effect of grainradEffects) {
      expect(effects).toContain(effect)
    }

    expect(leftPanel).toContain('StudioAnimationPanel')
    expect(leftPanel).toContain('Animation')
    expect(leftPanel).not.toContain('Presets')
    expect(leftPanel).not.toContain('StudioPresetsPanel')
    expect(mobileTabs).toContain('Animation')
    expect(mobileTabs).not.toContain('Presets')
  })

  it('uses Grainrad Character Set dropdown options instead of a native select', async () => {
    const terminalRows = await readFile(join(studioDir, 'TerminalRows.tsx'), 'utf8')
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')
    const store = await readFile(join(appStudioDir, 'studio-store.ts'), 'utf8')
    const effects = await readFile(join(studioDir, 'grainrad-effects.ts'), 'utf8')

    expect(terminalRows).toContain('TerminalDropdownRow')
    expect(terminalRows).toContain('dropdownMenu')
    expect(terminalRows).toContain('selectedMark')
    expect(rightPanel).toContain('TerminalDropdownRow')
    expect(rightPanel).toContain('Character Set')
    expect(rightPanel).not.toContain('TerminalSelectRow')

    for (const option of characterSetOptions) {
      expect(store).toContain(option.toLowerCase())
      expect(rightPanel).toContain(option)
      expect(effects).toContain(option)
    }

    expect(rightPanel).toContain('Custom Chars')
    expect(rightPanel).toContain("ascii.charsetStyle === 'custom'")
  })

  it('matches Grainrad settings labels and adds section reset', async () => {
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')

    expect(rightPanel).toContain('action={<button')
    expect(rightPanel).toContain('Reset')
    expect(rightPanel).toContain('Spacing')
    expect(rightPanel).toContain('Output Width')
    expect(rightPanel).toContain('Hue Rotation')
    expect(rightPanel).toContain('label="Mode"')
    expect(rightPanel).toContain("readStringControl(effectControls, 'color-mode', 'mono')")
    expect(rightPanel).not.toContain('label="Color Mode"')
    expect(rightPanel).toContain('label="Foreground"')
    expect(rightPanel).toContain('Background')
    expect(rightPanel).toContain('Intensity')
    expect(rightPanel).not.toContain('Density')
  })

  it('keeps Motion and Transform controls in the left Animation section only', async () => {
    const leftPanel = await readFile(join(studioDir, 'StudioLeftPanel.tsx'), 'utf8')
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')

    expect(leftPanel).toContain('label="Y Rotate"')
    expect(leftPanel).toContain('label="X Rotate"')
    expect(leftPanel).toContain('label="Depth"')
    expect(leftPanel).toContain('label="Scale"')
    expect(leftPanel).toContain('Reset Transform')

    for (const animationOnlyLabel of [
      'Motion',
      'Transform',
      'Y Rotate',
      'X Rotate',
      'Depth',
      'Auto Spin',
      'Spin',
      'Reset Transform',
    ]) {
      expect(rightPanel).not.toContain(animationOnlyLabel)
    }
  })

  it('includes Grainrad effect setting groups for Processing and Post-Processing parity', async () => {
    const effects = await readFile(join(studioDir, 'grainrad-effects.ts'), 'utf8')
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')

    expect(effects).toContain('Dithering')
    expect(effects).toContain('Algorithm')
    expect(effects).toContain('Chromatic Effects')
    expect(effects).toContain('Halftone')
    expect(effects).toContain('Dot Scale')
    expect(effects).toContain('VHS')
    expect(effects).toContain('Tracking Error')
    expect(effects).toContain('Grain')
    expect(effects).toContain("rangeControl('grain-intensity', 'Intensity'")
    expect(effects).not.toContain("'Grain Intensity'")
    for (const optionLabel of liveDropdownOptionLabels) {
      expect(effects).toContain(optionLabel)
    }
    expect(rightPanel).toContain('selectedEffectId')
    expect(rightPanel).toContain('renderEffectSettings')
  })

  it('gates GIF and MP4 export formats behind enabled animation', async () => {
    const exportPanel = await readFile(join(studioDir, 'StudioExportPanel.tsx'), 'utf8')
    const store = await readFile(join(appStudioDir, 'studio-store.ts'), 'utf8')

    expect(store).toContain("'gif'")
    expect(store).toContain("'mp4'")
    expect(exportPanel).toContain('animation.playing')
    expect(exportPanel).toContain('GIF')
    expect(exportPanel).toContain('MP4')
    expect(exportPanel).toContain('High quality image')
    expect(exportPanel).not.toContain('High quality WebGL canvas export')
    expect(exportPanel).toContain('captureAnimationLoop')
  })
})
