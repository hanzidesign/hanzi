'use client'

import {
  Canvas as FiberCanvas,
  useFrame,
  type CanvasProps,
} from '@react-three/fiber'
import {
  createContext,
  useCallback,
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
import { AnimationTimeline } from '@/components/studio/animation-time'
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
  reportPointer: (x: number, y: number) => void
  readPointer: (fallbackX?: number, fallbackY?: number) => { x: number; y: number }
  readAnimationTime: () => number
  timelineActive: boolean
  advanceAnimationTime: (
    deltaSeconds: number,
    speed: number,
    timeOffset: number,
    playing: boolean,
  ) => number
  resolveVisualFrameSize: (
    scope: StudioVisualFrameScope,
    actualWidth: number,
    actualHeight: number,
  ) => StudioVisualFrameSize
}

const emptyVoronoiMaskTextureRef: MutableRefObject<Texture | null> = { current: null }
const TWO_PI = Math.PI * 2
let latestPreviewPointer: { x: number; y: number } | null = null

export type StudioVisualFrameScope = 'canvas' | 'pixel-sort'

export type StudioVisualFrameSize = Readonly<{
  width: number
  height: number
}>

export type StudioVisualFrame = StudioVisualFrameSize & Readonly<{
  revision: number
}>

export type StudioVisualFrameSnapshot = Readonly<{
  effectId: string
  canvas?: StudioVisualFrame
  'pixel-sort'?: StudioVisualFrame
}>

export type StudioPreviewFrameRegistry = ReturnType<typeof createStudioPreviewFrameRegistry>

export function createStudioPreviewFrameRegistry() {
  const entries = new Map<string, Map<StudioVisualFrameScope, StudioVisualFrame>>()
  let revision = 0

  return {
    report(
      effectId: string,
      scope: StudioVisualFrameScope,
      width: number,
      height: number,
    ) {
      const safeWidth = safeFrameDimension(width)
      const safeHeight = safeFrameDimension(height)
      const effectEntries = entries.get(effectId) ?? new Map()
      const current = effectEntries.get(scope)
      if (current?.width === safeWidth && current.height === safeHeight) {
        return current
      }

      const frame = Object.freeze({
        width: safeWidth,
        height: safeHeight,
        revision: ++revision,
      })
      effectEntries.set(scope, frame)
      entries.set(effectId, effectEntries)
      return frame
    },
    capture(effectId: string): StudioVisualFrameSnapshot {
      const effectEntries = entries.get(effectId)
      return Object.freeze({
        effectId,
        ...(effectEntries?.get('canvas')
          ? { canvas: Object.freeze({ ...effectEntries.get('canvas')! }) }
          : {}),
        ...(effectEntries?.get('pixel-sort')
          ? { 'pixel-sort': Object.freeze({ ...effectEntries.get('pixel-sort')! }) }
          : {}),
      })
    },
    clear() {
      entries.clear()
    },
  }
}

export function resolveDirectionalPixelScale(
  actual: StudioVisualFrameSize,
  visual: StudioVisualFrameSize,
  axis: Readonly<{ x: number; y: number }>,
) {
  const axisLength = Math.hypot(axis.x, axis.y)
  if (!Number.isFinite(axisLength) || axisLength <= 0) {
    return 1
  }

  const scaleX = safeFrameDimension(actual.width) / safeFrameDimension(visual.width)
  const scaleY = safeFrameDimension(actual.height) / safeFrameDimension(visual.height)
  return Math.hypot(axis.x * scaleX, axis.y * scaleY) / axisLength
}

export function resolveStudioVisualFrameSize({
  exportRender,
  snapshot,
  scope,
  actualWidth,
  actualHeight,
}: Readonly<{
  exportRender: boolean
  snapshot?: StudioVisualFrameSnapshot
  scope: StudioVisualFrameScope
  actualWidth: number
  actualHeight: number
}>): StudioVisualFrameSize {
  const actual = {
    width: safeFrameDimension(actualWidth),
    height: safeFrameDimension(actualHeight),
  }
  const captured = exportRender ? snapshot?.[scope] : undefined

  return captured
    ? { width: captured.width, height: captured.height }
    : actual
}

function safeFrameDimension(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1
}

const StudioPreviewFrameRegistryContext = createContext<StudioPreviewFrameRegistry | null>(null)

export function StudioPreviewFrameProvider({ children }: { children: ReactNode }) {
  const [registry] = useState(createStudioPreviewFrameRegistry)

  useEffect(() => () => registry.clear(), [registry])

  return (
    <StudioPreviewFrameRegistryContext value={registry}>
      {children}
    </StudioPreviewFrameRegistryContext>
  )
}

export function useStudioPreviewFrameSnapshot() {
  const registry = useContext(StudioPreviewFrameRegistryContext)

  return useCallback((effectId: string) => (
    registry?.capture(effectId) ?? Object.freeze({ effectId })
  ), [registry])
}

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

export function reportLatestPreviewPointer(x: number, y: number) {
  if (Number.isFinite(x) && Number.isFinite(y)) {
    latestPreviewPointer = { x, y }
  }
}

