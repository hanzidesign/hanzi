import type { ShaderPreset } from '../../types'
import fragmentShader from './fragment.glsl'

const gridPulsePreset: ShaderPreset = {
  id: 'grid-pulse',
  name: 'Grid Pulse',
  category: 'Grid Pulse',
  fragmentShader,
  shaderPath: 'shaders/presets/grid-pulse/fragment.glsl',
  usesDisplacementMap: false,
  params: [
    {
      type: 'number',
      id: 'density',
      uniformName: 'u_density',
      label: 'Density',
      default: 18,
      min: 4,
      max: 48,
      step: 1,
    },
    {
      type: 'number',
      id: 'pulseSpeed',
      uniformName: 'u_pulseSpeed',
      label: 'Pulse speed',
      default: 1.4,
      min: 0,
      max: 5,
      step: 0.01,
    },
    {
      type: 'number',
      id: 'dotSize',
      uniformName: 'u_dotSize',
      label: 'Dot size',
      default: 0.26,
      min: 0.05,
      max: 0.45,
      step: 0.01,
    },
    {
      type: 'boolean',
      id: 'invertGrid',
      uniformName: 'u_invertGrid',
      label: 'Invert',
      default: false,
    },
    {
      type: 'color',
      id: 'foreground',
      uniformName: 'u_foreground',
      label: 'Foreground',
      default: '#f8fafc',
    },
    {
      type: 'color',
      id: 'background',
      uniformName: 'u_background',
      label: 'Background',
      default: '#0f172a',
    },
  ],
}

export default gridPulsePreset
