export type GrainradControlValue = string | number | boolean

export const ASCII_OUTPUT_WIDTH_MAX = 600

export type GrainradControlCondition =
  | {
      controlId: string
      operator: 'equals'
      value: GrainradControlValue
    }
  | {
      controlId: string
      operator: 'in'
      values: GrainradControlValue[]
    }

export type GrainradControlVisibility =
  | GrainradControlCondition
  | { all: GrainradControlCondition[] }

type GrainradControlBase = {
  id: string
  label: string
  visibleWhen?: GrainradControlVisibility
}

export type GrainradSelectOption<T extends string = string> = {
  value: T
  label: string
  meta?: string
}

export type GrainradRangeControl = GrainradControlBase & {
  kind: 'range'
  defaultValue: number
  min: number
  max: number
  step: number
  unit?: string
}

export type GrainradSelectControl = GrainradControlBase & {
  kind: 'select'
  defaultValue: string
  options: Array<GrainradSelectOption>
}

export type GrainradTextControl = GrainradControlBase & {
  kind: 'text'
  defaultValue: string
}

export type GrainradToggleControl = GrainradControlBase & {
  kind: 'toggle'
  defaultValue: boolean
}

export type GrainradColorControl = GrainradControlBase & {
  kind: 'color'
  defaultValue: string
}

export type GrainradEffectControl =
  | GrainradRangeControl
  | GrainradSelectControl
  | GrainradTextControl
  | GrainradToggleControl
  | GrainradColorControl

export type GrainradSettingGroup = {
  title?: string
  controls: GrainradEffectControl[]
}

export type GrainradEffectDefinition = {
  id: GrainradEffectId
  label: string
  renderer: GrainradEffectRenderer
  settingGroups: GrainradSettingGroup[]
}

export type GrainradEffectRenderer =
  | 'ascii'
  | 'dithering'
  | 'halftone'
  | 'matrix-rain'
  | 'dots'
  | 'unimplemented'

export const GRAINRAD_CHARACTER_SETS = [
  { value: 'standard', label: 'STANDARD' },
  { value: 'blocks', label: 'BLOCKS' },
  { value: 'binary', label: 'BINARY' },
  { value: 'detailed', label: 'DETAILED' },
  { value: 'minimal', label: 'MINIMAL' },
  { value: 'alphabetic', label: 'ALPHABETIC' },
  { value: 'numeric', label: 'NUMERIC' },
  { value: 'math', label: 'MATH' },
  { value: 'symbols', label: 'SYMBOLS' },
  { value: 'custom', label: 'CUSTOM' },
] as const

export type GrainradCharacterSet = (typeof GRAINRAD_CHARACTER_SETS)[number]['value']

export const GRAINRAD_CHARACTER_SET_IDS = GRAINRAD_CHARACTER_SETS.map((option) => option.value)

export const MATRIX_RAIN_CHARACTER_SETS = GRAINRAD_CHARACTER_SETS.map((option) =>
  option.value === 'symbols'
    ? { value: 'emoji', label: option.label }
    : { ...option },
)

export const MATRIX_RAIN_CUSTOM_CHARS_DEFAULT =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789'

const monoOriginalColorModeOptions = [
  { value: 'mono', label: 'Mono' },
  { value: 'original', label: 'Original' },
]

const ditheringColorModeOptions = [
  { value: 'mono', label: 'Mono' },
  { value: 'tonal', label: 'Tonal' },
  { value: 'palette', label: 'Palette' },
  { value: 'rgb', label: 'RGB' },
  { value: 'original', label: 'Original' },
]

