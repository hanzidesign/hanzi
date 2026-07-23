import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')
const offscreenSourceRenderers = [
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
const independentRenderers = ['CharacterPixelSortCanvas.tsx']
const sharedControllerRenderers = [
  'CharacterAsciiCanvas.tsx',
  ...offscreenSourceRenderers,
  ...independentRenderers,
]

describe('Studio shared post-processing compositor contract', () => {
  it('mounts one real compositor in the shared render canvas', async () => {
    const renderContext = await readFile(join(studioDir, 'studio-render-context.tsx'), 'utf8')
    const postProcessing = await readFile(join(studioDir, 'studio-post-processing.tsx'), 'utf8')

    expect(renderContext).toContain('<StudioPostProcessing />')
    expect(postProcessing).toContain('<EffectComposer multisampling={0} renderPriority={1}>')
    expect(postProcessing).toContain('<Bloom')
    expect(postProcessing).toContain('<ChromaticAberration')
    expect(postProcessing).toContain('StudioScanlineEffect')
    expect(postProcessing).toContain('object={scanlineEffect}')
    expect(postProcessing).toContain('<Vignette')
    expect(postProcessing).toContain('StudioGrainEffect')
    expect(postProcessing).toContain('StudioCrtCurveEffect')
    expect(postProcessing).toContain('StudioPhosphorEffect')
    expect(postProcessing).toContain('StudioBackgroundRestoreEffect')
    expect(postProcessing).toContain("selectedEffectId === 'voronoi'")
    expect(postProcessing).toContain('key="background-restore"')
    expect(postProcessing).toContain("readString(controls?.['grain-mode'], 'noise')")
    expect(postProcessing).toContain("readNumber(controls?.['grain-speed'], 50)")
    expect(postProcessing).not.toContain("readNumber(controls?.['grain-speed'], 50) / 100")
    expect(postProcessing).toContain('mode: grainMode')
    expect(postProcessing).toContain('grainEnabled && grainIntensity > 0')
    expect(postProcessing).toContain("readNumber(controls?.['scanline-opacity'], 0.5)")
    expect(postProcessing).toContain("readNumber(controls?.['scanline-spacing'], 80)")
    expect(postProcessing).toContain("readNumber(controls?.['scanline-offset'], 0)")
    expect(postProcessing).toContain("readNumber(controls?.['scanline-speed'], 1)")
    expect(postProcessing).toContain("readString(controls?.['scanline-direction'], 'down')")
    expect(postProcessing).toContain('offset: scanlineOffset')
    expect(postProcessing).toContain('speed: scanlineSpeed')
    expect(postProcessing).toContain(
      "scanlineEffect.setTime(scanlineDirection === 'up' ? -time : time)",
    )
    expect(postProcessing).toContain(
      'animation.animatePost ? readAnimationTime() : animation.timeOffset',
    )
    expect(postProcessing).not.toContain('scanlinePlay')
    expect(postProcessing).toContain('StudioProcessingEffect')
    expect(postProcessing.indexOf("if (selectedEffectId === 'voronoi')"))
      .toBeGreaterThan(postProcessing.indexOf('if (vignetteEnabled)'))
  })

  it('renders source, compositor, and export capture in strict order', async () => {
    const renderContext = await readFile(join(studioDir, 'studio-render-context.tsx'), 'utf8')
    const postProcessing = await readFile(join(studioDir, 'studio-post-processing.tsx'), 'utf8')
    const voronoiRenderer = await readFile(join(studioDir, 'CharacterVoronoiCanvas.tsx'), 'utf8')

    expect(postProcessing).toContain('renderPriority={1}')
    expect(renderContext).toContain('exportRender ? 2 : 0')
    expect(renderContext).not.toContain('gl.render(scene, camera)')
    expect(renderContext).toContain('onFrameRendered?.(requestId, gl.domElement)')
    expect(renderContext).toContain("selectedEffectId !== 'pixel-sort'")
    expect(renderContext).toContain('voronoiMaskTextureRef')
    expect(voronoiRenderer).toContain(
      'voronoiMaskTextureRef.current = nextSource ? renderTarget.texture : null',
    )
    expect(postProcessing).toContain('backgroundRestoreEffect.setMaskTexture(voronoiMaskTextureRef.current)')

    for (const rendererFile of offscreenSourceRenderers) {
      const renderer = await readFile(join(studioDir, rendererFile), 'utf8')
      expect(renderer, `${rendererFile} must finish its source texture before composition`)
        .toContain('}, -1)')
    }

    const pixelSortRenderer = await readFile(
      join(studioDir, independentRenderers[0]),
      'utf8',
    )
    expect(pixelSortRenderer).toContain('renderPixelSortTrails')
    expect(pixelSortRenderer).toContain('setPixelSortPresentMode')
    expect(pixelSortRenderer).not.toContain('PixelSortWorkerClient')
    expect(pixelSortRenderer).not.toContain('readRenderTargetPixelsAsync')
    expect(pixelSortRenderer).toContain('pendingExportAckRef')
    expect(pixelSortRenderer).toContain('preparedExportAckRef')
    expect(pixelSortRenderer).toContain('renderMode.onFrameRendered?.(')
  })

  it('applies shared Processing and Post-Processing exactly once after every source renderer', async () => {
    for (const rendererFile of sharedControllerRenderers) {
      const renderer = await readFile(join(studioDir, rendererFile), 'utf8')
      expect(renderer, `${rendererFile} must leave shared controls to the compositor`)
        .toContain('withoutSharedControllerValues')
    }
  })
})
