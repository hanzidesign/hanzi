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
    const contourCanvasSource = await readFile(
      join(studioDir, 'CharacterContourCanvas.tsx'),
      'utf8',
    )
    const pixelSortCanvasSource = await readFile(
      join(studioDir, 'CharacterPixelSortCanvas.tsx'),
      'utf8',
    )
    const blockifyCanvasSource = await readFile(
      join(studioDir, 'CharacterBlockifyCanvas.tsx'),
      'utf8',
    )
    const thresholdCanvasSource = await readFile(
      join(studioDir, 'CharacterThresholdCanvas.tsx'),
      'utf8',
    )
    const edgeDetectionCanvasSource = await readFile(
      join(studioDir, 'CharacterEdgeDetectionCanvas.tsx'),
      'utf8',
    )
    const crosshatchCanvasSource = await readFile(
      join(studioDir, 'CharacterCrosshatchCanvas.tsx'),
      'utf8',
    )
    const waveLinesCanvasSource = await readFile(
      join(studioDir, 'CharacterWaveLinesCanvas.tsx'),
      'utf8',
    )
    const noiseFieldCanvasSource = await readFile(
      join(studioDir, 'CharacterNoiseFieldCanvas.tsx'),
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
    expect(studioCanvasSource).toContain("selectedEffectId === 'contour'")
    expect(studioCanvasSource).toContain('<CharacterContourCanvas')
    expect(studioCanvasSource).toContain("selectedEffectId === 'pixel-sort'")
    expect(studioCanvasSource).toContain('<CharacterPixelSortCanvas')
    expect(studioCanvasSource).toContain("selectedEffectId === 'blockify'")
    expect(studioCanvasSource).toContain('<CharacterBlockifyCanvas')
    expect(studioCanvasSource).toContain("selectedEffectId === 'threshold'")
    expect(studioCanvasSource).toContain('<CharacterThresholdCanvas')
    expect(studioCanvasSource).toContain("selectedEffectId === 'edge-detection'")
    expect(studioCanvasSource).toContain('<CharacterEdgeDetectionCanvas')
    expect(studioCanvasSource).toContain("selectedEffectId === 'crosshatch'")
    expect(studioCanvasSource).toContain('<CharacterCrosshatchCanvas')
    expect(studioCanvasSource).toContain("selectedEffectId === 'wave-lines'")
    expect(studioCanvasSource).toContain('<CharacterWaveLinesCanvas')
    expect(studioCanvasSource).toContain("selectedEffectId === 'noise-field'")
    expect(studioCanvasSource).toContain('<CharacterNoiseFieldCanvas')
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

    for (const forbiddenImport of [
      'character-ascii-material',
      'dithering-material',
      'halftone-material',
      'matrix-rain-material',
      'dots-material',
      'grainrad-effect-runtime',
    ]) {
      expect(contourCanvasSource).not.toContain(forbiddenImport)
    }
    expect(contourCanvasSource).toContain('runtime.svgData')
    expect(contourCanvasSource).toContain('<Canvas')
    expect(contourCanvasSource).toContain('SVGLoader')
    expect(contourCanvasSource).toContain('createContourShaderMaterial')
    expect(contourCanvasSource).toContain('applyContourUniforms')
    expect(contourCanvasSource).toContain('disposeContourShaderMaterial')
    expect(contourCanvasSource).toContain('data-testid="character-contour-canvas"')
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
      expect(contourCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(contourCanvasSource).toContain('computeEffectiveAnimationTime')
    expect(contourCanvasSource).toContain('animation.playing')
    expect(contourCanvasSource).toContain('animation.speed')

    for (const forbiddenImport of [
      'character-ascii-material',
      'dithering-material',
      'halftone-material',
      'matrix-rain-material',
      'dots-material',
      'contour-material',
      'grainrad-effect-runtime',
    ]) {
      expect(pixelSortCanvasSource).not.toContain(forbiddenImport)
    }
    expect(pixelSortCanvasSource).toContain('runtime.svgData')
    expect(pixelSortCanvasSource).toContain('<Canvas')
    expect(pixelSortCanvasSource).toContain('SVGLoader')
    expect(pixelSortCanvasSource).toContain('createPixelSortShaderMaterial')
    expect(pixelSortCanvasSource).toContain('applyPixelSortUniforms')
    expect(pixelSortCanvasSource).toContain('disposePixelSortShaderMaterial')
    expect(pixelSortCanvasSource).toContain('data-testid="character-pixel-sort-canvas"')
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
      expect(pixelSortCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(pixelSortCanvasSource).toContain('computeEffectiveAnimationTime')
    expect(pixelSortCanvasSource).toContain('animation.playing')
    expect(pixelSortCanvasSource).toContain('animation.speed')

    for (const forbiddenImport of [
      'character-ascii-material',
      'dithering-material',
      'halftone-material',
      'matrix-rain-material',
      'dots-material',
      'contour-material',
      'pixel-sort-material',
      'grainrad-effect-runtime',
    ]) {
      expect(blockifyCanvasSource).not.toContain(forbiddenImport)
    }
    expect(blockifyCanvasSource).toContain('runtime.svgData')
    expect(blockifyCanvasSource).toContain('<Canvas')
    expect(blockifyCanvasSource).toContain('SVGLoader')
    expect(blockifyCanvasSource).toContain('createBlockifyShaderMaterial')
    expect(blockifyCanvasSource).toContain('applyBlockifyUniforms')
    expect(blockifyCanvasSource).toContain('disposeBlockifyShaderMaterial')
    expect(blockifyCanvasSource).toContain('data-testid="character-blockify-canvas"')
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
      expect(blockifyCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(blockifyCanvasSource).toContain('computeEffectiveAnimationTime')
    expect(blockifyCanvasSource).toContain('animation.playing')
    expect(blockifyCanvasSource).toContain('animation.speed')

    for (const forbiddenImport of [
      'character-ascii-material',
      'dithering-material',
      'halftone-material',
      'matrix-rain-material',
      'dots-material',
      'contour-material',
      'pixel-sort-material',
      'blockify-material',
      'grainrad-effect-runtime',
    ]) {
      expect(thresholdCanvasSource).not.toContain(forbiddenImport)
    }
    expect(thresholdCanvasSource).toContain('runtime.svgData')
    expect(thresholdCanvasSource).toContain('<Canvas')
    expect(thresholdCanvasSource).toContain('SVGLoader')
    expect(thresholdCanvasSource).toContain('createThresholdShaderMaterial')
    expect(thresholdCanvasSource).toContain('applyThresholdUniforms')
    expect(thresholdCanvasSource).toContain('disposeThresholdShaderMaterial')
    expect(thresholdCanvasSource).toContain('data-testid="character-threshold-canvas"')
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
      expect(thresholdCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(thresholdCanvasSource).toContain('computeEffectiveAnimationTime')
    expect(thresholdCanvasSource).toContain('animation.playing')
    expect(thresholdCanvasSource).toContain('animation.speed')

    for (const forbiddenImport of [
      'character-ascii-material',
      'dithering-material',
      'halftone-material',
      'matrix-rain-material',
      'dots-material',
      'contour-material',
      'pixel-sort-material',
      'blockify-material',
      'threshold-material',
      'grainrad-effect-runtime',
    ]) {
      expect(edgeDetectionCanvasSource).not.toContain(forbiddenImport)
    }
    expect(edgeDetectionCanvasSource).toContain('runtime.svgData')
    expect(edgeDetectionCanvasSource).toContain('<Canvas')
    expect(edgeDetectionCanvasSource).toContain('SVGLoader')
    expect(edgeDetectionCanvasSource).toContain('createEdgeDetectionShaderMaterial')
    expect(edgeDetectionCanvasSource).toContain('applyEdgeDetectionUniforms')
    expect(edgeDetectionCanvasSource).toContain('disposeEdgeDetectionShaderMaterial')
    expect(edgeDetectionCanvasSource).toContain('data-testid="character-edge-detection-canvas"')
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
      expect(edgeDetectionCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(edgeDetectionCanvasSource).toContain('computeEffectiveAnimationTime')
    expect(edgeDetectionCanvasSource).toContain('animation.playing')
    expect(edgeDetectionCanvasSource).toContain('animation.speed')

    for (const forbiddenImport of [
      'character-ascii-material',
      'dithering-material',
      'halftone-material',
      'matrix-rain-material',
      'dots-material',
      'contour-material',
      'pixel-sort-material',
      'blockify-material',
      'threshold-material',
      'edge-detection-material',
      'grainrad-effect-runtime',
    ]) {
      expect(crosshatchCanvasSource).not.toContain(forbiddenImport)
    }
    expect(crosshatchCanvasSource).toContain('runtime.svgData')
    expect(crosshatchCanvasSource).toContain('<Canvas')
    expect(crosshatchCanvasSource).toContain('SVGLoader')
    expect(crosshatchCanvasSource).toContain('createCrosshatchShaderMaterial')
    expect(crosshatchCanvasSource).toContain('applyCrosshatchUniforms')
    expect(crosshatchCanvasSource).toContain('disposeCrosshatchShaderMaterial')
    expect(crosshatchCanvasSource).toContain('data-testid="character-crosshatch-canvas"')
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
      expect(crosshatchCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(crosshatchCanvasSource).toContain('computeEffectiveAnimationTime')
    expect(crosshatchCanvasSource).toContain('animation.playing')
    expect(crosshatchCanvasSource).toContain('animation.speed')

    for (const forbiddenImport of [
      'character-ascii-material',
      'dithering-material',
      'halftone-material',
      'matrix-rain-material',
      'dots-material',
      'contour-material',
      'pixel-sort-material',
      'blockify-material',
      'threshold-material',
      'edge-detection-material',
      'crosshatch-material',
      'grainrad-effect-runtime',
    ]) {
      expect(waveLinesCanvasSource).not.toContain(forbiddenImport)
    }
    expect(waveLinesCanvasSource).toContain('runtime.svgData')
    expect(waveLinesCanvasSource).toContain('<Canvas')
    expect(waveLinesCanvasSource).toContain('SVGLoader')
    expect(waveLinesCanvasSource).toContain('createWaveLinesShaderMaterial')
    expect(waveLinesCanvasSource).toContain('applyWaveLinesUniforms')
    expect(waveLinesCanvasSource).toContain('disposeWaveLinesShaderMaterial')
    expect(waveLinesCanvasSource).toContain('data-testid="character-wave-lines-canvas"')
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
      expect(waveLinesCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(waveLinesCanvasSource).toContain('computeEffectiveAnimationTime')
    expect(waveLinesCanvasSource).toContain('animation.playing')
    expect(waveLinesCanvasSource).toContain('animation.speed')

    for (const forbiddenImport of [
      'character-ascii-material',
      'dithering-material',
      'halftone-material',
      'matrix-rain-material',
      'dots-material',
      'contour-material',
      'pixel-sort-material',
      'blockify-material',
      'threshold-material',
      'edge-detection-material',
      'crosshatch-material',
      'wave-lines-material',
      'grainrad-effect-runtime',
    ]) {
      expect(noiseFieldCanvasSource).not.toContain(forbiddenImport)
    }
    expect(noiseFieldCanvasSource).toContain('runtime.svgData')
    expect(noiseFieldCanvasSource).toContain('<Canvas')
    expect(noiseFieldCanvasSource).toContain('SVGLoader')
    expect(noiseFieldCanvasSource).toContain('createNoiseFieldShaderMaterial')
    expect(noiseFieldCanvasSource).toContain('applyNoiseFieldUniforms')
    expect(noiseFieldCanvasSource).toContain('disposeNoiseFieldShaderMaterial')
    expect(noiseFieldCanvasSource).toContain('data-testid="character-noise-field-canvas"')
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
      expect(noiseFieldCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(noiseFieldCanvasSource).toContain('computeEffectiveAnimationTime')
    expect(noiseFieldCanvasSource).toContain('animation.playing')
    expect(noiseFieldCanvasSource).toContain('animation.speed')
  })
})
