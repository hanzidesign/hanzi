import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Grainrad effect renderer routing contract', () => {
  it('routes Model Deform through every active geometry builder caller', async () => {
    const candidateFiles = (await readdir(studioDir))
      .filter((fileName) => /^Character(?:.*Canvas|Mesh)\.tsx$/.test(fileName))
      .sort()
    const builderCallers: string[] = []

    for (const fileName of candidateFiles) {
      const source = await readFile(join(studioDir, fileName), 'utf8')

      if (!source.includes('createCharacterMeshGeometries')) {
        continue
      }

      builderCallers.push(fileName)
      expect(source, `${fileName} must install the shared Model Deform animation seam`)
        .toContain('useCharacterMeshAnimation')
      expect(source, `${fileName} must attach the shared GPU Model Deform adapter`)
        .toContain('attachCharacterMeshGpuDeform')
      expect(source, `${fileName} must pass mesh.deform to the builder`)
        .toMatch(fileName === 'CharacterMesh.tsx'
          ? /deform,/
          : /deform:\s*(?:meshSettings|mesh)\.deform/)
      const deformReferences = source.match(/(?:meshSettings|mesh)\.deform/g) ?? []
      expect(deformReferences.length, `${fileName} must propagate mesh.deform dependencies`)
        .toBeGreaterThan(1)
    }

    expect(builderCallers).toHaveLength(16)
    expect(builderCallers).toEqual([
      'CharacterAsciiCanvas.tsx',
      'CharacterBlockifyCanvas.tsx',
      'CharacterContourCanvas.tsx',
      'CharacterCrosshatchCanvas.tsx',
      'CharacterDitheringCanvas.tsx',
      'CharacterDotsCanvas.tsx',
      'CharacterEdgeDetectionCanvas.tsx',
      'CharacterHalftoneCanvas.tsx',
      'CharacterMatrixRainCanvas.tsx',
      'CharacterMesh.tsx',
      'CharacterNoiseFieldCanvas.tsx',
      'CharacterPixelSortCanvas.tsx',
      'CharacterThresholdCanvas.tsx',
      'CharacterVhsCanvas.tsx',
      'CharacterVoronoiCanvas.tsx',
      'CharacterWaveLinesCanvas.tsx',
    ])
  })

  it('requires content readiness guards on every generic export renderer', async () => {
    const genericCanvasFiles = [
      'CharacterAsciiCanvas.tsx',
      'CharacterBlockifyCanvas.tsx',
      'CharacterContourCanvas.tsx',
      'CharacterCrosshatchCanvas.tsx',
      'CharacterDitheringCanvas.tsx',
      'CharacterDotsCanvas.tsx',
      'CharacterEdgeDetectionCanvas.tsx',
      'CharacterHalftoneCanvas.tsx',
      'CharacterMatrixRainCanvas.tsx',
      'CharacterNoiseFieldCanvas.tsx',
      'CharacterThresholdCanvas.tsx',
      'CharacterVhsCanvas.tsx',
      'CharacterVoronoiCanvas.tsx',
      'CharacterWaveLinesCanvas.tsx',
    ]

    for (const fileName of genericCanvasFiles) {
      const source = await readFile(join(studioDir, fileName), 'utf8')

      expect(source, `${fileName} must report export content readiness`)
        .toContain('markExportContentReady()')
      expect(source, `${fileName} must reject empty geometry results`)
        .toContain('geometryResult.geometries.length === 0')

      if (fileName !== 'CharacterAsciiCanvas.tsx') {
        const renderIndex = source.indexOf('gl.render(source.scene')
        const restoreIndex = source.indexOf('gl.setRenderTarget(previousTarget)', renderIndex)
        const readyIndex = source.indexOf('markExportContentReady()', restoreIndex)

        expect(renderIndex, `${fileName} must render its source scene`).toBeGreaterThanOrEqual(0)
        expect(restoreIndex, `${fileName} must restore its render target`).toBeGreaterThan(renderIndex)
        expect(readyIndex, `${fileName} must mark readiness after source render restoration`)
          .toBeGreaterThan(restoreIndex)
      }
    }
  })

  it('routes each implemented effect to its own renderer and never falls back to ASCII', async () => {
    const studioCanvasSource = await readFile(join(studioDir, 'StudioCanvas.tsx'), 'utf8')
    const effectCanvasSource = await readFile(join(studioDir, 'StudioEffectCanvas.tsx'), 'utf8')
    const exportSurfaceSource = await readFile(
      join(studioDir, 'StudioExportRenderSurface.tsx'),
      'utf8',
    )
    const asciiCanvasSource = await readFile(
      join(studioDir, 'CharacterAsciiCanvas.tsx'),
      'utf8',
    )
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
    const voronoiCanvasSource = await readFile(
      join(studioDir, 'CharacterVoronoiCanvas.tsx'),
      'utf8',
    )
    const vhsCanvasSource = await readFile(
      join(studioDir, 'CharacterVhsCanvas.tsx'),
      'utf8',
    )

    expect(studioCanvasSource).toContain('<StudioEffectCanvas')
    expect(exportSurfaceSource).toContain('<StudioEffectCanvas')
    expect(exportSurfaceSource).toContain('StudioRenderModeProvider')
    expect(effectCanvasSource).toContain("selectedEffectId === 'ascii'")
    expect(effectCanvasSource).toContain('<CharacterAsciiCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'dithering'")
    expect(effectCanvasSource).toContain('<CharacterDitheringCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'halftone'")
    expect(effectCanvasSource).toContain('<CharacterHalftoneCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'matrix-rain'")
    expect(effectCanvasSource).toContain('<CharacterMatrixRainCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'dots'")
    expect(effectCanvasSource).toContain('<CharacterDotsCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'contour'")
    expect(effectCanvasSource).toContain('<CharacterContourCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'pixel-sort'")
    expect(effectCanvasSource).toContain('<CharacterPixelSortCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'blockify'")
    expect(effectCanvasSource).toContain('<CharacterBlockifyCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'threshold'")
    expect(effectCanvasSource).toContain('<CharacterThresholdCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'edge-detection'")
    expect(effectCanvasSource).toContain('<CharacterEdgeDetectionCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'crosshatch'")
    expect(effectCanvasSource).toContain('<CharacterCrosshatchCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'wave-lines'")
    expect(effectCanvasSource).toContain('<CharacterWaveLinesCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'noise-field'")
    expect(effectCanvasSource).toContain('<CharacterNoiseFieldCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'voronoi'")
    expect(effectCanvasSource).toContain('<CharacterVoronoiCanvas')
    expect(effectCanvasSource).toContain("selectedEffectId === 'vhs'")
    expect(effectCanvasSource).toContain('<CharacterVhsCanvas')
    expect(effectCanvasSource).toContain('data-testid="effect-renderer-not-implemented"')
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
    expect(halftoneCanvasSource).toContain('readAnimationTime()')
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
    expect(matrixRainCanvasSource).toContain('readAnimationTime()')
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
    expect(dotsCanvasSource).toContain('readAnimationTime()')
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
    expect(contourCanvasSource).not.toContain('createCharacterGlyphAtlas')
    expect(contourCanvasSource).not.toContain('deriveGlyphDistancePackFromCanvas')
    expect(contourCanvasSource).toContain('WebGLRenderTarget')
    expect(contourCanvasSource).toContain('<planeGeometry')
    expect(contourCanvasSource).toContain('gl.render(source.scene, source.camera)')
    expect(contourCanvasSource).toContain('u_sourceSize')
    expect(contourCanvasSource).toContain('material={material}')
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
    expect(pixelSortCanvasSource).toContain('PixelSortWorkerClient')
    expect(pixelSortCanvasSource).toContain('readRenderTargetPixelsAsync')
    expect(pixelSortCanvasSource).toContain('createPixelSortPresentMaterial')
    expect(pixelSortCanvasSource).toContain('createPixelSortTexture(')
    expect(pixelSortCanvasSource).toContain('setPixelSortPreviewSource(')
    expect(pixelSortCanvasSource).toContain('setPixelSortExactFrame(')
    expect(pixelSortCanvasSource).toContain('setPixelSortPresentMode(')
    expect(pixelSortCanvasSource).toContain('createPixelSortExportGenerationCoordinator')
    expect(pixelSortCanvasSource).toContain('pendingExportAckRef')
    expect(pixelSortCanvasSource).toContain('function invalidatePixelSortExport(')
    expect(pixelSortCanvasSource.match(/generation\.invalidate\(\)/g)).toHaveLength(1)
    expect(pixelSortCanvasSource).not.toContain('generation.dispose()')
    expect(pixelSortCanvasSource).toContain('previousTexture.dispose()')
    expect(pixelSortCanvasSource).not.toContain('createPixelSortShaderMaterial')
    expect(pixelSortCanvasSource).not.toContain('PIXEL_SORT_SAMPLE_COUNT')
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
    expect(pixelSortCanvasSource).toContain('useCharacterMeshAnimation')
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
    expect(blockifyCanvasSource).toContain('readAnimationTime()')
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
    expect(thresholdCanvasSource).toContain('readAnimationTime()')
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
    expect(edgeDetectionCanvasSource).toContain('readAnimationTime()')
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
    expect(crosshatchCanvasSource).toContain('readAnimationTime()')
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
    expect(waveLinesCanvasSource).toContain('readAnimationTime()')
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
    expect(noiseFieldCanvasSource).toContain('readAnimationTime()')
    expect(noiseFieldCanvasSource).toContain('animation.playing')
    expect(noiseFieldCanvasSource).toContain('animation.speed')

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
      'noise-field-material',
      'grainrad-effect-runtime',
    ]) {
      expect(voronoiCanvasSource).not.toContain(forbiddenImport)
    }
    expect(voronoiCanvasSource).toContain('runtime.svgData')
    expect(voronoiCanvasSource).toContain('<Canvas')
    expect(voronoiCanvasSource).toContain('SVGLoader')
    expect(voronoiCanvasSource).toContain('createVoronoiShaderMaterial')
    expect(voronoiCanvasSource).toContain('applyVoronoiUniforms')
    expect(voronoiCanvasSource).toContain('disposeVoronoiShaderMaterial')
    expect(voronoiCanvasSource).toContain('data-testid="character-voronoi-canvas"')
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
      expect(voronoiCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(voronoiCanvasSource).toContain('readAnimationTime()')
    expect(voronoiCanvasSource).toContain('animation.playing')
    expect(voronoiCanvasSource).toContain('animation.speed')

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
      'noise-field-material',
      'voronoi-material',
      'grainrad-effect-runtime',
    ]) {
      expect(vhsCanvasSource).not.toContain(forbiddenImport)
    }
    expect(vhsCanvasSource).toContain('runtime.svgData')
    expect(vhsCanvasSource).toContain('<Canvas')
    expect(vhsCanvasSource).toContain('SVGLoader')
    expect(vhsCanvasSource).toContain('createVhsShaderMaterial')
    expect(vhsCanvasSource).toContain('applyVhsUniforms')
    expect(vhsCanvasSource).toContain('disposeVhsShaderMaterial')
    expect(vhsCanvasSource).toContain('data-testid="character-vhs-canvas"')
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
      expect(vhsCanvasSource).toContain(`meshSettings.${meshParam}`)
    }
    expect(vhsCanvasSource).not.toContain('clock.getElapsedTime()')
    expect(vhsCanvasSource).toContain('readAnimationTime()')
    expect(vhsCanvasSource).toContain('animation.playing')
    expect(vhsCanvasSource).toContain('animation.speed')

    for (const rendererSource of [
      asciiCanvasSource,
      ditheringCanvasSource,
      halftoneCanvasSource,
      matrixRainCanvasSource,
      dotsCanvasSource,
      contourCanvasSource,
      pixelSortCanvasSource,
      blockifyCanvasSource,
      thresholdCanvasSource,
      edgeDetectionCanvasSource,
      crosshatchCanvasSource,
      waveLinesCanvasSource,
      noiseFieldCanvasSource,
      voronoiCanvasSource,
      vhsCanvasSource,
    ]) {
      expect(rendererSource).toContain('reportCharacterRotationY(')
    }
  })

  it('keeps every dedicated Effect canvas isolated from every other Effect material', async () => {
    const renderers = [
      ['CharacterDitheringCanvas.tsx', 'dithering-material'],
      ['CharacterHalftoneCanvas.tsx', 'halftone-material'],
      ['CharacterMatrixRainCanvas.tsx', 'matrix-rain-material'],
      ['CharacterDotsCanvas.tsx', 'dots-material'],
      ['CharacterContourCanvas.tsx', 'contour-material'],
      ['CharacterPixelSortCanvas.tsx', 'pixel-sort-present-material'],
      ['CharacterBlockifyCanvas.tsx', 'blockify-material'],
      ['CharacterThresholdCanvas.tsx', 'threshold-material'],
      ['CharacterEdgeDetectionCanvas.tsx', 'edge-detection-material'],
      ['CharacterCrosshatchCanvas.tsx', 'crosshatch-material'],
      ['CharacterWaveLinesCanvas.tsx', 'wave-lines-material'],
      ['CharacterNoiseFieldCanvas.tsx', 'noise-field-material'],
      ['CharacterVoronoiCanvas.tsx', 'voronoi-material'],
      ['CharacterVhsCanvas.tsx', 'vhs-material'],
    ] as const
    const materialModules = renderers.map(([, materialModule]) => materialModule)

    for (const [rendererFile, ownMaterialModule] of renderers) {
      const renderer = await readFile(join(studioDir, rendererFile), 'utf8')
      expect(renderer, `${rendererFile} must import its own material`)
        .toContain(ownMaterialModule)
      expect(renderer, `${rendererFile} must not use the generic Effect runtime`)
        .not.toContain('grainrad-effect-runtime')

      for (const foreignMaterialModule of materialModules) {
        if (foreignMaterialModule === ownMaterialModule) continue
        expect(renderer, `${rendererFile} must not import ${foreignMaterialModule}`)
          .not.toContain(foreignMaterialModule)
      }
    }
  })
})
