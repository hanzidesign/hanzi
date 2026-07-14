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
  'CharacterPixelSortCanvas.tsx',
  'CharacterThresholdCanvas.tsx',
  'CharacterVhsCanvas.tsx',
  'CharacterVoronoiCanvas.tsx',
  'CharacterWaveLinesCanvas.tsx',
]
const sharedControllerRenderers = [
  'CharacterAsciiCanvas.tsx',
  ...offscreenSourceRenderers,
]

describe('Studio shared post-processing compositor contract', () => {
  it('mounts one real compositor in the shared render canvas', async () => {
    const renderContext = await readFile(join(studioDir, 'studio-render-context.tsx'), 'utf8')
    const postProcessing = await readFile(join(studioDir, 'studio-post-processing.tsx'), 'utf8')

    expect(renderContext).toContain('<StudioPostProcessing />')
    expect(postProcessing).toContain('<EffectComposer multisampling={0} renderPriority={1}>')
    expect(postProcessing).toContain('<Bloom')
    expect(postProcessing).toContain('<ChromaticAberration')
    expect(postProcessing).toContain('<Scanline')
    expect(postProcessing).toContain('<Vignette')
    expect(postProcessing).toContain('StudioGrainEffect')
    expect(postProcessing).toContain('StudioCrtCurveEffect')
    expect(postProcessing).toContain('StudioPhosphorEffect')
    expect(postProcessing).toContain('StudioProcessingEffect')
  })

  it('renders source, compositor, and export capture in strict order', async () => {
    const renderContext = await readFile(join(studioDir, 'studio-render-context.tsx'), 'utf8')
    const postProcessing = await readFile(join(studioDir, 'studio-post-processing.tsx'), 'utf8')

    expect(postProcessing).toContain('renderPriority={1}')
    expect(renderContext).toContain('exportRender ? 2 : 0')
    expect(renderContext).not.toContain('gl.render(scene, camera)')
    expect(renderContext).toContain('onFrameRendered?.(requestId, gl.domElement)')

    for (const rendererFile of offscreenSourceRenderers) {
      const renderer = await readFile(join(studioDir, rendererFile), 'utf8')
      expect(renderer, `${rendererFile} must finish its source texture before composition`)
        .toContain('}, -1)')
    }
  })

  it('applies shared Processing and Post-Processing exactly once after every source renderer', async () => {
    for (const rendererFile of sharedControllerRenderers) {
      const renderer = await readFile(join(studioDir, rendererFile), 'utf8')
      expect(renderer, `${rendererFile} must leave shared controls to the compositor`)
        .toContain('withoutSharedControllerValues')
    }
  })
})
