import {
  ASCII_OUTPUT_WIDTH_MAX,
  GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
  GRAINRAD_COMMON_PROCESSING_GROUPS,
  GRAINRAD_EFFECTS,
  type GrainradControlValue,
  type GrainradEffectControl,
  type GrainradEffectId,
  type GrainradSelectOption,
} from './grainrad-effects'

export const GRAINRAD_EFFECT_SHADER_IDS: Record<GrainradEffectId, number> = {
  ascii: 0,
  dithering: 1,
  halftone: 2,
  'matrix-rain': 3,
  dots: 4,
  contour: 5,
  'pixel-sort': 6,
  blockify: 7,
  threshold: 8,
  'edge-detection': 9,
  crosshatch: 10,
  'wave-lines': 11,
  'noise-field': 12,
  voronoi: 13,
  vhs: 14,
}

export const EFFECT_VALUE_SLOT_COUNT = 20
export const PROCESSING_VALUE_SLOT_COUNT = 6
export const POST_VALUE_SLOT_COUNT = 9

export type GrainradEffectRuntime = {
  effectId: number
  effectValues: number[]
  processingValues: number[]
  postValues: number[]
  effectColorA: [number, number, number]
  effectColorB: [number, number, number]
  customGlyphHash: number
  customGlyphCount: number
  customGlyphChars: string
}

type CompileRuntimeOptions = {
  selectedEffectId: GrainradEffectId
  controls: Record<string, GrainradControlValue> | undefined
}

const SELECT_OPTION_INDEXES = new Map<string, Map<string, number>>()

for (const group of GRAINRAD_EFFECTS.flatMap((effect) => effect.settingGroups)) {
  for (const control of group.controls) {
    if (control.kind === 'select') {
      mergeOptionIndex(control.id, control.options)
    }
  }
}

for (const group of [
  ...GRAINRAD_COMMON_PROCESSING_GROUPS,
  ...GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
]) {
  for (const control of group.controls) {
    if (control.kind === 'select') {
      mergeOptionIndex(control.id, control.options)
    }
  }
}

const SHARED_PROCESSING_CONTROL_IDS = [
  'processing-invert',
  'brightness-map',
  'edge-enhance',
  'blur',
  'quantize-colors',
  'shape-matching',
]

const SHARED_POST_CONTROL_IDS = [
  'bloom',
  'grain-intensity',
  'grain-size',
  'grain-speed',
  'chromatic',
  'scanlines',
  'vignette',
  'crt-curve',
  'phosphor',
]

const EFFECT_CONTROL_IDS: Record<GrainradEffectId, string[]> = {
  ascii: [
    'scale',
    'spacing',
    'output-width',
    'character-set',
    'custom-chars',
    'brightness',
    'contrast',
    'saturation',
    'hue-rotation',
    'sharpness',
    'gamma',
    'color-mode',
    'foreground',
    'background',
    'intensity',
  ],
  dithering: [
    'algorithm',
    'intensity',
    'matrix-size',
    'modulation',
    'brightness',
    'contrast',
    'gamma',
    'sharpen',
    'color-mode',
    'foreground',
    'background',
    'chromatic-enabled',
    'max-displace',
    'red-channel',
    'green-channel',
    'blue-channel',
  ],
  halftone: [
    'shape',
    'dot-scale',
    'spacing',
    'angle',
    'invert',
    'brightness',
    'contrast',
    'color-mode',
    'foreground',
    'background',
  ],
  'matrix-rain': [
    'character-set',
    'cell-size',
    'spacing',
    'speed',
    'trail-length',
    'direction',
    'glow',
    'bg-opacity',
    'brightness',
    'contrast',
    'threshold',
    'rain-color',
  ],
  dots: [
    'shape',
    'grid-type',
    'size',
    'spacing',
    'invert',
    'brightness',
    'contrast',
    'color-mode',
  ],
  contour: [
    'fill-mode',
    'levels',
    'line-thickness',
    'invert',
    'brightness',
    'contrast',
    'color-mode',
  ],
  'pixel-sort': [
    'direction',
    'sort-mode',
    'threshold',
    'streak-length',
    'intensity',
    'randomness',
    'reverse',
    'brightness',
    'contrast',
  ],
  blockify: [
    'style',
    'block-size',
    'border-width',
    'brightness',
    'contrast',
    'color-mode',
    'border-color',
  ],
  threshold: [
    'levels',
    'threshold-point',
    'dither',
    'invert',
    'brightness',
    'contrast',
    'color-mode',
    'foreground',
    'background',
  ],
  'edge-detection': [
    'algorithm',
    'threshold',
    'line-width',
    'invert',
    'brightness',
    'contrast',
    'color-mode',
    'edge-color',
    'background',
  ],
  crosshatch: [
    'density',
    'layers',
    'angle',
    'line-width',
    'randomness',
    'invert',
    'brightness',
    'contrast',
    'line-color',
    'background',
  ],
  'wave-lines': [
    'line-count',
    'amplitude',
    'frequency',
    'line-thickness',
    'direction',
    'animate',
    'brightness',
    'contrast',
    'color-mode',
  ],
  'noise-field': [
    'noise-type',
    'scale',
    'intensity',
    'octaves',
    'speed',
    'animate',
    'distort-only',
    'brightness',
    'contrast',
  ],
  voronoi: [
    'cell-size',
    'edge-width',
    'edge-color',
    'color-mode',
    'randomize',
    'brightness',
    'contrast',
  ],
  vhs: [
    'distortion',
    'noise',
    'color-bleed',
    'scanlines',
    'tracking-error',
    'brightness',
    'contrast',
  ],
}

