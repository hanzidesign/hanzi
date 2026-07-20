'use client'

import {
  Canvas as FiberCanvas,
  useFrame,
  type CanvasProps,
} from '@react-three/fiber'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import type { Texture } from 'three'
import { useStudioStore } from '@/app/studio/studio-store'
import { computeEffectiveAnimationTime } from '@/components/studio/animation-time'
import StudioPostProcessing from '@/components/studio/studio-post-processing'

type StudioRenderContextValue = {
  exportRender: boolean
  requestId: number
  onFrameRendered?: (requestId: number, canvas: HTMLCanvasElement) => void
  markExportContentReady: () => void
  exportFrameAckGate: ExportFrameAckGate
  voronoiMaskTextureRef: MutableRefObject<Texture | null>
  reportCharacterRotationY: (rotationY: number) => void
  readCharacterRotationY: (fallback: number) => number
}

const emptyVoronoiMaskTextureRef: MutableRefObject<Texture | null> = { current: null }
const TWO_PI = Math.PI * 2

export class ExportFrameAckGate {
  private armedRequestId = 0
  private contentReady = false
  private consumed = false

  arm(requestId: number) {
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return
    }

    this.armedRequestId = requestId
    this.contentReady = false
    this.consumed = false
  }

  markContentReady(requestId: number) {
    if (requestId !== this.armedRequestId || requestId <= 0 || this.consumed) {
      return
    }

    this.contentReady = true
  }

  consumeIfReady(requestId: number, renderCalls: number) {
    if (
      requestId !== this.armedRequestId
      || requestId <= 0
      || this.consumed
      || !this.contentReady
      || renderCalls <= 0
    ) {
      return false
    }

    this.consumed = true
    return true
  }

  clear(requestId: number) {
    if (requestId !== this.armedRequestId) {
      return
    }

    this.armedRequestId = 0
    this.contentReady = false
    this.consumed = false
  }
}

type CharacterRotationSnapshot = {
  current: number | null
  report: (rotationY: number) => void
  read: (fallback: number) => number
}

export function normalizeRotationRadians(value: number, fallback = 0) {
  const candidate = Number.isFinite(value) ? value : fallback

  if (!Number.isFinite(candidate)) {
    return 0
  }

  return ((candidate + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI
}

export function createCharacterRotationSnapshot(): CharacterRotationSnapshot {
  const snapshot: CharacterRotationSnapshot = {
    current: null,
    report: (rotationY) => {
      if (Number.isFinite(rotationY)) {
        snapshot.current = normalizeRotationRadians(rotationY)
      }
    },
    read: (fallback) => normalizeRotationRadians(snapshot.current ?? fallback),
  }

  return snapshot
}

const StudioRenderContext = createContext<StudioRenderContextValue>({
  exportRender: false,
  requestId: 0,
  markExportContentReady: () => undefined,
  exportFrameAckGate: new ExportFrameAckGate(),
  voronoiMaskTextureRef: emptyVoronoiMaskTextureRef,
  reportCharacterRotationY: () => undefined,
  readCharacterRotationY: (fallback) => normalizeRotationRadians(fallback),
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
  const voronoiMaskTextureRef = useRef<Texture | null>(null)
  const [characterRotationSnapshot] = useState(createCharacterRotationSnapshot)
  const exportFrameAckGate = useMemo(() => new ExportFrameAckGate(), [])

  useEffect(() => {
    if (exportRender && requestId > 0) {
      exportFrameAckGate.arm(requestId)
    } else {
      exportFrameAckGate.clear(requestId)
    }

    return () => {
      if (exportRender && requestId > 0) {
        exportFrameAckGate.clear(requestId)
      }
    }
  }, [exportFrameAckGate, exportRender, requestId])

  const reportCharacterRotationY = (rotationY: number) => {
    if (!exportRender) {
      characterRotationSnapshot.report(rotationY)
    }
  }
  const readCharacterRotationY = (fallback: number) => characterRotationSnapshot.read(fallback)
  const markExportContentReady = () => {
    if (exportRender && requestId > 0) {
      exportFrameAckGate.markContentReady(requestId)
    }
  }

  return (
    <StudioRenderContext value={{
      exportRender,
      requestId,
      onFrameRendered,
      markExportContentReady,
      exportFrameAckGate,
      voronoiMaskTextureRef,
      reportCharacterRotationY,
      readCharacterRotationY,
    }}>
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
  exportFrameAckGate,
}: StudioRenderContextValue) {
  const animation = useStudioStore((store) => store.animation)
  const selectedEffectId = useStudioStore((store) => store.grainradEffect.selectedEffectId)
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
      && exportFrameAckGate.consumeIfReady(requestId, gl.info.render.calls)
    ) {
      onFrameRendered?.(requestId, gl.domElement)
    }
  }, exportRender ? 2 : 0)

  return null
}