const ditheringPaletteOptions = [
  { value: 'gameboy-4', label: 'GameBoy 4', meta: 'Retro Gaming' },
  { value: 'cga-16', label: 'CGA 16', meta: 'Retro Gaming' },
  { value: 'nes-54', label: 'NES 54', meta: 'Retro Gaming' },
  { value: 'pico-8-16', label: 'PICO-8 16', meta: 'Retro Gaming' },
  { value: 'c64-16', label: 'C64 16', meta: 'Retro Gaming' },
  { value: 'apple-ii-16', label: 'Apple II 16', meta: 'Retro Gaming' },
  { value: 'macintosh-16', label: 'Macintosh 16', meta: 'Retro Gaming' },
  { value: 'sepia-5', label: 'Sepia 5', meta: 'Artistic' },
  { value: 'cyberpunk-6', label: 'Cyberpunk 6', meta: 'Artistic' },
  { value: 'newspaper-2', label: 'Newspaper 2', meta: 'Print' },
  { value: 'risograph-5', label: 'Risograph 5', meta: 'Print' },
  { value: 'custom', label: 'Custom', meta: 'Custom' },
]

const blockifyColorModeOptions = [
  { value: 'preserve-colors', label: 'Preserve Colors' },
  { value: 'grayscale', label: 'Grayscale' },
]

const shapeOptions = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'diamond', label: 'Diamond' },
]

const directionOptions = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
]

export const GRAINRAD_COMMON_PROCESSING_GROUPS: GrainradSettingGroup[] = [
  {
    controls: [
      toggleControl('processing-invert', 'Invert', false),
      rangeControl('brightness-map', 'Brightness Map', 1, 0, 2, 0.01),
      rangeControl('edge-enhance', 'Edge Enhance', 0, 0, 1, 0.01),
      rangeControl('blur', 'Blur', 0, 0, 12, 0.1),
      rangeControl('quantize-colors', 'Quantize Colors', 0, 0, 16, 1),
      rangeControl('shape-matching', 'Shape Matching', 0, 0, 1, 0.01),
    ],
  },
]

export const GRAINRAD_COMMON_POST_PROCESSING_GROUPS: GrainradSettingGroup[] = [
  {
    controls: [
      toggleControl('bloom', 'Bloom', false),
    ],
  },
  {
    title: 'Grain',
    controls: [
      rangeControl('grain-intensity', 'Intensity', 35, 0, 100, 1),
      rangeControl('grain-size', 'Size', 2, 1, 10, 1),
      rangeControl('grain-speed', 'Speed', 50, 0, 100, 1),
    ],
  },
  {
    controls: [
      toggleControl('chromatic', 'Chromatic', false),
      toggleControl('scanlines', 'Scanlines', false),
      toggleControl('vignette', 'Vignette', false),
      toggleControl('crt-curve', 'CRT Curve', false),
      toggleControl('phosphor', 'Phosphor', false),
    ],
  },
]

export type GrainradEffectId =
  | 'ascii'
  | 'dithering'
  | 'halftone'
  | 'matrix-rain'
  | 'dots'
  | 'contour'
  | 'pixel-sort'
  | 'blockify'
  | 'threshold'
  | 'edge-detection'
  | 'crosshatch'
  | 'wave-lines'
  | 'noise-field'
  | 'voronoi'
  | 'vhs'

export const DEFAULT_GRAINRAD_EFFECT_ID: GrainradEffectId = 'ascii'

