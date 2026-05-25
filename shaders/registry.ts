import type { ShaderPreset } from './types'
import { validateShaderPreset } from './validation'
import gridPulsePreset from './presets/grid-pulse/preset'
import kaleidoscopeNoisePreset from './presets/kaleidoscope-noise/preset'
import flowingNoisePreset from './presets/flowing-noise/preset'
import defaultVertexShaderSource from './shared/default-vertex.glsl'

const builtInShaderPresets: ShaderPreset[] = [
  flowingNoisePreset,
  kaleidoscopeNoisePreset,
  gridPulsePreset,
]

validateShaderPresetRegistry(builtInShaderPresets)

export const defaultVertexShader = defaultVertexShaderSource

export const shaderPresets: readonly ShaderPreset[] = builtInShaderPresets

export function getShaderPresetById(presetId: string) {
  return shaderPresets.find((preset) => preset.id === presetId)
}

export function getDefaultShaderPreset() {
  return shaderPresets[0]
}

function validateShaderPresetRegistry(presets: ShaderPreset[]) {
  const presetIds = new Set<string>()

  for (const preset of presets) {
    validateShaderPreset(preset)

    if (presetIds.has(preset.id)) {
      throw new Error(`Shader preset registry contains duplicate id "${preset.id}".`)
    }

    presetIds.add(preset.id)
  }
}
