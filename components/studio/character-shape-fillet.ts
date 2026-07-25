import { Path, Shape } from 'three'
import {
  areaD,
  FillRule,
  inflatePathsD,
  JoinType,
  EndType,
  isPositiveD,
  pointInPolygonD,
  simplifyPathsD,
  unionD,
  type PathD,
  type PathsD,
} from 'clipper2-ts'
import { CHARACTER_SHAPE_FLATTEN_DIVISIONS } from './character-mesh-constants'

const GEOMETRY_SEARCH_LEVELS = 64
const MAX_NORMALIZED_FILLET_RADIUS = 0.15
const GEOMETRY_EPSILON = 1e-7
const PATH_EPSILON = 1e-6

type ShapeTopology = {
  components: number
  holes: number
}

export type CharacterShapeFilletResult = {
  shapes: Shape[]
  appliedSourceRadius: number
}

export type CharacterShapeResizeResult = {
  shapes: Shape[]
  appliedSourceOffset: number
}

type PathNode = {
  path: PathD
  area: number
  parent: number
  depth: number
}

type PreparedResizeSource = {
  sourceShapes: Shape[]
  sourceUnion: PathsD
  sourceBounds: Bounds
  sourceSpan: number
  sourceMaterialArea: number
}

/**
 * Rebuilds a glyph-wide NonZero union without applying any offset.  Keeping
 * this operation separate from filleting is important: SVGLoader commonly
 * returns overlapping Shapes which Three's ExtrudeGeometry otherwise treats
 * as independent solids.
 */
export function unionCharacterShapes(sourceShapes: Shape[]): Shape[] {
  if (sourceShapes.length === 0) {
    return []
  }

  const sourcePaths = extractShapePaths(sourceShapes)
  if (sourcePaths.length === 0) {
    return []
  }

  const unioned = unionSafe(sourcePaths)
  const nodes = classifyPaths(unioned)
  return nodes && nodes.length > 0 ? rebuildShapes(nodes) : []
}

// A descriptive alias for callers that want to make the fill rule explicit.
export const unionCharacterShapesNonZero = unionCharacterShapes

/**
 * Resizes filled glyph material in source/SVG coordinates. Positive offsets
 * expand material and negative offsets shrink it. A collapsing negative
 * offset is bounded to a still-renderable candidate rather than crossing
 * through zero and growing in the opposite direction.
 */
export function resizeCharacterShapes(
  sourceShapes: Shape[],
  requestedSourceOffset: number,
): CharacterShapeResizeResult {
  if (!Number.isFinite(requestedSourceOffset) || Math.abs(requestedSourceOffset) <= GEOMETRY_EPSILON) {
    return { shapes: sourceShapes, appliedSourceOffset: 0 }
  }

  const prepared = prepareResizeSource(sourceShapes)
  if (!prepared) {
    return { shapes: sourceShapes, appliedSourceOffset: 0 }
  }

  return resizePreparedCharacterShapes(prepared, requestedSourceOffset)
}

export function resizeCharacterShapesToCollapseFraction(
  sourceShapes: Shape[],
  requestedFraction: number,
): CharacterShapeResizeResult {
  if (!Number.isFinite(requestedFraction) || requestedFraction <= GEOMETRY_EPSILON) {
    return { shapes: sourceShapes, appliedSourceOffset: 0 }
  }

  const prepared = prepareResizeSource(sourceShapes)
  if (!prepared) {
    return { shapes: sourceShapes, appliedSourceOffset: 0 }
  }

  const fraction = Math.min(requestedFraction, 1)
  const requestedSourceOffset = -fraction * findCollapseOffset(prepared)
  return resizePreparedCharacterShapes(prepared, requestedSourceOffset)
}

