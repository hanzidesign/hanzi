'use client'

import { useEffect, useState } from 'react'
import {
  IoCodeSlashOutline,
  IoCopyOutline,
  IoDocumentOutline,
  IoPlayOutline,
} from 'react-icons/io5'
import { useStudioStore, type StudioExportFormat } from '@/app/studio/studio-store'
import classes from './StudioShell.module.css'

type ExportGridOption = {
  label: string
  value?: StudioExportFormat
  supported: boolean
  requiresAnimation?: boolean
  icon: 'document' | 'play' | 'code' | 'copy'
}

const exportOptions: ExportGridOption[] = [
  { value: 'png', label: 'PNG', supported: true, icon: 'document' },
  { label: 'JPG', supported: false, icon: 'document' },
  { label: 'WEBP', supported: false, icon: 'document' },
  { value: 'gif', label: 'GIF', supported: true, requiresAnimation: true, icon: 'document' },
  { value: 'mp4', label: 'MP4', supported: true, requiresAnimation: true, icon: 'play' },
  { label: 'APNG', supported: false, icon: 'document' },
  { label: 'SVG', supported: false, icon: 'code' },
  { label: 'COPY', supported: false, icon: 'copy' },
]

export default function StudioExportPanel() {
  const selectedFormat = useStudioStore((store) => store.export.selectedFormat)
  const animation = useStudioStore((store) => store.animation)
  const setExportFormat = useStudioStore((store) => store.setExportFormat)
  const [message, setMessage] = useState('Ready')
  const activeFormat = exportOptions.some((option) => option.value === selectedFormat)
    ? selectedFormat
    : 'png'
  useEffect(() => {
    if (!animation.playing && selectedFormat !== 'png') {
      setExportFormat('png')
    }
  }, [animation.playing, selectedFormat, setExportFormat])

  const handleExport = async (format: StudioExportFormat) => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[data-studio-preview] canvas',
    )

    if (!canvas) {
      setMessage('Canvas unavailable')
      return
    }

    try {
      if (format === 'png') {
        downloadDataUrl(
          canvas.toDataURL('image/png'),
          createExportFileName('png'),
        )
        setMessage('PNG exported')
        return
      }

      if (!animation.playing) {
        setMessage('Enable animation first')
        return
      }

      const blob = await captureAnimationLoop(canvas, format)
      downloadBlob(blob, createExportFileName(format))
      setMessage(`${optionLabel(format)} exported`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed')
    }
  }

  return (
    <div className={classes.exportPanel}>
      <div className={classes.exportFormatGrid} aria-label="Export format" data-studio-export-grid>
        {exportOptions.map((option) => {
          const disabled = !option.supported || (option.requiresAnimation && !animation.playing)

          return (
            <button
              key={option.label}
              type="button"
              className={classes.exportFormatButton}
              data-active={option.value === activeFormat}
              disabled={disabled}
              title={disabled ? `${option.label} export is not available` : `Select ${option.label}`}
              onClick={() => {
                if (option.value) {
                  setExportFormat(option.value)
                  void handleExport(option.value)
                }
              }}
            >
              <ExportFormatIcon icon={option.icon} />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
      <p className={classes.exportStatus} aria-live="polite">{message}</p>
    </div>
  )
}

function optionLabel(format: StudioExportFormat) {
  return exportOptions.find((option) => option.value === format)?.label ?? format.toUpperCase()
}

function ExportFormatIcon({ icon }: { icon: ExportGridOption['icon'] }) {
  if (icon === 'play') {
    return <IoPlayOutline aria-hidden size={15} />
  }
  if (icon === 'code') {
    return <IoCodeSlashOutline aria-hidden size={15} />
  }
  if (icon === 'copy') {
    return <IoCopyOutline aria-hidden size={15} />
  }

  return <IoDocumentOutline aria-hidden size={15} />
}

async function captureAnimationLoop(
  canvas: HTMLCanvasElement,
  format: Exclude<StudioExportFormat, 'png'>
) {
  if (format === 'gif') {
    return captureGifAnimationLoop(canvas)
  }

  if (!canvas.captureStream || typeof MediaRecorder === 'undefined') {
    throw new Error('Video export is not supported by this browser')
  }

  const mimeType = readSupportedVideoMimeType()

  if (!mimeType) {
    throw new Error('MP4 export is not supported by this browser')
  }

  const stream = canvas.captureStream(30)
  const chunks: BlobPart[] = []
  const recorder = new MediaRecorder(stream, { mimeType })

  await new Promise<void>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }
    recorder.onerror = () => reject(new Error('Video recording failed'))
    recorder.onstop = () => resolve()
    recorder.start()
    window.setTimeout(() => recorder.stop(), 2400)
  }).finally(() => {
    for (const track of stream.getTracks()) {
      track.stop()
    }
  })

  return new Blob(chunks, { type: mimeType })
}

async function captureGifAnimationLoop(canvas: HTMLCanvasElement) {
  const { GIFEncoder, applyPalette, quantize } = await import('gifenc')
  const encoder = GIFEncoder()
  const { context, width, height } = createLoopCaptureCanvas(canvas, 640)
  const frameCount = 24
  const delay = 100

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    await waitForFrame(frameIndex === 0 ? 0 : delay)
    context.drawImage(canvas, 0, 0, width, height)

    const pixels = context.getImageData(0, 0, width, height).data
    const palette = quantize(pixels, 256)
    const indexedPixels = applyPalette(pixels, palette)

    encoder.writeFrame(indexedPixels, width, height, {
      palette,
      delay,
    })
  }

  encoder.finish()

  const bytes = encoder.bytes()
  const gifBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer

  return new Blob([gifBuffer], { type: 'image/gif' })
}

function createLoopCaptureCanvas(canvas: HTMLCanvasElement, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height))
  const width = Math.max(1, Math.round(canvas.width * scale))
  const height = Math.max(1, Math.round(canvas.height * scale))
  const captureCanvas = document.createElement('canvas')

  captureCanvas.width = width
  captureCanvas.height = height

  const context = captureCanvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    throw new Error('GIF canvas unavailable')
  }

  return { context, width, height }
}

async function waitForFrame(delay: number) {
  if (delay > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, delay))
  }

  await new Promise((resolve) => window.requestAnimationFrame(resolve))
}

function readSupportedVideoMimeType() {
  const mimeTypes = [
    'video/mp4;codecs=h264',
    'video/mp4',
  ]

  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? null
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement('a')
  link.download = fileName
  link.href = dataUrl
  link.click()
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
