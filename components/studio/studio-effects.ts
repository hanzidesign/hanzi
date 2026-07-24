export type StudioControlValue = string | number | boolean

export type StudioControlCondition =
  | {
      controlId: string
      operator: 'equals'
      value: StudioControlValue
    }
  | {
      controlId: string
      operator: 'in'
      values: StudioControlValue[]
    }
  | {
      controlId: string
      operator: 'greater-than'
      value: number
    }

export type StudioControlVisibility =
  | StudioControlCondition
  | { all: StudioControlCondition[] }

type StudioControlBase = {
  id: string
  label: string
  visibleWhen?: StudioControlVisibility
}

export type StudioSelectOption<T extends string = string> = {
  value: T
  label: string
  meta?: string
}

export type StudioRangeControl = StudioControlBase & {
  kind: 'range'
  defaultValue: number
  defaultValueByTheme?: Record<'light' | 'dark', number>
  min: number
  max: number
  step: number
  unit?: string
  displayScale?: number
  displayScaleByTheme?: Record<'light' | 'dark', number>
}

export type StudioSelectControl = StudioControlBase & {
  kind: 'select'
  defaultValue: string
  defaultValueByTheme?: Record<'light' | 'dark', string>
  options: Array<StudioSelectOption>
}

export type StudioTextControl = StudioControlBase & {
  kind: 'text'
  defaultValue: string
  defaultValueByTheme?: Record<'light' | 'dark', string>
}

export type StudioToggleControl = StudioControlBase & {
  kind: 'toggle'
  defaultValue: boolean
  defaultValueByTheme?: Record<'light' | 'dark', boolean>
}

export type StudioColorControl = StudioControlBase & {
  kind: 'color'
  defaultValue: string
  defaultValueByTheme: Record<'light' | 'dark', string>
}

export type StudioEffectControl =
  | StudioRangeControl
  | StudioSelectControl
  | StudioTextControl
  | StudioToggleControl
  | StudioColorControl

export type StudioThemeColorControl =
  | StudioColorControl
  | (StudioSelectControl & { defaultValueByTheme: Record<'light' | 'dark', string> })
  | (StudioTextControl & { defaultValueByTheme: Record<'light' | 'dark', string> })

export type StudioSettingGroup = {
  title?: string
  controls: StudioEffectControl[]
}

export type StudioEffectDefinition = {
  id: StudioEffectId
  label: string
  renderer: StudioEffectRenderer
  settingGroups: StudioSettingGroup[]
}

export type StudioEffectRenderer =
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
  | 'unimplemented'

export const STUDIO_CHARACTER_SETS = [
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

export type StudioCharacterSet = (typeof STUDIO_CHARACTER_SETS)[number]['value']

export const STUDIO_CHARACTER_SET_IDS = STUDIO_CHARACTER_SETS.map((option) => option.value)

export const MATRIX_RAIN_CHARACTER_SETS = STUDIO_CHARACTER_SETS.map((option) =>
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
  { value: 'mono', label: 'Mono' },
  { value: 'color', label: 'Preserve Colors' },
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

const pixelSortDirectionOptions = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'diagonal', label: '45°' },
  { value: 'anti-diagonal', label: '-45°' },
  { value: 'radial', label: 'Radial' },
]

export const STUDIO_COMMON_PROCESSING_GROUPS: StudioSettingGroup[] = [
  {
    controls: [
      toggleControl('processing-invert', 'Invert', false),
      rangeControl('brightness-map', 'Brightness Map', 1, 0, 4, 0.01),
      rangeControl('edge-enhance', 'Edge Enhance', 0, 0, 4, 0.01),
      rangeControl('blur', 'Blur', 0, 0, 100, 1),
      rangeControl('quantize-colors', 'Quantize Colors', 0, 0, 64, 1),
      rangeControl('shape-matching', 'Shape Matching', 0, 0, 1, 0.01),
    ],
  },
]

const MATRIX_RAIN_PROCESSING_GROUPS: StudioSettingGroup[] =
  STUDIO_COMMON_PROCESSING_GROUPS.map((group) => ({
    ...group,
    controls: group.controls.map((control) =>
      control.kind === 'range' && control.id === 'brightness-map'
        ? { ...control, defaultValue: 1, min: 0, max: 6 }
        : control
    ),
  }))

