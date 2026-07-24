'use client'

import type { ComponentType } from 'react'
import { useStudioStore } from '@/app/studio/studio-store'
import CharacterAsciiCanvas, {
  type CharacterAsciiStatus,
} from '@/components/studio/CharacterAsciiCanvas'
import CharacterBlockifyCanvas from '@/components/studio/CharacterBlockifyCanvas'
import CharacterContourCanvas from '@/components/studio/CharacterContourCanvas'
import CharacterCrosshatchCanvas from '@/components/studio/CharacterCrosshatchCanvas'
import CharacterDitheringCanvas from '@/components/studio/CharacterDitheringCanvas'
import CharacterDotsCanvas from '@/components/studio/CharacterDotsCanvas'
import CharacterEdgeDetectionCanvas from '@/components/studio/CharacterEdgeDetectionCanvas'
import CharacterHalftoneCanvas from '@/components/studio/CharacterHalftoneCanvas'
import CharacterMatrixRainCanvas from '@/components/studio/CharacterMatrixRainCanvas'
import CharacterNoiseFieldCanvas from '@/components/studio/CharacterNoiseFieldCanvas'
import CharacterPixelSortCanvas from '@/components/studio/CharacterPixelSortCanvas'
import CharacterThresholdCanvas from '@/components/studio/CharacterThresholdCanvas'
import CharacterWaveLinesCanvas from '@/components/studio/CharacterWaveLinesCanvas'
import CharacterVoronoiCanvas from '@/components/studio/CharacterVoronoiCanvas'
import CharacterVhsCanvas from '@/components/studio/CharacterVhsCanvas'
import {
  getStudioEffectById,
  type StudioEffectRenderer,
} from '@/components/studio/studio-effects'
import classes from './StudioShell.module.css'

const ignoreAsciiStatus = () => undefined

type NonAsciiEffectRenderer = Exclude<StudioEffectRenderer, 'ascii' | 'unimplemented'>

const effectRendererComponents: Record<NonAsciiEffectRenderer, ComponentType> = {
  dithering: CharacterDitheringCanvas,
  halftone: CharacterHalftoneCanvas,
  'matrix-rain': CharacterMatrixRainCanvas,
  dots: CharacterDotsCanvas,
  contour: CharacterContourCanvas,
  'pixel-sort': CharacterPixelSortCanvas,
  blockify: CharacterBlockifyCanvas,
  threshold: CharacterThresholdCanvas,
  'edge-detection': CharacterEdgeDetectionCanvas,
  crosshatch: CharacterCrosshatchCanvas,
  'wave-lines': CharacterWaveLinesCanvas,
  'noise-field': CharacterNoiseFieldCanvas,
  voronoi: CharacterVoronoiCanvas,
  vhs: CharacterVhsCanvas,
}

export default function StudioEffectCanvas({
  onAsciiStatusChange = ignoreAsciiStatus,
}: {
  onAsciiStatusChange?: (status: CharacterAsciiStatus) => void
}) {
  const selectedEffectId = useStudioStore((store) => store.studioEffect.selectedEffectId)
  const selectedEffect = getStudioEffectById(selectedEffectId)

  if (selectedEffect.renderer === 'ascii') {
    return <CharacterAsciiCanvas onAsciiStatusChange={onAsciiStatusChange} />
  }
  if (selectedEffect.renderer !== 'unimplemented') {
    const Renderer = effectRendererComponents[selectedEffect.renderer]
    return <Renderer />
  }

  return (
    <div
      data-testid="effect-renderer-not-implemented"
      role="status"
      className={classes.previewMessage}
    >
      <div className={classes.previewMessageTitle}>
        {selectedEffect.label} renderer is not implemented yet.
      </div>
    </div>
  )
}
