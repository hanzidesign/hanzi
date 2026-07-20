'use client'

import StudioEffectCanvas from '@/components/studio/StudioEffectCanvas'
import { StudioRenderModeProvider } from '@/components/studio/studio-render-context'
import classes from './StudioShell.module.css'

export default function StudioExportRenderSurface({
  size,
  initialAnimationTime,
  requestId,
  onFrameRendered,
}: {
  size: number
  initialAnimationTime: number
  requestId: number
  onFrameRendered: (requestId: number, canvas: HTMLCanvasElement) => void
}) {
  return (
    <div
      className={classes.exportRenderSurface}
      data-studio-export-render-surface
      data-export-size={size}
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <StudioRenderModeProvider
        exportRender
        initialAnimationTime={initialAnimationTime}
        requestId={requestId}
        onFrameRendered={onFrameRendered}
      >
        <StudioEffectCanvas />
      </StudioRenderModeProvider>
    </div>
  )
}
