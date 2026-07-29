import {
  sanitizeStudioPreset,
  type StudioPreset,
} from '@/app/studio/studio-store'

export const STUDIO_PRESETS_JSON_KIND = 'hanzi-studio-presets' as const
export const STUDIO_PRESETS_JSON_VERSION = 1 as const

export type StudioPresetsJsonEnvelope = {
  kind: typeof STUDIO_PRESETS_JSON_KIND
  version: typeof STUDIO_PRESETS_JSON_VERSION
  presets: StudioPreset[]
}

export type StudioPresetsParseErrorCode =
  | 'malformed-json'
  | 'invalid-envelope'
  | 'invalid-entry'

export class StudioPresetsParseError extends Error {
  readonly code: StudioPresetsParseErrorCode

  constructor(code: StudioPresetsParseErrorCode, message: string) {
    super(message)
    this.name = 'StudioPresetsParseError'
    this.code = code
  }
}

export function parseStudioPresetsJson(contents: string): StudioPreset[] {
  let value: unknown

  try {
    value = JSON.parse(contents)
  } catch {
    throw new StudioPresetsParseError('malformed-json', 'Preset file contains malformed JSON.')
  }

  if (!isRecord(value) || value.kind !== STUDIO_PRESETS_JSON_KIND || value.version !== STUDIO_PRESETS_JSON_VERSION) {
    throw new StudioPresetsParseError(
      'invalid-envelope',
      'Preset file must use the hanzi-studio-presets format (version 1).',
    )
  }

  if (!Array.isArray(value.presets)) {
    throw new StudioPresetsParseError('invalid-envelope', 'Preset file must contain a presets array.')
  }

  return sanitizeVersionOnePresets(
    value.presets,
    'Preset file contains an invalid preset entry.',
  )
}

export function serializeStudioPresets(presets: readonly StudioPreset[]): string {
  const sanitizedPresets = sanitizeVersionOnePresets(
    presets,
    'Cannot export an invalid preset entry.',
  )

  const envelope: StudioPresetsJsonEnvelope = {
    kind: STUDIO_PRESETS_JSON_KIND,
    version: STUDIO_PRESETS_JSON_VERSION,
    presets: sanitizedPresets,
  }

  return JSON.stringify(envelope, null, 2)
}

function sanitizeVersionOnePresets(
  entries: readonly unknown[],
  invalidMessage: string,
): StudioPreset[] {
  const presetsByName = new Map<string, StudioPreset>()

  for (const entry of entries) {
    if (!isVersionOnePresetEntry(entry)) {
      throw new StudioPresetsParseError('invalid-entry', invalidMessage)
    }

    const preset = sanitizeStudioPreset(entry)

    if (!preset) {
      throw new StudioPresetsParseError('invalid-entry', invalidMessage)
    }

    presetsByName.set(preset.name, preset)
  }

  return [...presetsByName.values()]
}

function isVersionOnePresetEntry(value: unknown) {
  if (!isRecord(value) || !isRecord(value.settings)) {
    return false
  }

  const settings = value.settings

  return (
    isRecord(settings.character) &&
    isRecord(settings.ascii) &&
    isRecord(settings.mesh) &&
    isRecord(settings.animation) &&
    typeof settings.rendererMode === 'string' &&
    isRecord(settings.export) &&
    isRecord(settings.studioEffect) &&
    isRecord(settings.view)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
