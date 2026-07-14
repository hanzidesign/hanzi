import {
  Box2,
  Box3,
  BufferAttribute,
  BufferGeometry,
  ExtrudeGeometry,
  Vector2,
  Vector3,
  type Shape,
} from 'three'

export const MIN_CHARACTER_EXTRUSION_DEPTH = 0.01
export const MIN_DISPLACEMENT_SUBDIVISION_LEVEL = 0
export const MAX_DISPLACEMENT_SUBDIVISION_LEVEL = 2

type CreateCharacterMeshGeometriesOptions = {
  shapes: Shape[]
  extrusionDepth: number
  thickness?: number
  bevel?: number
  twist?: number
  taper?: number
  bend?: number
  displacementSubdivisionLevel?: number
}

export type CharacterMeshGeometryResult = {
  geometries: BufferGeometry[]
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
  bevel = 0,
  twist = 0,
  taper = 0,
  bend = 0,
  displacementSubdivisionLevel = 0,
}: CreateCharacterMeshGeometriesOptions): CharacterMeshGeometryResult {
  if (shapes.length === 0) {
    throw new Error('Character SVG contains no drawable SVG shapes.')
  }

  const depth = clampCharacterExtrusionDepth(extrusionDepth)
  const safeBevel = Math.max(0, bevel)
  const sourceBevelSize = safeBevel * getShapeSpan(shapes) / 2
  let geometries: BufferGeometry[] = shapes.map(
    (shape) =>
      new ExtrudeGeometry(shape, {
        depth,
        steps: taper === 0 ? 1 : 8,
        bevelEnabled: safeBevel > 0,
        bevelSize: sourceBevelSize,
        bevelThickness: Math.min(safeBevel, depth / 2),
        bevelSegments: 2,
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

    const deformationBounds = getCombinedBounds(geometries)

    const subdivisionLevel = Math.max(
      sanitizeDisplacementSubdivisionLevel(displacementSubdivisionLevel),
      twist === 0 && bend === 0 ? 0 : 2,
    )
    geometries = geometries.map((geometry) =>
      subdivideGeometryTriangles(
        geometry,
        subdivisionLevel,
      ),
    )

    for (const geometry of geometries) {
      applyCharacterMeshDeformation(
        geometry,
        depth,
        twist,
        taper,
        bend,
        deformationBounds.min.y,
        deformationBounds.max.y,
      )
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

function applyCharacterMeshDeformation(
  geometry: BufferGeometry,
  depth: number,
  twistDegrees: number,
  taper: number,
  bendDegrees: number,
  twistMinY: number,
  twistMaxY: number,
) {
  if (twistDegrees === 0 && taper === 0 && bendDegrees === 0) {
    return
  }

  const position = geometry.attributes.position
  const twistRadians = (twistDegrees * Math.PI) / 180
  const bendRadians = (bendDegrees * Math.PI) / 180
  const bendRadius = bendRadians === 0 ? 0 : 2 / Math.abs(bendRadians)
  const bendDirection = Math.sign(bendRadians)
  const twistSpanY = Math.max(twistMaxY - twistMinY, Number.EPSILON)

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const depthPosition = z / Math.max(depth, MIN_CHARACTER_EXTRUSION_DEPTH)
    const twistPosition = (y - twistMinY) / twistSpanY
    const angle = twistRadians * twistPosition
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    const taperedScale = Math.max(0.15, 1 + taper * depthPosition)
    const taperedX = x * taperedScale
    const twistedX = taperedX * cosine + z * sine
    const twistedY = y * taperedScale
    const twistedZ = -taperedX * sine + z * cosine
    const bendAngle = bendRadians * twistedX / 2
    const bentX = bendRadians === 0
      ? twistedX
      : Math.sin(bendAngle) * bendRadius
    const bentZ = bendRadians === 0
      ? twistedZ
      : twistedZ + (1 - Math.cos(bendAngle)) * bendRadius * bendDirection

    position.setXYZ(
      index,
      bentX,
      twistedY,
      bentZ,
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}

function getShapeSpan(shapes: Shape[]) {
  const bounds = new Box2()

  for (const shape of shapes) {
    for (const point of shape.getPoints()) {
      bounds.expandByPoint(new Vector2(point.x, point.y))
    }
  }

  const size = bounds.getSize(new Vector2())
  return Math.max(size.x, size.y, 1)
}

export function sanitizeDisplacementSubdivisionLevel(value: number) {
  if (!Number.isFinite(value)) {
    return MIN_DISPLACEMENT_SUBDIVISION_LEVEL
  }

  return Math.trunc(
    Math.min(
      MAX_DISPLACEMENT_SUBDIVISION_LEVEL,
      Math.max(MIN_DISPLACEMENT_SUBDIVISION_LEVEL, value),
    ),
  )
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

function subdivideGeometryTriangles(
  geometry: BufferGeometry,
  subdivisionLevel: number,
) {
  if (subdivisionLevel <= 0) {
    return geometry
  }

  const sourceGeometry = geometry.index ? geometry.toNonIndexed() : geometry
  const position = sourceGeometry.attributes.position
  const vertices: number[] = []

  for (let index = 0; index < position.count; index += 3) {
    pushSubdividedTriangle(
      vertices,
      readPosition(position, index),
      readPosition(position, index + 1),
      readPosition(position, index + 2),
      subdivisionLevel,
    )
  }

  const subdividedGeometry = new BufferGeometry()
  subdividedGeometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(vertices), 3),
  )
  subdividedGeometry.computeVertexNormals()
  subdividedGeometry.computeBoundingBox()
  subdividedGeometry.computeBoundingSphere()

  if (sourceGeometry !== geometry) {
    sourceGeometry.dispose()
  }

  geometry.dispose()

  return subdividedGeometry
}

function pushSubdividedTriangle(
  vertices: number[],
  a: Vector3,
  b: Vector3,
  c: Vector3,
  depth: number,
) {
  if (depth <= 0) {
    pushTriangle(vertices, a, b, c)
    return
  }

  const ab = midpoint(a, b)
  const bc = midpoint(b, c)
  const ca = midpoint(c, a)

  pushSubdividedTriangle(vertices, a, ab, ca, depth - 1)
  pushSubdividedTriangle(vertices, ab, b, bc, depth - 1)
  pushSubdividedTriangle(vertices, ca, bc, c, depth - 1)
  pushSubdividedTriangle(vertices, ab, bc, ca, depth - 1)
}

function pushTriangle(vertices: number[], a: Vector3, b: Vector3, c: Vector3) {
  vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
}

type ReadablePositionAttribute = {
  getX: (index: number) => number
  getY: (index: number) => number
  getZ: (index: number) => number
}

function readPosition(position: ReadablePositionAttribute, index: number) {
  return new Vector3(position.getX(index), position.getY(index), position.getZ(index))
}

function midpoint(a: Vector3, b: Vector3) {
  return new Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
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
