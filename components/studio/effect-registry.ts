import type { LayerBlendMode } from './layer-compositing'

export type EffectStage =
  | 'pre-raster-vector'
  | 'coordinate-morph'
  | 'mask-morphology'
  | 'surface-height'
  | 'foreground-shader'
  | 'background-shader'
  | 'pattern-modulation'
  | 'post-surface'
  | 'feedback-simulation'

export type EffectRole =
  | 'source'
  | 'modifier'
  | 'material'
  | 'mask'
  | 'adjustment'
  | 'interactive'

export type EffectTier = 'stable' | 'experimental'

export type EffectVisibility = 'visible' | 'development-only'

export type EffectBuffer =
  | 'mask'
  | 'sdf'
  | 'edge'
  | 'height'
  | 'normal'
  | 'flow'
  | 'scatter'

export type ShaderLayerPrimitive =
  | 'time'
  | 'mouse'
  | 'resolution'
  | 'fbm-noise'
  | 'palette'
  | 'dither'
  | 'scanline'
  | 'channel-offset'
  | 'uv-refraction'
  | 'smoke-fire-aurora'
  | 'raymarching'

export type EffectPort =
  | 'color'
  | 'alpha'
  | 'uv'
  | 'sdf'
  | 'edge'
  | 'height'
  | 'normal'
  | 'flow'
  | 'pattern'
  | 'previousFrame'

export type EffectOutputPort = Exclude<EffectPort, 'previousFrame'>

export type CompositeBlendMode = LayerBlendMode | 'add' | 'subtract' | 'difference'

export type EffectDynamicPropDriver =
  | 'static'
  | 'time'
  | 'pointer'
  | 'pattern'
  | 'seeded-noise'

export type EffectParamDefinition =
  | {
      type: 'number'
      id: string
      label: string
      min: number
      max: number
      step: number
      unit?: string
    }
  | {
      type: 'boolean'
      id: string
      label: string
    }
  | {
      type: 'select'
      id: string
      label: string
      options: Array<{
        id: string
        label: string
      }>
    }

export type EffectParamValue = number | string | boolean

export type EffectRandomizeDefinition = {
  defaultEnabled: boolean
  params: Record<
    string,
    | {
        type: 'number'
        min: number
        max: number
        step?: number
      }
    | {
        type: 'select'
        options: string[]
      }
    | {
        type: 'boolean'
        probability: number
      }
  >
}

export type EffectDefinition = {
  id: string
  label: string
  family: 'morph' | 'shader' | 'pattern' | 'post' | 'animation'
  effectRole: EffectRole
  stage: EffectStage
  tier: EffectTier
  visibility: EffectVisibility
  requiredBuffers: EffectBuffer[]
  requiredPrimitives: ShaderLayerPrimitive[]
  inputPorts: EffectPort[]
  outputPorts: EffectOutputPort[]
  params: EffectParamDefinition[]
  defaults: Record<string, EffectParamValue>
  randomize: EffectRandomizeDefinition
  reactivity: {
    consumesTime: boolean
    consumesPointer: boolean
    consumesPattern: boolean
    consumesPreviousFrame: boolean
  }
  componentGraph?: {
    acceptsChildren: boolean
    supportsNesting: boolean
    blendModes: CompositeBlendMode[]
    maskModes: Array<'none' | 'alpha' | 'luminance' | 'sdf' | 'edge'>
    dynamicPropDrivers: EffectDynamicPropDriver[]
    supportsCustomSvgSdf: boolean
  }
  animation?: {
    supportsTime: boolean
    speedParam?: string
    phaseParam?: string
  }
  implementation: {
    source: 'custom' | 'lygia' | 'glslify' | 'postprocessing' | 'reference-only'
    shaderChunk?: string
    postEffect?: string
  }
}

type EffectDefinitionOverrides = Omit<Partial<EffectDefinition>, 'randomize'>

export const SHADER_LAYER_PRIMITIVES: readonly ShaderLayerPrimitive[] = [
  'time',
  'mouse',
  'resolution',
  'fbm-noise',
  'palette',
  'dither',
  'scanline',
  'channel-offset',
  'uv-refraction',
  'smoke-fire-aurora',
  'raymarching',
]

const componentGraphDefaults: EffectDefinition['componentGraph'] = {
  acceptsChildren: false,
  supportsNesting: false,
  blendModes: ['normal', 'multiply', 'screen', 'overlay', 'soft-light'],
  maskModes: ['none', 'alpha', 'sdf', 'edge'],
  dynamicPropDrivers: ['static', 'time', 'pointer', 'pattern', 'seeded-noise'],
  supportsCustomSvgSdf: true,
}

