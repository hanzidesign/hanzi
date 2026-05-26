import {
  Box3,
  BufferAttribute,
  ExtrudeGeometry,
  Vector3,
  type BufferGeometry,
  type Shape,
} from 'three'

export const MIN_CHARACTER_EXTRUSION_DEPTH = 0.01

type CreateCharacterMeshGeometriesOptions = {
  shapes: Shape[]
  extrusionDepth: number
  thickness?: number
}

export type CharacterMeshGeometryResult = {
  geometries: ExtrudeGeometry[]
  boundsMin: Vector3
  boundsMax: Vector3
  shaderBoundsMin: Vector3
  shaderBoundsMax: Vector3
}

export function clampCharacterExtrusionDepth(extrusionDepth: number) {
  return Math.max(extrusionDepth, MIN_CHARACTER_EXTRUSION_DEPTH)
}

export function createCharacterMeshGeometries({
  shapes,
  extrusionDepth,
  thickness = 0,
}: CreateCharacterMeshGeometriesOptions): CharacterMeshGeometryResult {
  if (shapes.length === 0) {
    throw new Error('Character SVG contains no drawable SVG shapes.')
  }

  const depth = clampCharacterExtrusionDepth(extrusionDepth)
  const geometries = shapes.map(
    (shape) =>
      new ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
      }),
  )

  try {
    const sourceBounds = getCombinedBounds(geometries)
    const sourceSize = sourceBounds.getSize(new Vector3())
    const sourceCenter = sourceBounds.getCenter(new Vector3())
    const sourceSpan = Math.max(sourceSize.x, sourceSize.y)

    if (sourceSpan <= 0) {
      throw new Error('Character SVG contains no drawable SVG area.')
    }

    const xyScale = sourceSpan / 2

    for (const geometry of geometries) {
      normalizeGeometry(geometry, sourceCenter, xyScale, depth)
      applyCharacterMeshThickness(geometry, thickness)
    }

    const normalizedBounds = getCombinedBounds(geometries)
    const boundsMin = roundVector(normalizedBounds.min)
    const boundsMax = roundVector(normalizedBounds.max)
    const shaderBounds = getAspectPreservingShaderBounds(boundsMin, boundsMax)

    for (const geometry of geometries) {
      assignCharacterMeshUvs(
        geometry,
        shaderBounds.min,
        shaderBounds.max,
        boundsMin,
        boundsMax,
      )
    }

    return {
      geometries,
      boundsMin,
      boundsMax,
      shaderBoundsMin: shaderBounds.min,
      shaderBoundsMax: shaderBounds.max,
    }
  } catch (error) {
    disposeGeometries(geometries)
    throw error
  }
}

function applyCharacterMeshThickness(
  geometry: BufferGeometry,
  thickness: number,
) {
  if (thickness === 0) {
    return
  }

  const position = geometry.attributes.position
  const normal = geometry.attributes.normal
  const sideNormals = new Map<string, { x: number; y: number; count: number }>()

  for (let index = 0; index < position.count; index += 1) {
    if (Math.abs(normal.getZ(index)) >= 0.5) {
      continue
    }

    const key = xyKey(position.getX(index), position.getY(index))
    const current = sideNormals.get(key) ?? { x: 0, y: 0, count: 0 }
    current.x += normal.getX(index)
    current.y += normal.getY(index)
    current.count += 1
    sideNormals.set(key, current)
  }

  for (let index = 0; index < position.count; index += 1) {
    const key = xyKey(position.getX(index), position.getY(index))
    const offset = sideNormals.get(key)

    if (!offset || offset.count === 0) {
      continue
    }

    const length = Math.hypot(offset.x, offset.y) || 1

    position.setXY(
      index,
      position.getX(index) - (offset.x / length) * thickness,
      position.getY(index) - (offset.y / length) * thickness,
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}

function assignCharacterMeshUvs(
  geometry: BufferGeometry,
  shaderBoundsMin: Vector3,
  shaderBoundsMax: Vector3,
  boundsMin: Vector3,
  boundsMax: Vector3,
) {
  const position = geometry.attributes.position
  const normal = geometry.attributes.normal
  const boundsSize = shaderBoundsMax.clone().sub(shaderBoundsMin)
  const zSize = Math.max(boundsMax.z - boundsMin.z, 0.0001)
  const uvs = new Float32Array(position.count * 2)

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const uvIndex = index * 2

    if (Math.abs(normal.getZ(index)) >= 0.5) {
      uvs[uvIndex] = normalizeUv(x, shaderBoundsMin.x, boundsSize.x)
      uvs[uvIndex + 1] = normalizeUv(y, shaderBoundsMin.y, boundsSize.y)
      continue
    }

    const followsY = Math.abs(normal.getX(index)) >= Math.abs(normal.getY(index))
    uvs[uvIndex] = followsY
      ? normalizeUv(y, shaderBoundsMin.y, boundsSize.y)
      : normalizeUv(x, shaderBoundsMin.x, boundsSize.x)
    uvs[uvIndex + 1] = normalizeUv(z, boundsMin.z, zSize)
  }

  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
}

function normalizeGeometry(
  geometry: BufferGeometry,
  sourceCenter: Vector3,
  xyScale: number,
  depth: number,
) {
  const position = geometry.attributes.position

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)

    position.setXYZ(
      index,
      (x - sourceCenter.x) / xyScale,
      -(y - sourceCenter.y) / xyScale,
      z - depth / 2,
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}

function getCombinedBounds(geometries: BufferGeometry[]) {
  const bounds = new Box3()

  for (const geometry of geometries) {
    geometry.computeBoundingBox()

    if (geometry.boundingBox) {
      bounds.union(geometry.boundingBox)
    }
  }

  if (bounds.isEmpty()) {
    throw new Error('Character SVG contains no drawable SVG shapes.')
  }

  return bounds
}

function getAspectPreservingShaderBounds(boundsMin: Vector3, boundsMax: Vector3) {
  const size = boundsMax.clone().sub(boundsMin)
  const squareSize = Math.max(size.x, size.y)
  const centerX = (boundsMin.x + boundsMax.x) / 2
  const centerY = (boundsMin.y + boundsMax.y) / 2
  const halfSize = squareSize / 2

  return {
    min: roundVector(
      new Vector3(centerX - halfSize, centerY - halfSize, boundsMin.z),
    ),
    max: roundVector(
      new Vector3(centerX + halfSize, centerY + halfSize, boundsMax.z),
    ),
  }
}

function disposeGeometries(geometries: BufferGeometry[]) {
  for (const geometry of geometries) {
    geometry.dispose()
  }
}

function roundVector(vector: Vector3) {
  return new Vector3(
    roundNumber(vector.x),
    roundNumber(vector.y),
    roundNumber(vector.z),
  )
}

function roundNumber(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000
}

function normalizeUv(value: number, min: number, size: number) {
  return Math.min(1, Math.max(0, (value - min) / Math.max(size, 0.0001)))
}

function xyKey(x: number, y: number) {
  return `${roundNumber(x)}:${roundNumber(y)}`
}
