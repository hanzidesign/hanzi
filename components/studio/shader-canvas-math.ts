import { Vector2 } from 'three'

type ViewportPointer = {
  clientX: number
  clientY: number
}

type ViewportRect = {
  left: number
  top: number
  width: number
  height: number
}

export function getViewportPointerUniformValue(
  pointer: ViewportPointer,
  rect: ViewportRect,
) {
  if (rect.width <= 0 || rect.height <= 0) {
    return new Vector2(0, 0)
  }

  return new Vector2(
    clamp01((pointer.clientX - rect.left) / rect.width),
    clamp01((pointer.clientY - rect.top) / rect.height),
  )
}

export function applyDeltaRotation(
  currentRotationY: number,
  autoRotateSpeed: number,
  deltaSeconds: number,
) {
  return currentRotationY + autoRotateSpeed * deltaSeconds
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