export const GRAINRAD_EFFECTS: GrainradEffectDefinition[] = [
  {
    id: 'ascii',
    label: 'ASCII',
    renderer: 'ascii',
    settingGroups: [
      {
        title: 'ASCII',
        controls: [
          rangeControl('scale', 'Scale', 4.3, 1, 20, 0.1),
          rangeControl('spacing', 'Spacing', 0, 0, 1, 0.01),
          rangeControl('output-width', 'Output Width', 0, 0, ASCII_OUTPUT_WIDTH_MAX, 1),
          selectControl('character-set', 'Character Set', 'standard', [...GRAINRAD_CHARACTER_SETS]),
          textControl('custom-chars', 'Custom Chars', '█▓▒░@#%*+=-:. '),
        ],
      },
      adjustmentGroup(),
      {
        title: 'Color',
        controls: [
          selectControl('color-mode', 'Mode', 'mono', monoOriginalColorModeOptions),
          colorControl('foreground', 'Foreground', '#101010'),
          colorControl('background', 'Background', '#f4f1e8'),
          rangeControl('intensity', 'Intensity', 1, 0, 2, 0.01),
        ],
      },
    ],
  },
  {
    id: 'dithering',
    label: 'Dithering',
    renderer: 'dithering',
    settingGroups: [
      {
        title: 'Dithering',
        controls: [
          selectControl('algorithm', 'Algorithm', 'bayer-8x8', [
            { value: 'floyd-steinberg', label: 'Floyd-Steinberg' },
            { value: 'atkinson', label: 'Atkinson' },
            { value: 'jarvis-judice-ninke', label: 'Jarvis-Judice-Ninke' },
            { value: 'stucki', label: 'Stucki' },
            { value: 'burkes', label: 'Burkes' },
            { value: 'sierra', label: 'Sierra' },
            { value: 'sierra-two-row', label: 'Sierra Two-Row' },
            { value: 'sierra-lite', label: 'Sierra Lite' },
            { value: 'bayer-2x2', label: 'Bayer 2x2' },
            { value: 'bayer-4x4', label: 'Bayer 4x4' },
            { value: 'bayer-8x8', label: 'Bayer 8x8' },
            { value: 'bayer-16x16', label: 'Bayer 16x16' },
            { value: 'clustered-dot', label: 'Clustered Dot' },
            { value: 'blue-noise', label: 'Blue Noise' },
            { value: 'interleaved-gradient', label: 'Interleaved Gradient' },
            { value: 'crosshatch', label: 'Crosshatch' },
          ]),
          rangeControl('intensity', 'Intensity', 1, 0.1, 2, 0.05),
          rangeControl('levels', 'Levels', 2, 2, 32, 1, undefined, {
            controlId: 'color-mode',
            operator: 'in',
            values: ['tonal', 'rgb'],
          }),
          selectControl('matrix-size', 'Matrix Size', '4', [
            { value: '2', label: '2x2 (Coarse)' },
            { value: '4', label: '4x4 (Medium)' },
            { value: '8', label: '8x8 (Fine)' },
            { value: '16', label: '16x16 (Very Fine)' },
          ], {
            controlId: 'algorithm',
            operator: 'in',
            values: ['bayer-2x2', 'bayer-4x4', 'bayer-8x8', 'bayer-16x16', 'clustered-dot'],
          }),
          rangeControl('line-weight', 'Line Weight', 0.5, 0.1, 1, 0.05, undefined, {
            controlId: 'algorithm',
            operator: 'equals',
            value: 'crosshatch',
          }),
          rangeControl('line-spacing', 'Line Spacing', 10, 1, 50, 1, undefined, {
            controlId: 'algorithm',
            operator: 'equals',
            value: 'crosshatch',
          }),
          rangeControl('layers', 'Layers', 2, 1, 4, 1, undefined, {
            controlId: 'algorithm',
            operator: 'equals',
            value: 'crosshatch',
          }),
          toggleControl('modulation', 'Modulation', false),
          selectControl('mod-type', 'Mod Type', 'wave', [
            { value: 'wave', label: 'Wave' },
            { value: 'grid', label: 'Grid' },
            { value: 'radial', label: 'Radial' },
            { value: 'horizontal', label: 'Horizontal' },
            { value: 'rgb-split', label: 'RGB Split' },
          ], {
            controlId: 'modulation',
            operator: 'equals',
            value: true,
          }),
          rangeControl('mod-frequency', 'Mod Frequency', 5, 1, 20, 1, undefined, {
            controlId: 'modulation',
            operator: 'equals',
            value: true,
          }),
          rangeControl('mod-amplitude', 'Mod Amplitude', 0.1, 0, 10, 0.1, undefined, {
            controlId: 'modulation',
            operator: 'equals',
            value: true,
          }),
        ],
      },
      {
        title: 'Adjustments',
        controls: [
          rangeControl('brightness', 'Brightness', 0, -100, 100, 1),
          rangeControl('contrast', 'Contrast', 0, -100, 100, 1),
          rangeControl('gamma', 'Gamma', 1, 0.5, 2, 0.05),
          rangeControl('sharpen', 'Sharpen', 0, -1, 1, 0.1),
        ],
      },
      {
        title: 'Color',
        controls: [
          selectControl('color-mode', 'Mode', 'mono', ditheringColorModeOptions),
          selectControl('palette', 'Palette', 'gameboy-4', ditheringPaletteOptions, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'palette',
          }),
          textControl(
            'custom-palette',
            'Custom Palette',
            '#9bbc0f,#8bac0f,#306230,#0f380f',
            {
              all: [
                { controlId: 'color-mode', operator: 'equals', value: 'palette' },
                { controlId: 'palette', operator: 'equals', value: 'custom' },
              ],
            },
          ),
          colorControl('foreground', 'Foreground', '#ffffff', {
            controlId: 'color-mode',
            operator: 'in',
            values: ['mono', 'tonal'],
          }),
          colorControl('background', 'Background', '#000000', {
            controlId: 'color-mode',
            operator: 'in',
            values: ['mono', 'tonal', 'original'],
          }),
          rangeControl('color-depth', 'Color Depth', 2, 2, 64, 1, undefined, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'rgb',
          }),
        ],
      },
      {
        title: 'Chromatic Effects',
        controls: [
          toggleControl('chromatic-enabled', 'Enabled', false),
          rangeControl('max-displace', 'Max Displace', 6, 0, 50, 1, 'px'),
          rangeControl('red-channel', 'Red Channel', 23, 0, 360, 1),
          rangeControl('green-channel', 'Green Channel', 50, 0, 360, 1),
          rangeControl('blue-channel', 'Blue Channel', 80, 0, 360, 1),
        ],
      },
    ],
  },
  {
    id: 'halftone',
    label: 'Halftone',
    renderer: 'halftone',
    settingGroups: [
      {
        title: 'Halftone',
        controls: [
          selectControl('shape', 'Shape', 'circle', [...shapeOptions, { value: 'line', label: 'Line' }]),
          rangeControl('dot-scale', 'Dot Scale', 1, 0.5, 2, 0.1),
          rangeControl('spacing', 'Spacing', 8, 1, 20, 1),
          rangeControl('angle', 'Angle', 45, 0, 90, 5, '°'),
          toggleControl('invert', 'Invert', false),
        ],
      },
      {
        title: 'Adjustments',
        controls: [
          rangeControl('brightness', 'Brightness', 0, -100, 100, 1),
          rangeControl('contrast', 'Contrast', 0, -100, 100, 1),
        ],
      },
      {
        title: 'Color',
        controls: [
          selectControl('color-mode', 'Mode', 'bw', [
            { value: 'bw', label: 'Mono' },
            { value: 'color', label: 'Original' },
          ]),
          colorControl('foreground', 'Foreground', '#ffffff', {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'bw',
          }),
          colorControl('background', 'Background', '#000000', {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'bw',
          }),
        ],
      },
    ],
  },
  {
    id: 'matrix-rain',
    label: 'Matrix Rain',
    renderer: 'matrix-rain',
    settingGroups: [
      {
        title: 'Matrix Rain',
        controls: [
          selectControl('character-set', 'Character Set', 'standard', MATRIX_RAIN_CHARACTER_SETS),
          textControl(
            'custom-chars',
            'Custom Chars',
            MATRIX_RAIN_CUSTOM_CHARS_DEFAULT,
            { controlId: 'character-set', operator: 'equals', value: 'custom' },
          ),
          rangeControl('cell-size', 'Cell Size', 12, 4, 32, 1),
          rangeControl('spacing', 'Spacing', 0, 0, 1, 0.05),
          rangeControl('speed', 'Speed', 1, 0.5, 3, 0.1),
          rangeControl('trail-length', 'Trail Length', 15, 5, 30, 1),
          selectControl('direction', 'Direction', 'down', [
            { value: 'down', label: 'Down' },
            { value: 'up', label: 'Up' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ]),
          rangeControl('glow', 'Glow', 1, 0, 2, 0.1),
          rangeControl('bg-opacity', 'BG Opacity', 0.3, 0, 1, 0.05),
        ],
      },
      {
        title: 'Adjustments',
        controls: [
          rangeControl('brightness', 'Brightness', 0, -100, 100, 1),
          rangeControl('contrast', 'Contrast', 0, -100, 100, 1),
          rangeControl('threshold', 'Threshold', 0, 0, 0.5, 0.01),
        ],
      },
      {
        title: 'Color',
        controls: [colorControl('rain-color', 'Rain Color', '#00ff00')],
      },
    ],
  },
  {
    id: 'dots',
    label: 'Dots',
    renderer: 'dots',
    settingGroups: [
      {
        title: 'Dots',
        controls: [
          selectControl('shape', 'Shape', 'circle', shapeOptions),
          selectControl('grid-type', 'Grid Type', 'square', [
            { value: 'square', label: 'Square Grid' },
            { value: 'hex', label: 'Hexagonal Grid' },
          ]),
          rangeControl('size', 'Size', 1, 0.5, 2, 0.1),
          rangeControl('spacing', 'Spacing', 1, 0.5, 2, 0.1),
          toggleControl('invert', 'Invert', false),
        ],
      },
      {
        title: 'Adjustments',
        controls: [
          rangeControl('brightness', 'Brightness', 0, -100, 100, 1),
          rangeControl('contrast', 'Contrast', 0, -100, 100, 1),
        ],
      },
      colorModeGroup('original', [
        { value: 'custom', label: 'Mono' },
        { value: 'original', label: 'Original' },
      ], [
        colorControl('foreground', 'Dot Color', '#ffffff', {
          controlId: 'color-mode',
          operator: 'equals',
          value: 'custom',
        }),
        colorControl('background', 'Background', '#000000', {
          controlId: 'color-mode',
          operator: 'equals',
          value: 'custom',
        }),
      ]),
    ],
  },
  {
    id: 'contour',
    label: 'Contour',
    renderer: 'unimplemented',
    settingGroups: [
      {
        title: 'Contour',
        controls: [
          selectControl('fill-mode', 'Fill Mode', 'filled-bands', [
            { value: 'filled-bands', label: 'Filled Bands' },
            { value: 'lines-only', label: 'Lines Only' },
          ]),
          rangeControl('levels', 'Levels', 8, 2, 32, 1),
          rangeControl('line-thickness', 'Line Thickness', 1, 0.1, 6, 0.1),
          toggleControl('invert', 'Invert', false),
        ],
      },
      adjustmentGroup(['Brightness', 'Contrast']),
      colorModeGroup('original'),
    ],
  },
  {
    id: 'pixel-sort',
    label: 'Pixel Sort',
    renderer: 'unimplemented',
    settingGroups: [
      {
        title: 'Pixel Sort',
        controls: [
          selectControl('direction', 'Direction', 'horizontal', [
            ...directionOptions,
            { value: 'diagonal', label: 'Diagonal' },
          ]),
          selectControl('sort-mode', 'Sort Mode', 'brightness', [
            { value: 'brightness', label: 'Brightness' },
            { value: 'hue', label: 'Hue' },
            { value: 'saturation', label: 'Saturation' },
          ]),
          rangeControl('threshold', 'Threshold', 0.3, 0, 1, 0.01),
          rangeControl('streak-length', 'Streak Length', 100, 1, 300, 1),
          rangeControl('intensity', 'Intensity', 0.8, 0, 1, 0.01),
          rangeControl('randomness', 'Randomness', 0.3, 0, 1, 0.01),
          toggleControl('reverse', 'Reverse', false),
        ],
      },
      adjustmentGroup(['Brightness', 'Contrast']),
    ],
  },
  {
    id: 'blockify',
    label: 'Blockify',
    renderer: 'unimplemented',
    settingGroups: [
      {
        title: 'Blockify',
        controls: [
          selectControl('style', 'Style', 'full-blocks', [
            { value: 'full-blocks', label: 'Full Blocks' },
            { value: 'shaded', label: 'Shaded' },
            { value: 'outline', label: 'Outline' },
          ]),
          rangeControl('block-size', 'Block Size', 8, 2, 64, 1),
          rangeControl('border-width', 'Border Width', 1, 0, 12, 0.1),
        ],
      },
      adjustmentGroup(['Brightness', 'Contrast']),
      {
        title: 'Color',
        controls: [
          selectControl('color-mode', 'Mode', 'preserve-colors', blockifyColorModeOptions),
          colorControl('border-color', 'Border Color', '#000000'),
        ],
      },
    ],
  },
  {
    id: 'threshold',
    label: 'Threshold',
    renderer: 'unimplemented',
    settingGroups: [
      {
        title: 'Threshold',
        controls: [
          rangeControl('levels', 'Levels', 2, 2, 16, 1),
          rangeControl('threshold-point', 'Threshold Point', 0.5, 0, 1, 0.01),
          toggleControl('dither', 'Dither', false),
          toggleControl('invert', 'Invert', false),
        ],
      },
      adjustmentGroup(['Brightness', 'Contrast']),
      monoColorGroup(),
    ],
  },
  {
    id: 'edge-detection',
    label: 'Edge Detection',
    renderer: 'unimplemented',
    settingGroups: [
      {
        title: 'Edge Detection',
        controls: [
          selectControl('algorithm', 'Algorithm', 'sobel', [
            { value: 'sobel', label: 'Sobel' },
            { value: 'prewitt', label: 'Prewitt' },
            { value: 'laplacian', label: 'Laplacian' },
          ]),
          rangeControl('threshold', 'Threshold', 0.3, 0, 1, 0.01),
          rangeControl('line-width', 'Line Width', 1, 0.1, 8, 0.1),
          toggleControl('invert', 'Invert', false),
        ],
      },
      adjustmentGroup(['Brightness', 'Contrast']),
      {
        title: 'Color',
        controls: [
          selectControl('color-mode', 'Mode', 'mono', monoOriginalColorModeOptions),
          colorControl('edge-color', 'Edge Color', '#ffffff'),
          colorControl('background', 'Background', '#000000'),
        ],
      },
    ],
  },
  {
    id: 'crosshatch',
    label: 'Crosshatch',
    renderer: 'unimplemented',
    settingGroups: [
      {
        title: 'Crosshatch',
        controls: [
          rangeControl('density', 'Density', 6, 1, 24, 1),
          rangeControl('layers', 'Layers', 3, 1, 8, 1),
          rangeControl('angle', 'Angle', 45, -180, 180, 1, 'deg'),
          rangeControl('line-width', 'Line Width', 0.1, 0.05, 3, 0.05),
          rangeControl('randomness', 'Randomness', 0, 0, 1, 0.01),
          toggleControl('invert', 'Invert', false),
        ],
      },
      adjustmentGroup(['Brightness', 'Contrast']),
      {
        title: 'Color',
        controls: [
          colorControl('line-color', 'Line Color', '#ffffff'),
          colorControl('background', 'Background', '#000000'),
        ],
      },
    ],
  },
  {
    id: 'wave-lines',
    label: 'Wave Lines',
    renderer: 'unimplemented',
    settingGroups: [
      {
        title: 'Wave Lines',
        controls: [
          rangeControl('line-count', 'Line Count', 50, 1, 200, 1),
          rangeControl('amplitude', 'Amplitude', 20, 0, 100, 1),
          rangeControl('frequency', 'Frequency', 1, 0, 8, 0.01),
          rangeControl('line-thickness', 'Line Thickness', 0.4, 0.05, 6, 0.05),
          selectControl('direction', 'Direction', 'horizontal', directionOptions),
          toggleControl('animate', 'Animate', false),
        ],
      },
      adjustmentGroup(['Brightness', 'Contrast']),
      colorModeGroup('original'),
    ],
  },
  {
    id: 'noise-field',
    label: 'Noise Field',
    renderer: 'unimplemented',
    settingGroups: [
      {
        title: 'Noise Field',
        controls: [
          selectControl('noise-type', 'Noise Type', 'perlin', [
            { value: 'perlin', label: 'Perlin' },
            { value: 'simplex', label: 'Simplex' },
            { value: 'worley', label: 'Worley' },
          ]),
          rangeControl('scale', 'Scale', 50, 1, 200, 1),
          rangeControl('intensity', 'Intensity', 1, 0, 2, 0.01),
          rangeControl('octaves', 'Octaves', 4, 1, 8, 1),
          rangeControl('speed', 'Speed', 1, 0, 4, 0.01),
          toggleControl('animate', 'Animate', false),
          toggleControl('distort-only', 'Distort Only', false),
        ],
      },
      adjustmentGroup(['Brightness', 'Contrast']),
    ],
  },
  {
    id: 'voronoi',
    label: 'Voronoi',
    renderer: 'unimplemented',
    settingGroups: [
      {
        title: 'Voronoi',
        controls: [
          rangeControl('cell-size', 'Cell Size', 30, 4, 120, 1),
          rangeControl('edge-width', 'Edge Width', 0.3, 0, 3, 0.01),
          selectControl('edge-color', 'Edge Color', 'black', [
            { value: 'black', label: 'Black' },
            { value: 'white', label: 'White' },
            { value: 'darkened', label: 'Darkened' },
          ]),
          selectControl('color-mode', 'Color Mode', 'cell-average', [
            { value: 'cell-average', label: 'Cell Average' },
            { value: 'center-sample', label: 'Center Sample' },
            { value: 'gradient', label: 'Gradient' },
          ]),
          rangeControl('randomize', 'Randomize', 0.8, 0, 1, 0.01),
        ],
      },
      adjustmentGroup(['Brightness', 'Contrast']),
    ],
  },
  {
    id: 'vhs',
    label: 'VHS',
    renderer: 'unimplemented',
    settingGroups: [
      {
        title: 'VHS',
        controls: [
          rangeControl('distortion', 'Distortion', 0.5, 0, 1, 0.01),
          rangeControl('noise', 'Noise', 0.3, 0, 1, 0.01),
          rangeControl('color-bleed', 'Color Bleed', 0.5, 0, 1, 0.01),
          rangeControl('scanlines', 'Scanlines', 0.3, 0, 1, 0.01),
          rangeControl('tracking-error', 'Tracking Error', 0.2, 0, 1, 0.01),
        ],
      },
      adjustmentGroup(['Brightness', 'Contrast']),
    ],
  },
]

