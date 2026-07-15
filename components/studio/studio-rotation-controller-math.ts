import { Euler, Quaternion, Vector3 } from 'three'

export type StudioRotation = {
  x: number
  y: number
  z: number
}

export type StudioRotationDragMode = 'orbit' | 'x' | 'y' | 'z'

const DRAG_RADIANS_PER_PIXEL = Math.PI / 240
const X_AXIS = new Vector3(1, 0, 0)
const Y_AXIS = new Vector3(0, 1, 0)

export function applyRotationDrag(
  start: StudioRotation,
  mode: StudioRotationDragMode,
  deltaX: number,
  deltaY: number,
): StudioRotation {
  if (mode !== 'orbit') {
    const delta = (mode === 'x' ? -deltaY : deltaX) * DRAG_RADIANS_PER_PIXEL

    return {
      ...start,
      [mode]: normalizeRotation(start[mode] + delta),
    }
  }

  const rotation = new Quaternion().setFromEuler(
    new Euler(start.x, start.y, start.z, 'XYZ'),
  )
  const yaw = new Quaternion().setFromAxisAngle(
    Y_AXIS,
    deltaX * DRAG_RADIANS_PER_PIXEL,
  )
  const pitch = new Quaternion().setFromAxisAngle(
    X_AXIS,
    -deltaY * DRAG_RADIANS_PER_PIXEL,
  )
  const nextEuler = new Euler().setFromQuaternion(
    rotation.premultiply(yaw).premultiply(pitch),
    'XYZ',
  )

  return {
    x: normalizeRotation(nextEuler.x),
    y: normalizeRotation(nextEuler.y),
    z: normalizeRotation(nextEuler.z),
  }
}

export function normalizeRotation(value: number) {
  const fullTurn = Math.PI * 2
  return ((value + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI
}
