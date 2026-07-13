'use client'

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
import { getGrainradEffectById } from '@/components/studio/grainrad-effects'
import classes from './StudioShell.module.css'

const ignoreAsciiStatus = () => undefined

export default function StudioEffectCanvas({
  onAsciiStatusChange = ignoreAsciiStatus,
}: {
  onAsciiStatusChange?: (status: CharacterAsciiStatus) => void
}) {
  const selectedEffectId = useStudioStore((store) => store.grainradEffect.selectedEffectId)
  const selectedEffect = getGrainradEffectById(selectedEffectId)

  if (selectedEffectId === 'ascii') {
    return <CharacterAsciiCanvas onAsciiStatusChange={onAsciiStatusChange} />
  }
  if (selectedEffectId === 'dithering') {
    return <CharacterDitheringCanvas />
  }
  if (selectedEffectId === 'halftone') {
    return <CharacterHalftoneCanvas />
  }
  if (selectedEffectId === 'matrix-rain') {
    return <CharacterMatrixRainCanvas />
  }
  if (selectedEffectId === 'dots') {
    return <CharacterDotsCanvas />
  }
  if (selectedEffectId === 'contour') {
    return <CharacterContourCanvas />
  }
  if (selectedEffectId === 'pixel-sort') {
    return <CharacterPixelSortCanvas />
  }
  if (selectedEffectId === 'blockify') {
    return <CharacterBlockifyCanvas />
  }
  if (selectedEffectId === 'threshold') {
    return <CharacterThresholdCanvas />
  }
  if (selectedEffectId === 'edge-detection') {
    return <CharacterEdgeDetectionCanvas />
  }
  if (selectedEffectId === 'crosshatch') {
    return <CharacterCrosshatchCanvas />
  }
  if (selectedEffectId === 'wave-lines') {
    return <CharacterWaveLinesCanvas />
  }
  if (selectedEffectId === 'noise-field') {
    return <CharacterNoiseFieldCanvas />
  }
  if (selectedEffectId === 'voronoi') {
    return <CharacterVoronoiCanvas />
  }
  if (selectedEffectId === 'vhs') {
    return <CharacterVhsCanvas />
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