const builtInEffectDefinitions: EffectDefinition[] = [
  morphEffect({
    id: 'sine-bend',
    label: 'Sine Bend',
    stage: 'coordinate-morph',
    params: [
      numberParam('amplitude', 'Amplitude', 0, 0.7, 0.01),
      numberParam('frequency', 'Frequency', 0.5, 8, 0.1),
      numberParam('phase', 'Phase', 0, 1, 0.01),
    ],
    defaults: { amplitude: 0.18, frequency: 2.5, phase: 0 },
    randomize: {
      amplitude: { type: 'number', min: 0.05, max: 0.45 },
      frequency: { type: 'number', min: 1, max: 5 },
      phase: { type: 'number', min: 0, max: 1 },
    },
  }),
  morphEffect({
    id: 'ink-compression',
    label: 'Ink Compression',
    stage: 'mask-morphology',
    effectRole: 'mask',
    requiredBuffers: ['mask'],
    inputPorts: ['alpha'],
    outputPorts: ['alpha'],
    params: [
      numberParam('amount', 'Amount', -0.5, 0.5, 0.01),
      numberParam('softness', 'Softness', 0, 0.3, 0.01),
    ],
    defaults: { amount: 0.18, softness: 0.08 },
    randomize: {
      amount: { type: 'number', min: -0.25, max: 0.35 },
      softness: { type: 'number', min: 0.02, max: 0.16 },
    },
  }),
  shaderEffect({
    id: 'surface-depth',
    label: 'Surface Depth',
    stage: 'foreground-shader',
    tier: 'stable',
    requiredBuffers: ['mask', 'edge', 'height', 'normal'],
    requiredPrimitives: ['resolution', 'palette'],
    inputPorts: ['color', 'alpha', 'edge', 'height', 'normal'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('depth', 'Depth', 0, 1, 0.01),
      numberParam('lightAngle', 'Light Angle', 0, 360, 1),
      numberParam('specular', 'Specular', 0, 1, 0.01),
    ],
    defaults: { depth: 0.35, lightAngle: 35, specular: 0.18 },
    randomize: {
      depth: { type: 'number', min: 0.12, max: 0.75 },
      lightAngle: { type: 'number', min: 0, max: 360, step: 1 },
      specular: { type: 'number', min: 0, max: 0.45 },
    },
    implementation: { source: 'custom', shaderChunk: 'surfaceDepth' },
  }),
  shaderEffect({
    id: 'ink-graphite',
    label: 'Ink Graphite',
    stage: 'foreground-shader',
    tier: 'stable',
    requiredBuffers: ['mask', 'sdf', 'edge', 'height', 'normal', 'scatter'],
    requiredPrimitives: ['resolution', 'fbm-noise', 'palette'],
    inputPorts: ['color', 'alpha', 'sdf', 'edge', 'height', 'normal'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('edgeWidth', 'Edge Width', 0, 1, 0.01),
      numberParam('bevelDepth', 'Bevel Depth', 0, 1, 0.01),
      numberParam('roughness', 'Roughness', 0, 1, 0.01),
      numberParam('readabilityClamp', 'Readability Clamp', 0, 1, 0.01),
    ],
    defaults: { edgeWidth: 0.32, bevelDepth: 0.52, roughness: 0.45, readabilityClamp: 0.78 },
    randomize: {
      edgeWidth: { type: 'number', min: 0.18, max: 0.58 },
      bevelDepth: { type: 'number', min: 0.3, max: 0.82 },
      roughness: { type: 'number', min: 0.22, max: 0.68 },
      readabilityClamp: { type: 'number', min: 0.64, max: 0.92 },
    },
    implementation: { source: 'custom', shaderChunk: 'inkGraphite' },
  }),
  shaderEffect({
    id: 'stone-relief',
    label: 'Stone Relief',
    stage: 'foreground-shader',
    tier: 'stable',
    requiredBuffers: ['mask', 'sdf', 'edge', 'height', 'normal', 'scatter'],
    requiredPrimitives: ['resolution', 'fbm-noise', 'palette'],
    inputPorts: ['color', 'alpha', 'sdf', 'edge', 'height', 'normal'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('edgeWidth', 'Edge Width', 0, 1, 0.01),
      numberParam('bevelDepth', 'Bevel Depth', 0, 1, 0.01),
      numberParam('grainScale', 'Grain Scale', 0, 1, 0.01),
      numberParam('highlight', 'Highlight', 0, 1, 0.01),
    ],
    defaults: { edgeWidth: 0.38, bevelDepth: 0.74, grainScale: 0.34, highlight: 0.46 },
    randomize: {
      edgeWidth: { type: 'number', min: 0.22, max: 0.62 },
      bevelDepth: { type: 'number', min: 0.48, max: 0.9 },
      grainScale: { type: 'number', min: 0.18, max: 0.62 },
      highlight: { type: 'number', min: 0.24, max: 0.7 },
    },
    implementation: { source: 'custom', shaderChunk: 'stoneRelief' },
  }),
  shaderEffect({
    id: 'paper-emboss',
    label: 'Paper Emboss',
    stage: 'foreground-shader',
    tier: 'stable',
    requiredBuffers: ['mask', 'sdf', 'edge', 'height', 'normal'],
    requiredPrimitives: ['resolution', 'palette'],
    inputPorts: ['color', 'alpha', 'sdf', 'edge', 'height', 'normal'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('bevelDepth', 'Bevel Depth', 0, 1, 0.01),
      numberParam('rim', 'Rim', 0, 1, 0.01),
      numberParam('paperPickup', 'Paper Pickup', 0, 1, 0.01),
    ],
    defaults: { bevelDepth: 0.42, rim: 0.36, paperPickup: 0.3 },
    randomize: {
      bevelDepth: { type: 'number', min: 0.24, max: 0.66 },
      rim: { type: 'number', min: 0.16, max: 0.58 },
      paperPickup: { type: 'number', min: 0.12, max: 0.52 },
    },
    implementation: { source: 'custom', shaderChunk: 'paperEmboss' },
  }),
  shaderEffect({
    id: 'black-lacquer',
    label: 'Black Lacquer',
    stage: 'foreground-shader',
    tier: 'stable',
    requiredBuffers: ['mask', 'sdf', 'edge', 'height', 'normal'],
    requiredPrimitives: ['resolution', 'palette', 'uv-refraction'],
    inputPorts: ['color', 'alpha', 'sdf', 'edge', 'height', 'normal'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('gloss', 'Gloss', 0, 1, 0.01),
      numberParam('rim', 'Rim', 0, 1, 0.01),
      numberParam('readabilityClamp', 'Readability Clamp', 0, 1, 0.01),
    ],
    defaults: { gloss: 0.68, rim: 0.44, readabilityClamp: 0.84 },
    randomize: {
      gloss: { type: 'number', min: 0.42, max: 0.9 },
      rim: { type: 'number', min: 0.22, max: 0.72 },
      readabilityClamp: { type: 'number', min: 0.7, max: 0.94 },
    },
    implementation: { source: 'custom', shaderChunk: 'blackLacquer' },
  }),
  shaderEffect({
    id: 'edge-wear',
    label: 'Edge Wear',
    stage: 'foreground-shader',
    tier: 'stable',
    requiredBuffers: ['mask', 'sdf', 'edge', 'scatter'],
    requiredPrimitives: ['resolution', 'fbm-noise', 'dither'],
    inputPorts: ['color', 'alpha', 'sdf', 'edge'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('wear', 'Wear', 0, 1, 0.01),
      numberParam('contrast', 'Contrast', 0, 2, 0.01),
      numberParam('seed', 'Seed', 0, 999, 1),
    ],
    defaults: { wear: 0.32, contrast: 1.15, seed: 17 },
    randomize: {
      wear: { type: 'number', min: 0.14, max: 0.58 },
      contrast: { type: 'number', min: 0.8, max: 1.65 },
      seed: { type: 'number', min: 0, max: 999, step: 1 },
    },
    implementation: { source: 'custom', shaderChunk: 'edgeWear' },
  }),
  shaderEffect({
    id: 'contour-topography',
    label: 'Contour Topography',
    stage: 'foreground-shader',
    tier: 'stable',
    requiredBuffers: ['mask', 'sdf', 'edge', 'height'],
    requiredPrimitives: ['resolution', 'dither'],
    inputPorts: ['color', 'alpha', 'sdf', 'edge', 'height'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('contourSpacing', 'Contour Spacing', 0, 1, 0.01),
      numberParam('lineWeight', 'Line Weight', 0, 1, 0.01),
      numberParam('contrast', 'Contrast', 0, 2, 0.01),
    ],
    defaults: { contourSpacing: 0.42, lineWeight: 0.35, contrast: 1.1 },
    randomize: {
      contourSpacing: { type: 'number', min: 0.24, max: 0.7 },
      lineWeight: { type: 'number', min: 0.18, max: 0.52 },
      contrast: { type: 'number', min: 0.75, max: 1.6 },
    },
    implementation: { source: 'custom', shaderChunk: 'contourTopography' },
  }),
  shaderEffect({
    id: 'watercolor-paper',
    label: 'Watercolor Paper',
    stage: 'background-shader',
    tier: 'stable',
    requiredBuffers: ['scatter'],
    requiredPrimitives: ['resolution', 'fbm-noise', 'palette'],
    inputPorts: ['color', 'uv'],
    outputPorts: ['color'],
    params: [
      numberParam('wash', 'Wash', 0, 1, 0.01),
      numberParam('grain', 'Grain', 0, 1, 0.01),
      numberParam('scale', 'Scale', 0.5, 8, 0.1),
    ],
    defaults: { wash: 0.46, grain: 0.32, scale: 2.4 },
    randomize: {
      wash: { type: 'number', min: 0.22, max: 0.68 },
      grain: { type: 'number', min: 0.18, max: 0.52 },
      scale: { type: 'number', min: 1.2, max: 4.6 },
    },
    implementation: { source: 'lygia', shaderChunk: 'watercolorPaper' },
  }),
  shaderEffect({
    id: 'dithered-reveal',
    label: 'Dithered Reveal',
    stage: 'foreground-shader',
    tier: 'stable',
    requiredBuffers: ['mask', 'scatter'],
    requiredPrimitives: ['resolution', 'dither', 'fbm-noise'],
    inputPorts: ['color', 'alpha', 'uv'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('threshold', 'Threshold', 0, 1, 0.01),
      numberParam('contrast', 'Contrast', 0, 2, 0.01),
      numberParam('scale', 'Scale', 1, 32, 1),
    ],
    defaults: { threshold: 0.48, contrast: 1.2, scale: 12 },
    randomize: {
      threshold: { type: 'number', min: 0.28, max: 0.68 },
      contrast: { type: 'number', min: 0.8, max: 1.8 },
      scale: { type: 'number', min: 6, max: 24, step: 1 },
    },
    implementation: { source: 'custom', shaderChunk: 'ditheredReveal' },
  }),
  shaderEffect({
    id: 'halftone-ink',
    label: 'Halftone Ink',
    stage: 'foreground-shader',
    tier: 'stable',
    requiredBuffers: ['mask', 'edge', 'scatter'],
    requiredPrimitives: ['resolution', 'dither'],
    inputPorts: ['color', 'alpha', 'uv', 'edge'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('scale', 'Scale', 2, 48, 1),
      numberParam('threshold', 'Threshold', 0, 1, 0.01),
      numberParam('contrast', 'Contrast', 0, 2, 0.01),
    ],
    defaults: { scale: 18, threshold: 0.48, contrast: 1.15 },
    randomize: {
      scale: { type: 'number', min: 8, max: 32, step: 1 },
      threshold: { type: 'number', min: 0.28, max: 0.66 },
      contrast: { type: 'number', min: 0.8, max: 1.7 },
    },
    implementation: { source: 'custom', shaderChunk: 'halftoneInk' },
  }),
  shaderEffect({
    id: 'scratch-field',
    label: 'Scratch Field',
    stage: 'foreground-shader',
    tier: 'stable',
    requiredBuffers: ['mask', 'edge', 'scatter'],
    requiredPrimitives: ['resolution', 'fbm-noise', 'dither'],
    inputPorts: ['color', 'alpha', 'uv', 'edge'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('scale', 'Scale', 2, 64, 1),
      numberParam('threshold', 'Threshold', 0, 1, 0.01),
      numberParam('angle', 'Angle', 0, 360, 1),
    ],
    defaults: { scale: 22, threshold: 0.56, angle: 18 },
    randomize: {
      scale: { type: 'number', min: 8, max: 42, step: 1 },
      threshold: { type: 'number', min: 0.38, max: 0.78 },
      angle: { type: 'number', min: 0, max: 360, step: 1 },
    },
    implementation: { source: 'custom', shaderChunk: 'scratchField' },
  }),
  shaderEffect({
    id: 'technical-hatch',
    label: 'Technical Hatch',
    stage: 'foreground-shader',
    tier: 'stable',
    requiredBuffers: ['mask', 'sdf', 'edge'],
    requiredPrimitives: ['resolution', 'scanline'],
    inputPorts: ['color', 'alpha', 'uv', 'sdf', 'edge'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('scale', 'Scale', 2, 64, 1),
      numberParam('angle', 'Angle', 0, 360, 1),
      numberParam('threshold', 'Threshold', 0, 1, 0.01),
    ],
    defaults: { scale: 20, angle: 45, threshold: 0.52 },
    randomize: {
      scale: { type: 'number', min: 8, max: 40, step: 1 },
      angle: { type: 'number', min: 0, max: 360, step: 1 },
      threshold: { type: 'number', min: 0.3, max: 0.72 },
    },
    implementation: { source: 'custom', shaderChunk: 'technicalHatch' },
  }),
  patternEffect({
    id: 'damaged-sensor',
    label: 'Damaged Sensor',
    tier: 'stable',
    requiredPrimitives: ['time', 'resolution', 'scanline', 'channel-offset', 'dither'],
    params: [
      numberParam('dropout', 'Dropout', 0, 1, 0.01),
      numberParam('scanlineStrength', 'Scanline Strength', 0, 1, 0.01),
      numberParam('channelOffset', 'Channel Offset', 0, 0.08, 0.001),
    ],
    defaults: { dropout: 0.2, scanlineStrength: 0.35, channelOffset: 0.018 },
    randomize: {
      dropout: { type: 'number', min: 0.08, max: 0.42 },
      scanlineStrength: { type: 'number', min: 0.18, max: 0.65 },
      channelOffset: { type: 'number', min: 0.006, max: 0.04 },
    },
    implementation: { source: 'custom', shaderChunk: 'damagedSensor' },
  }),
  shaderEffect({
    id: 'fluid-chrome',
    label: 'Fluid Chrome',
    tier: 'experimental',
    requiredBuffers: ['mask', 'sdf', 'normal', 'flow'],
    requiredPrimitives: ['time', 'resolution', 'fbm-noise', 'uv-refraction', 'palette'],
    inputPorts: ['color', 'alpha', 'uv', 'sdf', 'normal', 'flow'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('flowStrength', 'Flow Strength', 0, 1, 0.01),
      numberParam('metalness', 'Metalness', 0, 1, 0.01),
      numberParam('refraction', 'Refraction', 0, 1, 0.01),
    ],
    defaults: { flowStrength: 0.42, metalness: 0.88, refraction: 0.26 },
    defaultRandomize: false,
    animation: { supportsTime: true, speedParam: 'flowStrength' },
    implementation: { source: 'lygia', shaderChunk: 'fluidChrome' },
  }),
  shaderEffect({
    id: 'frosted-fluted-glass',
    label: 'Frosted Fluted Glass',
    tier: 'experimental',
    requiredBuffers: ['mask', 'sdf', 'normal'],
    requiredPrimitives: ['resolution', 'uv-refraction', 'fbm-noise'],
    inputPorts: ['color', 'alpha', 'uv', 'sdf', 'normal'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('fluteScale', 'Flute Scale', 1, 32, 1),
      numberParam('frost', 'Frost', 0, 1, 0.01),
      numberParam('distortion', 'Distortion', 0, 1, 0.01),
    ],
    defaults: { fluteScale: 12, frost: 0.36, distortion: 0.28 },
    defaultRandomize: false,
    implementation: { source: 'custom', shaderChunk: 'frostedFlutedGlass' },
  }),
  shaderEffect({
    id: 'holofoil',
    label: 'Holofoil',
    tier: 'experimental',
    requiredBuffers: ['mask', 'sdf', 'normal', 'scatter'],
    requiredPrimitives: ['time', 'resolution', 'palette', 'fbm-noise', 'channel-offset'],
    inputPorts: ['color', 'alpha', 'uv', 'sdf', 'normal'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('iridescence', 'Iridescence', 0, 1, 0.01),
      numberParam('banding', 'Banding', 0, 1, 0.01),
      numberParam('sparkle', 'Sparkle', 0, 1, 0.01),
    ],
    defaults: { iridescence: 0.72, banding: 0.48, sparkle: 0.28 },
    defaultRandomize: false,
    animation: { supportsTime: true, speedParam: 'sparkle' },
    implementation: { source: 'custom', shaderChunk: 'holofoil' },
  }),
  shaderEffect({
    id: 'raymarched-interior',
    label: 'Raymarched Interior',
    tier: 'experimental',
    requiredBuffers: ['mask', 'sdf', 'normal'],
    requiredPrimitives: ['time', 'resolution', 'fbm-noise', 'raymarching'],
    inputPorts: ['color', 'alpha', 'uv', 'sdf', 'normal'],
    outputPorts: ['color', 'alpha'],
    params: [
      numberParam('depth', 'Depth', 0, 1, 0.01),
      numberParam('steps', 'Steps', 4, 48, 1),
      numberParam('glow', 'Glow', 0, 1, 0.01),
    ],
    defaults: { depth: 0.44, steps: 16, glow: 0.22 },
    defaultRandomize: false,
    animation: { supportsTime: true, speedParam: 'glow' },
    implementation: { source: 'reference-only', shaderChunk: 'raymarchedInterior' },
  }),
  shaderEffect({
    id: 'shadergpt-sketch',
    label: 'ShaderGPT Sketch',
    stage: 'feedback-simulation',
    tier: 'experimental',
    visibility: 'development-only',
    requiredBuffers: ['mask', 'sdf', 'scatter'],
    requiredPrimitives: [...SHADER_LAYER_PRIMITIVES],
    inputPorts: ['color', 'alpha', 'uv', 'sdf', 'pattern', 'previousFrame'],
    outputPorts: ['color', 'alpha', 'uv'],
    params: [
      numberParam('mix', 'Mix', 0, 1, 0.01),
      numberParam('speed', 'Speed', 0, 2, 0.01),
      selectParam('referenceFamily', 'Reference Family', [
        ['glitch', 'Glitch'],
        ['smoke', 'Smoke'],
        ['raymarch', 'Raymarch'],
      ]),
    ],
    defaults: { mix: 0.5, speed: 0.6, referenceFamily: 'glitch' },
    defaultRandomize: false,
    reactivity: {
      consumesTime: true,
      consumesPointer: true,
      consumesPattern: true,
      consumesPreviousFrame: true,
    },
    animation: { supportsTime: true, speedParam: 'speed' },
    implementation: { source: 'reference-only', shaderChunk: 'shadergptSketch' },
  }),
  postEffect({
    id: 'scanline-mask',
    label: 'Scanline Mask',
    tier: 'stable',
    requiredPrimitives: ['resolution', 'scanline'],
    params: [
      numberParam('density', 'Density', 1, 64, 1),
      numberParam('strength', 'Strength', 0, 1, 0.01),
    ],
    defaults: { density: 24, strength: 0.24 },
    randomize: {
      density: { type: 'number', min: 12, max: 48, step: 1 },
      strength: { type: 'number', min: 0.08, max: 0.4 },
    },
    implementation: { source: 'postprocessing', postEffect: 'scanlineMask' },
  }),
]

