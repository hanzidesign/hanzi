import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'

import { computeEffectiveAnimationTime } from '@/components/studio/animation-time'
import { useStudioRenderMode } from '@/components/studio/studio-render-context'
import type { CharacterMeshDeformSettings } from '@/components/studio/character-mesh-deform'
import type { CharacterMeshGpuDeformBinding } from '@/components/studio/character-mesh-gpu-deform'

export type CharacterMeshAnimationState = {
  playing: boolean
  speed: number
  timeOffset: number
}

export type CharacterMeshGpuDeformSource = {
  gpuDeform: CharacterMeshGpuDeformBinding | null
}

/**
 * Synchronizes GPU Model Deform uniforms before offscreen source renders.
 * A negative priority runs before offscreen source renders (which use -1).
 */
export function useCharacterMeshAnimation(
  sourceRef: RefObject<CharacterMeshGpuDeformBinding | CharacterMeshGpuDeformSource | null>,
  deform: CharacterMeshDeformSettings,
  animation?: CharacterMeshAnimationState,
) {
  const { readAnimationTime, timelineActive } = useStudioRenderMode()

  useFrame(({ clock }) => {
    const source = sourceRef.current
    const binding = source && 'gpuDeform' in source ? source.gpuDeform : source
    const animationTime = timelineActive
      ? readAnimationTime()
      : computeEffectiveAnimationTime({
          elapsedSeconds: clock.getElapsedTime(),
          speed: animation?.speed ?? 0,
          timeOffset: animation?.timeOffset ?? 0,
          playing: animation?.playing ?? false,
        })
    binding?.update(
      deform,
      animationTime,
    )
  }, -2)
}
