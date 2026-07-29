import { describe, expect, it } from 'vitest'

import {
  parseStudioPresetsJson,
  serializeStudioPresets,
  StudioPresetsParseError,
  STUDIO_PRESETS_JSON_KIND,
} from './studio-presets'
import {
  createInitialStudioStoreState,
  createStudioStore,
  type StudioPreset,
} from '@/app/studio/studio-store'

function createPreset(name: string, density: number): StudioPreset {
  const state = createInitialStudioStoreState()

  return {
    name,
    settings: {
      character: state.character,
      ascii: { ...state.ascii, density },
      mesh: state.mesh,
      animation: state.animation,
      rendererMode: state.rendererMode,
      export: state.export,
      studioEffect: {
        selectedEffectId: state.studioEffect.selectedEffectId,
        controlsByTheme: {
          light: state.studioEffect.controlsByTheme.light[state.studioEffect.selectedEffectId],
          dark: state.studioEffect.controlsByTheme.dark[state.studioEffect.selectedEffectId],
        },
      },
      view: { backgroundColor: state.view.backgroundColor },
    },
  }
}

describe('studio preset JSON', () => {
  it('round-trips a deterministic versioned envelope', () => {
    const source = [createPreset('One', 0.4)]
    const serialized = serializeStudioPresets(source)

    expect(serialized).toContain('"kind": "hanzi-studio-presets"')
    expect(parseStudioPresetsJson(serialized)).toEqual(source)
    expect(serializeStudioPresets(parseStudioPresetsJson(serialized))).toBe(serialized)
  })

  it('rejects malformed envelopes and entries', () => {
    const asciiPresetWithoutAscii = createPreset('Missing ASCII', 0.5)
    delete asciiPresetWithoutAscii.settings.ascii

    for (const value of [
      '{',
      '{"kind":"wrong","version":1,"presets":[]}',
      '{"kind":"hanzi-studio-presets","presets":[]}',
      '{"kind":"hanzi-studio-presets","version":3,"presets":[]}',
      '{"kind":"hanzi-studio-presets","version":1,"presets":[null]}',
      '{"kind":"hanzi-studio-presets","version":1,"presets":[{"name":"Favorite","settings":{}}]}',
      JSON.stringify({
        kind: STUDIO_PRESETS_JSON_KIND,
        version: 1,
        presets: [asciiPresetWithoutAscii],
      }),
    ]) {
      expect(() => parseStudioPresetsJson(value)).toThrow(StudioPresetsParseError)
    }
  })

  it('rejects the unsupported full-effect preset shape', () => {
    const state = createInitialStudioStoreState()
    const fullEffectPreset = {
      name: 'Legacy',
      settings: {
        character: state.character,
        ascii: state.ascii,
        mesh: state.mesh,
        animation: state.animation,
        rendererMode: state.rendererMode,
        export: state.export,
        studioEffect: state.studioEffect,
        view: { backgroundColor: state.view.backgroundColor },
      },
    }

    expect(() => parseStudioPresetsJson(JSON.stringify({
      kind: STUDIO_PRESETS_JSON_KIND,
      version: 1,
      presets: [fullEffectPreset],
    }))).toThrow(StudioPresetsParseError)
  })

  it('does not overwrite an existing same-name preset when the imported schema is incomplete', () => {
    const store = createStudioStore()
    store.getState().saveStudioPreset('Favorite')
    const original = store.getState().presets[0]

    expect(() => parseStudioPresetsJson(JSON.stringify({
      kind: 'hanzi-studio-presets',
      version: 1,
      presets: [{ name: 'Favorite', settings: {} }],
    }))).toThrow(StudioPresetsParseError)
    expect(store.getState().presets[0]).toEqual(original)
  })

  it('uses the last duplicate name', () => {
    const source = [createPreset('One', 0.4), createPreset('One', 0.9)]
    const parsed = parseStudioPresetsJson(serializeStudioPresets(source))

    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.settings.ascii?.density).toBe(0.9)
  })
})