function resizePreparedCharacterShapes(
  prepared: PreparedResizeSource,
  requestedSourceOffset: number,
): CharacterShapeResizeResult {
  const {
    sourceShapes,
    sourceUnion,
    sourceBounds,
    sourceSpan,
    sourceMaterialArea,
  } = prepared

  if (Math.abs(requestedSourceOffset) <= GEOMETRY_EPSILON) {
    return { shapes: sourceShapes, appliedSourceOffset: 0 }
  }

  if (requestedSourceOffset > 0) {
    // Positive offsets normally use the requested value directly. If a very
    // large request exceeds Clipper's valid range, walk down the same lattice
    // and retain the largest valid expansion without ever inverting material.
    for (let level = GEOMETRY_SEARCH_LEVELS; level >= 1; level -= 1) {
      const offset = requestedSourceOffset * (level / GEOMETRY_SEARCH_LEVELS)
      const candidate = makeResizeCandidate(
        sourceUnion,
        sourceBounds,
        sourceSpan,
        sourceMaterialArea,
        offset,
      )
      if (candidate) {
        return { shapes: candidate, appliedSourceOffset: offset }
      }
    }
    return { shapes: sourceShapes, appliedSourceOffset: 0 }
  }

  const magnitude = Math.abs(requestedSourceOffset)
  for (let level = GEOMETRY_SEARCH_LEVELS; level >= 1; level -= 1) {
    const offset = -magnitude * (level / GEOMETRY_SEARCH_LEVELS)
    const candidate = makeResizeCandidate(
      sourceUnion,
      sourceBounds,
      sourceSpan,
      sourceMaterialArea,
      offset,
    )
    if (candidate) {
      return { shapes: candidate, appliedSourceOffset: offset }
    }
  }

  // A very small stroke can collapse before the first global lattice step
  // (for example a 2px stroke inside a 500px glyph at -0.4). Refine the
  // safe/unsafe bracket deterministically so this case still returns a thin
  // renderable contour rather than the unmodified source.
  let safeMagnitude = 0
  let safeCandidate: Shape[] | undefined
  let unsafeMagnitude = magnitude
  for (let iteration = 0; iteration < 16; iteration += 1) {
    const candidateMagnitude = (safeMagnitude + unsafeMagnitude) / 2
    const candidate = makeResizeCandidate(
      sourceUnion,
      sourceBounds,
      sourceSpan,
      sourceMaterialArea,
      -candidateMagnitude,
    )
    if (candidate) {
      safeMagnitude = candidateMagnitude
      safeCandidate = candidate
    } else {
      unsafeMagnitude = candidateMagnitude
    }
  }
  if (safeCandidate && safeMagnitude > GEOMETRY_EPSILON) {
    return { shapes: safeCandidate, appliedSourceOffset: -safeMagnitude }
  }

  return { shapes: sourceShapes, appliedSourceOffset: 0 }
}

/**
 * Finds the maximum inward offset that still leaves this compound Shape
 * renderable. The returned value is a positive source-space magnitude and is
 * intentionally derived per Shape so a narrow stroke does not inherit the
 * collapse limit of a larger glyph elsewhere in the SVG.
 */
export function getCharacterShapeCollapseOffset(sourceShapes: Shape[]): number {
  const prepared = prepareResizeSource(sourceShapes)
  return prepared ? findCollapseOffset(prepared) : 0
}

function prepareResizeSource(sourceShapes: Shape[]): PreparedResizeSource | undefined {
  const sourcePaths = extractShapePaths(sourceShapes)
  if (sourcePaths.length === 0) {
    return undefined
  }

  const sourceUnion = unionSafe(sourcePaths)
  if (sourceUnion.length === 0) {
    return undefined
  }

  const sourceBounds = getPathsBounds(sourceUnion)
  const sourceSpan = Math.max(
    sourceBounds.maxX - sourceBounds.minX,
    sourceBounds.maxY - sourceBounds.minY,
  )
  const sourceMaterialArea = Math.abs(sourceUnion.reduce((sum, path) => sum + areaD(path), 0))
  if (
    !Number.isFinite(sourceSpan)
    || sourceSpan <= GEOMETRY_EPSILON
    || !Number.isFinite(sourceMaterialArea)
    || sourceMaterialArea <= PATH_EPSILON
  ) {
    return undefined
  }

  return {
    sourceShapes,
    sourceUnion,
    sourceBounds,
    sourceSpan,
    sourceMaterialArea,
  }
}

function findCollapseOffset({
  sourceUnion,
  sourceBounds,
  sourceSpan,
  sourceMaterialArea,
}: PreparedResizeSource): number {
  let safeMagnitude = 0
  let unsafeMagnitude = sourceSpan
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const candidateMagnitude = (safeMagnitude + unsafeMagnitude) / 2
    const candidate = makeResizeCandidate(
      sourceUnion,
      sourceBounds,
      sourceSpan,
      sourceMaterialArea,
      -candidateMagnitude,
    )
    if (candidate) {
      safeMagnitude = candidateMagnitude
    } else {
      unsafeMagnitude = candidateMagnitude
    }
  }
  return safeMagnitude
}

