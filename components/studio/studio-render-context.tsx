'use client'

import {
  Canvas as FiberCanvas,
  useFrame,
  type CanvasProps,
} from '@react-three/fiber'
import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useStudioStore } from '@/app/studio/studio-store'
import { computeEffectiveAnimationTime } from '@/components/studio/animation-time'
import StudioPostProcessing from '@/components/studio/studio-post-processing'

type StudioRenderContextValue = {
  exportRender: boolean
  requestId: number
  onFrameRendered?: (requestId: number, canvas: HTMLCanvasElement) => void
}

const StudioRenderContext = createContext<StudioRenderContextValue>({
  exportRender: false,
  requestId: 0,
})

let latestPreviewAnimationTime = 0

export function StudioRenderModeProvider({
  exportRender,
  requestId = 0,
  onFrameRendered,
  children,
}: {
  exportRender: boolean
  requestId?: number
  onFrameRendered?: (requestId: number, canvas: HTMLCanvasElement) => void
  children: ReactNode
}) {
  return (
    <StudioRenderContext value={{ exportRender, requestId, onFrameRendered }}>
      {children}
    </StudioRenderContext>
  )
}

export function StudioRenderCanvas(props: CanvasProps) {
  const renderContext = useStudioRenderMode()
  const { exportRender } = renderContext
  const { children, dpr, ...canvasProps } = props

  return (
    <FiberCanvas {...canvasProps} dpr={exportRender ? 1 : dpr}>
      {children}
      <StudioPostProcessing />
      <StudioRenderFrameObserver {...renderContext} />
    </FiberCanvas>
  )
}

export function useStudioRenderMode() {
  return useContext(StudioRenderContext)
}

export function readLatestPreviewAnimationTime() {
  return latestPreviewAnimationTime
}

export function reportLatestPreviewAnimationTime(animationTime: number) {
  if (Number.isFinite(animationTime)) {
    latestPreviewAnimationTime = Math.max(0, animationTime)
  }
}

function StudioRenderFrameObserver({
  exportRender,
  requestId,
  onFrameRendered,
}: StudioRenderContextValue) {
  const animation = useStudioStore((store) => store.animation)
  const selectedEffectId = useStudioStore((store) => store.grainradEffect.selectedEffectId)
  const acknowledgedRequestRef = useRef(0)

  useFrame(({ clock, gl }) => {
    if (!exportRender) {
      reportLatestPreviewAnimationTime(computeEffectiveAnimationTime({
        elapsedSeconds: clock.getElapsedTime(),
        speed: animation.speed,
        timeOffset: animation.timeOffset,
        playing: animation.playing,
      }))
      return
    }

    if (
      selectedEffectId !== 'pixel-sort'
      && requestId > 0
      && requestId !== acknowledgedRequestRef.current
      && gl.info.render.calls > 0
    ) {
      acknowledgedRequestRef.current = requestId
      onFrameRendered?.(requestId, gl.domElement)
    }
  }, exportRender ? 2 : 0)

  return null
}