validateEffectRegistry(builtInEffectDefinitions)

export const effectDefinitions: readonly EffectDefinition[] = builtInEffectDefinitions

export function getEffectDefinitionById(effectId: string) {
  return effectDefinitions.find((effect) => effect.id === effectId)
}

export function getDefaultRandomizableEffectDefinitions() {
  return effectDefinitions.filter(
    (effect) =>
      effect.visibility === 'visible' &&
      effect.tier === 'stable' &&
      effect.randomize.defaultEnabled,
  )
}

export function getVisibleShaderEffectDefinitions() {
  return effectDefinitions.filter(
    (effect) =>
      effect.visibility === 'visible' &&
      ['foreground-shader', 'background-shader'].includes(effect.stage),
  )
}

export function createEffectDefaultParams(effect: EffectDefinition) {
  return { ...effect.defaults }
}

export function validateEffectRegistry(definitions: readonly EffectDefinition[]) {
  const ids = new Set<string>()

  for (const definition of definitions) {
    validateEffectDefinition(definition)

    if (ids.has(definition.id)) {
      throw new Error(`Effect registry contains duplicate id "${definition.id}".`)
    }

    ids.add(definition.id)
  }
}

function validateEffectDefinition(effect: EffectDefinition) {
  if (!effect.id.trim() || !effect.label.trim() || !effect.family.trim()) {
    throw new Error('Effect definition must include id, label, and family.')
  }

  if (effect.visibility === 'development-only' && effect.randomize.defaultEnabled) {
    throw new Error(`Development-only effect "${effect.id}" cannot be default-randomizable.`)
  }

  if (effect.tier === 'experimental' && effect.randomize.defaultEnabled) {
    throw new Error(`Experimental effect "${effect.id}" cannot be default-randomizable.`)
  }

  if (isShaderStage(effect.stage)) {
    validateShaderEffect(effect)
  }

  if (requiresComponentGraph(effect) && !effect.componentGraph) {
    throw new Error(`Effect "${effect.id}" must include component graph metadata.`)
  }

  if (effect.componentGraph) {
    validateComponentGraph(effect)
  }

  if (effect.reactivity.consumesPreviousFrame && effect.stage !== 'feedback-simulation') {
    throw new Error(`Effect "${effect.id}" consumes previous-frame data outside feedback-simulation.`)
  }

  validatePorts(effect)
  validateParams(effect)
  validateImplementation(effect)
}

