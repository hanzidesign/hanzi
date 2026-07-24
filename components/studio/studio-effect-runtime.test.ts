import { describe, expect, it } from 'vitest'

import {
  STUDIO_COMMON_POST_PROCESSING_GROUPS,
  STUDIO_COMMON_PROCESSING_GROUPS,
  STUDIO_EFFECTS,
  createDefaultStudioEffectControls,
  getStudioProcessingGroups,
  isStudioThemeColorControl,
  type StudioControlValue,
  type StudioEffectControl,
  type StudioEffectId,
} from './studio-effects'
import {
  STUDIO_EFFECT_SHADER_IDS,
  PIXEL_SORT_DEDICATED_CONTROL_IDS,
  POST_VALUE_SLOT_COUNT,
  VORONOI_DEDICATED_COLOR_CONTROL_IDS,
  compileStudioEffectRuntime,
  getUnmappedStudioControls,
} from './studio-effect-runtime'

describe('Phase 5F Studio runtime effect compiler', () => {
  it('defines valid light and dark defaults for every color control', () => {
    const colorControlIds: string[] = []
    const lightDefaults = createDefaultStudioEffectControls('light')
    const darkDefaults = createDefaultStudioEffectControls('dark')

    for (const effect of STUDIO_EFFECTS) {
      for (const group of effect.settingGroups) {
        for (const control of group.controls) {
          if (!isStudioThemeColorControl(control)) {
            continue
          }

          if (control.kind === 'color') {
            expect(control.defaultValueByTheme, `${effect.id}.${control.id}`).toEqual({
              light: expect.stringMatching(/^#[0-9a-f]{6}$/i),
              dark: expect.stringMatching(/^#[0-9a-f]{6}$/i),
            })
          } else if (control.kind === 'text') {
            for (const value of Object.values(control.defaultValueByTheme)) {
              expect(value.split(',')).toHaveLength(4)
              expect(value.split(',').every((entry) => /^#[0-9a-f]{6}$/i.test(entry))).toBe(true)
            }
          } else {
            expect(control.options.map((option) => option.value)).toEqual(
              expect.arrayContaining(Object.values(control.defaultValueByTheme)),
            )
          }
          expect(lightDefaults[effect.id][control.id]).toBe(control.defaultValueByTheme.light)
          expect(darkDefaults[effect.id][control.id]).toBe(control.defaultValueByTheme.dark)
          colorControlIds.push(`${effect.id}.${control.id}`)
        }
      }
    }

    expect(colorControlIds).toEqual([
      'ascii.foreground',
      'ascii.background',
      'dithering.custom-palette',
      'dithering.foreground',
      'dithering.background',
      'halftone.foreground',
      'halftone.background',
      'matrix-rain.foreground',
      'matrix-rain.rain-color',
      'matrix-rain.background',
      'dots.foreground',
      'dots.background',
      'contour.line-color',
      'contour.background',
      'pixel-sort.start-color',
      'pixel-sort.middle-color',
      'pixel-sort.end-color',
      'pixel-sort.background',
      'blockify.foreground',
      'blockify.background',
      'threshold.foreground',
      'threshold.background',
      'edge-detection.edge-color',
      'edge-detection.background',
      'crosshatch.line-color',
      'crosshatch.background',
      'wave-lines.line-color',
      'wave-lines.background',
      'noise-field.foreground',
      'noise-field.background',
      'voronoi.cell-shadow',
      'voronoi.cell-midtone',
      'voronoi.cell-highlight',
      'voronoi.background',
      'voronoi.edge-color',
      'vhs.background',
    ])
  })

  it('publishes all 15 Effects as independent renderers with no unimplemented fallback', () => {
    expect(STUDIO_EFFECTS).toHaveLength(15)
    expect(STUDIO_EFFECTS.map((effect) => effect.renderer)).toEqual(
      STUDIO_EFFECTS.map((effect) => effect.id),
    )
    expect(STUDIO_EFFECTS.some((effect) => effect.renderer === 'unimplemented')).toBe(false)
  })

  it('keeps effect-local control ids disjoint from shared Processing and Post ids', () => {
    const sharedIds = new Set([
      ...STUDIO_COMMON_PROCESSING_GROUPS,
      ...STUDIO_COMMON_POST_PROCESSING_GROUPS,
    ].flatMap((group) => group.controls.map((control) => control.id)))

    for (const effect of STUDIO_EFFECTS) {
      const collisions = effect.settingGroups
        .flatMap((group) => group.controls.map((control) => control.id))
        .filter((id) => sharedIds.has(id))

      expect(collisions, effect.id).toEqual([])
    }
  })

  it('assigns each Studio effect a unique shader id', () => {
    const ids = STUDIO_EFFECTS.map((effect) => STUDIO_EFFECT_SHADER_IDS[effect.id])

    expect(ids).toHaveLength(STUDIO_EFFECTS.length)
    expect(new Set(ids).size).toBe(STUDIO_EFFECTS.length)
    expect(ids.every((id) => Number.isInteger(id) && id >= 0)).toBe(true)
  })

  it('maps every visible Settings, Processing, and Post-Processing control into runtime output', () => {
    expect(getUnmappedStudioControls()).toEqual([])
  })

  it('changes runtime signature when any selected-effect control changes', () => {
    const defaults = createDefaultStudioEffectControls()

    for (const effect of STUDIO_EFFECTS) {
      const baseControls = defaults[effect.id]
      const baseSignature = signatureFor(effect.id, baseControls)

      for (const control of effect.settingGroups.flatMap((group) => group.controls)) {
        if (
          effect.id === 'voronoi' && VORONOI_DEDICATED_COLOR_CONTROL_IDS.includes(
            control.id as typeof VORONOI_DEDICATED_COLOR_CONTROL_IDS[number],
          )
          || effect.id === 'pixel-sort'
            && PIXEL_SORT_DEDICATED_CONTROL_IDS.includes(
              control.id as typeof PIXEL_SORT_DEDICATED_CONTROL_IDS[number],
            )
        ) continue
        const nextControls = {
          ...baseControls,
          [control.id]: changedValueFor(control),
        }

        expect(signatureFor(effect.id, nextControls), `${effect.id}.${control.id}`).not.toEqual(baseSignature)
      }
    }
  })

  it('changes runtime signature when any shared Processing or Post-Processing control changes', () => {
    const defaults = createDefaultStudioEffectControls()

    for (const effect of STUDIO_EFFECTS) {
      const sharedControls = [
        ...getStudioProcessingGroups(effect.id),
        ...STUDIO_COMMON_POST_PROCESSING_GROUPS,
      ].flatMap((group) => group.controls)
      const baseControls = defaults[effect.id]
      const baseSignature = signatureFor(effect.id, baseControls)

      for (const control of sharedControls) {
        const nextControls = {
          ...baseControls,
          [control.id]: changedValueFor(control),
        }

        expect(signatureFor(effect.id, nextControls), `${effect.id}.${control.id}`).not.toEqual(baseSignature)
      }
    }
  })

  it('changes runtime signature for every select option', () => {
    const defaults = createDefaultStudioEffectControls()

    for (const effect of STUDIO_EFFECTS) {
      const selectControls = effect.settingGroups
        .flatMap((group) => group.controls)
        .filter((control) => control.kind === 'select')

      for (const control of selectControls) {
        const signatures = control.options.map((option) => signatureFor(effect.id, {
          ...defaults[effect.id],
          [control.id]: option.value,
        }))

        expect(new Set(signatures).size, `${effect.id}.${control.id}`).toBe(control.options.length)
      }
    }
  })

  it('defines ASCII Size and Scale with corrected control semantics', () => {
    const ascii = STUDIO_EFFECTS.find((effect) => effect.id === 'ascii')
    const controls = Object.fromEntries(
      ascii?.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]) ?? []
    )
    expect(ascii?.settingGroups[0]?.controls.slice(0, 3).map((control) => control.id)).toEqual([
      'size',
      'scale',
      'character-set',
    ])

    expect(controls.scale).toMatchObject({
      kind: 'range',
      min: 1,
      max: 20,
      step: 0.1,
    })
    expect(controls.size).toMatchObject({
      kind: 'range',
      label: 'Size',
      defaultValue: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
    })
    expect(controls).not.toHaveProperty('spacing')
    expect(controls).not.toHaveProperty('output-width')

    expect(compileStudioEffectRuntime({
      selectedEffectId: 'ascii',
      controls: { ...createDefaultStudioEffectControls().ascii, size: 1.7 },
    }).effectValues[1]).toBe(1.7)
    expect(compileStudioEffectRuntime({
      selectedEffectId: 'ascii',
      controls: {},
    }).effectValues[1]).toBe(1)
    expect(compileStudioEffectRuntime({
      selectedEffectId: 'ascii',
      controls: { spacing: 0.75 },
    }).effectValues[1]).toBe(1)
  })

  it('defaults ASCII Color Mode to mono for initial state and resets', () => {
    const defaultControls = createDefaultStudioEffectControls().ascii
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'ascii',
      controls: defaultControls,
    })

    expect(defaultControls['color-mode']).toBe('mono')
    expect(runtime.effectValues[11]).toBe(0)
  })

  it('maps ASCII Foreground and Background color controls into runtime colors', () => {
    const ascii = STUDIO_EFFECTS.find((effect) => effect.id === 'ascii')
    const controls = Object.fromEntries(
      ascii?.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]) ?? []
    )
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'ascii',
      controls: {
        ...createDefaultStudioEffectControls().ascii,
        foreground: '#123456',
        background: '#abcdef',
      },
    })

    expect(controls.foreground).toMatchObject({
      kind: 'color',
      label: 'Foreground',
    })
    expect(runtime.effectColorA).toEqual([
      0x12 / 255,
      0x34 / 255,
      0x56 / 255,
    ])
    expect(runtime.effectColorB).toEqual([
      0xab / 255,
      0xcd / 255,
      0xef / 255,
    ])
  })

  it('uses Studio Dithering algorithm ids instead of catalogue ordinals', () => {
    const defaults = createDefaultStudioEffectControls().dithering

    expect(compileStudioEffectRuntime({
      selectedEffectId: 'dithering',
      controls: { ...defaults, algorithm: 'floyd-steinberg' },
    }).effectValues[0]).toBe(0)
    expect(compileStudioEffectRuntime({
      selectedEffectId: 'dithering',
      controls: { ...defaults, algorithm: 'bayer-8x8' },
    }).effectValues[0]).toBe(10)
    expect(compileStudioEffectRuntime({
      selectedEffectId: 'dithering',
      controls: { ...defaults, algorithm: 'crosshatch' },
    }).effectValues[0]).toBe(20)
  })

  it('keeps Dithering matrix size in source-pixel units', () => {
    const defaults = createDefaultStudioEffectControls().dithering

    expect(compileStudioEffectRuntime({
      selectedEffectId: 'dithering',
      controls: defaults,
    }).effectValues[2]).toBe(4)
    expect(compileStudioEffectRuntime({
      selectedEffectId: 'dithering',
      controls: { ...defaults, 'matrix-size': '16' },
    }).effectValues[2]).toBe(16)
  })

  it('keeps Halftone values in the renderer units verified from Studio', () => {
    const defaults = createDefaultStudioEffectControls().halftone
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'halftone',
      controls: {
        ...defaults,
        shape: 'diamond',
        'dot-scale': 1.7,
        spacing: 13,
        angle: 65,
        invert: true,
        brightness: 40,
        contrast: -25,
        'color-mode': 'color',
        foreground: '#123456',
        background: '#abcdef',
      },
    })

    expect(runtime.effectValues.slice(0, 8)).toEqual([
      2,
      1.7,
      13,
      65,
      1,
      0.4,
      -0.25,
      1,
    ])
    expect(runtime.effectColorA).toEqual([0x12 / 255, 0x34 / 255, 0x56 / 255])
    expect(runtime.effectColorB).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
  })

  it('packs Matrix Rain controls in Studio uniform units and preserves custom glyphs', () => {
    const defaults = createDefaultStudioEffectControls()['matrix-rain']
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'matrix-rain',
      controls: {
        ...defaults,
        'character-set': 'custom',
        'custom-chars': '雨電01',
        'cell-size': 24,
        spacing: 0.35,
        speed: 2.4,
        'trail-length': 27,
        direction: 'left',
        glow: 1.6,
        'bg-opacity': 0.65,
        brightness: 40,
        contrast: -25,
        threshold: 0.18,
        'foreground': '#654321',
        'rain-color': '#12ab34',
        'background': '#f4f1e8',
      },
    })

    expect(runtime.effectValues.slice(0, 11)).toEqual([
      9,
      24,
      0.35,
      2.4,
      27,
      3,
      1.6,
      0.65,
      0.4,
      -0.25,
      0.18,
    ])
    expect(runtime.effectColorA).toEqual([0x12 / 255, 0xab / 255, 0x34 / 255])
    expect(runtime.effectColorB).toEqual([0x65 / 255, 0x43 / 255, 0x21 / 255])
    expect(runtime.effectValues.slice(11, 14)).toEqual([
      0xf4 / 255,
      0xf1 / 255,
      0xe8 / 255,
    ])
    expect(runtime.customGlyphChars).toBe('雨電01')
    expect(runtime.customGlyphCount).toBe(4)
    expect(runtime.customGlyphHash).toBeGreaterThan(0)
  })

  it('uses the Matrix Rain Opacity fallback when controls are absent', () => {
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'matrix-rain',
      controls: {},
    })

    expect(runtime.effectValues[7]).toBe(0.5)
  })

  it('packs Dots controls in the exact production uniform units and ids', () => {
    const defaults = createDefaultStudioEffectControls().dots
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'dots',
      controls: {
        ...defaults,
        shape: 'diamond',
        'grid-type': 'hex',
        size: 1.7,
        spacing: 1.4,
        invert: true,
        brightness: 40,
        contrast: -25,
        'color-mode': 'custom',
        foreground: '#12ab34',
        background: '#abcdef',
      },
    })

    expect(runtime.effectValues.slice(0, 8)).toEqual([
      2,
      1,
      1.7,
      1.4,
      1,
      0.4,
      -0.25,
      1,
    ])
    expect(runtime.effectColorA).toEqual([0x12 / 255, 0xab / 255, 0x34 / 255])
    expect(runtime.effectColorB).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
  })

  it('packs Contour controls in the exact production uniform units and ids', () => {
    const defaults = createDefaultStudioEffectControls().contour
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'contour',
      controls: {
        ...defaults,
        'fill-mode': 'lines',
        levels: 17,
        'line-thickness': 2.25,
        invert: true,
        brightness: 40,
        contrast: -25,
        'color-mode': 'custom',
        'line-color': '#123456',
        background: '#abcdef',
      },
    })

    expect(runtime.effectValues.slice(0, 7)).toEqual([
      1,
      17,
      2.25,
      1,
      0.4,
      -0.25,
      2,
    ])
    expect(runtime.effectColorA).toEqual([0x12 / 255, 0x34 / 255, 0x56 / 255])
    expect(runtime.effectColorB).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
    expect(runtime.customGlyphChars).toBe('')
    expect(runtime.customGlyphCount).toBe(0)
  })

  it('packs Pixel Sort controls in the exact production uniform units and ids', () => {
    const defaults = createDefaultStudioEffectControls()['pixel-sort']
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'pixel-sort',
      controls: {
        ...defaults,
        direction: 'radial',
        'sort-mode': 'saturation',
        threshold: 0.45,
        'streak-length': 270,
        intensity: 0.65,
        randomness: 0.75,
        reverse: true,
        brightness: 40,
        contrast: -25,
      },
    })

    expect(runtime.effectValues.slice(0, 9)).toEqual([
      4,
      2,
      0.45,
      270,
      0.65,
      0.75,
      1,
      0.4,
      -0.25,
    ])
    expect(runtime.effectColorA).toEqual([1, 1, 1])
    expect(runtime.effectColorB).toEqual([0, 0, 0])

    expect(compileStudioEffectRuntime({
      selectedEffectId: 'pixel-sort',
      controls: { ...defaults, 'sort-mode': 'depth' },
    }).effectValues[1]).toBe(4)

    expect(['horizontal', 'vertical', 'diagonal', 'anti-diagonal', 'radial'].map((direction) => (
      compileStudioEffectRuntime({
        selectedEffectId: 'pixel-sort',
        controls: { ...defaults, direction },
      }).effectValues[0]
    ))).toEqual([0, 1, 2, 3, 4])

    expect(compileStudioEffectRuntime({
      selectedEffectId: 'pixel-sort',
      controls: {},
    }).effectValues[3]).toBe(500)
    expect(compileStudioEffectRuntime({
      selectedEffectId: 'pixel-sort',
      controls: {},
    }).effectValues[4]).toBe(1)
    expect(compileStudioEffectRuntime({
      selectedEffectId: 'pixel-sort',
      controls: {},
    }).effectValues[5]).toBe(0.5)
  })

  it('packs Blockify controls in the exact production uniform units and ids', () => {
    const defaults = createDefaultStudioEffectControls().blockify
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'blockify',
      controls: {
        ...defaults,
        style: 'outline',
        'block-size': 17,
        'border-width': 2.5,
        brightness: 40,
        contrast: -25,
        'color-mode': 'grayscale',
        'foreground': '#123456',
        'background': '#abcdef',
      },
    })

    expect(runtime.effectValues.slice(0, 6)).toEqual([
      2,
      17,
      2.5,
      0.4,
      -0.25,
      1,
    ])
    expect(runtime.effectColorA).toEqual([0x12 / 255, 0x34 / 255, 0x56 / 255])
    expect(runtime.effectColorB).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
  })

  it('packs Threshold controls in the exact production uniform units and ids', () => {
    const defaults = createDefaultStudioEffectControls().threshold
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'threshold',
      controls: {
        ...defaults,
        levels: 7,
        'threshold-point': 0.65,
        dither: true,
        invert: true,
        brightness: 40,
        contrast: -25,
        'color-mode': 'color',
        foreground: '#123456',
        background: '#abcdef',
      },
    })

    expect(runtime.effectValues.slice(0, 7)).toEqual([
      7,
      1,
      0.65,
      0.4,
      -0.25,
      1,
      1,
    ])
    expect(runtime.effectColorA).toEqual([0x12 / 255, 0x34 / 255, 0x56 / 255])
    expect(runtime.effectColorB).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
  })

  it('packs Edge Detection controls in the exact production uniform units and ids', () => {
    const defaults = createDefaultStudioEffectControls()['edge-detection']
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'edge-detection',
      controls: {
        ...defaults,
        algorithm: 'laplacian',
        threshold: 0.65,
        'line-width': 3.5,
        invert: true,
        brightness: 40,
        contrast: -25,
        'color-mode': 'original',
        'edge-color': '#123456',
        background: '#abcdef',
      },
    })

    expect(runtime.effectValues.slice(0, 7)).toEqual([
      0.65,
      3.5,
      1,
      2,
      0.4,
      -0.25,
      1,
    ])
    expect(runtime.effectColorA).toEqual([0x12 / 255, 0x34 / 255, 0x56 / 255])
    expect(runtime.effectColorB).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
  })

  it('packs Crosshatch controls in exact physical units', () => {
    const defaults = createDefaultStudioEffectControls().crosshatch
    expect(compileStudioEffectRuntime({
      selectedEffectId: 'crosshatch',
      controls: defaults,
    }).effectValues[3]).toBe(0.08)

    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'crosshatch',
      controls: {
        ...defaults,
        density: 11,
        angle: 90,
        layers: 4,
        'line-width': 0.75,
        brightness: 40,
        contrast: -25,
        invert: true,
        randomness: 0.75,
        'background-density': 40,
        'background-layers': 4,
        'background-angle': 15,
        'background-line-width': 0.24,
        'background-randomness': 0.35,
        'background-speed': 2.4,
        'line-color': '#123456',
        background: '#abcdef',
      },
    })

    expect(runtime.effectValues.slice(0, 14)).toEqual([
      11,
      Math.PI / 2,
      4,
      0.75,
      0.4,
      -0.25,
      1,
      0.75,
      40,
      4,
      Math.PI / 12,
      0.24,
      0.35,
      2.4,
    ])
    expect(runtime.effectColorA).toEqual([0x12 / 255, 0x34 / 255, 0x56 / 255])
    expect(runtime.effectColorB).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
  })

  it('packs Wave Lines controls in exact production units and preserves the below-minimum default thickness', () => {
    const defaults = createDefaultStudioEffectControls()['wave-lines']
    expect(compileStudioEffectRuntime({
      selectedEffectId: 'wave-lines',
      controls: defaults,
    }).effectValues[4]).toBe(0.4)

    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'wave-lines',
      controls: {
        ...defaults,
        'line-count': 125,
        amplitude: 42,
        frequency: 2.4,
        'line-thickness': 1.7,
        direction: 'vertical',
        animate: false,
        brightness: 40,
        contrast: -25,
        'color-mode': 'custom',
        'line-color': '#123456',
        background: '#abcdef',
      },
    })

    expect(runtime.effectValues.slice(0, 9)).toEqual([
      125, 42, 2.4, 1, 1.7, 0.4, -0.25, 1, 0,
    ])
    expect(runtime.effectColorA).toEqual([0x12 / 255, 0x34 / 255, 0x56 / 255])
    expect(runtime.effectColorB).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
  })

  it('packs Noise Field controls in exact production units and ids', () => {
    const defaults = createDefaultStudioEffectControls()['noise-field']
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'noise-field',
      controls: {
        ...defaults,
        'noise-type': 'worley',
        scale: 85,
        intensity: 2.4,
        speed: 1.7,
        octaves: 7,
        animate: false,
        brightness: 40,
        contrast: -25,
        'distort-only': true,
        foreground: '#123456',
        background: '#abcdef',
      },
    })

    expect(runtime.effectValues.slice(0, 9)).toEqual([
      85, 2.4, 1.7, 7, 0, 0.4, -0.25, 2, 1,
    ])
    expect(runtime.effectColorA).toEqual([0x12 / 255, 0x34 / 255, 0x56 / 255])
    expect(runtime.effectColorB).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
  })

  it('packs Voronoi controls in exact production units and numeric ids', () => {
    const defaults = createDefaultStudioEffectControls().voronoi
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'voronoi',
      controls: {
        ...defaults,
        'cell-size': 85,
        'edge-width': 0.65,
        'edge-color': '#123456',
        'fill-canvas': true,
        background: '#abcdef',
        randomize: 0.35,
        brightness: 40,
        contrast: -25,
      },
    })

    expect(runtime.effectValues.slice(0, 6)).toEqual([
      85, 0.65, 0.35, 0.4, -0.25, 1,
    ])
    expect(runtime.effectColorA).toEqual([0x12 / 255, 0x34 / 255, 0x56 / 255])
    expect(runtime.effectColorB).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
  })

  it('packs VHS controls in exact production units and does not confuse Post Scanlines', () => {
    const defaults = createDefaultStudioEffectControls().vhs
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'vhs',
      controls: {
        ...defaults,
        distortion: 0.8,
        noise: 0.65,
        'color-bleed': 0.4,
        'vhs-scanlines': 0.75,
        'tracking-error': 0.55,
        brightness: 40,
        contrast: -25,
        scanlines: true,
        'chroma-blur': 0.25,
        saturation: 1.25,
        'red-gain': 1.4,
        'green-gain': 0.85,
        'blue-gain': 0.65,
        background: '#abcdef',
      },
    })

    expect(runtime.effectValues.slice(0, 12)).toEqual([
      0.8, 0.65, 0.4, 0.75, 0.55, 0.4, -0.25, 0.25, 1.25, 1.4, 0.85, 0.65,
    ])
    expect(runtime.postValues[5]).toBe(1)
    expect(runtime.effectColorB).toEqual([0xab / 255, 0xcd / 255, 0xef / 255])
  })

  it('packs the expanded Post-Processing controls without changing legacy slots', () => {
    expect(POST_VALUE_SLOT_COUNT).toBe(28)
    const defaults = createDefaultStudioEffectControls().ascii
    const runtime = compileStudioEffectRuntime({
      selectedEffectId: 'ascii',
      controls: {
        ...defaults,
        bloom: true,
        'bloom-threshold': 0.7,
        'bloom-soft-threshold': 0.35,
        'bloom-intensity': 1.8,
        'bloom-radius': 16,
        grain: true,
        'grain-mode': 'pixel',
        'grain-intensity': 125,
        'grain-size': 7,
        'grain-speed': 150,
        chromatic: true,
        'chromatic-offset': 22,
        scanlines: true,
        'scanline-opacity': 0.65,
        'scanline-spacing': 9,
        'scanline-offset': 13,
        'scanline-speed': 2.5,
        'scanline-direction': 'up',
        vignette: true,
        'vignette-intensity': 0.8,
        'vignette-radius': 0.3,
        'crt-curve': true,
        'crt-amount': 0.25,
        phosphor: true,
        'phosphor-color': 'custom',
        'phosphor-custom-color': '#123456',
      },
    })

    expect(runtime.postValues).toEqual([
      1, 1.25, 0.7, 1.5, 1, 1, 1, 1, 1,
      0.7, 0.35, 1.8, 0.8, 1, 22, 0.65, 9, 0.8, 0.3, 0.25, 3,
      0x12 / 255, 0x34 / 255, 0x56 / 255, 13, 2.5, 0, 1,
    ])
  })
})

function signatureFor(
  selectedEffectId: StudioEffectId,
  controls: Record<string, StudioControlValue>,
) {
  return JSON.stringify(compileStudioEffectRuntime({
    selectedEffectId,
    controls,
  }))
}

function changedValueFor(control: StudioEffectControl): StudioControlValue {
  if (control.kind === 'range') {
    return control.defaultValue === control.max ? control.min : control.max
  }

  if (control.kind === 'toggle') {
    return !control.defaultValue
  }

  if (control.kind === 'select') {
    return control.options.find((option) => option.value !== control.defaultValue)?.value ?? control.defaultValue
  }

  if (control.kind === 'text') {
    return `${control.defaultValue}X`
  }

  return control.defaultValue.toLowerCase() === '#123456' ? '#654321' : '#123456'
}
