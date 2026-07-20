import { describe, expect, it } from 'vitest'

import {
  createDefaultGrainradEffectControls,
  getGrainradControlDefaultValue,
  getGrainradEffectById,
  isGrainradControlVisible,
} from './grainrad-effects'

const MATRIX_CUSTOM_DEFAULT =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789'

describe('Grainrad Matrix Rain schema', () => {
  it('publishes an independent renderer and the exact current Settings order', () => {
    const definition = getGrainradEffectById('matrix-rain')

    expect(definition.renderer).toBe('matrix-rain')
    expect(definition.settingGroups.map((group) => group.title)).toEqual([
      'Matrix Rain',
      'Adjustments',
      'Color',
    ])
    expect(definition.settingGroups.flatMap((group) => group.controls.map((control) => control.id))).toEqual([
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
      'foreground', 'rain-color', 'background',
    ])
  })

  it('matches every Matrix Rain option, default, range, and step', () => {
    const definition = getGrainradEffectById('matrix-rain')
    const controls = Object.fromEntries(
      definition.settingGroups.flatMap((group) => group.controls).map((control) => [control.id, control]),
    )

    expect(controls['character-set']).toMatchObject({
      kind: 'select',
      defaultValue: 'standard',
      options: [
        { value: 'standard', label: 'STANDARD' },
        { value: 'blocks', label: 'BLOCKS' },
        { value: 'binary', label: 'BINARY' },
        { value: 'detailed', label: 'DETAILED' },
        { value: 'minimal', label: 'MINIMAL' },
        { value: 'alphabetic', label: 'ALPHABETIC' },
        { value: 'numeric', label: 'NUMERIC' },
        { value: 'math', label: 'MATH' },
        { value: 'emoji', label: 'SYMBOLS' },
        { value: 'custom', label: 'CUSTOM' },
      ],
    })
    expect(controls['custom-chars']).toMatchObject({
      kind: 'text',
      defaultValue: MATRIX_CUSTOM_DEFAULT,
      visibleWhen: { controlId: 'character-set', operator: 'equals', value: 'custom' },
    })
    expect(controls['cell-size']).toMatchObject({ defaultValue: 12, min: 4, max: 32, step: 1 })
    expect(controls.spacing).toMatchObject({ defaultValue: 0, min: 0, max: 1, step: 0.05 })
    expect(controls.speed).toMatchObject({ defaultValue: 1, min: 0.5, max: 3, step: 0.1 })
    expect(controls['trail-length']).toMatchObject({ defaultValue: 15, min: 5, max: 30, step: 1 })
    expect(controls.direction).toMatchObject({
      defaultValue: 'down',
      options: [
        { value: 'down', label: 'Down' },
        { value: 'up', label: 'Up' },
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
      ],
    })
    expect(controls.glow).toMatchObject({ defaultValue: 1, min: 0, max: 4, step: 0.1 })
    expect(controls['bg-opacity']).toMatchObject({
      label: 'Rain Opacity',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
    })
    expect(controls.brightness).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.contrast).toMatchObject({ defaultValue: 0, min: -100, max: 100, step: 1 })
    expect(controls.threshold).toMatchObject({ defaultValue: 0, min: 0, max: 0.5, step: 0.01 })
    expect(controls.foreground).toMatchObject({ kind: 'color', label: 'Foreground', defaultValue: '#ffffff' })
    expect(getGrainradControlDefaultValue(controls.foreground, 'light')).toBe('#10da14')
    expect(getGrainradControlDefaultValue(controls.foreground, 'dark')).toBe('#36d00b')
    expect(controls['rain-color']).toMatchObject({ kind: 'color', defaultValue: '#00ff00' })
    expect(getGrainradControlDefaultValue(controls['rain-color'], 'light')).toBe('#24ee20')
    expect(getGrainradControlDefaultValue(controls['rain-color'], 'dark')).toBe('#00ff00')
    expect(controls.background).toMatchObject({ kind: 'color', label: 'Background', defaultValue: '#000000' })
    expect(getGrainradControlDefaultValue(controls.background, 'dark')).toBe('#000000')
    expect(getGrainradControlDefaultValue(controls.background, 'light')).toBe('#f4f1e8')
    expect(controls.density).toBeUndefined()
  })

  it('shows Custom Chars only for the custom Matrix character set', () => {
    const definition = getGrainradEffectById('matrix-rain')
    const customChars = definition.settingGroups
      .flatMap((group) => group.controls)
      .find((control) => control.id === 'custom-chars')!
    const defaults = createDefaultGrainradEffectControls()['matrix-rain']

    expect(isGrainradControlVisible(customChars, defaults)).toBe(false)
    expect(isGrainradControlVisible(customChars, {
      ...defaults,
      'character-set': 'custom',
    })).toBe(true)
  })
})
