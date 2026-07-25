import { describe, expect, it } from 'vitest'

import {
  applyAdaptiveIntensity,
  DEFAULT_DITHERING_SETTINGS,
  DITHERING_ALGORITHM_IDS,
  renderDitheringReference,
} from './dithering-core'

describe('Dithering CPU reference', () => {
  it('renders the default Bayer 8x8 mono fixture on a 4px source grid', () => {
    const grayscale = new Uint8ClampedArray([
      1, 255, 255, 255, 127, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255,
    ])

    const output = renderDitheringReference({
      grayscale,
      width: 8,
      height: 4,
      settings: DEFAULT_DITHERING_SETTINGS,
    })

    expect(output).toEqual({
      channels: 1,
      data: new Uint8ClampedArray([
        255, 255, 255, 255, 0, 0, 0, 0,
        255, 255, 255, 255, 0, 0, 0, 0,
        255, 255, 255, 255, 0, 0, 0, 0,
        255, 255, 255, 255, 0, 0, 0, 0,
      ]),
      height: 4,
      width: 8,
    })
  })

  it('adds Brightness / 100 before thresholding', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray([128]),
      width: 1,
      height: 1,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        brightness: -100,
      },
    })

    expect(output.data).toEqual(new Uint8ClampedArray([0]))
  })

  it('applies Studio contrast around the 0.5 midpoint', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 150, 0]),
      width: 8,
      height: 1,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        contrast: 100,
        matrixSize: 2,
      },
    })

    expect(output.data[6]).toBe(255)
  })

  it('applies Gamma as pow(luminance, 1 / gamma)', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray([0, 0, 64, 0]),
      width: 4,
      height: 1,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        gamma: 2,
        matrixSize: 2,
      },
    })

    expect(output.data[2]).toBe(255)
  })

  it('applies Sharpen as a five-sample Laplacian before thresholding', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray([0, 0, 127, 0]),
      width: 4,
      height: 1,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        matrixSize: 2,
        sharpen: 1,
      },
    })

    expect(output.data[2]).toBe(255)
  })

  it('increases ordered foreground coverage as Intensity rises around neutral', () => {
    const coverage = [0.1, 1, 2].map((intensity) => {
      const output = renderDitheringReference({
        grayscale: new Uint8ClampedArray(16 * 16).fill(128),
        width: 16,
        height: 16,
        settings: {
          ...DEFAULT_DITHERING_SETTINGS,
          algorithm: 'bayer-4x4',
          intensity,
          matrixSize: 4,
        },
      })

      return output.data.reduce((count, value) => count + (value > 0 ? 1 : 0), 0)
    })

    expect(coverage[0]).toBeLessThan(coverage[1])
    expect(coverage[1]).toBeLessThan(coverage[2])
  })

  it('increases single Diffusion foreground coverage as Intensity rises', () => {
    const coverage = [0.1, 1, 2].map((intensity) => {
      const output = renderDitheringReference({
        grayscale: new Uint8ClampedArray(16 * 16).fill(128),
        width: 16,
        height: 16,
        settings: {
          ...DEFAULT_DITHERING_SETTINGS,
          algorithm: 'floyd-steinberg',
          intensity,
        },
      })

      return output.data.reduce((count, value) => count + (value > 0 ? 1 : 0), 0)
    })

    expect(coverage[0]).toBeLessThan(coverage[1])
    expect(coverage[1]).toBeLessThan(coverage[2])
  })

  it('keeps adaptive foreground luminance increasing with Intensity', () => {
    expect(applyAdaptiveIntensity(0.5, 0.1)).toBeCloseTo(0.23)
    expect(applyAdaptiveIntensity(0.5, 1)).toBeCloseTo(0.5)
    expect(applyAdaptiveIntensity(0.5, 2)).toBeCloseTo(0.8)
  })

  it('owns Studio algorithm ids inside the Dithering effect', () => {
    expect(DITHERING_ALGORITHM_IDS).toEqual({
      'floyd-steinberg': 0,
      'bayer-2x2': 8,
      'bayer-4x4': 9,
      'bayer-8x8': 10,
      'bayer-16x16': 11,
      'clustered-dot': 14,
      'interleaved-gradient': 19,
    })
  })

  it('uses the exact ordered threshold period for each Bayer algorithm', () => {
    expect(renderCell('bayer-2x2', 2, 13)).toBe(255)
    expect(renderCell('bayer-4x4', 2, 13)).toBe(0)

    expect(renderCell('bayer-4x4', 4, 5)).toBe(255)
    expect(renderCell('bayer-8x8', 4, 5)).toBe(0)

    expect(renderCell('bayer-8x8', 8, 5)).toBe(255)
    expect(renderCell('bayer-16x16', 8, 5)).toBe(0)
  })

  it('uses Studio interleaved-gradient noise at the quantized pixel position', () => {
    expect(renderCell('interleaved-gradient', 1, 50)).toBe(255)
  })

  it('keeps the single Diffusion approximation at the former ID-0 spread', () => {
    expect(renderCell('floyd-steinberg', 1, 149)).toBe(0)
    expect(renderCell('floyd-steinberg', 1, 152)).toBe(255)
  })

  it('returns an interleaved RGB buffer quantized to the requested depth', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray([128, 128, 128, 128]),
      width: 4,
      height: 1,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        colorMode: 'rgb',
        levels: 4,
        matrixSize: 2,
      },
    })

    expect(output).toEqual({
      channels: 3,
      data: new Uint8ClampedArray([
        85, 85, 85,
        85, 85, 85,
        170, 170, 170,
        170, 170, 170,
      ]),
      height: 1,
      width: 4,
    })
  })

  it('grows Clustered Dot radius from darkness inside matrixSize * 2 cells', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray(16).fill(128),
      width: 4,
      height: 4,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        algorithm: 'clustered-dot',
        matrixSize: 2,
      },
    })

    expect(output.data[0]).toBe(0)
    expect(output.data[2 * 4 + 2]).toBe(255)
  })

  it('uses Tonal levels to blend between Background and Foreground', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray(4).fill(128),
      width: 4,
      height: 1,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        background: [10, 20, 30],
        colorMode: 'tonal',
        foreground: [200, 100, 50],
        levels: 4,
        matrixSize: 2,
      },
    })

    expect(output.channels).toBe(3)
    expect(Array.from(output.data.slice(6, 9))).toEqual([137, 73, 43])
  })

  it('dithers Original grayscale against the selected Background', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray(8).fill(128),
      width: 8,
      height: 1,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        background: [10, 20, 30],
        colorMode: 'original',
        matrixSize: 2,
      },
    })

    expect(Array.from(output.data.slice(6, 9))).toEqual([128, 128, 128])
    expect(Array.from(output.data.slice(18, 21))).toEqual([10, 20, 30])
  })

  it('dithers between the two nearest built-in GameBoy colors', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray(24).fill(128),
      width: 8,
      height: 3,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        colorMode: 'palette',
        matrixSize: 2,
        palette: 'gameboy',
      },
    })

    expect(Array.from(output.data.slice(0, 3))).toEqual([139, 172, 15])
    expect(Array.from(output.data.slice(60, 63))).toEqual([48, 98, 48])
  })

  it('uses Custom Palette colors instead of the built-in palette', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray(12).fill(128),
      width: 4,
      height: 3,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        colorMode: 'palette',
        customPalette: [[0, 0, 0], [255, 255, 255]],
        matrixSize: 2,
        palette: 'custom',
      },
    })

    expect(Array.from(output.data.slice(0, 3))).toEqual([255, 255, 255])
    expect(Array.from(output.data.slice(24, 27))).toEqual([0, 0, 0])
  })

  it('selects higher-luminance Palette colors more often at high Intensity', () => {
    const countHigherLuminance = (intensity: number) => {
      const output = renderDitheringReference({
        grayscale: new Uint8ClampedArray(8 * 8).fill(128),
        width: 8,
        height: 8,
        settings: {
          ...DEFAULT_DITHERING_SETTINGS,
          colorMode: 'palette',
          customPalette: [[0, 0, 0], [255, 255, 255]],
          intensity,
          matrixSize: 2,
          palette: 'custom',
        },
      })

      return Array.from(output.data).filter((value, index) => index % 3 === 0 && value > 128).length
    }

    expect(countHigherLuminance(2)).toBeGreaterThan(countHigherLuminance(1))
  })

  it('keeps zero-frequency modulation finite and equal to the static output', () => {
    const grayscale = new Uint8ClampedArray(8 * 8).fill(128)
    const baseSettings: typeof DEFAULT_DITHERING_SETTINGS = {
      ...DEFAULT_DITHERING_SETTINGS,
      matrixSize: 2,
    }
    const staticOutput = renderDitheringReference({
      grayscale,
      width: 8,
      height: 8,
      settings: baseSettings,
    })
    const zeroFrequencyOutput = renderDitheringReference({
      grayscale,
      width: 8,
      height: 8,
      settings: {
        ...baseSettings,
        modulation: {
          ...baseSettings.modulation,
          amplitude: 3,
          enabled: true,
          frequency: 0,
        },
      },
    })

    expect(zeroFrequencyOutput.data).toEqual(staticOutput.data)
    expect(Array.from(zeroFrequencyOutput.data).every(Number.isFinite)).toBe(true)
  })

  it('uses local modulation Speed and destination Direction to resolve phase', () => {
    const grayscale = new Uint8ClampedArray(8 * 8).fill(128)
    const render = (phase: number, speed: number, direction: 1 | -1) => (
      renderDitheringReference({
        grayscale,
        width: 8,
        height: 8,
        settings: {
          ...DEFAULT_DITHERING_SETTINGS,
          algorithm: 'bayer-2x2',
          matrixSize: 2,
          modulation: {
            ...DEFAULT_DITHERING_SETTINGS.modulation,
            amplitude: 1,
            direction,
            enabled: true,
            frequency: 1,
            phase,
            speed,
            type: 'wave',
          },
        },
      }).data
    )

    expect(render(2, 0, -1)).toEqual(render(0, 1, 1))
    expect(render(0.75, 2, 1)).not.toEqual(render(0.75, 2, -1))
  })

  it('keeps an exact tonal match from an unsorted Custom Palette', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray([0]),
      width: 1,
      height: 1,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        algorithm: 'bayer-2x2',
        colorMode: 'palette',
        customPalette: [[255, 255, 255], [0, 0, 0], [128, 128, 128]],
        matrixSize: 2,
        palette: 'custom',
      },
    })

    expect(Array.from(output.data)).toEqual([0, 0, 0])
  })

  it('uses Wave modulation to offset the threshold from horizontal UV', () => {
    const output = renderDitheringReference({
      grayscale: new Uint8ClampedArray(8).fill(200),
      width: 8,
      height: 1,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        matrixSize: 2,
        modulation: {
          amplitude: 1,
          direction: 1,
          enabled: true,
          frequency: 1,
          phase: 0,
          speed: 1,
          type: 'wave',
        },
      },
    })

    expect(output.data[2]).toBe(0)
  })

  it('uses Grid modulation to multiply horizontal and vertical waves', () => {
    expect(renderModulatedPixel('grid', 2, 2)).toBe(0)
  })

  it('uses Horizontal modulation to offset the threshold from vertical UV', () => {
    expect(renderModulatedPixel('horizontal', 0, 2)).toBe(0)
  })

  it('uses Radial modulation to offset the threshold by center distance', () => {
    expect(renderModulatedPixel('radial', 5, 4)).toBe(0)
  })

  it('uses RGB Split modulation to sample grayscale channels at phased positions', () => {
    const grayscale = new Uint8ClampedArray(8)
    grayscale[0] = 10
    grayscale[2] = 200

    const output = renderDitheringReference({
      grayscale,
      width: 8,
      height: 1,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        colorMode: 'original',
        matrixSize: 2,
        modulation: {
          amplitude: 10,
          direction: 1,
          enabled: true,
          frequency: 1,
          phase: 0,
          speed: 1,
          type: 'rgb-split',
        },
      },
    })

    expect(Array.from(output.data.slice(6, 9))).toEqual([200, 200, 10])
  })

  it('uses modulation displacement before sampling the source grid', () => {
    const grayscale = new Uint8ClampedArray(8 * 400)
    grayscale[2 * 8 + 2] = 255

    const output = renderDitheringReference({
      grayscale,
      width: 8,
      height: 400,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        colorMode: 'original',
        matrixSize: 2,
        modulation: {
          amplitude: 0.1,
          direction: 1,
          enabled: true,
          frequency: 1,
          phase: 0,
          speed: 1,
          type: 'wave',
        },
      },
    })

    expect(Array.from(output.data.slice(6, 9))).toEqual([255, 255, 255])
  })

  it('uses Chromatic angles for spatial channel sampling and Max Displace for mixing', () => {
    const grayscale = new Uint8ClampedArray(4 * 4)
    grayscale[0] = 200
    grayscale[3] = 20
    grayscale[3 * 4] = 60

    const output = renderDitheringReference({
      grayscale,
      width: 4,
      height: 4,
      settings: {
        ...DEFAULT_DITHERING_SETTINGS,
        chromatic: {
          blueChannel: 90,
          enabled: true,
          greenChannel: 180,
          maxDisplace: 50,
          redChannel: 0,
        },
        colorMode: 'original',
        matrixSize: 2,
      },
    })

    expect(Array.from(output.data.slice(0, 3))).toEqual([110, 200, 130])
  })
})

function renderCell(
  algorithm: keyof typeof DITHERING_ALGORITHM_IDS,
  cellX: number,
  luminance: number,
) {
  const width = (cellX + 1) * 2
  const output = renderDitheringReference({
    grayscale: new Uint8ClampedArray(width).fill(luminance),
    width,
    height: 1,
    settings: {
      ...DEFAULT_DITHERING_SETTINGS,
      algorithm,
      matrixSize: 2,
    },
  })

  return output.data[cellX * 2]
}

function renderModulatedPixel(
  type: 'grid' | 'horizontal' | 'radial',
  x: number,
  y: number,
) {
  const output = renderDitheringReference({
    grayscale: new Uint8ClampedArray(8 * 8).fill(200),
    width: 8,
    height: 8,
    settings: {
      ...DEFAULT_DITHERING_SETTINGS,
      matrixSize: 2,
      modulation: {
        amplitude: 1,
        direction: 1,
        enabled: true,
        frequency: 1,
        phase: 0,
        speed: 1,
        type,
      },
    },
  })

  return output.data[y * 8 + x]
}