function validateShaderEffect(effect: EffectDefinition) {
  if (effect.requiredPrimitives.length === 0) {
    throw new Error(`Shader Layer effect "${effect.id}" must declare required primitives.`)
  }

  for (const primitive of effect.requiredPrimitives) {
    if (!SHADER_LAYER_PRIMITIVES.includes(primitive)) {
      throw new Error(`Shader Layer effect "${effect.id}" uses unknown primitive "${primitive}".`)
    }
  }
}

function validateComponentGraph(effect: EffectDefinition) {
  if (!effect.componentGraph) {
    return
  }

  if (effect.componentGraph.blendModes.length === 0) {
    throw new Error(`Effect "${effect.id}" must declare at least one blend mode.`)
  }

  if (!effect.componentGraph.maskModes.includes('none')) {
    throw new Error(`Effect "${effect.id}" must support the none mask mode.`)
  }

  if (!effect.componentGraph.dynamicPropDrivers.includes('static')) {
    throw new Error(`Effect "${effect.id}" must support static props.`)
  }
}

function validatePorts(effect: EffectDefinition) {
  if (effect.inputPorts.length === 0 || effect.outputPorts.length === 0) {
    throw new Error(`Effect "${effect.id}" must declare input and output ports.`)
  }

  if (effect.inputPorts.includes('previousFrame') && !effect.reactivity.consumesPreviousFrame) {
    throw new Error(`Effect "${effect.id}" must mark previous-frame reactivity.`)
  }
}

