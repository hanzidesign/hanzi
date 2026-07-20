import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'

import { computeEffectiveAnimationTime } from '@/components/studio/animation-time'
import {
  updateCharacterMeshGeometryAnimation,
  type CharacterMeshGeometryResult,
} from '@/components/studio/character-mesh-geometry'
import { useStudioRenderMode } from '@/components/studio/studio-render-context'

export type CharacterMeshAnimationCadenceInput = {
  exportRender: boolean
  skipNextPreviewFrame: boolean
}

export function shouldRunCharacterMeshAnimation({
  exportRender,
  skipNextPreviewFrame,
}: CharacterMeshAnimationCadenceInput) {
  return exportRender || !skipNextPreviewFrame
}

export type CharacterMeshAnimationState = {
  playing: boolean
  speed: number
  timeOffset: number
}

/**
 * Installs the shared per-frame seam for animated Model Deform geometry.
 * A negative priority runs before offscreen source renders (which use -1).
 */
export function useCharacterMeshAnimation(
  geometryResultRef: RefObject<CharacterMeshGeometryResult | null>,
  animation: CharacterMeshAnimationState,
) {
  const { exportRender } = useStudioRenderMode()
  const skipNextPreviewFrameRef = useRef(false)

  useFrame(({ clock }) => {
    if (!shouldRunCharacterMeshAnimation({
      exportRender,
      skipNextPreviewFrame: skipNextPreviewFrameRef.current,
    })) {
      skipNextPreviewFrameRef.current = false
      return
    }

    const didUpdate = updateCharacterMeshGeometryAnimation(
      geometryResultRef.current,
      computeEffectiveAnimationTime({
        elapsedSeconds: clock.getElapsedTime(),
        speed: animation.speed,
        timeOffset: animation.timeOffset,
        playing: animation.playing,
      }),
    )

    if (!exportRender && didUpdate) {
      skipNextPreviewFrameRef.current = true
    }
  }, -2)
}