export function getStudioProcessingGroups(
  effectId: StudioEffectId,
): StudioSettingGroup[] {
  return effectId === 'matrix-rain'
    ? MATRIX_RAIN_PROCESSING_GROUPS
    : STUDIO_COMMON_PROCESSING_GROUPS
}

export const STUDIO_COMMON_POST_PROCESSING_GROUPS: StudioSettingGroup[] = [
  {
    controls: [
      toggleControl('bloom', 'Bloom', false),
      rangeControl('bloom-threshold', 'Threshold', 0.5, 0, 1, 0.05, undefined, {
        controlId: 'bloom',
        operator: 'equals',
        value: true,
      }),
      rangeControl('bloom-soft-threshold', 'Soft Threshold', 0.2, 0, 1, 0.05, undefined, {
        controlId: 'bloom',
        operator: 'equals',
        value: true,
      }),
      rangeControl('bloom-intensity', 'Intensity', 1.5, 0, 2, 0.1, undefined, {
        controlId: 'bloom',
        operator: 'equals',
        value: true,
      }),
      rangeControl('bloom-radius', 'Radius', 12, 1, 20, 1, undefined, {
        controlId: 'bloom',
        operator: 'equals',
        value: true,
      }),
    ],
  },
  {
    controls: [
      toggleControl('grain', 'Grain', false),
      selectControl('grain-mode', 'Mode', 'noise', [
        { value: 'noise', label: 'Noise' },
        { value: 'pixel', label: 'Pixel' },
      ], {
        controlId: 'grain',
        operator: 'equals',
        value: true,
      }),
      rangeControl('grain-intensity', 'Intensity', 1, 0, 200, 1, undefined, {
        controlId: 'grain',
        operator: 'equals',
        value: true,
      }),
      rangeControl('grain-size', 'Size', 2, 1, 10, 1, undefined, {
        controlId: 'grain',
        operator: 'equals',
        value: true,
      }),
      rangeControl('grain-speed', 'Speed', 50, 1, 200, 1, undefined, {
        controlId: 'grain',
        operator: 'equals',
        value: true,
      }),
    ],
  },
  {
    controls: [
      toggleControl('chromatic', 'Chromatic', false),
      rangeControl('chromatic-offset', 'Offset', 5, 0, 100, 1, undefined, {
        controlId: 'chromatic',
        operator: 'equals',
        value: true,
      }),
    ],
  },
  {
    controls: [
      toggleControl('scanlines', 'Scanlines', false),
      rangeControl('scanline-opacity', 'Opacity', 0.2, 0, 1, 0.05, undefined, {
        controlId: 'scanlines',
        operator: 'equals',
        value: true,
      }),
      rangeControl('scanline-spacing', 'Line', 80, 1, 1000, 1, undefined, {
        controlId: 'scanlines',
        operator: 'equals',
        value: true,
      }),
      rangeControl('scanline-offset', 'Offset', 0, 0, 20, 1, undefined, {
        controlId: 'scanlines',
        operator: 'equals',
        value: true,
      }),
      rangeControl('scanline-speed', 'Speed', 1, 1, 10, 0.1, undefined, {
        controlId: 'scanlines',
        operator: 'equals',
        value: true,
      }),
      selectControl('scanline-direction', 'Direction', 'down', [
        { value: 'up', label: 'Up' },
        { value: 'down', label: 'Down' },
      ], {
        controlId: 'scanlines',
        operator: 'equals',
        value: true,
      }),
    ],
  },
  {
    controls: [
      toggleControl('vignette', 'Vignette', false),
      rangeControl('vignette-intensity', 'Intensity', 0.5, 0, 1, 0.05, undefined, {
        controlId: 'vignette',
        operator: 'equals',
        value: true,
      }),
      rangeControl('vignette-radius', 'Radius', 0.5, 0, 1, 0.05, undefined, {
        controlId: 'vignette',
        operator: 'equals',
        value: true,
      }),
    ],
  },
  {
    controls: [
      toggleControl('crt-curve', 'CRT Curve', false),
      scaledRangeControl('crt-amount', 'Amount', 0.1, 0, 0.5, 0.01, 100, undefined, {
        controlId: 'crt-curve',
        operator: 'equals',
        value: true,
      }),
    ],
  },
  {
    controls: [
      toggleControl('phosphor', 'Phosphor', false),
      selectControl('phosphor-color', 'Color', 'green', [
        { value: 'green', label: 'Green' },
        { value: 'amber', label: 'Amber' },
        { value: 'white', label: 'White' },
        { value: 'custom', label: 'Custom' },
      ], {
        controlId: 'phosphor',
        operator: 'equals',
        value: true,
      }),
      colorControl('phosphor-custom-color', 'Custom', '#00ff00', {
        light: '#00ff00',
        dark: '#00ff00',
      }, {
        all: [
          { controlId: 'phosphor', operator: 'equals', value: true },
          { controlId: 'phosphor-color', operator: 'equals', value: 'custom' },
        ],
      }),
    ],
  },
]