function validateParams(effect: EffectDefinition) {
  const paramIds = new Set<string>()

  for (const param of effect.params) {
    if (!param.id.trim() || !param.label.trim()) {
      throw new Error(`Effect "${effect.id}" contains a param missing id or label.`)
    }

    if (paramIds.has(param.id)) {
      throw new Error(`Effect "${effect.id}" contains duplicate param "${param.id}".`)
    }

    paramIds.add(param.id)

    if (!Object.hasOwn(effect.defaults, param.id)) {
      throw new Error(`Effect "${effect.id}" param "${param.id}" is missing a default.`)
    }

    validateParamDefault(effect, param)
    validateParamRandomize(effect, param)
  }
}

function validateParamDefault(effect: EffectDefinition, param: EffectParamDefinition) {
  const value = effect.defaults[param.id]

  if (param.type === 'number') {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      !Number.isFinite(param.min) ||
      !Number.isFinite(param.max) ||
      !Number.isFinite(param.step) ||
      param.min > param.max ||
      param.step <= 0 ||
      value < param.min ||
      value > param.max
    ) {
      throw new Error(`Effect "${effect.id}" param "${param.id}" has invalid number metadata.`)
    }
  }

  if (param.type === 'boolean' && typeof value !== 'boolean') {
    throw new Error(`Effect "${effect.id}" param "${param.id}" has invalid boolean default.`)
  }

  if (param.type === 'select') {
    const options = new Set(param.options.map((option) => option.id))

    if (typeof value !== 'string' || !options.has(value)) {
      throw new Error(`Effect "${effect.id}" param "${param.id}" has invalid select default.`)
    }
  }
}

