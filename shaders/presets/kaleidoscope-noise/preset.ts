import type { ShaderPreset } from '../../types'
import fragmentShader from './fragment.glsl'

const kaleidoscopeNoisePreset: ShaderPreset = {
  id: 'kaleidoscope-noise',
  name: 'Kaleidoscope Noise',
  category: 'Kaleidoscope',
  fragmentShader,
  shaderPath: 'shaders/presets/kaleidoscope-noise/fragment.glsl',
  usesDisplacementMap: false,
  params: [
    {
      type: 'select',
      id: 'segments',
      uniformName: 'u_segments',
      label: 'Segments',
      default: 'six',
      options: [
        { id: 'four', label: '4', value: 4 },
        { id: 'six', label: '6', value: 6 },
        { id: 'eight', label: '8', value: 8 },
        { id: 'twelve', label: '12', value: 12 },
      ],
    },
    {
      type: 'number',
      id: 'spinSpeed',
      uniformName: 'u_spinSpeed',
      label: 'Spin speed',
      default: 0.8,
      min: 0,
      max: 4,
      step: 0.01,
    },
    {
      type: 'number',
      id: 'detail',
      uniformName: 'u_detail',
      label: 'Detail',
      default: 18,
      min: 4,
      max: 42,
      step: 0.5,
    },
    {
      type: 'number',
      id: 'softness',
      uniformName: 'u_softness',
      label: 'Edge softness',
      default: 0.18,
      min: 0.05,
      max: 0.7,
      step: 0.01,
    },
    {
      type: 'color',
      id: 'tint',
      uniformName: 'u_tint',
      label: 'Tint',
      default: '#a78bfa',
    },
  ],
}

export default kaleidoscopeNoisePreset
