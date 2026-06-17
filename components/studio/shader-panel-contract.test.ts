import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components/studio')

describe('ShaderPanel Character Surface contract', () => {
  it('controls active Surface Shader state instead of legacy shader presets', async () => {
    const source = await readFile(join(studioDir, 'ShaderPanel.tsx'), 'utf8')
    const pickerSource = await readFile(join(studioDir, 'GradientColorPicker.tsx'), 'utf8')

    expect(source).toContain('surfaceShaders.foreground')
    expect(source).toContain('surfaceShaders.background')
    expect(source).toContain('setSurfaceShaderLayer')
    expect(source).toContain('GradientColorPicker')
    expect(source).toContain("allowGradient={layerId === 'foreground'}")
    expect(source).toContain('onModeChange')
    expect(source).toContain('onGradientSettingsChange')
    expect(pickerSource).toContain('react-best-gradient-color-picker')
    expect(pickerSource).toContain('parseGradientCssSettings')
    expect(source).not.toContain('SegmentedControl')
    expect(source).not.toContain('foregroundStyleOptions')
    expect(source).not.toContain('selectedPresetId')
    expect(source).not.toContain('setSelectedPreset')
    expect(source).not.toContain('shaderPresets')
  })
})
