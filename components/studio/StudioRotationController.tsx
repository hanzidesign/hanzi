'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import {
  applyRotationDrag,
  projectRotationRings,
  type StudioRotation,
} from '@/components/studio/studio-rotation-controller-math'
import classes from './StudioShell.module.css'

type StudioRotationControllerProps = {
  rotation: StudioRotation
  onRotationChange: (rotation: StudioRotation) => void
  readCharacterRotationY: (fallback: number) => number
}

type RotationDrag = {
  pointerId: number
  startX: number
  startY: number
  startRotation: StudioRotation
}

export default function StudioRotationController({
  rotation,
  onRotationChange,
  readCharacterRotationY,
}: StudioRotationControllerProps) {
  const dragRef = useRef<RotationDrag | null>(null)
  const readCharacterRotationYRef = useRef(readCharacterRotationY)
  const rotationYFallbackRef = useRef(rotation.y)
  const [liveRotationY, setLiveRotationY] = useState(rotation.y)

  useEffect(() => {
    readCharacterRotationYRef.current = readCharacterRotationY
  }, [readCharacterRotationY])

  useEffect(() => {
    rotationYFallbackRef.current = rotation.y
  }, [rotation.y])

  useEffect(() => {
    let frameId = 0
    const readLiveRotation = () => {
      const nextRotationY = readCharacterRotationYRef.current(rotationYFallbackRef.current)
      setLiveRotationY((currentRotationY) =>
        currentRotationY === nextRotationY ? currentRotationY : nextRotationY,
      )
      frameId = window.requestAnimationFrame(readLiveRotation)
    }

    frameId = window.requestAnimationFrame(readLiveRotation)

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const ringPaths = useMemo(
    () => projectRotationRings({
      x: rotation.x,
      y: liveRotationY,
      z: rotation.z,
    }),
    [liveRotationY, rotation.x, rotation.z],
  )

  const beginDrag = (event: PointerEvent<SVGElement>) => {
    event.preventDefault()
    const surface = event.currentTarget.ownerSVGElement
    surface?.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
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

  return (
    <svg
      className={classes.rotationController}
      viewBox="0 0 128 128"
      role="group"
      aria-label="3D rotation controller. Drag anywhere to orbit freely."
      data-testid="studio-rotation-controller"
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <circle className={classes.rotationSphere} cx="64" cy="64" r="54" />
      <circle
        className={classes.rotationOrbitHit}
        cx="64"
        cy="64"
        r="50"
        onPointerDown={beginDrag}
      />

      <path className={classes.rotationAxisX} d={ringPaths.x} />
      <path className={classes.rotationAxisY} d={ringPaths.y} />
      <path className={classes.rotationAxisZ} d={ringPaths.z} />

      <path
        className={classes.rotationAxisHit}
        d={ringPaths.x}
        onPointerDown={beginDrag}
      />
      <path
        className={classes.rotationAxisHit}
        d={ringPaths.y}
        onPointerDown={beginDrag}
      />
      <path
        className={classes.rotationAxisHit}
        d={ringPaths.z}
        onPointerDown={beginDrag}
      />
      <circle className={classes.rotationCenter} cx="64" cy="64" r="2" />
    </svg>
  )
}