export function readLatestPreviewPointer(fallbackX = 0, fallbackY = 0) {
  return latestPreviewPointer ?? {
    x: Number.isFinite(fallbackX) ? fallbackX : 0,
    y: Number.isFinite(fallbackY) ? fallbackY : 0,
  }
}

const StudioRenderContext = createContext<StudioRenderContextValue>({
  exportRender: false,
  requestId: 0,
  markExportContentReady: () => undefined,
  exportFrameAckGate: new ExportFrameAckGate(),
  voronoiMaskTextureRef: emptyVoronoiMaskTextureRef,
  reportCharacterRotationY: () => undefined,
  readCharacterRotationY: (fallback) => normalizeRotationRadians(fallback),
  reportPointer: () => undefined,
  readPointer: (fallbackX, fallbackY) => readLatestPreviewPointer(fallbackX, fallbackY),
  readAnimationTime: () => 0,
  timelineActive: false,
  advanceAnimationTime: () => 0,
  resolveVisualFrameSize: (_scope, actualWidth, actualHeight) => ({
    width: safeFrameDimension(actualWidth),
    height: safeFrameDimension(actualHeight),
  }),
})

let latestPreviewAnimationTime = 0

export function StudioRenderModeProvider({
  exportRender,
  initialAnimationTime,
  visualFrameSnapshot,
  requestId = 0,
  onFrameRendered,
  children,
}: {
  exportRender: boolean
  initialAnimationTime?: number
  visualFrameSnapshot?: StudioVisualFrameSnapshot
  requestId?: number
  onFrameRendered?: (requestId: number, canvas: HTMLCanvasElement) => void
  children: ReactNode
}) {
  const inheritedPreviewFrameRegistry = useContext(StudioPreviewFrameRegistryContext)
  const [fallbackPreviewFrameRegistry] = useState(createStudioPreviewFrameRegistry)
  const previewFrameRegistry = inheritedPreviewFrameRegistry ?? fallbackPreviewFrameRegistry
  const selectedEffectId = useStudioStore((store) => store.studioEffect.selectedEffectId)
  const voronoiMaskTextureRef = useRef<Texture | null>(null)
  const [characterRotationSnapshot] = useState(createCharacterRotationSnapshot)
  const [animationTimeline] = useState(
    () => {
      const timeOffset = useStudioStore.getState().animation.timeOffset
      return new AnimationTimeline(initialAnimationTime ?? timeOffset, timeOffset)
    },
  )
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
  const reportPointer = (x: number, y: number) => {
    if (!exportRender) {
      reportLatestPreviewPointer(x, y)
    }
  }
  const readPointer = (fallbackX = 0, fallbackY = 0) => (
    readLatestPreviewPointer(fallbackX, fallbackY)
  )
  const readAnimationTime = useCallback(() => animationTimeline.read(), [animationTimeline])
  const advanceAnimationTime = useCallback((
    deltaSeconds: number,
    speed: number,
    timeOffset: number,
    playing: boolean,
  ) => animationTimeline.advance({ deltaSeconds, speed, timeOffset, playing }), [animationTimeline])
  const markExportContentReady = () => {
    if (exportRender && requestId > 0) {
      exportFrameAckGate.markContentReady(requestId)
    }
  }
  const resolveVisualFrameSize = useCallback((
    scope: StudioVisualFrameScope,
    actualWidth: number,
    actualHeight: number,
  ): StudioVisualFrameSize => {
    const actual = resolveStudioVisualFrameSize({
      exportRender,
      snapshot: visualFrameSnapshot,
      scope,
      actualWidth,
      actualHeight,
    })

    if (!exportRender) {
      previewFrameRegistry.report(selectedEffectId, scope, actual.width, actual.height)
    }

    return actual
  }, [exportRender, previewFrameRegistry, selectedEffectId, visualFrameSnapshot])

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
      reportPointer,
      readPointer,
      readAnimationTime,
      timelineActive: true,
      advanceAnimationTime,
      resolveVisualFrameSize,
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
    latestPreviewAnimationTime = animationTime
  }
}

function StudioRenderFrameObserver({
  exportRender,
  requestId,
  onFrameRendered,
  exportFrameAckGate,
  advanceAnimationTime,
  resolveVisualFrameSize,
}: StudioRenderContextValue) {
  const animation = useStudioStore((store) => store.animation)
  const selectedEffectId = useStudioStore((store) => store.studioEffect.selectedEffectId)
  useFrame((_, delta) => {
    const animationTime = advanceAnimationTime(
      delta,
      animation.speed,
      animation.timeOffset,
      animation.playing,
    )

    if (!exportRender) {
      reportLatestPreviewAnimationTime(animationTime)
    }
  }, -3)

  useFrame(({ gl }) => {
    resolveVisualFrameSize('canvas', gl.domElement.width, gl.domElement.height)

    if (
      exportRender
      &&
      selectedEffectId !== 'pixel-sort'
      && requestId > 0
      && exportFrameAckGate.consumeIfReady(requestId, gl.info.render.calls)
    ) {
      onFrameRendered?.(requestId, gl.domElement)
    }
  }, exportRender ? 2 : 0)

  return null
}