export const GRAINRAD_EFFECT_IDS = GRAINRAD_EFFECTS.map((effect) => effect.id)

export function getGrainradEffectById(effectId: GrainradEffectId) {
  return GRAINRAD_EFFECTS.find((effect) => effect.id === effectId) ?? GRAINRAD_EFFECTS[0]
}

export function isGrainradControlVisible(
  control: GrainradEffectControl,
  values: Record<string, GrainradControlValue> | undefined,
) {
  const condition = control.visibleWhen

  if (!condition) {
    return true
  }

  if ('all' in condition) {
    return condition.all.every((entry) => matchesVisibilityCondition(entry, values))
  }

  return matchesVisibilityCondition(condition, values)
}

function matchesVisibilityCondition(
  condition: GrainradControlCondition,
  values: Record<string, GrainradControlValue> | undefined,
) {

  const currentValue = values?.[condition.controlId]

  return condition.operator === 'equals'
    ? currentValue === condition.value
    : condition.values.includes(currentValue ?? '')
}

export function createDefaultGrainradEffectControls() {
  return Object.fromEntries(
    GRAINRAD_EFFECTS.map((effect) => [
      effect.id,
      Object.fromEntries(
        flattenGroups(effect.settingGroups)
          .concat(flattenGroups(GRAINRAD_COMMON_PROCESSING_GROUPS))
          .concat(flattenGroups(GRAINRAD_COMMON_POST_PROCESSING_GROUPS))
          .map((control) => [control.id, control.defaultValue]),
      ),
    ]),
  ) as Record<GrainradEffectId, Record<string, GrainradControlValue>>
}