function makeResizeCandidate(
  sourcePaths: PathsD,
  sourceBounds: Bounds,
  sourceSpan: number,
  sourceMaterialArea: number,
  offset: number,
): Shape[] | undefined {
  let paths: PathsD
  try {
    paths = offset === 0 ? cleanPaths(sourcePaths) : offsetAndUnion(sourcePaths, offset)
  } catch {
    return undefined
  }

  const nodes = classifyPaths(paths)
  if (!nodes || nodes.length === 0 || nodes.some((node) => hasDegeneratePath(node.path))) {
    return undefined
  }

  const materialArea = Math.abs(nodes.reduce((sum, node) => sum + areaD(node.path), 0))
  const bounds = getPathsBounds(nodes.map((node) => node.path))
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  const spanFloor = sourceSpan * 1e-5
  if (
    !Number.isFinite(materialArea)
    || materialArea <= PATH_EPSILON
    || !Number.isFinite(width)
    || !Number.isFinite(height)
    || width <= spanFloor
    || height <= spanFloor
  ) {
    return undefined
  }

  const epsilon = Math.max(PATH_EPSILON, sourceSpan * 1e-8)
  if (offset < 0) {
    // A negative offset must never expand. This guards against a failed
    // orientation/winding interpretation that would otherwise reverse-thicken
    // a stroke after it has collapsed.
    if (
      materialArea > sourceMaterialArea * (1 + 1e-6)
      || width > sourceBounds.maxX - sourceBounds.minX + epsilon
      || height > sourceBounds.maxY - sourceBounds.minY + epsilon
    ) {
      return undefined
    }
  } else if (
    materialArea < sourceMaterialArea * (1 - 1e-6)
    || width < sourceBounds.maxX - sourceBounds.minX - epsilon
    || height < sourceBounds.maxY - sourceBounds.minY - epsilon
  ) {
    return undefined
  }

  return rebuildShapes(nodes)
}

/**
 * Rounds both convex and reflex corners without expanding the source contour.
 *
 * The opening/closing sequence is intentionally performed on the filled path,
 * rather than on each contour independently. This keeps holes and disconnected
 * components subject to the same radius and lets Clipper remove invalid narrow
 * features before we rebuild Three Shapes.
 */
export function smoothCharacterShapes(
  sourceShapes: Shape[],
  requestedSourceRadius: number,
): CharacterShapeFilletResult {
  if (!Number.isFinite(requestedSourceRadius) || requestedSourceRadius <= GEOMETRY_EPSILON) {
    return { shapes: sourceShapes, appliedSourceRadius: 0 }
  }

  const sourcePaths = extractShapePaths(sourceShapes)
  if (sourcePaths.length === 0) {
    return { shapes: sourceShapes, appliedSourceRadius: 0 }
  }

  const sourceBounds = getPathsBounds(sourcePaths)
  const sourceUnion = unionSafe(sourcePaths)
  const sourceNodes = classifyPaths(sourceUnion)
  if (!sourceNodes || sourceNodes.length === 0) {
    return { shapes: sourceShapes, appliedSourceRadius: 0 }
  }
  const sourceTopology = topologyOf(sourceNodes)
  const sourceMaterialArea = Math.abs(sourceUnion.reduce((sum, path) => sum + areaD(path), 0))

  const sourceSpan = Math.max(
    sourceBounds.maxX - sourceBounds.minX,
    sourceBounds.maxY - sourceBounds.minY,
  )
  const minimumRingSpan = Math.min(...sourceUnion.map((path) => {
    const bounds = getPathsBounds([path])
    return Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
  }))
  const maximumRadius = Math.min(
    sourceSpan * MAX_NORMALIZED_FILLET_RADIUS,
    minimumRingSpan / 4,
  )
  if (!Number.isFinite(maximumRadius) || maximumRadius <= GEOMETRY_EPSILON) {
    return { shapes: sourceShapes, appliedSourceRadius: 0 }
  }
  const targetRadius = Math.min(requestedSourceRadius, maximumRadius)
  const radiusStep = maximumRadius / GEOMETRY_SEARCH_LEVELS
  const targetLevel = Math.floor(targetRadius / radiusStep + GEOMETRY_EPSILON)

  // Search the same fixed radius lattice from large to small. Taking the
  // highest safe level makes the applied radius monotonic even when polygon
  // topology has isolated safe islands at larger offsets.
  for (let level = targetLevel; level >= 1; level -= 1) {
    const radius = level * radiusStep
    const candidate = makeCandidate(
      sourceUnion,
      sourceTopology,
      sourceNodes,
      sourceBounds,
      sourceMaterialArea,
      radius,
    )
    if (candidate) {
      return candidate
    }
  }

  return { shapes: sourceShapes, appliedSourceRadius: 0 }
}