export type StudioEffectId =
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

export const DEFAULT_STUDIO_EFFECT_ID: StudioEffectId = 'ascii'

export const STUDIO_EFFECTS: StudioEffectDefinition[] = [
  {
    id: 'ascii',
    label: 'ASCII',
    renderer: 'ascii',
    settingGroups: [
      {
        title: 'ASCII',
        controls: [
          rangeControl('size', 'Size', 1, 0.1, 10, 0.1),
          rangeControl('scale', 'Scale', 4.3, 1, 20, 0.1),
          selectControl('character-set', 'Character Set', 'standard', [...STUDIO_CHARACTER_SETS]),
          textControl('custom-chars', 'Custom Chars', '█▓▒░@#%*+=-:. '),
        ],
      },
      adjustmentGroup(),
      {
        title: 'Color',
        controls: [
          selectControl('color-mode', 'Mode', 'mono', monoOriginalColorModeOptions),
          colorControl('foreground', 'Foreground', '#101010', { light: '#101010', dark: '#f4f1e8' }),
          colorControl('background', 'Background', '#f4f1e8', { light: '#f4f1e8', dark: '#101010' }),
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
              light: '#101010,#555555,#aaaaaa,#f4f1e8',
              dark: '#f4f1e8,#aaaaaa,#555555,#101010',
            },
            {
              all: [
                { controlId: 'color-mode', operator: 'equals', value: 'palette' },
                { controlId: 'palette', operator: 'equals', value: 'custom' },
              ],
            },
          ),
          colorControl('foreground', 'Foreground', '#ffffff', { light: '#000000', dark: '#ffffff' }, {
            controlId: 'color-mode',
            operator: 'in',
            values: ['mono', 'tonal'],
          }),
          colorControl('background', 'Background', '#000000', { light: '#ffffff', dark: '#000000' }, {
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
          rangeControl('max-displace', 'Max Displace', 6, 0, 50, 1, 'px', {
            controlId: 'chromatic-enabled',
            operator: 'equals',
            value: true,
          }),
          rangeControl('red-channel', 'Red Channel', 23, 0, 360, 1, undefined, {
            controlId: 'chromatic-enabled',
            operator: 'equals',
            value: true,
          }),
          rangeControl('green-channel', 'Green Channel', 50, 0, 360, 1, undefined, {
            controlId: 'chromatic-enabled',
            operator: 'equals',
            value: true,
          }),
          rangeControl('blue-channel', 'Blue Channel', 80, 0, 360, 1, undefined, {
            controlId: 'chromatic-enabled',
            operator: 'equals',
            value: true,
          }),
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
          selectControl('color-mode', 'Mode', 'mono', [
            { value: 'mono', label: 'Mono' },
            { value: 'color', label: 'Original' },
          ]),
          colorControl('foreground', 'Foreground', '#ffffff', { light: '#000000', dark: '#ffffff' }, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'mono',
          }),
          colorControl('background', 'Background', '#000000', { light: '#ffffff', dark: '#000000' }, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'mono',
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
          rangeControl('glow', 'Glow', 1, 0, 4, 0.1),
          rangeControl('bg-opacity', 'Rain Opacity', 0.5, 0, 1, 0.05),
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
        controls: [
          colorControl('foreground', 'Foreground', '#ffffff', { light: '#10da14', dark: '#36d00b' }),
          colorControl('rain-color', 'Rain Color', '#00ff00', { light: '#24ee20', dark: '#00ff00' }),
          colorControl('background', 'Background', '#000000', { light: '#f4f1e8', dark: '#000000' }),
        ],
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
      colorModeGroup('mono', [
        { value: 'mono', label: 'Mono' },
        { value: 'original', label: 'Original' },
      ], [
        colorControl('foreground', 'Dot Color', '#ffffff', { light: '#000000', dark: '#ffffff' }, {
          controlId: 'color-mode',
          operator: 'equals',
          value: 'mono',
        }),
        colorControl('background', 'Background', '#000000', { light: '#ffffff', dark: '#000000' }, {
          controlId: 'color-mode',
          operator: 'equals',
          value: 'mono',
        }),
      ]),
    ],
  },
  {
    id: 'contour',
    label: 'Contour',
    renderer: 'contour',
    settingGroups: [
      {
        title: 'Contour',
        controls: [
          selectControl('fill-mode', 'Fill Mode', 'filled', [
            { value: 'filled', label: 'Filled Bands' },
            { value: 'lines', label: 'Lines Only' },
          ]),
          rangeControl('levels', 'Levels', 8, 3, 20, 1),
          rangeControl('line-thickness', 'Line Thickness', 1, 0.5, 3, 0.25),
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
      colorModeGroup('mono', [
        { value: 'mono', label: 'Mono' },
        { value: 'original', label: 'Original' },
      ], [
        colorControl('line-color', 'Line Color', '#000000', { light: '#000000', dark: '#ffffff' }, {
          controlId: 'color-mode',
          operator: 'equals',
          value: 'mono',
        }),
        colorControl('background', 'Background', '#ffffff', { light: '#ffffff', dark: '#000000' }, {
          controlId: 'color-mode',
          operator: 'equals',
          value: 'mono',
        }),
      ]),
    ],
  },
  {
    id: 'pixel-sort',
    label: 'Pixel Sort',
    renderer: 'pixel-sort',
    settingGroups: [
      {
        title: 'Pixel Sort',
        controls: [
          selectControl('direction', 'Direction', 'horizontal', [
            ...pixelSortDirectionOptions,
          ]),
          selectControl('sort-mode', 'Sort Mode', 'depth', [
            { value: 'brightness', label: 'Brightness' },
            { value: 'hue', label: 'Hue' },
            { value: 'saturation', label: 'Saturation' },
            { value: 'depth', label: 'Depth' },
          ]),
          rangeControl('threshold', 'Threshold', 0.25, 0, 0.5, 0.05),
          rangeControl('streak-length', 'Streak Length', 500, 1, 2000, 1),
          rangeControl('intensity', 'Intensity', 1, 0, 2, 0.05),
          rangeControl('randomness', 'Randomness', 0.5, 0, 5, 0.1),
          toggleControl('reverse', 'Reverse', false),
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
          colorControl('start-color', 'Start Color', '#35115c', { light: '#35115c', dark: '#1b0836' }),
          colorControl('middle-color', 'Middle Color', '#c93472', { light: '#c93472', dark: '#ff5a9d' }),
          colorControl('end-color', 'End Color', '#e6a928', { light: '#e6a928', dark: '#ffe08a' }),
          colorControl('background', 'Background', '#ffffff', { light: '#ffffff', dark: '#000000' }),
          rangeControl('mix', 'Mix', 1, 0, 2, 0.05),
        ],
      },
    ],
  },
  {
    id: 'blockify',
    label: 'Blockify',
    renderer: 'blockify',
    settingGroups: [
      {
        title: 'Blockify',
        controls: [
          selectControl('style', 'Style', 'full', [
            { value: 'full', label: 'Full Blocks' },
            { value: 'shaded', label: 'Shaded' },
            { value: 'outline', label: 'Outline' },
          ]),
          rangeControl('block-size', 'Block Size', 8, 4, 20, 1),
          rangeControl('border-width', 'Border Width', 1, 0, 3, 0.5),
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
          selectControl('color-mode', 'Mode', 'mono', blockifyColorModeOptions),
          colorControl('foreground', 'Foreground', '#ffffff', { light: '#101010', dark: '#f4f1e8' }, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'mono',
          }),
          colorControl('background', 'Background', '#000000', { light: '#f4f1e8', dark: '#101010' }, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'mono',
          }),
        ],
      },
    ],
  },
  {
    id: 'threshold',
    label: 'Threshold',
    renderer: 'threshold',
    settingGroups: [
      {
        title: 'Threshold',
        controls: [
          rangeControl('levels', 'Levels', 2, 2, 8, 1),
          rangeControl('threshold-point', 'Threshold Point', 0.5, 0.1, 0.9, 0.05),
          toggleControl('dither', 'Dither', false),
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
          selectControl('color-mode', 'Mode', 'mono', [
            { value: 'mono', label: 'Mono' },
            { value: 'color', label: 'Original' },
          ]),
          colorControl('foreground', 'Foreground', '#ffffff', { light: '#000000', dark: '#ffffff' }, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'mono',
          }),
          colorControl('background', 'Background', '#000000', { light: '#ffffff', dark: '#000000' }, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'mono',
          }),
        ],
      },
    ],
  },
  {
    id: 'edge-detection',
    label: 'Edge Detection',
    renderer: 'edge-detection',
    settingGroups: [
      {
        title: 'Edge Detection',
        controls: [
          selectControl('algorithm', 'Algorithm', 'sobel', [
            { value: 'sobel', label: 'Sobel' },
            { value: 'prewitt', label: 'Prewitt' },
            { value: 'laplacian', label: 'Laplacian' },
          ]),
          rangeControl('threshold', 'Threshold', 0.3, 0.1, 0.8, 0.05),
          rangeControl('line-width', 'Line Width', 1, 0.5, 4, 0.5),
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
          selectControl('color-mode', 'Mode', 'mono', [
            { value: 'mono', label: 'Mono' },
            { value: 'original', label: 'Original' },
          ]),
          colorControl('edge-color', 'Edge Color', '#ffffff', { light: '#000000', dark: '#ffffff' }, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'mono',
          }),
          colorControl('background', 'Background', '#000000', { light: '#ffffff', dark: '#000000' }, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'mono',
          }),
        ],
      },
    ],
  },
  {
    id: 'crosshatch',
    label: 'Crosshatch',
    renderer: 'crosshatch',
    settingGroups: [
      {
        title: 'Crosshatch',
        controls: [
          rangeControl('density', 'Density', 6, 1, 50, 1),
          rangeControl('layers', 'Layers', 3, 1, 4, 1),
          rangeControl('angle', 'Angle', 45, 0, 90, 5, '°'),
          scaledRangeControl('line-width', 'Line Width', 0.08, 0.01, 0.5, 0.01, 100),
          rangeControl('randomness', 'Randomness', 0, 0, 1, 0.05),
          toggleControl('invert', 'Invert', false),
        ],
      },
      {
        title: 'Background Lines',
        controls: [
          rangeControl('background-density', 'Density', 12, 1, 50, 1),
          rangeControl('background-layers', 'Layers', 1, 1, 4, 1),
          rangeControl('background-angle', 'Angle', 45, 0, 90, 5, '°'),
          scaledRangeControl('background-line-width', 'Line Width', 0.08, 0.01, 0.5, 0.01, 100),
          rangeControl('background-randomness', 'Randomness', 0, 0, 1, 0.05),
          rangeControl('background-speed', 'Speed', 0.1, 0, 10, 0.1),
        ],
      },
      {
        title: 'Adjustments',
        controls: [
          {
            ...themedRangeControl('brightness', 'Brightness', -4, -100, 100, 1, {
              light: -15,
              dark: -4,
            }),
            displayScaleByTheme: { light: 1, dark: -1 },
          },
          rangeControl('contrast', 'Contrast', 0, -100, 100, 1),
        ],
      },
      {
        title: 'Color',
        controls: [
          colorControl('line-color', 'Line Color', '#000000', { light: '#000000', dark: '#ffffff' }),
          colorControl('background', 'Background', '#ffffff', { light: '#ffffff', dark: '#000000' }),
        ],
      },
    ],
  },
  {
    id: 'wave-lines',
    label: 'Wave Lines',
    renderer: 'wave-lines',
    settingGroups: [
      {
        title: 'Wave Lines',
        controls: [
          rangeControl('line-count', 'Line Count', 50, 10, 150, 5),
          rangeControl('amplitude', 'Amplitude', 20, 5, 50, 1),
          rangeControl('frequency', 'Frequency', 1, 0.5, 3, 0.1),
          rangeControl('line-thickness', 'Line Thickness', 0.4, 0.5, 3, 0.1),
          selectControl('direction', 'Direction', 'horizontal', directionOptions),
          toggleControl('animate', 'Animate', true),
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
          selectControl('color-mode', 'Mode', 'mono', [
            { value: 'mono', label: 'Mono' },
            { value: 'original', label: 'Original' },
          ]),
          colorControl('line-color', 'Line Color', '#ffffff', { light: '#000000', dark: '#ffffff' }, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'mono',
          }),
          colorControl('background', 'Background', '#000000', { light: '#ffffff', dark: '#000000' }, {
            controlId: 'color-mode',
            operator: 'equals',
            value: 'mono',
          }),
        ],
      },
    ],
  },
  {
    id: 'noise-field',
    label: 'Noise Field',
    renderer: 'noise-field',
    settingGroups: [
      {
        title: 'Noise Field',
        controls: [
          selectControl('noise-type', 'Noise Type', 'perlin', [
            { value: 'perlin', label: 'Perlin' },
            { value: 'simplex', label: 'Simplex' },
            { value: 'worley', label: 'Worley' },
          ]),
          rangeControl('scale', 'Scale', 50, 10, 100, 5),
          rangeControl('intensity', 'Intensity', 1, 0.5, 3, 0.1),
          rangeControl('octaves', 'Octaves', 4, 1, 8, 1),
          rangeControl('speed', 'Speed', 1, 0.1, 3, 0.1),
          toggleControl('animate', 'Animate', true),
          toggleControl('distort-only', 'Distort Only', true),
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
          colorControl('foreground', 'Foreground', '#ffffff', { light: '#ffffff', dark: '#ffffff' }),
          colorControl('background', 'Background', '#000000', { light: '#000000', dark: '#000000' }),
        ],
      },
    ],
  },
  {
    id: 'voronoi',
    label: 'Voronoi',
    renderer: 'voronoi',
    settingGroups: [
      {
        title: 'Voronoi',
        controls: [
          rangeControl('cell-size', 'Cell Size', 30, 10, 100, 5),
          rangeControl('edge-width', 'Edge Width', 0.3, 0, 1, 0.05),
          rangeControl('randomize', 'Randomize', 0.8, 0, 1, 0.05),
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
          colorControl('cell-shadow', 'Cell Shadow', '#2b2d42', { light: '#2b2d42', dark: '#101828' }),
          colorControl('cell-midtone', 'Cell Midtone', '#6d597a', { light: '#6d597a', dark: '#00b4d8' }),
          colorControl('cell-highlight', 'Cell Highlight', '#e9c46a', { light: '#e9c46a', dark: '#ff4d8d' }),
          colorControl('background', 'Background', '#ffffff', { light: '#ffffff', dark: '#000000' }),
          colorControl('edge-color', 'Edge Color', '#101010', { light: '#101010', dark: '#f4f1e8' }),
          toggleControl('fill-canvas', 'Fill Canvas', false),
        ],
      },
    ],
  },
  {
    id: 'vhs',
    label: 'VHS',
    renderer: 'vhs',
    settingGroups: [
      {
        title: 'VHS',
        controls: [
          rangeControl('distortion', 'Distortion', 0.5, 0, 1, 0.05),
          rangeControl('noise', 'Noise', 0.3, 0, 1, 0.05),
          rangeControl('vhs-scanlines', 'Scanlines', 0.3, 0, 1, 0.05),
          rangeControl('tracking-error', 'Tracking Error', 0.2, 0, 1, 0.05),
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
          rangeControl('color-bleed', 'Color Bleed', 0.5, 0, 1, 0.05),
          rangeControl('chroma-blur', 'Chroma Blur', 0.3, 0, 1, 0.05, undefined, {
            controlId: 'color-bleed',
            operator: 'greater-than',
            value: 0,
          }),
          rangeControl('saturation', 'Saturation', 0.9, 0, 2, 0.05),
          rangeControl('red-gain', 'Red Gain', 1.1, 0, 2, 0.05),
          rangeControl('green-gain', 'Green Gain', 1, 0, 2, 0.05),
          rangeControl('blue-gain', 'Blue Gain', 0.9, 0, 2, 0.05),
          colorControl('background', 'Background', '#f4f1e8', { light: '#f4f1e8', dark: '#101010' }),
        ],
      },
    ],
  },
]