function flattenGroups(groups: GrainradSettingGroup[]) {
  return groups.flatMap((group) => group.controls)
}

function adjustmentGroup(labels: string[] = [
  'Brightness',
  'Contrast',
  'Saturation',
  'Hue Rotation',
  'Sharpness',
  'Gamma',
]): GrainradSettingGroup {
  return {
    title: 'Adjustments',
    controls: labels.map((label) => {
      if (label === 'Color Mode') {
        return selectControl('color-mode', 'Mode', 'original', monoOriginalColorModeOptions)
      }

      if (label === 'Hue Rotation') {
        return rangeControl('hue-rotation', 'Hue Rotation', 0, -180, 180, 1, 'deg')
      }

      if (label === 'Gamma') {
        return rangeControl('gamma', 'Gamma', 1, 0.2, 3, 0.01)
      }

      if (label === 'Sharpen') {
        return rangeControl('sharpen', 'Sharpen', 0, 0, 1, 0.01)
      }

      if (label === 'Threshold') {
        return rangeControl('threshold', 'Threshold', 0, 0, 1, 0.01)
      }

      const id = label.toLowerCase().replace(/\s+/g, '-')
      const min = label === 'Brightness' || label === 'Saturation' ? -1 : 0.2
      const max = label === 'Brightness' || label === 'Saturation' ? 1 : 2

      return rangeControl(id, label, 0, min, max, 0.01)
    }),
  }
}

