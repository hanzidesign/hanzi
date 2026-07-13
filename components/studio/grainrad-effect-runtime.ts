import {
  ASCII_OUTPUT_WIDTH_MAX,
  GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
  GRAINRAD_COMMON_PROCESSING_GROUPS,
  GRAINRAD_EFFECTS,
  type GrainradControlValue,
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

export const EFFECT_VALUE_SLOT_COUNT = 24
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
    'levels',
    'matrix-size',
    'line-weight',
    'line-spacing',
    'layers',
    'modulation',
    'mod-type',
    'mod-frequency',
    'mod-amplitude',
    'brightness',
    'contrast',
    'gamma',
    'sharpen',
    'color-mode',
    'palette',
    'custom-palette',
    'foreground',
    'background',
    'color-depth',
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
    'custom-chars',
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
    'foreground',
    'background',
  ],
  contour: [
    'fill-mode',
    'levels',
    'line-thickness',
    'invert',
    'brightness',
    'contrast',
    'color-mode',
    'line-color',
    'background',
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
    'line-color',
    'background',
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

const DITHERING_ALGORITHM_IDS: Record<string, number> = {
  'floyd-steinberg': 0,
  atkinson: 1,
  'jarvis-judice-ninke': 2,
  stucki: 3,
  burkes: 4,
  sierra: 5,
  'sierra-two-row': 6,
  'sierra-lite': 7,
  'bayer-2x2': 8,
  'bayer-4x4': 9,
  'bayer-8x8': 10,
  'bayer-16x16': 11,
  'clustered-dot': 14,
  'blue-noise': 17,
  'interleaved-gradient': 19,
  crosshatch: 20,
}

const DITHERING_MATRIX_SIZES: Record<string, number> = {
  '2': 2,
  '4': 4,
  '8': 8,
  '16': 16,
}

const HALFTONE_SHAPE_IDS: Record<string, number> = {
  circle: 0,
  square: 1,
  diamond: 2,
  line: 3,
}

const HALFTONE_COLOR_MODE_IDS: Record<string, number> = {
  bw: 0,
  color: 1,
}

const MATRIX_RAIN_CHARACTER_SET_IDS: Record<string, number> = {
  standard: 0,
  blocks: 1,
  binary: 2,
  detailed: 3,
  minimal: 4,
  alphabetic: 5,
  numeric: 6,
  math: 7,
  emoji: 8,
  custom: 9,
}

const MATRIX_RAIN_DIRECTION_IDS: Record<string, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
}

const DOTS_SHAPE_IDS: Record<string, number> = {
  circle: 0,
  square: 1,
  diamond: 2,
}

const DOTS_GRID_IDS: Record<string, number> = {
  square: 0,
  hex: 1,
}

const DOTS_COLOR_MODE_IDS: Record<string, number> = {
  original: 0,
  custom: 1,
}

const CONTOUR_FILL_MODE_IDS: Record<string, number> = {
  filled: 0,
  lines: 1,
}

const CONTOUR_COLOR_MODE_IDS: Record<string, number> = {
  original: 1,
  custom: 2,
}

const PIXEL_SORT_DIRECTION_IDS: Record<string, number> = {
  horizontal: 0,
  vertical: 1,
  diagonal: 2,
}

const PIXEL_SORT_MODE_IDS: Record<string, number> = {
  brightness: 0,
  hue: 1,
  saturation: 2,
}

const BLOCKIFY_STYLE_IDS: Record<string, number> = {
  full: 0,
  shaded: 1,
  outline: 2,
}

const BLOCKIFY_COLOR_MODE_IDS: Record<string, number> = {
  color: 0,
  grayscale: 1,
}

const THRESHOLD_COLOR_MODE_IDS: Record<string, number> = {
  custom: 0,
  color: 1,
}

const EDGE_DETECTION_ALGORITHM_IDS: Record<string, number> = {
  sobel: 0,
  prewitt: 1,
  laplacian: 2,
}

const EDGE_DETECTION_COLOR_MODE_IDS: Record<string, number> = {
  custom: 0,
  original: 1,
}

const WAVE_LINES_DIRECTION_IDS: Record<string, number> = {
  horizontal: 0,
  vertical: 1,
}

const WAVE_LINES_COLOR_MODE_IDS: Record<string, number> = {
  original: 0,
  custom: 1,
}

const NOISE_FIELD_TYPE_IDS: Record<string, number> = {
  perlin: 0,
  simplex: 1,
  worley: 2,
}