export const STUDIO_EFFECT_IDS = STUDIO_EFFECTS.map((effect) => effect.id)

export function getStudioEffectById(effectId: StudioEffectId) {
  return STUDIO_EFFECTS.find((effect) => effect.id === effectId) ?? STUDIO_EFFECTS[0]
}

export function isStudioControlVisible(
  control: StudioEffectControl,
  values: Record<string, StudioControlValue> | undefined,
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
  condition: StudioControlCondition,
  values: Record<string, StudioControlValue> | undefined,
) {

  const currentValue = values?.[condition.controlId]

  if (condition.operator === 'equals') {
    return currentValue === condition.value
  }

  if (condition.operator === 'greater-than') {
    return typeof currentValue === 'number' && currentValue > condition.value
  }

  return condition.values.includes(currentValue ?? '')
}

export function createDefaultStudioEffectControls(theme: 'light' | 'dark' = 'light') {
  return Object.fromEntries(
    STUDIO_EFFECTS.map((effect) => [
      effect.id,
      Object.fromEntries(
        flattenGroups(effect.settingGroups)
          .concat(flattenGroups(getStudioProcessingGroups(effect.id)))
          .concat(flattenGroups(STUDIO_COMMON_POST_PROCESSING_GROUPS))
          .map((control) => [control.id, getStudioControlDefaultValue(control, theme)]),
      ),
    ]),
  ) as Record<StudioEffectId, Record<string, StudioControlValue>>
}

