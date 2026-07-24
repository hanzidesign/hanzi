import { Euler, Quaternion, Vector3 } from 'three'

export type StudioRotation = {
  x: number
  y: number
  z: number
}

export type StudioRotationRingPaths = {
  x: string
  y: string
  z: string
}

const DRAG_RADIANS_PER_PIXEL = Math.PI / 240
const SVG_CENTER = 64
const SVG_RING_RADIUS = 50
const RING_SAMPLE_COUNT = 48
const X_AXIS = new Vector3(1, 0, 0)
const Y_AXIS = new Vector3(0, 1, 0)

/**
 * Projects each local axis ring into the controller's front-view SVG plane.
 *
 * The controller deliberately uses the same orthographic projection as the
 * model's front view: world X maps to SVG X and world Y maps to inverted SVG
 * Y. The axis ring's local plane is sampled before applying the model's XYZ
 * Euler rotation, so even an edge-on ring remains a useful hit target while
 * the visible path follows the model orientation.
 */
export function projectRotationRings(rotation: StudioRotation): StudioRotationRingPaths {
  const quaternion = new Quaternion().setFromEuler(
    new Euler(rotation.x, rotation.y, rotation.z, 'XYZ'),
  )

  return {
    x: projectRingPath((angle) => new Vector3(0, Math.cos(angle), Math.sin(angle)), quaternion),
    y: projectRingPath((angle) => new Vector3(Math.sin(angle), 0, Math.cos(angle)), quaternion),
    z: projectRingPath((angle) => new Vector3(Math.cos(angle), Math.sin(angle), 0), quaternion),
  }
}

function projectRingPath(
  createLocalPoint: (angle: number) => Vector3,
  quaternion: Quaternion,
) {
  const points: string[] = []

  for (let index = 0; index < RING_SAMPLE_COUNT; index += 1) {
    const angle = (index / RING_SAMPLE_COUNT) * Math.PI * 2
    const point = createLocalPoint(angle).applyQuaternion(quaternion)
    const x = SVG_CENTER + point.x * SVG_RING_RADIUS
    const y = SVG_CENTER - point.y * SVG_RING_RADIUS

    points.push(`${formatSvgCoordinate(x)} ${formatSvgCoordinate(y)}`)
  }

  return `M ${points.join(' L ')} Z`
}

function formatSvgCoordinate(value: number) {
  const rounded = Math.round(value * 1000) / 1000
  return String(Object.is(rounded, -0) ? 0 : rounded)
}

export function applyRotationDrag(
  start: StudioRotation,
  deltaX: number,
  deltaY: number,
): StudioRotation {
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