export function compileGrainradEffectRuntime({
  selectedEffectId,
  controls,
}: CompileRuntimeOptions): GrainradEffectRuntime {
  const read = createControlReader(controls)
  const effectValues = createValueSlots(EFFECT_VALUE_SLOT_COUNT)
  const processingValues = createValueSlots(PROCESSING_VALUE_SLOT_COUNT)
  const postValues = createValueSlots(POST_VALUE_SLOT_COUNT)
  let effectColorA: [number, number, number] = [1, 1, 1]
  let effectColorB: [number, number, number] = [0, 0, 0]
  let customGlyphHash = 0
  let customGlyphCount = 0
  let customGlyphChars = ''

  switch (selectedEffectId) {
    case 'ascii':
      effectValues[0] = read.number('scale', 4.3)
      effectValues[1] = read.number('spacing', 0)
      effectValues[2] = clampNumber(read.number('output-width', 0), 0, ASCII_OUTPUT_WIDTH_MAX)
      effectValues[3] = read.select('character-set')
      effectValues[4] = hashText(read.text('custom-chars', '')) / 997
      effectValues[5] = read.number('brightness', 0)
      effectValues[6] = read.number('contrast', 0)
      effectValues[7] = read.number('saturation', 0)
      effectValues[8] = read.number('hue-rotation', 0) / 360
      effectValues[9] = read.number('sharpness', 0)
      effectValues[10] = read.number('gamma', 1)
      effectValues[11] = read.select('color-mode')
      effectColorA = read.color('foreground', '#101010')
      effectColorB = read.color('background', '#f4f1e8')
      effectValues[12] = read.number('intensity', 1)
      customGlyphHash = effectValues[4]
      customGlyphChars = read.text('custom-chars', '')
      customGlyphCount = customGlyphChars.length
      break
    case 'dithering':
      effectValues[0] = read.select('algorithm')
      effectValues[1] = read.number('intensity', 1)
      effectValues[2] = read.select('matrix-size')
      effectValues[3] = read.boolean('modulation')
      effectValues[4] = read.number('brightness', 0)
      effectValues[5] = read.number('contrast', 0)
      effectValues[6] = read.number('gamma', 1)
      effectValues[7] = read.number('sharpen', 0)
      effectValues[8] = read.select('color-mode')
      effectColorA = read.color('foreground', '#ffffff')
      effectColorB = read.color('background', '#000000')
      effectValues[9] = read.boolean('chromatic-enabled')
      effectValues[10] = read.number('max-displace', 6) / 24
      effectValues[11] = read.number('red-channel', 23) / 100
      effectValues[12] = read.number('green-channel', 50) / 100
      effectValues[13] = read.number('blue-channel', 80) / 100
      break
    case 'halftone':
      effectValues[0] = read.select('shape')
      effectValues[1] = read.number('dot-scale', 1)
      effectValues[2] = read.number('spacing', 8) / 48
      effectValues[3] = read.number('angle', 45) / 180
      effectValues[4] = read.boolean('invert')
      effectValues[5] = read.number('brightness', 0)
      effectValues[6] = read.number('contrast', 0)
      effectValues[7] = read.select('color-mode')
      effectColorA = read.color('foreground', '#ffffff')
      effectColorB = read.color('background', '#000000')
      break
    case 'matrix-rain':
      effectValues[0] = read.select('character-set')
      effectValues[1] = read.number('cell-size', 12) / 48
      effectValues[2] = read.number('spacing', 0)
      effectValues[3] = read.number('speed', 1)
      effectValues[4] = read.number('trail-length', 15) / 80
      effectValues[5] = read.select('direction')
      effectValues[6] = read.number('glow', 1)
      effectValues[7] = read.number('bg-opacity', 0.3)
      effectValues[8] = read.number('brightness', 0)
      effectValues[9] = read.number('contrast', 0)
      effectValues[10] = read.number('threshold', 0)
      effectColorA = read.color('rain-color', '#2cff77')
      break
    case 'dots':
      effectValues[0] = read.select('shape')
      effectValues[1] = read.select('grid-type')
      effectValues[2] = read.number('size', 1)
      effectValues[3] = read.number('spacing', 1)
      effectValues[4] = read.boolean('invert')
      effectValues[5] = read.number('brightness', 0)
      effectValues[6] = read.number('contrast', 0)
      effectValues[7] = read.select('color-mode')
      break
    case 'contour':
      effectValues[0] = read.select('fill-mode')
      effectValues[1] = read.number('levels', 8)
      effectValues[2] = read.number('line-thickness', 1)
      effectValues[3] = read.boolean('invert')
      effectValues[4] = read.number('brightness', 0)
      effectValues[5] = read.number('contrast', 0)
      effectValues[6] = read.select('color-mode')
      break
    case 'pixel-sort':
      effectValues[0] = read.select('direction')
      effectValues[1] = read.select('sort-mode')
      effectValues[2] = read.number('threshold', 0.3)
      effectValues[3] = read.number('streak-length', 100) / 300
      effectValues[4] = read.number('intensity', 0.8)
      effectValues[5] = read.number('randomness', 0.3)
      effectValues[6] = read.boolean('reverse')
      effectValues[7] = read.number('brightness', 0)
      effectValues[8] = read.number('contrast', 0)
      break
    case 'blockify':
      effectValues[0] = read.select('style')
      effectValues[1] = read.number('block-size', 8) / 64
      effectValues[2] = read.number('border-width', 1) / 12
      effectValues[3] = read.number('brightness', 0)
      effectValues[4] = read.number('contrast', 0)
      effectValues[5] = read.select('color-mode')
      effectColorA = read.color('border-color', '#000000')
      break
    case 'threshold':
      effectValues[0] = read.number('levels', 2)
      effectValues[1] = read.number('threshold-point', 0.5)
      effectValues[2] = read.boolean('dither')
      effectValues[3] = read.boolean('invert')
      effectValues[4] = read.number('brightness', 0)
      effectValues[5] = read.number('contrast', 0)
      effectValues[6] = read.select('color-mode')
      effectColorA = read.color('foreground', '#ffffff')
      effectColorB = read.color('background', '#000000')
      break
    case 'edge-detection':
      effectValues[0] = read.select('algorithm')
      effectValues[1] = read.number('threshold', 0.3)
      effectValues[2] = read.number('line-width', 1)
      effectValues[3] = read.boolean('invert')
      effectValues[4] = read.number('brightness', 0)
      effectValues[5] = read.number('contrast', 0)
      effectValues[6] = read.select('color-mode')
      effectColorA = read.color('edge-color', '#ffffff')
      effectColorB = read.color('background', '#000000')
      break
    case 'crosshatch':
      effectValues[0] = read.number('density', 6)
      effectValues[1] = read.number('layers', 3)
      effectValues[2] = read.number('angle', 45) / 180
      effectValues[3] = read.number('line-width', 0.1)
      effectValues[4] = read.number('randomness', 0)
      effectValues[5] = read.boolean('invert')
      effectValues[6] = read.number('brightness', 0)
      effectValues[7] = read.number('contrast', 0)
      effectColorA = read.color('line-color', '#ffffff')
      effectColorB = read.color('background', '#000000')
      break
    case 'wave-lines':
      effectValues[0] = read.number('line-count', 50)
      effectValues[1] = read.number('amplitude', 20) / 100
      effectValues[2] = read.number('frequency', 1)
      effectValues[3] = read.number('line-thickness', 0.4)
      effectValues[4] = read.select('direction')
      effectValues[5] = read.boolean('animate')
      effectValues[6] = read.number('brightness', 0)
      effectValues[7] = read.number('contrast', 0)
      effectValues[8] = read.select('color-mode')
      break
    case 'noise-field':
      effectValues[0] = read.select('noise-type')
      effectValues[1] = read.number('scale', 50) / 200
      effectValues[2] = read.number('intensity', 1)
      effectValues[3] = read.number('octaves', 4)
      effectValues[4] = read.number('speed', 1)
      effectValues[5] = read.boolean('animate')
      effectValues[6] = read.boolean('distort-only')
      effectValues[7] = read.number('brightness', 0)
      effectValues[8] = read.number('contrast', 0)
      break
    case 'voronoi':
      effectValues[0] = read.number('cell-size', 30) / 120
      effectValues[1] = read.number('edge-width', 0.3)
      effectValues[2] = read.select('edge-color')
      effectValues[3] = read.select('color-mode')
      effectValues[4] = read.number('randomize', 0.8)
      effectValues[5] = read.number('brightness', 0)
      effectValues[6] = read.number('contrast', 0)
      break
    case 'vhs':
      effectValues[0] = read.number('distortion', 0.5)
      effectValues[1] = read.number('noise', 0.3)
      effectValues[2] = read.number('color-bleed', 0.5)
      effectValues[3] = read.number('scanlines', 0.3)
      effectValues[4] = read.number('tracking-error', 0.2)
      effectValues[5] = read.number('brightness', 0)
      effectValues[6] = read.number('contrast', 0)
      break
  }

  processingValues[0] = read.boolean('processing-invert')
  processingValues[1] = read.number('brightness-map', 1)
  processingValues[2] = read.number('edge-enhance', 0)
  processingValues[3] = read.number('blur', 0) / 12
  processingValues[4] = read.number('quantize-colors', 0)
  processingValues[5] = read.number('shape-matching', 0)

  postValues[0] = read.boolean('bloom')
  postValues[1] = read.number('grain-intensity', 35) / 100
  postValues[2] = read.number('grain-size', 2) / 10
  postValues[3] = read.number('grain-speed', 50) / 100
  postValues[4] = read.boolean('chromatic')
  postValues[5] = read.boolean('scanlines')
  postValues[6] = read.boolean('vignette')
  postValues[7] = read.boolean('crt-curve')
  postValues[8] = read.boolean('phosphor')

  return {
    effectId: GRAINRAD_EFFECT_SHADER_IDS[selectedEffectId],
    effectValues,
    processingValues,
    postValues,
    effectColorA,
    effectColorB,
    customGlyphHash,
    customGlyphCount,
    customGlyphChars,
  }
}