// Keep a descriptive alias for callers that prefer the operation name.
export const filletCharacterShapes = smoothCharacterShapes

function makeCandidate(
  sourcePaths: PathsD,
  sourceTopology: ShapeTopology,
  sourceNodes: PathNode[],
  sourceBounds: Bounds,
  sourceMaterialArea: number,
  radius: number,
): CharacterShapeFilletResult | undefined {
  if (!Number.isFinite(radius) || radius <= GEOMETRY_EPSILON) {
    return undefined
  }

  let paths = sourcePaths
  try {
    // Round opening then closing. Clipper's positive/negative winding keeps
    // outer rings and holes in one NonZero-filled operation.
    paths = offsetAndUnion(paths, -radius)
    paths = offsetAndUnion(paths, 2 * radius)
    paths = offsetAndUnion(paths, -radius)
    paths = clampPathsToBounds(paths, sourceBounds)
    paths = simplifyCandidatePaths(paths, Math.max(radius / 32, PATH_EPSILON))
  } catch {
    return undefined
  }

  const nodes = classifyPaths(paths)
  if (!nodes || !isSafePathSet(nodes, sourceTopology, sourceNodes, sourceBounds, sourceMaterialArea)) {
    return undefined
  }

  // Mirror every actual ExtrudeGeometry bevel layer. The final shape is the
  // zero-offset perimeter; the six preceding layers all move inward.
  for (let layer = 0; layer <= 6; layer += 1) {
    const bevelOffset = radius * Math.sin((layer / 6) * Math.PI / 2) - radius
    let layerPaths: PathsD
    try {
      layerPaths = bevelOffset === 0
        ? paths
        : offsetAndUnion(paths, bevelOffset)
    } catch {
      return undefined
    }
    const layerNodes = classifyPaths(layerPaths)
    if (!layerNodes || !isSafePathSet(layerNodes, sourceTopology, sourceNodes, sourceBounds, sourceMaterialArea, true)) {
      return undefined
    }
  }

  const shapes = rebuildShapes(nodes)
  if (shapes.length !== sourceTopology.components) {
    return undefined
  }
  return { shapes, appliedSourceRadius: radius }
}

function extractShapePaths(shapes: Shape[]): PathsD {
  const paths: PathsD = []
  for (const shape of shapes) {
    const extracted = shape.extractPoints(CHARACTER_SHAPE_FLATTEN_DIVISIONS)
    const outer = normalizePath(extracted.shape, true)
    if (outer.length >= 3 && Math.abs(areaD(outer)) > PATH_EPSILON) {
      paths.push(outer)
    }
    for (const hole of extracted.holes) {
      const normalizedHole = normalizePath(hole, false)
      if (normalizedHole.length >= 3 && Math.abs(areaD(normalizedHole)) > PATH_EPSILON) {
        paths.push(normalizedHole)
      }
    }
  }
  return paths
}

function normalizePath(points: Array<{ x: number; y: number }>, positive?: boolean): PathD {
  const path = points.map((point) => ({ x: point.x, y: point.y }))
  if (path.length > 1 && pointsNear(path[0], path[path.length - 1])) {
    path.pop()
  }
  if (path.length >= 3 && positive !== undefined && isPositiveD(path) !== positive) {
    path.reverse()
  }
  return path
}

function cleanPaths(paths: PathsD): PathsD {
  if (paths.length === 0) {
    return []
  }
  return simplifyPathsD(paths, 1e-8, true)
    .filter((path) => path.length >= 3 && Math.abs(areaD(path)) > PATH_EPSILON)
}

