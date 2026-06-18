import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components/studio')

describe('ShaderPanel Character Surface contract', () => {
  it('controls stackable Shader Layer rows through the effect registry', async () => {
    const source = await readFile(join(studioDir, 'ShaderPanel.tsx'), 'utf8')
    const pickerSource = await readFile(join(studioDir, 'GradientColorPicker.tsx'), 'utf8')

    expect(source).toContain('shaderLayers.layers')
    expect(source).toContain('getEffectDefinitionById')
    expect(source).toContain('ShaderLayerRow')
    expect(source).toContain('ShaderLayerDetailSurface')
    expect(source).toContain('selectedShaderLayerId')
    expect(source).toContain('addShaderLayer')
    expect(source).toContain('updateShaderLayer')
    expect(source).toContain('reorderShaderLayer')
    expect(source).toContain('setShaderLayerLocked')
    expect(source).toContain('Effect')
    expect(source).toContain('Intensity')
    expect(source).toContain('Blend')
    expect(source).toContain('surfaceShaders.foreground')
    expect(source).toContain('surfaceShaders.background')
    expect(source).toContain('setSurfaceShaderLayer')
    expect(source).toContain('GradientColorPicker')
    expect(source).toContain("allowGradient={layerId === 'foreground'}")
    expect(source).toContain('onModeChange')
    expect(source).toContain('onGradientSettingsChange')
    expect(source).toContain('Depth Strength')
    expect(source).toContain('Highlight')
    expect(source).toContain('Rim Light')
    expect(source).toContain('Edge Softness')
    expect(source).toContain('updateShaderParam')
    expect(source).not.toContain('<Stack gap="xl">')
    expect(pickerSource).toContain('react-best-gradient-color-picker')
    expect(pickerSource).toContain('parseGradientCssSettings')
    expect(source).not.toContain('SegmentedControl')
    expect(source).not.toContain('foregroundStyleOptions')
    expect(source).not.toContain('selectedPresetId')
    expect(source).not.toContain('setSelectedPreset')
    expect(source).not.toContain('shaderPresets')
  })
})