function validateParamRandomize(effect: EffectDefinition, param: EffectParamDefinition) {
  const randomize = effect.randomize.params[param.id]

  if (!randomize) {
    return
  }

  if (param.type !== randomize.type) {
    throw new Error(`Effect "${effect.id}" param "${param.id}" has mismatched randomize type.`)
  }

  if (param.type === 'number' && randomize.type === 'number') {
    if (
      !Number.isFinite(randomize.min) ||
      !Number.isFinite(randomize.max) ||
      randomize.min > randomize.max ||
      randomize.min < param.min ||
      randomize.max > param.max ||
      (typeof randomize.step === 'number' && randomize.step <= 0)
    ) {
      throw new Error(`Effect "${effect.id}" param "${param.id}" has invalid randomize bounds.`)
    }
  }

  if (param.type === 'select' && randomize.type === 'select') {
    const options = new Set(param.options.map((option) => option.id))

    if (randomize.options.some((option) => !options.has(option))) {
      throw new Error(`Effect "${effect.id}" param "${param.id}" has invalid randomize options.`)
    }
  }

  if (param.type === 'boolean' && randomize.type === 'boolean') {
    if (randomize.probability < 0 || randomize.probability > 1) {
      throw new Error(`Effect "${effect.id}" param "${param.id}" has invalid boolean probability.`)
    }
  }
}