function simplifyCandidatePaths(paths: PathsD, tolerance: number): PathsD {
  return simplifyPathsD(paths, tolerance, true)
    .filter((path) => path.length >= 3 && Math.abs(areaD(path)) > PATH_EPSILON)
}

function offsetAndUnion(paths: PathsD, delta: number): PathsD {
  const inflated = inflatePathsD(
    paths,
    delta,
    JoinType.Round,
    EndType.Polygon,
    2,
    8,
    Math.max(Math.abs(delta) / 64, 1e-6),
  )
  return cleanPaths(unionSafe(inflated))
}

function unionSafe(paths: PathsD): PathsD {
  if (paths.length === 0) {
    return []
  }
  // Clipper's union with NonZero both removes self-overlaps and restores the
  // outer-positive / hole-negative winding contract.
  return unionD(paths, FillRule.NonZero)
}

type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

function getPathsBounds(paths: PathsD): Bounds {
  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const path of paths) {
    for (const point of path) {
      bounds.minX = Math.min(bounds.minX, point.x)
      bounds.minY = Math.min(bounds.minY, point.y)
      bounds.maxX = Math.max(bounds.maxX, point.x)
      bounds.maxY = Math.max(bounds.maxY, point.y)
    }
  }
  return bounds
}

function clampPathsToBounds(paths: PathsD, bounds: Bounds): PathsD {
  return paths.map((path) => path.map((point) => ({
    x: Math.min(bounds.maxX, Math.max(bounds.minX, point.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, point.y)),
  })))
}

function classifyPaths(paths: PathsD): PathNode[] | undefined {
  const nodes: PathNode[] = paths
    .map((path) => normalizeOutputPath(path))
    .filter((path): path is PathD => path.length >= 3 && Math.abs(areaD(path)) > PATH_EPSILON)
    .map((path) => ({ path, area: Math.abs(areaD(path)), parent: -1, depth: 0 }))

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    for (let candidateIndex = 0; candidateIndex < nodes.length; candidateIndex += 1) {
      if (index === candidateIndex || nodes[candidateIndex].area <= node.area) {
        continue
      }
      const relation = pointInPolygonD(node.path[0], nodes[candidateIndex].path, 8)
      if (relation === 0) {
        return undefined
      }
      if (relation === 1 && (node.parent < 0 || nodes[candidateIndex].area < nodes[node.parent].area)) {
        node.parent = candidateIndex
      }
    }
  }

  const visiting = new Set<number>()
  const resolveDepth = (index: number): number | undefined => {
    if (nodes[index].parent < 0) {
      return 0
    }
    if (visiting.has(index)) {
      return undefined
    }
    visiting.add(index)
    const parentDepth = resolveDepth(nodes[index].parent)
    visiting.delete(index)
    if (parentDepth === undefined) {
      return undefined
    }
    return parentDepth + 1
  }
  for (let index = 0; index < nodes.length; index += 1) {
    const depth = resolveDepth(index)
    if (depth === undefined) {
      return undefined
    }
    nodes[index].depth = depth
    const expectedPositive = depth % 2 === 0
    if (isPositiveD(nodes[index].path) !== expectedPositive) {
      nodes[index].path.reverse()
    }
  }
  return nodes
}

function normalizeOutputPath(path: PathD): PathD {
  const copy = path.map((point) => ({ x: point.x, y: point.y }))
  if (copy.length > 1 && pointsNear(copy[0], copy[copy.length - 1])) {
    copy.pop()
  }
  return copy
}

function topologyOf(nodes: PathNode[]): ShapeTopology {
  return {
    components: nodes.filter((node) => node.depth % 2 === 0).length,
    holes: nodes.filter((node) => node.depth % 2 === 1).length,
  }
}

