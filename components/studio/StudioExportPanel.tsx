'use client'

import { Tooltip } from '@mantine/core'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { createPortal } from 'react-dom'
import { IoDocumentOutline, IoPlayOutline } from 'react-icons/io5'

import { useStudioStore, type StudioExportFormat } from '@/app/studio/studio-store'
import { encodeApngFromPngFrames } from '@/components/studio/apng-encoder'
import StudioExportRenderSurface from '@/components/studio/StudioExportRenderSurface'
import {
  createExportAnimationPlan,
  createFrameDelaySchedule,
  readExportFrame,
  type AnimatedStudioExportFormat,
  type ExportAnimationPlan,
} from '@/components/studio/export-animation'
import {
  readLatestPreviewAnimationTime,
  useStudioPreviewFrameSnapshot,
  type StudioVisualFrameSnapshot,
} from '@/components/studio/studio-render-context'
import { isAbortError } from '@/utils/dataUrl'
import classes from './StudioShell.module.css'

type ExportGridOption = {
  label: string
  value: StudioExportFormat
  icon: 'document' | 'play'
}

const exportOptions: ExportGridOption[] = [
  { value: 'png', label: 'PNG', icon: 'document' },
  { value: 'apng', label: 'APNG', icon: 'document' },
  { value: 'gif', label: 'GIF', icon: 'document' },
  { value: 'mp4', label: 'MP4', icon: 'play' },
]

const PNG_EXPORT_SIZE = 2048
const ANIMATION_EXPORT_SIZE = 1024

type ExportModalState = {
  format: StudioExportFormat
  status: 'exporting' | 'completed' | 'canceled' | 'error'
  stage: 'rendering' | 'compressing'
  completedFrames: number
  totalFrames: number
  blob?: Blob
  error?: string
}

type PendingExportFrame = {
  requestId: number
  size: number
  resolve: (canvas: HTMLCanvasElement) => void
  reject: (error: Error) => void
  cleanup: () => void
}