function monoColorGroup(): GrainradSettingGroup {
  return colorModeGroup('mono', monoOriginalColorModeOptions, [
    colorControl('foreground', 'Foreground', '#ffffff'),
    colorControl('background', 'Background', '#000000'),
  ])
}

function colorModeGroup(
  defaultValue: string,
  options: Array<GrainradSelectOption> = monoOriginalColorModeOptions,
  additionalControls: GrainradEffectControl[] = [],
): GrainradSettingGroup {
  return {
    title: 'Color',
    controls: [
      selectControl('color-mode', 'Mode', defaultValue, options),
      ...additionalControls,
    ],
  }
}

function rangeControl(
  id: string,
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  unit?: string,
  visibleWhen?: GrainradControlVisibility,
): GrainradRangeControl {
  return {
    kind: 'range',
    id,
    label,
    defaultValue,
    min,
    max,
    step,
    unit,
    visibleWhen,
  }
}

function selectControl(
  id: string,
  label: string,
  defaultValue: string,
  options: Array<GrainradSelectOption>,
  visibleWhen?: GrainradControlVisibility,
): GrainradSelectControl {
  return {
    kind: 'select',
    id,
    label,
    defaultValue,
    options,
    visibleWhen,
  }
}

function textControl(
  id: string,
  label: string,
  defaultValue: string,
  visibleWhen?: GrainradControlVisibility,
): GrainradTextControl {
  return {
    kind: 'text',
    id,
    label,
    defaultValue,
    visibleWhen,
  }
}

function toggleControl(id: string, label: string, defaultValue: boolean): GrainradToggleControl {
  return {
    kind: 'toggle',
    id,
    label,
    defaultValue,
  }
}

function colorControl(
  id: string,
  label: string,
  defaultValue: string,
  visibleWhen?: GrainradControlVisibility,
): GrainradColorControl {
  return {
    kind: 'color',
    id,
    label,
    defaultValue,
    visibleWhen,
  }
}
