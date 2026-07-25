export type PixelSortColorPresetId =
  | 'default'
  | 'vaporwave'
  | 'ocean'
  | 'ember'
  | 'mono'
  | 'aurora'
  | 'candy'
  | 'forest'
  | 'glacier'
  | 'matrix'

export type PixelSortColorTheme = 'light' | 'dark'

export const PIXEL_SORT_COLOR_CONTROL_IDS = [
  'start-color',
  'middle-color',
  'end-color',
  'background',
] as const

export type PixelSortColorControlId = (typeof PIXEL_SORT_COLOR_CONTROL_IDS)[number]

export type PixelSortColorPalette = Readonly<Record<PixelSortColorControlId, string>>

export type PixelSortColorPresetOption = Readonly<{
  value: PixelSortColorPresetId
  label: string
}>

export const PIXEL_SORT_COLOR_PRESET_OPTIONS: readonly PixelSortColorPresetOption[] = [
  { value: 'default', label: 'Default' },
  { value: 'vaporwave', label: 'Vaporwave' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'ember', label: 'Ember' },
  { value: 'mono', label: 'Mono' },
  { value: 'aurora', label: 'Aurora' },
  { value: 'candy', label: 'Candy' },
  { value: 'forest', label: 'Forest' },
  { value: 'glacier', label: 'Glacier' },
  { value: 'matrix', label: 'Matrix' },
]

const DEFAULT_PIXEL_SORT_COLOR_PRESETS: Readonly<Record<PixelSortColorTheme, PixelSortColorPalette>> = {
  light: {
    'start-color': '#35115c',
    'middle-color': '#c93472',
    'end-color': '#e6a928',
    background: '#ffffff',
  },
  dark: {
    'start-color': '#1b0836',
    'middle-color': '#ff5a9d',
    'end-color': '#ffe08a',
    background: '#000000',
  },
}

const PIXEL_SORT_COLOR_PRESETS: Readonly<Record<Exclude<PixelSortColorPresetId, 'default'>, PixelSortColorPalette>> = {
  vaporwave: {
    'start-color': '#2d00f7',
    'middle-color': '#f20089',
    'end-color': '#00f5d4',
    background: '#0b0014',
  },
  ocean: {
    'start-color': '#03045e',
    'middle-color': '#00b4d8',
    'end-color': '#caf0f8',
    background: '#001219',
  },
  ember: {
    'start-color': '#3d0c02',
    'middle-color': '#ff5400',
    'end-color': '#ffbd00',
    background: '#120400',
  },
  mono: {
    'start-color': '#101010',
    'middle-color': '#808080',
    'end-color': '#f5f5f5',
    background: '#000000',
  },
  aurora: {
    'start-color': '#240046',
    'middle-color': '#7b2cbf',
    'end-color': '#80ffdb',
    background: '#03001c',
  },
  candy: {
    'start-color': '#ff4d6d',
    'middle-color': '#ff85a1',
    'end-color': '#ffd6e0',
    background: '#240014',
  },
  forest: {
    'start-color': '#132a13',
    'middle-color': '#4f772d',
    'end-color': '#ecf39e',
    background: '#081c15',
  },
  glacier: {
    'start-color': '#023e8a',
    'middle-color': '#48cae4',
    'end-color': '#ffffff',
    background: '#001219',
  },
  matrix: {
    'start-color': '#003b00',
    'middle-color': '#00a000',
    'end-color': '#b6ff00',
    background: '#001100',
  },
}

export function resolvePixelSortColorPreset(
  presetId: PixelSortColorPresetId,
  theme: PixelSortColorTheme,
): PixelSortColorPalette {
  if (presetId === 'default') {
    return { ...DEFAULT_PIXEL_SORT_COLOR_PRESETS[theme] }
  }

  return { ...PIXEL_SORT_COLOR_PRESETS[presetId] }
}

export function applyPixelSortColorPreset(
  presetId: PixelSortColorPresetId,
  theme: PixelSortColorTheme,
  onChange: (controlId: PixelSortColorControlId, value: string) => void,
) {
  const palette = resolvePixelSortColorPreset(presetId, theme)
  for (const controlId of PIXEL_SORT_COLOR_CONTROL_IDS) {
    onChange(controlId, palette[controlId])
  }
}