export default function StudioExportPanel() {
  const selectedEffectId = useStudioStore((store) => store.studioEffect.selectedEffectId)
  const selectedFormat = useStudioStore((store) => store.export.selectedFormat)
  const autoRotate = useStudioStore((store) => store.mesh.autoRotate)
  const autoRotateSpeed = useStudioStore((store) => store.mesh.autoRotateSpeed)
  const motionPlaying = useStudioStore((store) => store.animation.playing)
  const motionSpeed = useStudioStore((store) => store.animation.speed)
  const setExportFormat = useStudioStore((store) => store.setExportFormat)
  const [message, setMessage] = useState('Ready')
  const [modal, setModal] = useState<ExportModalState | null>(null)
  const [pngExporting, setPngExporting] = useState(false)
  const [renderSurface, setRenderSurface] = useState<{
    size: number
    requestId: number
    animationTime: number
    visualFrameSnapshot: StudioVisualFrameSnapshot
  } | null>(null)
  const captureVisualFrameSnapshot = useStudioPreviewFrameSnapshot()
  const abortControllerRef = useRef<AbortController | null>(null)
  const renderRequestIdRef = useRef(0)
  const pendingExportFrameRef = useRef<PendingExportFrame | null>(null)
  const pngAvailable = !motionPlaying || motionSpeed === 0
  const animationAvailable = motionPlaying
    && autoRotate
    && autoRotateSpeed > 0
    && motionSpeed !== 0
  const exporting = modal?.status === 'exporting'

  const requestExportFrame = useCallback((
    size: number,
    animationTime: number,
    visualFrameSnapshot: StudioVisualFrameSnapshot,
    signal?: AbortSignal,
  ) => {
    return new Promise<HTMLCanvasElement>((resolve, reject) => {
      if (pendingExportFrameRef.current) {
        reject(new Error('Another export frame is still rendering'))
        return
      }

      const requestId = renderRequestIdRef.current + 1
      renderRequestIdRef.current = requestId
      const timeoutId = window.setTimeout(() => {
        const pending = pendingExportFrameRef.current
        if (pending?.requestId !== requestId) {
          return
        }
        pending.cleanup()
        pendingExportFrameRef.current = null
        reject(new Error('Export renderer timed out'))
      }, 15000)
      const handleAbort = () => {
        const pending = pendingExportFrameRef.current
        if (pending?.requestId !== requestId) {
          return
        }
        pending.cleanup()
        pendingExportFrameRef.current = null
        reject(new DOMException('Export canceled', 'AbortError'))
      }
      const cleanup = () => {
        window.clearTimeout(timeoutId)
        signal?.removeEventListener('abort', handleAbort)
      }

      pendingExportFrameRef.current = { requestId, size, resolve, reject, cleanup }
      signal?.addEventListener('abort', handleAbort, { once: true })
      setRenderSurface({
        size,
        requestId,
        animationTime,
        visualFrameSnapshot,
      })

      if (signal?.aborted) {
        handleAbort()
      }
    })
  }, [])

  const handleExportFrameRendered = useCallback((requestId: number, canvas: HTMLCanvasElement) => {
    const pending = pendingExportFrameRef.current
    if (!pending || pending.requestId !== requestId) {
      return
    }

    pending.cleanup()
    pendingExportFrameRef.current = null

    if (canvas.width !== pending.size || canvas.height !== pending.size) {
      pending.reject(new Error(
        `Export renderer produced ${canvas.width}×${canvas.height}; expected ${pending.size}×${pending.size}`,
      ))
      return
    }

    pending.resolve(canvas)
  }, [])

  const releaseExportSurface = useCallback(() => {
    const pending = pendingExportFrameRef.current
    if (pending) {
      pending.cleanup()
      pending.reject(new Error('Export renderer was released'))
      pendingExportFrameRef.current = null
    }
    setRenderSurface(null)
  }, [])

  useEffect(() => releaseExportSurface, [releaseExportSurface])

  const handleExport = async (format: StudioExportFormat) => {
    const visualFrameSnapshot = captureVisualFrameSnapshot(selectedEffectId)
    setExportFormat(format)
    setMessage(`Preparing ${optionLabel(format)}…`)

    if (format === 'png') {
      setPngExporting(true)
      try {
        const exportCanvas = await requestExportFrame(
          PNG_EXPORT_SIZE,
          readLatestPreviewAnimationTime(),
          visualFrameSnapshot,
        )
        const rawBlob = await canvasToBlob(exportCanvas, 'image/png')
        const blob = await compressExportBlob(rawBlob, 'png')
        downloadBlob(blob, createExportFileName(format))
        setMessage('PNG exported at 2048×2048 after Sharp compression')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'PNG export failed')
      } finally {
        releaseExportSurface()
        setPngExporting(false)
      }
      return
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    setModal({
      format,
      status: 'exporting',
      stage: 'rendering',
      completedFrames: 0,
      totalFrames: 0,
    })
    let totalFrames = 0
    const previewAnimationTime = readLatestPreviewAnimationTime()

    try {
      const rawBlob = await captureAnimationLoop(
        format,
        abortController.signal,
        previewAnimationTime,
        (animationTime) => requestExportFrame(
          ANIMATION_EXPORT_SIZE,
          animationTime,
          visualFrameSnapshot,
          abortController.signal,
        ),
        (completed, total) => {
          totalFrames = total
          setMessage(`Exporting ${optionLabel(format)} ${completed}/${total}`)
          setModal((current) => current?.status === 'exporting'
            ? { ...current, completedFrames: completed, totalFrames: total }
            : current)
        },
      )

      throwIfAborted(abortController.signal)
      const blob = format === 'gif'
        ? await compressAnimatedExport(rawBlob, format, abortController.signal, setModal)
        : rawBlob
      throwIfAborted(abortController.signal)
      setMessage(`${optionLabel(format)} ready to download`)
      setModal({
        format,
        status: 'completed',
        stage: 'rendering',
        completedFrames: totalFrames,
        totalFrames,
        blob,
      })
    } catch (error) {
      if (isAbortError(error)) {
        setMessage(`${optionLabel(format)} export canceled`)
        setModal((current) => current
          ? { ...current, status: 'canceled', stage: 'rendering' }
          : null)
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Export failed'
        setMessage(errorMessage)
        setModal((current) => current
          ? { ...current, status: 'error', stage: 'rendering', error: errorMessage }
          : null)
      }
    } finally {
      releaseExportSurface()
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
    }
  }

  return (
    <div className={classes.exportPanel}>
      <div className={classes.exportFormatGrid} aria-label="Export format" data-studio-export-grid>
        {exportOptions.map((option) => {
          const disabled = exporting || pngExporting
            || (option.value === 'png' ? !pngAvailable : !animationAvailable)
          const unavailableReason = option.value === 'png' && !pngAvailable
            ? '3D Motion Play must be off to export PNG'
            : option.value !== 'png' && !animationAvailable
              ? 'Turn Play on and set a non-zero 3D Motion Speed to export animation'
              : undefined

          return (
            <Tooltip
              key={option.value}
              label={unavailableReason}
              disabled={!unavailableReason}
              openDelay={250}
              position="top"
              withArrow
            >
              <span
                className={classes.exportFormatTooltip}
              >
                <button
                  type="button"
                  className={classes.exportFormatButton}
                  data-active={option.value === selectedFormat}
                  disabled={disabled}
                  aria-label={unavailableReason ?? `Export ${option.label}`}
                  onClick={() => void handleExport(option.value)}
                >
                  <ExportFormatIcon icon={option.icon} />
                  <span>{option.label}</span>
                </button>
              </span>
            </Tooltip>
          )
        })}
      </div>
      <p className={classes.exportStatus} aria-live="polite">{message}</p>
      {modal && typeof document !== 'undefined'
        ? createPortal(
            <ExportProgressModal
              state={modal}
              onCancel={() => abortControllerRef.current?.abort()}
              onClose={() => setModal(null)}
              onDownload={() => {
                if (modal.blob) {
                  downloadBlob(modal.blob, createExportFileName(modal.format))
                }
              }}
            />,
            getExportPortalTarget(),
          )
        : null}
      {renderSurface && typeof document !== 'undefined'
        ? createPortal(
            <StudioExportRenderSurface
              size={renderSurface.size}
              initialAnimationTime={renderSurface.animationTime}
              requestId={renderSurface.requestId}
              onFrameRendered={handleExportFrameRendered}
              visualFrameSnapshot={renderSurface.visualFrameSnapshot}
            />,
            document.body,
          )
        : null}
    </div>
  )
}