const VORONOI_ENUM_IDS: Record<string, number> = {
  '0': 0,
  '1': 1,
  '2': 2,
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
      effectValues[0] = DITHERING_ALGORITHM_IDS[read.text('algorithm', 'bayer-8x8')] ?? 10
      effectValues[1] = read.number('intensity', 1)
      effectValues[2] = DITHERING_MATRIX_SIZES[read.text('matrix-size', '4')] ?? 4
      effectValues[3] = read.boolean('modulation')
      effectValues[4] = read.number('brightness', 0)
      effectValues[5] = read.number('contrast', 0)
      effectValues[6] = read.number('gamma', 1)
      effectValues[7] = read.number('sharpen', 0)
      effectValues[8] = read.select('color-mode')
      effectColorA = read.color('foreground', '#ffffff')
      effectColorB = read.color('background', '#000000')
      effectValues[9] = read.boolean('chromatic-enabled')
      effectValues[10] = read.number('max-displace', 6) / 50
      effectValues[11] = read.number('red-channel', 23) / 360
      effectValues[12] = read.number('green-channel', 50) / 360
      effectValues[13] = read.number('blue-channel', 80) / 360
      effectValues[14] = read.number('levels', 2)
      effectValues[15] = read.number('line-weight', 0.5)
      effectValues[16] = read.number('line-spacing', 10)
      effectValues[17] = read.number('layers', 2)
      effectValues[18] = read.select('mod-type')
      effectValues[19] = read.number('mod-frequency', 5)
      effectValues[20] = read.number('mod-amplitude', 0.1)
      effectValues[21] = read.select('palette')
      effectValues[22] = read.number('color-depth', 2)
      effectValues[23] = hashText(read.text('custom-palette', '')) / 997
      break
    case 'halftone':
      effectValues[0] = HALFTONE_SHAPE_IDS[read.text('shape', 'circle')] ?? 0
      effectValues[1] = read.number('dot-scale', 1)
      effectValues[2] = read.number('spacing', 8)
      effectValues[3] = read.number('angle', 45)
      effectValues[4] = read.boolean('invert')
      effectValues[5] = read.number('brightness', 0) / 100
      effectValues[6] = read.number('contrast', 0) / 100
      effectValues[7] = HALFTONE_COLOR_MODE_IDS[read.text('color-mode', 'bw')] ?? 0
      effectColorA = read.color('foreground', '#ffffff')
      effectColorB = read.color('background', '#000000')
      break
    case 'matrix-rain':
      effectValues[0] = MATRIX_RAIN_CHARACTER_SET_IDS[read.text('character-set', 'standard')] ?? 0
      effectValues[1] = read.number('cell-size', 12)
      effectValues[2] = read.number('spacing', 0)
      effectValues[3] = read.number('speed', 1)
      effectValues[4] = read.number('trail-length', 15)
      effectValues[5] = MATRIX_RAIN_DIRECTION_IDS[read.text('direction', 'down')] ?? 0
      effectValues[6] = read.number('glow', 1)
      effectValues[7] = read.number('bg-opacity', 0.3)
      effectValues[8] = read.number('brightness', 0) / 100
      effectValues[9] = read.number('contrast', 0) / 100
      effectValues[10] = read.number('threshold', 0)
      effectColorA = read.color('rain-color', '#00ff00')
      customGlyphChars = read.text('custom-chars', '')
      customGlyphCount = customGlyphChars.length
      customGlyphHash = hashText(customGlyphChars) / 997
      break
    case 'dots':
      effectValues[0] = DOTS_SHAPE_IDS[read.text('shape', 'circle')] ?? 0
      effectValues[1] = DOTS_GRID_IDS[read.text('grid-type', 'square')] ?? 0
      effectValues[2] = read.number('size', 1)
      effectValues[3] = read.number('spacing', 1)
      effectValues[4] = read.boolean('invert')
      effectValues[5] = read.number('brightness', 0) / 100
      effectValues[6] = read.number('contrast', 0) / 100
      effectValues[7] = DOTS_COLOR_MODE_IDS[read.text('color-mode', 'original')] ?? 0
      effectColorA = read.color('foreground', '#ffffff')
      effectColorB = read.color('background', '#000000')
      break
    case 'contour':
      effectValues[0] = CONTOUR_FILL_MODE_IDS[read.text('fill-mode', 'filled')] ?? 0
      effectValues[1] = read.number('levels', 8)
      effectValues[2] = read.number('line-thickness', 1)
      effectValues[3] = read.boolean('invert')
      effectValues[4] = read.number('brightness', 0) / 100
      effectValues[5] = read.number('contrast', 0) / 100
      effectValues[6] = CONTOUR_COLOR_MODE_IDS[read.text('color-mode', 'original')] ?? 1
      effectColorA = read.color('line-color', '#000000')
      effectColorB = read.color('background', '#ffffff')
      break
    case 'pixel-sort':
      effectValues[0] = PIXEL_SORT_DIRECTION_IDS[read.text('direction', 'horizontal')] ?? 0
      effectValues[1] = PIXEL_SORT_MODE_IDS[read.text('sort-mode', 'brightness')] ?? 0
      effectValues[2] = read.number('threshold', 0.25)
      effectValues[3] = read.number('streak-length', 100)
      effectValues[4] = read.number('intensity', 0.8)
      effectValues[5] = read.number('randomness', 0.3)
      effectValues[6] = read.boolean('reverse')
      effectValues[7] = read.number('brightness', 0) / 100
      effectValues[8] = read.number('contrast', 0) / 100
      break
    case 'blockify':
      effectValues[0] = BLOCKIFY_STYLE_IDS[read.text('style', 'full')] ?? 0
      effectValues[1] = read.number('block-size', 8)
      effectValues[2] = read.number('border-width', 1)
      effectValues[3] = read.number('brightness', 0) / 100
      effectValues[4] = read.number('contrast', 0) / 100
      effectValues[5] = BLOCKIFY_COLOR_MODE_IDS[read.text('color-mode', 'color')] ?? 0
      effectColorA = read.color('border-color', '#000000')
      break
    case 'threshold':
      effectValues[0] = read.number('levels', 2)
      effectValues[1] = read.boolean('dither')
      effectValues[2] = read.number('threshold-point', 0.5)
      effectValues[3] = read.number('brightness', 0) / 100
      effectValues[4] = read.number('contrast', 0) / 100
      effectValues[5] = read.boolean('invert')
      effectValues[6] = THRESHOLD_COLOR_MODE_IDS[read.text('color-mode', 'custom')] ?? 0
      effectColorA = read.color('foreground', '#ffffff')
      effectColorB = read.color('background', '#000000')
      break
    case 'edge-detection':
      effectValues[0] = read.number('threshold', 0.3)
      effectValues[1] = read.number('line-width', 1)
      effectValues[2] = read.boolean('invert')
      effectValues[3] = EDGE_DETECTION_ALGORITHM_IDS[read.text('algorithm', 'sobel')] ?? 0
      effectValues[4] = read.number('brightness', 0) / 100
      effectValues[5] = read.number('contrast', 0) / 100
      effectValues[6] = EDGE_DETECTION_COLOR_MODE_IDS[read.text('color-mode', 'custom')] ?? 0
      effectColorA = read.color('edge-color', '#ffffff')
      effectColorB = read.color('background', '#000000')
      break
    case 'crosshatch':
      effectValues[0] = read.number('density', 6)
      effectValues[1] = read.number('angle', 45) * Math.PI / 180
      effectValues[2] = read.number('layers', 3)
      effectValues[3] = read.number('line-width', 0.15)
      effectValues[4] = read.number('brightness', 0) / 100
      effectValues[5] = read.number('contrast', 0) / 100
      effectValues[6] = read.boolean('invert')
      effectValues[7] = read.number('randomness', 0)
      effectColorA = read.color('line-color', '#000000')
      effectColorB = read.color('background', '#ffffff')
      break
    case 'wave-lines':
      effectValues[0] = read.number('line-count', 50)
      effectValues[1] = read.number('amplitude', 20)
      effectValues[2] = read.number('frequency', 1)
      effectValues[3] = WAVE_LINES_DIRECTION_IDS[read.text('direction', 'horizontal')] ?? 0
      effectValues[4] = read.number('line-thickness', 0.4)
      effectValues[5] = read.number('brightness', 0) / 100
      effectValues[6] = read.number('contrast', 0) / 100
      effectValues[7] = WAVE_LINES_COLOR_MODE_IDS[read.text('color-mode', 'original')] ?? 0
      effectValues[8] = read.boolean('animate')
      effectColorA = read.color('line-color', '#ffffff')
      effectColorB = read.color('background', '#000000')
      break
    case 'noise-field':
      effectValues[0] = read.number('scale', 50)
      effectValues[1] = read.number('intensity', 1)
      effectValues[2] = read.number('speed', 1)
      effectValues[3] = read.number('octaves', 4)
      effectValues[4] = read.boolean('animate')
      effectValues[5] = read.number('brightness', 0) / 100
      effectValues[6] = read.number('contrast', 0) / 100
      effectValues[7] = NOISE_FIELD_TYPE_IDS[read.text('noise-type', 'perlin')] ?? 0
      effectValues[8] = read.boolean('distort-only')
      break
    case 'voronoi':
      effectValues[0] = read.number('cell-size', 30)
      effectValues[1] = read.number('edge-width', 0.3)
      effectValues[2] = VORONOI_ENUM_IDS[read.text('edge-color', '0')] ?? 0
      effectValues[3] = VORONOI_ENUM_IDS[read.text('color-mode', '0')] ?? 0
      effectValues[4] = read.number('randomize', 0.8)
      effectValues[5] = read.number('brightness', 0) / 100
      effectValues[6] = read.number('contrast', 0) / 100
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