export function getUnmappedGrainradControls() {
  const missing: string[] = []

  for (const effect of GRAINRAD_EFFECTS) {
    const mapped = new Set([
      ...EFFECT_CONTROL_IDS[effect.id],
      ...SHARED_PROCESSING_CONTROL_IDS,
      ...SHARED_POST_CONTROL_IDS,
    ])
    const visibleIds = [
      ...effect.settingGroups,
      ...GRAINRAD_COMMON_PROCESSING_GROUPS,
      ...GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
    ].flatMap((group) => group.controls.map((control) => control.id))

    for (const id of visibleIds) {
      if (!mapped.has(id)) {
        missing.push(`${effect.id}.${id}`)
      }
    }
  }

  return missing
}

function createControlReader(controls: Record<string, GrainradControlValue> | undefined) {
  return {
    number: (id: string, fallback: number) => {
      const value = controls?.[id]
      return typeof value === 'number' && Number.isFinite(value) ? value : fallback
    },
    boolean: (id: string) => {
      const value = controls?.[id]
      return value === true ? 1 : 0
    },
    text: (id: string, fallback: string) => {
      const value = controls?.[id]
      return typeof value === 'string' ? value : fallback
    },
    select: (id: string) => {
      const value = controls?.[id]
      const index = SELECT_OPTION_INDEXES.get(id)

      if (typeof value === 'string' && index?.has(value)) {
        return index.get(value) ?? 0
      }

      return 0
    },
    color: (id: string, fallback: string) => {
      const value = controls?.[id]
      return parseHexColor(typeof value === 'string' ? value : fallback)
    },
  }
}

function createValueSlots(count: number) {
  return Array.from({ length: count }, () => 0)
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function mergeOptionIndex(controlId: string, options: Array<GrainradSelectOption>) {
  const existing = SELECT_OPTION_INDEXES.get(controlId) ?? new Map<string, number>()

  for (const option of options) {
    if (!existing.has(option.value)) {
      existing.set(option.value, existing.size)
    }
  }

  SELECT_OPTION_INDEXES.set(controlId, existing)
}

function parseHexColor(value: string): [number, number, number] {
  const match = value.match(/^#?([0-9a-f]{6})$/i)
  const hex = match?.[1] ?? '000000'
  const intValue = Number.parseInt(hex, 16)

  return [
    ((intValue >> 16) & 255) / 255,
    ((intValue >> 8) & 255) / 255,
    (intValue & 255) / 255,
  ]
}

function hashText(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 997
  }

  return hash
}