function getExportPortalTarget() {
  return document.querySelector<HTMLElement>('[data-studio-terminal-shell]')
    ?? document.body
}

function ExportProgressModal({
  state,
  onCancel,
  onClose,
  onDownload,
}: {
  state: ExportModalState
  onCancel: () => void
  onClose: () => void
  onDownload: () => void
}) {
  const progress = state.totalFrames > 0
    ? Math.round((state.completedFrames / state.totalFrames) * 100)
    : 0
  const title = state.status === 'completed'
    ? `${optionLabel(state.format)} ready`
    : state.status === 'canceled'
      ? 'Export canceled'
      : state.status === 'error'
        ? 'Export failed'
        : state.stage === 'compressing'
          ? `Optimizing ${optionLabel(state.format)}`
          : `Exporting ${optionLabel(state.format)}`

  return (
    <div className={classes.exportModalBackdrop} data-studio-export-modal>
      <section
        className={classes.exportModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-export-modal-title"
      >
        <div className={classes.exportModalHeader}>
          <span className={classes.exportModalEyebrow}>Export</span>
          <h2 id="studio-export-modal-title">{title}</h2>
        </div>

        {state.status === 'exporting' ? (
          <>
            <div
              className={classes.exportProgressTrack}
              role="progressbar"
              aria-label={`${optionLabel(state.format)} export progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span className={classes.exportProgressFill} style={{ width: `${progress}%` }} />
            </div>
            <div className={classes.exportProgressMeta}>
              <span>{progress}%</span>
              <span>{state.stage === 'compressing'
                ? 'Compressing with Sharp…'
                : state.totalFrames > 0
                  ? `${state.completedFrames} / ${state.totalFrames} frames`
                : 'Preparing encoder…'}</span>
            </div>
            <button type="button" className={classes.exportModalSecondaryButton} onClick={onCancel}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <p className={classes.exportModalMessage}>
              {state.status === 'completed'
                ? 'Your file is ready. Download it when you are ready.'
                : state.status === 'canceled'
                  ? 'No file was downloaded.'
                  : state.error ?? 'Export failed.'}
            </p>
            <div className={classes.exportModalActions}>
              <button type="button" className={classes.exportModalSecondaryButton} onClick={onClose}>
                Close
              </button>
              {state.status === 'completed' ? (
                <button type="button" className={classes.exportModalPrimaryButton} onClick={onDownload}>
                  Download
                </button>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function optionLabel(format: StudioExportFormat) {
  return exportOptions.find((option) => option.value === format)?.label ?? format.toUpperCase()
}

function ExportFormatIcon({ icon }: { icon: ExportGridOption['icon'] }) {
  return icon === 'play'
    ? <IoPlayOutline aria-hidden size={15} />
    : <IoDocumentOutline aria-hidden size={15} />
}

async function captureAnimationLoop(
  format: AnimatedStudioExportFormat,
  signal: AbortSignal,
  baseAnimationTime: number,
  renderFrame: (animationTime: number) => Promise<HTMLCanvasElement>,
  onProgress: (completed: number, total: number) => void,
) {
  const initialState = useStudioStore.getState()
  const initialMesh = initialState.mesh
  const initialAnimation = initialState.animation
  const plan = createExportAnimationPlan({
    format,
    autoRotate: initialMesh.autoRotate,
    autoRotateSpeed: initialMesh.autoRotateSpeed,
    motionSpeed: initialAnimation.speed,
  })
  onProgress(0, plan.frameCount)
  throwIfAborted(signal)
  let encoder: AnimationEncoder | null = null

  useStudioStore.setState({
    animation: {
      ...initialAnimation,
      playing: false,
    },
  })

  try {
    for (let frameIndex = 0; frameIndex < plan.frameCount; frameIndex += 1) {
      throwIfAborted(signal)
      const frame = readExportFrame({
        plan,
        frameIndex,
        baseRotationY: initialMesh.rotation.y,
        baseTime: baseAnimationTime,
        motionSpeed: initialAnimation.speed,
      })

      useStudioStore.setState({
        mesh: {
          ...initialMesh,
          rotation: {
            ...initialMesh.rotation,
            y: frame.rotationY,
          },
        },
        animation: {
          ...initialAnimation,
          playing: false,
          timeOffset: frame.animationTime,
        },
      })

      const exportCanvas = await renderFrame(frame.animationTime)
      encoder ??= await createAnimationEncoder(format, exportCanvas, plan)
      await encoder.addFrame(frameIndex, exportCanvas)
      onProgress(frameIndex + 1, plan.frameCount)
    }

    throwIfAborted(signal)
    if (!encoder) {
      throw new Error('Animation export produced no frames')
    }
    return await encoder.finish()
  } catch (error) {
    await encoder?.cancel()
    throw error
  } finally {
    useStudioStore.setState({
      mesh: initialMesh,
      animation: initialAnimation,
    })
  }
}

type AnimationEncoder = {
  addFrame: (frameIndex: number, canvas: HTMLCanvasElement) => Promise<void>
  finish: () => Promise<Blob>
  cancel: () => Promise<void>
}

async function createAnimationEncoder(
  format: AnimatedStudioExportFormat,
  canvas: HTMLCanvasElement,
  plan: ExportAnimationPlan,
): Promise<AnimationEncoder> {
  if (format === 'gif') {
    return createGifEncoder(canvas, plan)
  }

  if (format === 'apng') {
    return createApngEncoder(canvas, plan)
  }

  return createMp4Encoder(canvas, plan)
}

async function createGifEncoder(
  canvas: HTMLCanvasElement,
  plan: ExportAnimationPlan,
): Promise<AnimationEncoder> {
  const { GIFEncoder, applyPalette, quantize } = await import('gifenc')
  const encoder = GIFEncoder()
  const delays = createFrameDelaySchedule(plan.frameCount, plan.fps, 10)
  const frameCanvas = document.createElement('canvas')
  frameCanvas.width = canvas.width
  frameCanvas.height = canvas.height
  const context = frameCanvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('GIF frame canvas unavailable')
  }

  return {
    async addFrame(frameIndex, sourceCanvas) {
      context.drawImage(sourceCanvas, 0, 0)
      const pixels = context.getImageData(0, 0, frameCanvas.width, frameCanvas.height).data
      const palette = quantize(pixels, 256)
      const indexedPixels = applyPalette(pixels, palette)

      encoder.writeFrame(indexedPixels, frameCanvas.width, frameCanvas.height, {
        palette,
        delay: delays[frameIndex],
        repeat: 0,
      })
    },
    async finish() {
      encoder.finish()

      const bytes = encoder.bytes()
      const buffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer

      return new Blob([buffer], { type: 'image/gif' })
    },
    async cancel() {
      encoder.finish()
    },
  }
}

async function createApngEncoder(
  canvas: HTMLCanvasElement,
  plan: ExportAnimationPlan,
): Promise<AnimationEncoder> {
  const frames: ArrayBuffer[] = []

  return {
    async addFrame(_frameIndex, sourceCanvas) {
      const blob = await canvasToBlob(sourceCanvas, 'image/png')
      frames.push(await blob.arrayBuffer())
    },
    async finish() {
      return encodeApngFromPngFrames({
        pngFrames: frames,
        width: canvas.width,
        height: canvas.height,
        fps: plan.fps,
      })
    },
    async cancel() {
      frames.length = 0
    },
  }
}

async function createMp4Encoder(
  canvas: HTMLCanvasElement,
  plan: ExportAnimationPlan,
): Promise<AnimationEncoder> {
  const {
    BufferTarget,
    CanvasSource,
    Mp4OutputFormat,
    Output,
    QUALITY_HIGH,
    canEncodeVideo,
  } = await import('mediabunny')
  const supported = await canEncodeVideo('avc', {
    width: canvas.width,
    height: canvas.height,
    bitrate: QUALITY_HIGH,
  })

  if (!supported) {
    throw new Error('MP4 export is not supported by this browser')
  }

  const target = new BufferTarget()
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  })
  const source = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: QUALITY_HIGH,
    keyFrameInterval: 1,
  })

  output.addVideoTrack(source, { frameRate: plan.fps })
  await output.start()

  return {
    async addFrame(frameIndex) {
      await source.add(
        frameIndex * plan.frameDurationSeconds,
        plan.frameDurationSeconds,
        { keyFrame: frameIndex % plan.fps === 0 },
      )
    },
    async finish() {
      await output.finalize()

      if (!target.buffer) {
        throw new Error('MP4 encoding produced no data')
      }

      return new Blob([target.buffer], { type: 'video/mp4' })
    },
    async cancel() {
      if (output.state === 'started') {
        await output.cancel()
      }
    },
  }
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException('Export canceled', 'AbortError')
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('PNG export failed'))
      }
    }, type)
  })
}

async function compressAnimatedExport(
  blob: Blob,
  format: 'gif',
  signal: AbortSignal,
  setModal: Dispatch<SetStateAction<ExportModalState | null>>,
) {
  setModal((current) => current?.status === 'exporting'
    ? { ...current, stage: 'compressing' }
    : current)
  return compressExportBlob(blob, format, signal)
}

async function compressExportBlob(
  blob: Blob,
  format: 'png' | 'gif',
  signal?: AbortSignal,
) {
  const response = await fetch('/api/studio/export/compress', {
    method: 'POST',
    headers: {
      'Content-Type': blob.type,
      'x-hanzi-export-format': format,
    },
    body: blob,
    signal,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error ?? 'Sharp compression failed')
  }

  return response.blob()
}

function downloadBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.download = fileName
  link.href = href
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 1000)
}

function createExportFileName(format: StudioExportFormat) {
  return `hanzi-studio-${new Date().toISOString().slice(0, 10)}.${format}`
}