export function getStudioControlDefaultValue(
  control: StudioEffectControl,
  theme: 'light' | 'dark',
) {
  return hasStudioThemeDefaultValue(control)
    ? control.defaultValueByTheme[theme]
    : control.defaultValue
}

export function hasStudioThemeDefaultValue(
  control: StudioEffectControl,
): control is StudioEffectControl & {
  defaultValueByTheme: Record<'light' | 'dark', StudioControlValue>
} {
  return 'defaultValueByTheme' in control && control.defaultValueByTheme !== undefined
}

export function isStudioThemeColorControl(
  control: StudioEffectControl,
): control is StudioThemeColorControl {
  return control.kind !== 'range'
    && control.kind !== 'toggle'
    && hasStudioThemeDefaultValue(control)
}

function flattenGroups(groups: StudioSettingGroup[]) {
  return groups.flatMap((group) => group.controls)
}

function adjustmentGroup(labels: string[] = [
  'Brightness',
  'Contrast',
  'Saturation',
  'Hue Rotation',
  'Sharpness',
  'Gamma',
]): StudioSettingGroup {
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

function colorModeGroup(
  defaultValue: string,
  options: Array<StudioSelectOption> = monoOriginalColorModeOptions,
  additionalControls: StudioEffectControl[] = [],
): StudioSettingGroup {
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
  visibleWhen?: StudioControlVisibility,
): StudioRangeControl {
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

function scaledRangeControl(
  id: string,
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  displayScale: number,
  unit?: string,
  visibleWhen?: StudioControlVisibility,
): StudioRangeControl {
  return {
    ...rangeControl(id, label, defaultValue, min, max, step, unit, visibleWhen),
    displayScale,
  }
}

function themedRangeControl(
  id: string,
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  defaultValueByTheme: Record<'light' | 'dark', number>,
  unit?: string,
): StudioRangeControl {
  return {
    ...rangeControl(id, label, defaultValue, min, max, step, unit),
    defaultValueByTheme,
  }
}

function selectControl(
  id: string,
  label: string,
  defaultValue: string,
  options: Array<StudioSelectOption>,
  visibleWhen?: StudioControlVisibility,
): StudioSelectControl {
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
  defaultValueByThemeOrVisibleWhen?: Record<'light' | 'dark', string> | StudioControlVisibility,
  visibleWhen?: StudioControlVisibility,
): StudioTextControl {
  const defaultValueByTheme = defaultValueByThemeOrVisibleWhen
    && 'light' in defaultValueByThemeOrVisibleWhen
    && 'dark' in defaultValueByThemeOrVisibleWhen
      ? defaultValueByThemeOrVisibleWhen
      : undefined
  const resolvedVisibleWhen = defaultValueByTheme
    ? visibleWhen
    : defaultValueByThemeOrVisibleWhen as StudioControlVisibility | undefined

  return {
    kind: 'text',
    id,
    label,
    defaultValue,
    defaultValueByTheme,
    visibleWhen: resolvedVisibleWhen,
  }
}

function toggleControl(id: string, label: string, defaultValue: boolean): StudioToggleControl {
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
  defaultValueByTheme: Record<'light' | 'dark', string>,
  visibleWhen?: StudioControlVisibility,
): StudioColorControl {
  return {
    kind: 'color',
    id,
    label,
    defaultValue,
    defaultValueByTheme,
    visibleWhen,
  }
}
