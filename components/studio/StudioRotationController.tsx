'use client'

import {
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import {
  applyRotationDrag,
  normalizeRotation,
  type StudioRotation,
  type StudioRotationDragMode,
} from '@/components/studio/studio-rotation-controller-math'
import classes from './StudioShell.module.css'

type StudioRotationControllerProps = {
  rotation: StudioRotation
  onRotationChange: (rotation: StudioRotation) => void
}

type RotationDrag = {
  pointerId: number
  mode: StudioRotationDragMode
  startX: number
  startY: number
  startRotation: StudioRotation
}

const KEYBOARD_STEP = Math.PI / 180

export default function StudioRotationController({
  rotation,
  onRotationChange,
}: StudioRotationControllerProps) {
  const dragRef = useRef<RotationDrag | null>(null)

  const beginDrag = (
    mode: StudioRotationDragMode,
    event: PointerEvent<SVGElement>,
  ) => {
    event.preventDefault()
    const surface = event.currentTarget.ownerSVGElement
    surface?.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: { ...rotation },
    }
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    onRotationChange(applyRotationDrag(
      drag.startRotation,
      drag.mode,
      event.clientX - drag.startX,
      event.clientY - drag.startY,
    ))
  }

  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
  }

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const step = event.shiftKey ? KEYBOARD_STEP * 5 : KEYBOARD_STEP
    let axis: keyof StudioRotation | null = null
    let delta = 0

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      axis = 'x'
      delta = event.key === 'ArrowUp' ? step : -step
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      axis = 'y'
      delta = event.key === 'ArrowRight' ? step : -step
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      axis = 'z'
      delta = event.key === 'PageUp' ? step : -step
    }

    if (!axis) {
      return
    }

    event.preventDefault()
    onRotationChange({
      ...rotation,
      [axis]: normalizeRotation(rotation[axis] + delta),
    })
  }

  return (
    <svg
      className={classes.rotationController}
      viewBox="0 0 128 128"
      role="group"
      tabIndex={0}
      aria-label="3D rotation controller. Drag the sphere to orbit or drag a colored axis ring."
      data-testid="studio-rotation-controller"
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
    >
      <circle className={classes.rotationSphere} cx="64" cy="64" r="54" />
      <circle
        className={classes.rotationOrbitHit}
        cx="64"
        cy="64"
        r="50"
        onPointerDown={(event) => beginDrag('orbit', event)}
      />

      <path className={classes.rotationAxisX} d="M 64 14 C 24 14 24 114 64 114" />
      <path className={classes.rotationAxisY} d="M 64 14 C 104 14 104 114 64 114" />
      <path className={classes.rotationAxisZ} d="M 14 62 C 14 100 114 100 114 62" />

      <path
        className={classes.rotationAxisHit}
        d="M 64 14 C 24 14 24 114 64 114"
        onPointerDown={(event) => beginDrag('x', event)}
      />
      <path
        className={classes.rotationAxisHit}
        d="M 64 14 C 104 14 104 114 64 114"
        onPointerDown={(event) => beginDrag('y', event)}
      />
      <path
        className={classes.rotationAxisHit}
        d="M 14 62 C 14 100 114 100 114 62"
        onPointerDown={(event) => beginDrag('z', event)}
      />
      <circle className={classes.rotationCenter} cx="64" cy="64" r="2" />
    </svg>
  )
}
