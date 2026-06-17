import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  createColorCss,
  createGradientCss,
  normalizeGradientStops,
  parseGradientCssSettings,
  parseCssColorOpacity,
  parseCssColorToHex,
  parseGradientCssStops,
  readGradientAngle,
  readGradientStopOpacity,
  readGradientType,
  readStopInsertionPosition,
} from './GradientColorPicker'

describe('GradientColorPicker helpers', () => {
  it('renders a single-color bar without stops for solid styles', () => {
    expect(createGradientCss('#123456', [])).toBe('#123456')
  })

  it('normalizes gradient stops by clamping, sorting, and preserving at least two stops', () => {
    expect(
      normalizeGradientStops([
        { color: '#ffffff', position: 1.5 },
        { color: 'bad', position: 0.5 },
        { color: '#000000', position: -1 },
      ])
    ).toEqual([
      { color: '#000000', position: 0 },
      { color: '#ffffff', position: 1 },
    ])
  })

  it('creates a CSS gradient from normalized stops', () => {
    expect(
      createGradientCss('#000000', [
        { color: '#000000', position: 0 },
        { color: '#ffffff', position: 1, opacity: 0.5 },
      ])
    ).toBe('linear-gradient(90deg, #000000 0%, rgba(255, 255, 255, 0.5) 100%)')
    expect(
      createGradientCss(
        '#000000',
        [
          { color: '#000000', position: 0 },
          { color: '#ffffff', position: 1 },
        ],
        { gradientType: 'linear', gradientAngle: 45 }
      )
    ).toBe('linear-gradient(45deg, #000000 0%, #ffffff 100%)')
    expect(
      createGradientCss(
        '#000000',
        [
          { color: '#000000', position: 0 },
          { color: '#ffffff', position: 1 },
        ],
        { gradientType: 'radial', gradientAngle: 45 }
      )
    ).toBe('radial-gradient(circle, #000000 0%, #ffffff 100%)')
  })

  it('creates rgba color strings for transparent solid colors', () => {
    expect(createColorCss('#112233', 0.25)).toBe('rgba(17, 34, 51, 0.25)')
    expect(createColorCss('#112233', 1)).toBe('#112233')
  })

  it('reads pointer insertion positions from the bar bounds', () => {
    expect(readStopInsertionPosition(25, { left: 10, width: 60 })).toBe(0.25)
    expect(readStopInsertionPosition(-10, { left: 10, width: 60 })).toBe(0)
    expect(readStopInsertionPosition(100, { left: 10, width: 60 })).toBe(1)
  })

  it('parses package CSS gradient output into normalized stops', () => {
    expect(
      parseGradientCssStops('linear-gradient(90deg, rgba(255, 0, 0, 0.25) 0%, #00ff00 50%, rgb(0, 0, 255) 100%)')
    ).toEqual([
      { color: '#ff0000', position: 0, opacity: 0.25 },
      { color: '#00ff00', position: 0.5 },
      { color: '#0000ff', position: 1 },
    ])
  })

  it('parses package CSS gradient type and angle output', () => {
    expect(parseGradientCssSettings('linear-gradient(315deg, rgba(255, 0, 0, 0.25) 0%, #00ff00 100%)')).toEqual({
      gradientType: 'linear',
      gradientAngle: 315,
    })
    expect(parseGradientCssSettings('radial-gradient(circle, rgba(255, 0, 0, 0.25) 0%, #00ff00 100%)')).toEqual({
      gradientType: 'radial',
      gradientAngle: 90,
    })
    expect(readGradientType('radial')).toBe('radial')
    expect(readGradientType('bad')).toBe('linear')
    expect(readGradientAngle(-45)).toBe(315)
    expect(readGradientAngle(405)).toBe(45)
  })

  it('converts package solid color output to hex and opacity', () => {
    expect(parseCssColorToHex('rgba(17, 34, 51, 1)', '#000000')).toBe('#112233')
    expect(parseCssColorOpacity('rgba(17, 34, 51, 0.4)', 1)).toBe(0.4)
    expect(parseCssColorToHex('#abcDEF', '#000000')).toBe('#abcdef')
    expect(parseCssColorOpacity('#abcdef', 0.75)).toBe(0.75)
    expect(parseCssColorToHex('bad', '#123456')).toBe('#123456')
    expect(readGradientStopOpacity({ opacity: 0.5 })).toBe(0.5)
    expect(readGradientStopOpacity({})).toBe(1)
  })

  it('keeps the package draft value stable so selected gradient stops are not reset on every render', async () => {
    const source = await readFile(join(process.cwd(), 'components/studio/GradientColorPicker.tsx'), 'utf8')

    expect(source).toContain('useState')
    expect(source).toContain('setPickerValue((currentValue)')
    expect(source).toContain('schedulePickerCommit(nextValue)')
    expect(source).not.toContain('const pickerValue = showStops\n    ? createGradientCss')
  })

  it('does not write unchanged picker values back to the store', async () => {
    const source = await readFile(join(process.cwd(), 'components/studio/GradientColorPicker.tsx'), 'utf8')

    expect(source).toContain('latestPropsRef')
    expect(source).toContain('if (!isGradient)')
    expect(source).toContain('if (!areGradientStopsEqual')
    expect(source).toContain('if (nextColor !== color)')
    expect(source).toContain('parseCssColorOpacity(nextValue, opacity)')
    expect(source).toContain('parseGradientCssSettings(nextValue)')
    expect(source).toContain("parsedGradientSettings.gradientType === 'radial'")
    expect(source).toContain('onGradientSettingsChange?.(nextGradientSettings)')
    expect(source).toContain('if (isGradient)')
  })

  it('preserves the package gradient draft string so selected stops can change', async () => {
    const source = await readFile(join(process.cwd(), 'components/studio/GradientColorPicker.tsx'), 'utf8')

    expect(source).toContain('handlePickerChange')
    expect(source).toContain('setPickerValue((currentValue)')
    expect(source).toContain('currentValue === nextValue ? currentValue : nextValue')
    expect(source).not.toContain('isSamePickerValue')
  })

  it('debounces store writes while the picker is dragged quickly', async () => {
    const source = await readFile(join(process.cwd(), 'components/studio/GradientColorPicker.tsx'), 'utf8')

    expect(source).toContain('commitTimerRef')
    expect(source).toContain('schedulePickerCommit(nextValue)')
    expect(source).toContain('window.setTimeout')
    expect(source).toContain('commitPickerValue(pickerValue)')
  })

  it('lets the package picker expose solid, opacity, gradient type, and gradient angle controls when gradient is allowed', async () => {
    const source = await readFile(join(process.cwd(), 'components/studio/GradientColorPicker.tsx'), 'utf8')

    expect(source).toContain('hideOpacity={false}')
    expect(source).toContain('hideControls={!allowGradient}')
    expect(source).toContain('hideGradientType={!allowGradient}')
    expect(source).toContain('hideGradientAngle={!allowGradient}')
    expect(source).toContain("onModeChange?.('gradient')")
    expect(source).toContain("onModeChange?.('solid')")
  })

  it('keeps the picker in a draggable floating portal opened by a color preview button', async () => {
    const source = await readFile(join(process.cwd(), 'components/studio/GradientColorPicker.tsx'), 'utf8')

    expect(source).toContain('Portal')
    expect(source).toContain('Button')
    expect(source).toContain('ActionIcon')
    expect(source).toContain('{opened ? (')
    expect(source).toContain('setPickerValue(externalPickerValue)')
    expect(source).toContain('setOpened(true)')
    expect(source).toContain('background: pickerValue')
    expect(source).toContain('pickerPanelRef')
    expect(source).toContain('handlePanelPointerDown')
    expect(source).toContain('handlePanelPointerMove')
    expect(source).toContain('handleWindowPointerDown')
    expect(source).toContain("position: 'fixed'")
    expect(source).toContain("background: '#191919'")
    expect(source).toContain('borderRadius: 16')
    expect(source).toContain('padding: 16')
    expect(source).toContain('aria-label="Close color picker"')
  })
})