function validateImplementation(effect: EffectDefinition) {
  if (!effect.implementation.source) {
    throw new Error(`Effect "${effect.id}" must declare an implementation source.`)
  }

  if (effect.implementation.source === 'postprocessing' && !effect.implementation.postEffect) {
    throw new Error(`Postprocessing effect "${effect.id}" must declare a post effect.`)
  }

  if (
    effect.implementation.source !== 'postprocessing' &&
    !effect.implementation.shaderChunk
  ) {
    throw new Error(`Effect "${effect.id}" must declare a shader chunk.`)
  }
}

function isShaderStage(stage: EffectStage) {
  return stage === 'foreground-shader' || stage === 'background-shader'
}

function requiresComponentGraph(effect: EffectDefinition) {
  return (
    effect.visibility === 'visible' &&
    ['foreground-shader', 'background-shader', 'pattern-modulation', 'post-surface'].includes(
      effect.stage,
    )
  )
}

function morphEffect(
  partial: Pick<
    EffectDefinition,
    'id' | 'label' | 'stage' | 'params' | 'defaults'
  > &
    EffectDefinitionOverrides & {
      defaultRandomize?: boolean
      randomize?: EffectRandomizeDefinition['params']
    },
): EffectDefinition {
  const { defaultRandomize, randomize, ...definition } = partial

  return {
    family: 'morph',
    effectRole: partial.effectRole ?? 'modifier',
    tier: partial.tier ?? 'stable',
    visibility: partial.visibility ?? 'visible',
    requiredBuffers: partial.requiredBuffers ?? ['mask'],
    requiredPrimitives: partial.requiredPrimitives ?? ['resolution'],
    inputPorts: partial.inputPorts ?? ['uv', 'alpha'],
    outputPorts: partial.outputPorts ?? ['uv', 'alpha'],
    randomize: {
      defaultEnabled: defaultRandomize ?? true,
      params: randomize ?? {},
    },
    reactivity: partial.reactivity ?? staticReactivity(),
    implementation: partial.implementation ?? { source: 'custom', shaderChunk: partial.id },
    ...definition,
  }
}

