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
  '45°',
  '-45°',
  'Radial',
  'Shaded',
  'Worley',
]

describe('Phase 5D Grainrad follow-up parity contract', () => {
  it('matches the generated-image Input, Effects, and Presets catalogue', async () => {
    const leftPanel = await readFile(join(studioDir, 'StudioLeftPanel.tsx'), 'utf8')
    const mobileTabs = await readFile(join(studioDir, 'StudioMobileTabs.tsx'), 'utf8')
    const effects = await readFile(join(studioDir, 'grainrad-effects.ts'), 'utf8')

    for (const effect of grainradEffects) {
      expect(effects).toContain(effect)
    }

    expect(leftPanel).toContain('StudioMotionPanel')
    expect(leftPanel).toContain('3D Motion')
    expect(leftPanel).toContain('Presets')
    expect(leftPanel).not.toContain('StudioPresetsPanel')
    expect(mobileTabs).not.toContain("id: 'animation'")
  })

  it('uses Grainrad Character Set dropdown options instead of a native select', async () => {
    const terminalRows = await readFile(join(studioDir, 'TerminalRows.tsx'), 'utf8')
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')
    const store = await readFile(join(appStudioDir, 'studio-store.ts'), 'utf8')
    const effects = await readFile(join(studioDir, 'grainrad-effects.ts'), 'utf8')

    expect(terminalRows).toContain('TerminalDropdownRow')
    expect(terminalRows).toContain('dropdownMenu')
    expect(terminalRows).toContain('aria-selected={option.value === value}')
    expect(terminalRows).not.toContain('selectedMark')
    expect(terminalRows).toContain('IoChevronDownOutline')
    expect(terminalRows).toContain('IoChevronUpOutline')
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

  it('keeps Model geometry separate from generated-image 3D Motion controls', async () => {
    const leftPanel = await readFile(join(studioDir, 'StudioLeftPanel.tsx'), 'utf8')
    const rightPanel = await readFile(join(studioDir, 'StudioRightPanel.tsx'), 'utf8')

    expect(leftPanel.indexOf('CharacterPanel')).toBeLessThan(leftPanel.indexOf('StudioModelPanel'))
    expect(leftPanel.indexOf('StudioModelPanel')).toBeLessThan(leftPanel.indexOf('StudioMotionPanel'))
    expect(leftPanel).toContain('label="Extrude"')
    expect(leftPanel).toContain('label="Thickness"')
    expect(leftPanel).toContain('label="Bevel"')
    expect(leftPanel).toContain('label="Twist"')
    expect(leftPanel).toContain('label="Taper"')
    expect(leftPanel).toContain('label="Bend"')
    expect(leftPanel).toContain('label="X"')
    expect(leftPanel).toContain('label="Y"')
    expect(leftPanel).toContain('label="Z"')
    expect(leftPanel).not.toContain('label="Depth"')
    expect(leftPanel).toContain('label="Speed"')

    for (const animationOnlyLabel of [
      'Motion',
      '3D Motion',
      'label="X"',
      'label="Y"',
      'label="Z"',
      'Depth',
      'Speed',
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

  it('exports one motion-speed-driven loop at each required frame rate', async () => {
    const exportPanel = await readFile(join(studioDir, 'StudioExportPanel.tsx'), 'utf8')
    const exportAnimation = await readFile(join(studioDir, 'export-animation.ts'), 'utf8')
    const store = await readFile(join(appStudioDir, 'studio-store.ts'), 'utf8')

    expect(store).toContain("'apng'")
    expect(store).toContain("'gif'")
    expect(store).toContain("'mp4'")
    expect(exportPanel).toContain('createExportAnimationPlan')
    expect(exportPanel).toContain('initialMesh.autoRotateSpeed')
    expect(exportAnimation).toContain('apng: 24')
    expect(exportAnimation).toContain('gif: 12')
    expect(exportAnimation).toContain('mp4: 30')
    expect(exportPanel).toContain('APNG')
    expect(exportPanel).toContain('GIF')
    expect(exportPanel).toContain('MP4')
    expect(exportPanel).not.toContain("label: 'JPG'")
    expect(exportPanel).not.toContain("label: 'WEBP'")
    expect(exportPanel).not.toContain("label: 'SVG'")
    expect(exportPanel).not.toContain("label: 'COPY'")
    expect(exportPanel).not.toContain('High quality image')
    expect(exportPanel).toContain('captureAnimationLoop')
  })
})
