import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Grainrad effect renderer routing contract', () => {
  it('routes each implemented effect to its own renderer and never falls back to ASCII', async () => {
    const studioCanvasSource = await readFile(join(studioDir, 'StudioCanvas.tsx'), 'utf8')
    const ditheringCanvasSource = await readFile(
      join(studioDir, 'CharacterDitheringCanvas.tsx'),
      'utf8',
    )
    const halftoneCanvasSource = await readFile(
      join(studioDir, 'CharacterHalftoneCanvas.tsx'),
      'utf8',
    )
    const matrixRainCanvasSource = await readFile(
      join(studioDir, 'CharacterMatrixRainCanvas.tsx'),
      'utf8',
    )
    const dotsCanvasSource = await readFile(
      join(studioDir, 'CharacterDotsCanvas.tsx'),
      'utf8',
    )

    expect(studioCanvasSource).toContain("selectedEffectId === 'ascii'")
    expect(studioCanvasSource).toContain('<CharacterAsciiCanvas')
    expect(studioCanvasSource).toContain("selectedEffectId === 'dithering'")
    expect(studioCanvasSource).toContain('<CharacterDitheringCanvas')
    expect(studioCanvasSource).toContain("selectedEffectId === 'halftone'")
    expect(studioCanvasSource).toContain('<CharacterHalftoneCanvas')
    expect(studioCanvasSource).toContain("selectedEffectId === 'matrix-rain'")
    expect(studioCanvasSource).toContain('<CharacterMatrixRainCanvas')
    expect(studioCanvasSource).toContain("selectedEffectId === 'dots'")
    expect(studioCanvasSource).toContain('<CharacterDotsCanvas')
    expect(studioCanvasSource).toContain('data-testid="effect-renderer-not-implemented"')
    expect(studioCanvasSource).toContain('effectControls.background')

    expect(ditheringCanvasSource).not.toContain('character-ascii-material')
    expect(ditheringCanvasSource).not.toContain('createAsciiShaderMaterial')
    expect(ditheringCanvasSource).not.toContain('glyph')
    expect(ditheringCanvasSource).toContain('runtime.svgData')
    expect(ditheringCanvasSource).toContain('<Canvas')
    expect(ditheringCanvasSource).toContain('SVGLoader')
    expect(ditheringCanvasSource).toContain('createDitheringShaderMaterial')
    expect(ditheringCanvasSource).not.toContain('Renderer implementation is in progress')

    expect(halftoneCanvasSource).not.toContain('character-ascii-material')
    expect(halftoneCanvasSource).not.toContain('createAsciiShaderMaterial')
    expect(halftoneCanvasSource).not.toContain('dithering-material')
    expect(halftoneCanvasSource).not.toContain('createDitheringShaderMaterial')
    expect(halftoneCanvasSource).toContain('runtime.svgData')
    expect(halftoneCanvasSource).toContain('<Canvas')
    expect(halftoneCanvasSource).toContain('SVGLoader')
    expect(halftoneCanvasSource).toContain('createHalftoneShaderMaterial')
    expect(halftoneCanvasSource).toContain('data-testid="character-halftone-canvas"')
    for (const meshParam of [
      'extrusionDepth',
      'thickness',
      'bevel',
      'twist',
      'taper',
      'bend',
      'position',
      'rotation',
      'scale',
      'autoRotate',
      'autoRotateSpeed',
    ]) {
      expect(halftoneCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(halftoneCanvasSource).toContain('computeEffectiveAnimationTime')
    expect(halftoneCanvasSource).toContain('animation.playing')
    expect(halftoneCanvasSource).toContain('animation.speed')

    expect(matrixRainCanvasSource).not.toContain('character-ascii-material')
    expect(matrixRainCanvasSource).not.toContain('createAsciiShaderMaterial')
    expect(matrixRainCanvasSource).not.toContain('dithering-material')
    expect(matrixRainCanvasSource).not.toContain('halftone-material')
    expect(matrixRainCanvasSource).not.toContain('grainrad-effect-runtime')
    expect(matrixRainCanvasSource).toContain('runtime.svgData')
    expect(matrixRainCanvasSource).toContain('<Canvas')
    expect(matrixRainCanvasSource).toContain('SVGLoader')
    expect(matrixRainCanvasSource).toContain('createMatrixRainShaderMaterial')
    expect(matrixRainCanvasSource).toContain('createMatrixRainGlyphAtlas')
    expect(matrixRainCanvasSource).toContain('data-testid="character-matrix-rain-canvas"')
    for (const meshParam of [
      'extrusionDepth',
      'thickness',
      'bevel',
      'twist',
      'taper',
      'bend',
      'position',
      'rotation',
      'scale',
      'autoRotate',
      'autoRotateSpeed',
    ]) {
      expect(matrixRainCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(matrixRainCanvasSource).toContain('computeEffectiveAnimationTime')
    expect(matrixRainCanvasSource).toContain('animation.playing')
    expect(matrixRainCanvasSource).toContain('animation.speed')
    expect(matrixRainCanvasSource).toContain('disposeMatrixRainGlyphAtlas')
    expect(matrixRainCanvasSource).toContain('disposeMatrixRainShaderMaterial')

    for (const forbiddenImport of [
      'character-ascii-material',
      'dithering-material',
      'halftone-material',
      'matrix-rain-material',
      'grainrad-effect-runtime',
    ]) {
      expect(dotsCanvasSource).not.toContain(forbiddenImport)
    }
    expect(dotsCanvasSource).toContain('runtime.svgData')
    expect(dotsCanvasSource).toContain('<Canvas')
    expect(dotsCanvasSource).toContain('SVGLoader')
    expect(dotsCanvasSource).toContain('createDotsShaderMaterial')
    expect(dotsCanvasSource).toContain('applyDotsUniforms')
    expect(dotsCanvasSource).toContain('disposeDotsShaderMaterial')
    expect(dotsCanvasSource).toContain('data-testid="character-dots-canvas"')
    for (const meshParam of [
      'extrusionDepth',
      'thickness',
      'bevel',
      'twist',
      'taper',
      'bend',
      'position',
      'rotation',
      'scale',
      'autoRotate',
      'autoRotateSpeed',
    ]) {
      expect(dotsCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(dotsCanvasSource).toContain('computeEffectiveAnimationTime')
    expect(dotsCanvasSource).toContain('animation.playing')
    expect(dotsCanvasSource).toContain('animation.speed')
  })
})
