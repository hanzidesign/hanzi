import {
  Group,
  Mesh,
  type BufferGeometry,
  type Material,
} from 'three'

export const MIN_CHARACTER_REPEAT_COUNT = 1
export const MAX_CHARACTER_REPEAT_COUNT = 50
export const MIN_CHARACTER_REPEAT_RADIUS = 0
export const MAX_CHARACTER_REPEAT_RADIUS = 50
export const MIN_CHARACTER_REPEAT_ORIENTATION = 0
export const MAX_CHARACTER_REPEAT_ORIENTATION = 360
export const MIN_CHARACTER_REPEAT_SIZE = 0.1
export const MAX_CHARACTER_REPEAT_SIZE = 3

export type CharacterRepeatSettings = {
  enabled: boolean
  count: number
  radius: number
  orientation: number
  size: number
}

export type CharacterRepeatTransform = {
  position: [number, number, number]
  rotationY: number
  scale: number
}

export function createCharacterRepeatTransforms(
  repeat: CharacterRepeatSettings,
): CharacterRepeatTransform[] {
  const count = Math.round(Math.min(
    MAX_CHARACTER_REPEAT_COUNT,
    Math.max(MIN_CHARACTER_REPEAT_COUNT, repeat.count),
  ))

  if (!repeat.enabled) {
    return [{ position: [0, 0, 0], rotationY: 0, scale: 1 }]
  }

  const scale = Math.min(
    MAX_CHARACTER_REPEAT_SIZE,
    Math.max(MIN_CHARACTER_REPEAT_SIZE, repeat.size),
  )

  if (count === 1) {
    return [{ position: [0, 0, 0], rotationY: 0, scale }]
  }

  const radius = Math.min(
    MAX_CHARACTER_REPEAT_RADIUS,
    Math.max(MIN_CHARACTER_REPEAT_RADIUS, repeat.radius),
  )
  const orientation = Math.min(
    MAX_CHARACTER_REPEAT_ORIENTATION,
    Math.max(MIN_CHARACTER_REPEAT_ORIENTATION, repeat.orientation),
  )
  const orientationOffset = ((orientation - 90) * Math.PI) / 180

  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2

    return {
      position: [Math.sin(angle) * radius, 0, Math.cos(angle) * radius],
      rotationY: angle + orientationOffset,
      scale,
    }
  })
}

export function addCharacterModelCopies(
  root: Group,
  geometries: BufferGeometry[],
  material: Material | Material[],
  repeat: CharacterRepeatSettings,
) {
  for (const transform of createCharacterRepeatTransforms(repeat)) {
    const copy = new Group()
    copy.position.set(...transform.position)
    copy.rotation.y = transform.rotationY
    copy.scale.setScalar(transform.scale)

    for (const geometry of geometries) {
      copy.add(new Mesh(geometry, material))
    }

    root.add(copy)
  }
}
