import {
  DEFAULT_CHARACTER_MESH_DEFORM,
  sanitizeCharacterMeshDeformSettings,
  type CharacterMeshDeformSettings,
  type CharacterMeshLegacyDeformSettings,
} from '@/components/studio/character-mesh-deform'

/**
 * The inputs that can change the topology or the CPU-built character mesh.
 *
 * SVG shape identity is deliberately not part of this value. Callers already
 * have the SVG source as a dependency, while this key lets them avoid
 * rebuilding a mesh when only GPU animation uniforms changed.
 */
export type CharacterMeshGeometrySignatureOptions = {
  extrusionDepth: number
  thickness?: number
  bevel?: number
  twist?: number
  taper?: number
  bend?: number
  deform?: CharacterMeshDeformSettings | CharacterMeshLegacyDeformSettings
  displacementSubdivisionLevel?: number
}

export type CharacterMeshGeometryTopology = {
  gpuDeformActive: boolean
  subdivisionLevel: number
}

const MIN_CHARACTER_EXTRUSION_DEPTH = 0.01
const MIN_DISPLACEMENT_SUBDIVISION_LEVEL = 0
const MAX_DISPLACEMENT_SUBDIVISION_LEVEL = 2

/**
 * Returns the topology decisions shared by geometry construction and its
 * dependency key. Wave/noise parameters are intentionally absent from the
 * key: they are uniforms once their GPU capability attributes exist.
 */
export function deriveCharacterMeshGeometryTopology(
  options: CharacterMeshGeometrySignatureOptions,
): CharacterMeshGeometryTopology {
  const deform = sanitizeCharacterMeshDeformSettings(
    options.deform ?? DEFAULT_CHARACTER_MESH_DEFORM,
  )
  const twist = finiteNumber(options.twist)
  const bend = finiteNumber(options.bend)
  const totalCurlDegrees = deform.curl.angle + deform.curl.turns * 360
  const bulgeSignal = deform.bulgePinch.enabled ? deform.bulgePinch.amount : 0
  const squashSignal = deform.squashStretch.enabled ? deform.squashStretch.amount : 0
  const waveSignal = deform.wave.enabled ? deform.wave.amplitude : 0
  const noiseSignal = deform.surfaceNoise.enabled ? deform.surfaceNoise.amount : 0
  const inflateSignal = deform.inflate.enabled ? deform.inflate.amount : 0
  const curlSignal = deform.curl.enabled ? totalCurlDegrees : 0
  const gpuDeformActive = waveSignal !== 0 || noiseSignal !== 0
  const nonNoiseNonlinearActive = (
    bulgeSignal !== 0
    || (squashSignal !== 0 && deform.squashStretch.falloff > 0)
    || waveSignal !== 0
    || (inflateSignal !== 0 && !deform.inflate.uniform)
    || curlSignal !== 0
  )
  const noiseOnlyAnimatedActive = noiseSignal !== 0
    && deform.surfaceNoise.speed > 0
    && !nonNoiseNonlinearActive
    && twist === 0
    && bend === 0
  const autoSubdivisionLevel = noiseOnlyAnimatedActive
    ? 1
    : nonNoiseNonlinearActive || noiseSignal !== 0 || twist !== 0 || bend !== 0
      ? 2
      : 0

  return {
    gpuDeformActive,
    subdivisionLevel: Math.max(
      sanitizeDisplacementSubdivisionLevel(options.displacementSubdivisionLevel),
      autoSubdivisionLevel,
    ),
  }
}

/**
 * Produces a deterministic dependency key for the CPU mesh and GPU-capability
 * attributes. Structural changes (including active boundaries and the
 * subdivision class) change the key; wave/noise animation settings do not.
 */
export function deriveCharacterMeshGeometrySignature(
  options: CharacterMeshGeometrySignatureOptions,
): string {
  const deform = sanitizeCharacterMeshDeformSettings(
    options.deform ?? DEFAULT_CHARACTER_MESH_DEFORM,
  )
  const topology = deriveCharacterMeshGeometryTopology(options)
  const cpuDeform = {
    bulgePinch: deform.bulgePinch.enabled && deform.bulgePinch.amount !== 0
      ? deform.bulgePinch
      : null,
    squashStretch: deform.squashStretch.enabled && deform.squashStretch.amount !== 0
      ? deform.squashStretch
      : null,
    inflate: deform.inflate.enabled && deform.inflate.amount !== 0
      ? deform.inflate
      : null,
    curl: deform.curl.enabled && deform.curl.angle + deform.curl.turns * 360 !== 0
      ? deform.curl
      : null,
  }

  return JSON.stringify([
    'character-mesh-geometry-v2',
    finiteNumber(Math.max(options.extrusionDepth, MIN_CHARACTER_EXTRUSION_DEPTH)),
    finiteNumber(options.thickness),
    finiteNumber(options.bevel),
    finiteNumber(options.twist),
    finiteNumber(options.taper),
    finiteNumber(options.bend),
    cpuDeform,
    topology.gpuDeformActive ? 1 : 0,
    topology.subdivisionLevel,
    sanitizeDisplacementSubdivisionLevel(options.displacementSubdivisionLevel),
  ])
}

export function sanitizeDisplacementSubdivisionLevel(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return MIN_DISPLACEMENT_SUBDIVISION_LEVEL
  }

  return Math.trunc(
    Math.min(
      MAX_DISPLACEMENT_SUBDIVISION_LEVEL,
      Math.max(MIN_DISPLACEMENT_SUBDIVISION_LEVEL, value as number),
    ),
  )
}

function finiteNumber(value: number | undefined) {
  return Number.isFinite(value) ? value : 0
}