function shaderEffect(
  partial: Pick<
    EffectDefinition,
    | 'id'
    | 'label'
    | 'requiredBuffers'
    | 'requiredPrimitives'
    | 'inputPorts'
    | 'outputPorts'
    | 'params'
    | 'defaults'
    | 'implementation'
  > &
    EffectDefinitionOverrides & {
      defaultRandomize?: boolean
      randomize?: EffectRandomizeDefinition['params']
    },
): EffectDefinition {
  const { defaultRandomize, randomize, ...definition } = partial

  return {
    family: 'shader',
    effectRole: partial.effectRole ?? 'material',
    stage: partial.stage ?? 'foreground-shader',
    tier: partial.tier ?? 'stable',
    visibility: partial.visibility ?? 'visible',
    randomize: {
      defaultEnabled: defaultRandomize ?? partial.tier !== 'experimental',
      params: randomize ?? {},
    },
    reactivity: partial.reactivity ?? reactivityFromPrimitives(partial.requiredPrimitives),
    componentGraph: partial.componentGraph ?? componentGraphDefaults,
    ...definition,
  }
}

function patternEffect(
  partial: Pick<
    EffectDefinition,
    | 'id'
    | 'label'
    | 'requiredPrimitives'
    | 'params'
    | 'defaults'
    | 'implementation'
  > &
    EffectDefinitionOverrides & {
      defaultRandomize?: boolean
      randomize?: EffectRandomizeDefinition['params']
    },
): EffectDefinition {
  const { defaultRandomize, randomize, ...definition } = partial

  return {
    family: 'pattern',
    effectRole: partial.effectRole ?? 'source',
    stage: 'pattern-modulation',
    tier: partial.tier ?? 'stable',
    visibility: partial.visibility ?? 'visible',
    requiredBuffers: partial.requiredBuffers ?? ['mask', 'scatter'],
    inputPorts: partial.inputPorts ?? ['color', 'alpha', 'uv', 'pattern'],
    outputPorts: partial.outputPorts ?? ['color', 'alpha', 'pattern'],
    randomize: {
      defaultEnabled: defaultRandomize ?? partial.tier !== 'experimental',
      params: randomize ?? {},
    },
    reactivity: partial.reactivity ?? reactivityFromPrimitives(partial.requiredPrimitives),
    componentGraph: partial.componentGraph ?? componentGraphDefaults,
    ...definition,
  }
}

function postEffect(
  partial: Pick<
    EffectDefinition,
    | 'id'
    | 'label'
    | 'requiredPrimitives'
    | 'params'
    | 'defaults'
    | 'implementation'
  > &
    EffectDefinitionOverrides & {
      defaultRandomize?: boolean
      randomize?: EffectRandomizeDefinition['params']
    },
): EffectDefinition {
  const { defaultRandomize, randomize, ...definition } = partial

  return {
    family: 'post',
    effectRole: partial.effectRole ?? 'adjustment',
    stage: 'post-surface',
    tier: partial.tier ?? 'stable',
    visibility: partial.visibility ?? 'visible',
    requiredBuffers: partial.requiredBuffers ?? ['mask'],
    inputPorts: partial.inputPorts ?? ['color', 'alpha'],
    outputPorts: partial.outputPorts ?? ['color', 'alpha'],
    randomize: {
      defaultEnabled: defaultRandomize ?? partial.tier !== 'experimental',
      params: randomize ?? {},
    },
    reactivity: partial.reactivity ?? reactivityFromPrimitives(partial.requiredPrimitives),
    componentGraph: partial.componentGraph ?? componentGraphDefaults,
    ...definition,
  }
}

function numberParam(
  id: string,
  label: string,
  min: number,
  max: number,
  step: number,
  unit?: string,
): Extract<EffectParamDefinition, { type: 'number' }> {
  return {
    type: 'number',
    id,
    label,
    min,
    max,
    step,
    unit,
  }
}

function selectParam(
  id: string,
  label: string,
  options: Array<[string, string]>,
): Extract<EffectParamDefinition, { type: 'select' }> {
  return {
    type: 'select',
    id,
    label,
    options: options.map(([optionId, optionLabel]) => ({
      id: optionId,
      label: optionLabel,
    })),
  }
}

function staticReactivity(): EffectDefinition['reactivity'] {
  return {
    consumesTime: false,
    consumesPointer: false,
    consumesPattern: false,
    consumesPreviousFrame: false,
  }
}

function reactivityFromPrimitives(
  primitives: readonly ShaderLayerPrimitive[],
): EffectDefinition['reactivity'] {
  return {
    consumesTime: primitives.includes('time'),
    consumesPointer: primitives.includes('mouse'),
    consumesPattern: false,
    consumesPreviousFrame: false,
  }
}