function isSafePathSet(
  nodes: PathNode[],
  sourceTopology: ShapeTopology,
  sourceNodes: PathNode[],
  sourceBounds: Bounds,
  sourceMaterialArea: number,
  checkLayer = false,
): boolean {
  const topology = topologyOf(nodes)
  if (topology.components !== sourceTopology.components || topology.holes !== sourceTopology.holes) {
    return false
  }
  if (nodes.some((node) => hasDegeneratePath(node.path))) {
    return false
  }
  const orderedSourceNodes = [...sourceNodes].sort(comparePathNodes)
  const orderedNodes = [...nodes].sort(comparePathNodes)
  const ringRetention = checkLayer ? 0.15 : 0.5
  for (let index = 0; index < orderedSourceNodes.length; index += 1) {
    const sourceNode = orderedSourceNodes[index]
    const node = orderedNodes[index]
    if (!node || node.depth !== sourceNode.depth || node.area < sourceNode.area * ringRetention) {
      return false
    }
    const sourceRingBounds = getPathsBounds([sourceNode.path])
    const ringBounds = getPathsBounds([node.path])
    if (
      ringBounds.maxX - ringBounds.minX < (sourceRingBounds.maxX - sourceRingBounds.minX) * ringRetention
      || ringBounds.maxY - ringBounds.minY < (sourceRingBounds.maxY - sourceRingBounds.minY) * ringRetention
    ) {
      return false
    }
  }
  const bounds = getPathsBounds(nodes.map((node) => node.path))
  const materialArea = Math.abs(nodes.reduce((sum, node) => sum + areaD(node.path), 0))
  const minimumRetention = checkLayer ? 0.15 : 0.5
  const sourceWidth = sourceBounds.maxX - sourceBounds.minX
  const sourceHeight = sourceBounds.maxY - sourceBounds.minY
  if (
    materialArea < sourceMaterialArea * minimumRetention
    || bounds.maxX - bounds.minX < sourceWidth * minimumRetention
    || bounds.maxY - bounds.minY < sourceHeight * minimumRetention
  ) {
    return false
  }
  if (!checkLayer) {
    const epsilon = Math.max(PATH_EPSILON, (sourceBounds.maxX - sourceBounds.minX + sourceBounds.maxY - sourceBounds.minY) * 1e-8)
    if (
      bounds.minX < sourceBounds.minX - epsilon
      || bounds.minY < sourceBounds.minY - epsilon
      || bounds.maxX > sourceBounds.maxX + epsilon
      || bounds.maxY > sourceBounds.maxY + epsilon
    ) {
      return false
    }
  }
  return true
}

function comparePathNodes(a: PathNode, b: PathNode) {
  return a.depth - b.depth || b.area - a.area
}

function hasDegeneratePath(path: PathD): boolean {
  const visited = new Set<string>()
  for (let index = 0; index < path.length; index += 1) {
    const next = (index + 1) % path.length
    if (distanceSquared(path[index], path[next]) <= GEOMETRY_EPSILON ** 2) {
      return true
    }
    const pointKey = `${Math.round(path[index].x / GEOMETRY_EPSILON)}:${Math.round(path[index].y / GEOMETRY_EPSILON)}`
    if (visited.has(pointKey)) {
      return true
    }
    visited.add(pointKey)
  }
  return false
}

function distanceSquared(a: PointD, b: PointD) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
}

function pointsNear(a: PointD, b: PointD) {
  return distanceSquared(a, b) <= GEOMETRY_EPSILON ** 2
}

function rebuildShapes(nodes: PathNode[]): Shape[] {
  const shapes: Shape[] = []
  const outerNodes = nodes.filter((node) => node.depth % 2 === 0)
  for (const outer of outerNodes) {
    const shape = pathToShape(outer.path)
    for (const hole of nodes) {
      if (hole.depth !== outer.depth + 1 || hole.parent < 0 || nodes[hole.parent] !== outer) {
        continue
      }
      shape.holes.push(pathToPath(hole.path))
    }
    shapes.push(shape)
  }
  return shapes
}

function pathToShape(path: PathD): Shape {
  const shape = new Shape()
  shape.moveTo(path[0].x, path[0].y)
  for (let index = 1; index < path.length; index += 1) {
    shape.lineTo(path[index].x, path[index].y)
  }
  shape.lineTo(path[0].x, path[0].y)
  return shape
}

function pathToPath(path: PathD): Path {
  const result = new Path()
  result.moveTo(path[0].x, path[0].y)
  for (let index = 1; index < path.length; index += 1) {
    result.lineTo(path[index].x, path[index].y)
  }
  result.lineTo(path[0].x, path[0].y)
  return result
}

type PointD = { x: number; y: number }
