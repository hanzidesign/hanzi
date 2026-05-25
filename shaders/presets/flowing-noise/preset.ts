import type { ShaderPreset } from '../../types'
import fragmentShader from './fragment.glsl'

const flowingNoisePreset: ShaderPreset = {
  id: 'flowing-noise',
  name: 'Flowing Noise',
  category: 'Organic Flow',
  fragmentShader,
  shaderPath: 'shaders/presets/flowing-noise/fragment.glsl',
  usesDisplacementMap: false,
  params: [
    {
      type: 'number',
      id: 'flowSpeed',
      uniformName: 'u_flowSpeed',
      label: 'Flow speed',
      default: 0.45,
      min: 0,
      max: 2,
      step: 0.01,
    },
    {
      type: 'number',
      id: 'noiseScale',
      uniformName: 'u_noiseScale',
      label: 'Noise scale',
      default: 5,
      min: 1,
      max: 16,
      step: 0.1,
    },
    {
      type: 'number',
      id: 'contrast',
      uniformName: 'u_contrast',
      label: 'Contrast',
      default: 1.2,
      min: 0.25,
      max: 2.5,
      step: 0.01,
    },
    {
      type: 'color',
      id: 'colorA',
      uniformName: 'u_colorA',
      label: 'Color A',
      default: '#22d3ee',
    },
    {
      type: 'color',
      id: 'colorB',
      uniformName: 'u_colorB',
      label: 'Color B',
      default: '#f43f5e',
    },
  ],
}

export default flowingNoisePreset
