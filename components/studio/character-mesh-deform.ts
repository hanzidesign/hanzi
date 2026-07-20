export type CharacterMeshDeformAxis = 'x' | 'y' | 'z'
export type CharacterMeshBulgeAxis = 'radial' | 'x' | 'y'
export type CharacterMeshBulgeProfile = 'smooth' | 'sharp' | 'gaussian'
export type CharacterMeshWaveDirection = 'x' | 'y' | 'diagonal' | 'radial'
export type CharacterMeshWaveform = 'sine' | 'triangle' | 'square'
export type CharacterMeshNoiseDirection = 'depth' | 'radial' | 'normal'

export type CharacterMeshBulgePinch = {
  enabled: boolean
  amount: number
  radius: number
  falloff: number
  centerX: number
  centerY: number
  axis: CharacterMeshBulgeAxis
  profile: CharacterMeshBulgeProfile
}

export type CharacterMeshSquashStretch = {
  enabled: boolean
  amount: number
  axis: CharacterMeshDeformAxis
  pivot: number
  preserveVolume: boolean
  secondaryScale: number
  falloff: number
}

export type CharacterMeshWave = {
  enabled: boolean
  amplitude: number
  frequency: number
  phase: number
  direction: CharacterMeshWaveDirection
  waveform: CharacterMeshWaveform
  offset: number
  decay: number
}

export type CharacterMeshSurfaceNoise = {
  enabled: boolean
  amount: number
  speed: number
  scale: number
  seed: number
  detail: number
  roughness: number
  direction: CharacterMeshNoiseDirection
  contrast: number
  offsetX: number
  offsetY: number
}

export type CharacterMeshInflate = {
  enabled: boolean
  amount: number
  balance: number
  radius: number
  falloff: number
  centerX: number
  centerY: number
  uniform: boolean
  deflate: boolean
}

export type CharacterMeshCurl = {
  enabled: boolean
  angle: number
  axis: CharacterMeshDeformAxis
  tightness: number
  pivot: number
  offset: number
  turns: number
  falloff: number
  clamp: boolean
}

export type CharacterMeshDeformSettings = {
  bulgePinch: CharacterMeshBulgePinch
  squashStretch: CharacterMeshSquashStretch
  wave: CharacterMeshWave
  surfaceNoise: CharacterMeshSurfaceNoise
  inflate: CharacterMeshInflate
  curl: CharacterMeshCurl
}

export type CharacterMeshLegacyDeformControl = {
  enabled: boolean
  amount: number
}

export type CharacterMeshLegacyDeformSettings = Record<keyof CharacterMeshDeformSettings, CharacterMeshLegacyDeformControl>

export const DEFAULT_CHARACTER_MESH_DEFORM: CharacterMeshDeformSettings = {
  bulgePinch: {
    enabled: false,
    amount: 0.5,
    radius: 2,
    falloff: 0.5,
    centerX: 0,
    centerY: 0,
    axis: 'radial',
    profile: 'smooth',
  },
  squashStretch: {
    enabled: false,
    amount: 0,
    axis: 'y',
    pivot: 0,
    preserveVolume: true,
    secondaryScale: 1,
    falloff: 0,
  },
  wave: {
    enabled: false,
    amplitude: 0.2,
    frequency: 3,
    phase: 0,
    direction: 'y',
    waveform: 'sine',
    offset: 0,
    decay: 0,
  },
  surfaceNoise: {
    enabled: false,
    amount: 0.5,
    speed: 2,
    scale: 10,
    seed: 0,
    detail: 1,
    roughness: 0.5,
    direction: 'depth',
    contrast: 1,
    offsetX: 0,
    offsetY: 0,
  },
  inflate: {
    enabled: false,
    amount: 0.5,
    balance: 0.5,
    radius: 1,
    falloff: 0.5,
    centerX: 0,
    centerY: 0,
    uniform: true,
    deflate: false,
  },
  curl: {
    enabled: false,
    angle: 0,
    axis: 'x',
    tightness: 1,
    pivot: 0,
    offset: 0,
    turns: 0,
    falloff: 0,
    clamp: false,
  },
}

export function sanitizeCharacterMeshDeformSettings(
  value: unknown,
  fallback: CharacterMeshDeformSettings = DEFAULT_CHARACTER_MESH_DEFORM,
): CharacterMeshDeformSettings {
  const record = asRecord(value)
  return {
    bulgePinch: sanitizeBulgePinch(record.bulgePinch, fallback.bulgePinch),
    squashStretch: sanitizeSquashStretch(record.squashStretch, fallback.squashStretch),
    wave: sanitizeWave(record.wave, fallback.wave),
    surfaceNoise: sanitizeSurfaceNoise(record.surfaceNoise, fallback.surfaceNoise),
    inflate: sanitizeInflate(record.inflate, fallback.inflate),
    curl: sanitizeCurl(record.curl, fallback.curl),
  }
}

export const sanitizeCharacterMeshDeform = sanitizeCharacterMeshDeformSettings

export function resetCharacterMeshDeformFeature<K extends keyof CharacterMeshDeformSettings>(
  feature: K,
): CharacterMeshDeformSettings[K] {
  return {
    ...DEFAULT_CHARACTER_MESH_DEFORM[feature],
    enabled: true,
  } as CharacterMeshDeformSettings[K]
}

function sanitizeBulgePinch(value: unknown, fallback: CharacterMeshBulgePinch): CharacterMeshBulgePinch {
  const record = asRecord(value)
  return {
    enabled: readBoolean(record.enabled, fallback.enabled),
    amount: readClamped(record.amount, fallback.amount, -10, 10),
    radius: readClamped(record.radius, fallback.radius, 0.05, 5),
    falloff: readClamped(record.falloff, fallback.falloff, 0, 1),
    centerX: readClamped(record.centerX, fallback.centerX, -1, 1),
    centerY: readClamped(record.centerY, fallback.centerY, -1, 1),
    axis: readEnum(record.axis, ['radial', 'x', 'y'], fallback.axis),
    profile: readEnum(record.profile, ['smooth', 'sharp', 'gaussian'], fallback.profile),
  }
}

function sanitizeSquashStretch(value: unknown, fallback: CharacterMeshSquashStretch): CharacterMeshSquashStretch {
  const record = asRecord(value)
  return {
    enabled: readBoolean(record.enabled, fallback.enabled),
    amount: readClamped(record.amount, fallback.amount, -1, 1),
    axis: readEnum(record.axis, ['x', 'y', 'z'], fallback.axis),
    pivot: readClamped(record.pivot, fallback.pivot, -1, 1),
    preserveVolume: readBoolean(record.preserveVolume, fallback.preserveVolume),
    secondaryScale: readClamped(record.secondaryScale, fallback.secondaryScale, 0.1, 3),
    falloff: readClamped(record.falloff, fallback.falloff, 0, 1),
  }
}

function sanitizeWave(value: unknown, fallback: CharacterMeshWave): CharacterMeshWave {
  const record = asRecord(value)
  const amplitudeValue = record.amplitude ?? record.amount
  return {
    enabled: readBoolean(record.enabled, fallback.enabled),
    amplitude: readClamped(amplitudeValue, fallback.amplitude, -1, 1),
    frequency: readClamped(record.frequency, fallback.frequency, 0.1, 12),
    phase: readClamped(record.phase, fallback.phase, -360, 360),
    direction: readEnum(record.direction, ['x', 'y', 'diagonal', 'radial'], fallback.direction),
    waveform: readEnum(record.waveform, ['sine', 'triangle', 'square'], fallback.waveform),
    offset: readClamped(record.offset, fallback.offset, -1, 1),
    decay: readClamped(record.decay, fallback.decay, 0, 1),
  }
}

function sanitizeSurfaceNoise(value: unknown, fallback: CharacterMeshSurfaceNoise): CharacterMeshSurfaceNoise {
  const record = asRecord(value)
  return {
    enabled: readBoolean(record.enabled, fallback.enabled),
    amount: readClamped(record.amount, fallback.amount, 0, 2),
    speed: readClamped(record.speed, fallback.speed, 1, 20),
    scale: readClamped(record.scale, fallback.scale, 0.1, 20),
    seed: readInteger(record.seed, fallback.seed, -9999, 9999),
    detail: readInteger(record.detail, fallback.detail, 1, 5),
    roughness: readClamped(record.roughness, fallback.roughness, 0, 1),
    direction: readEnum(record.direction, ['depth', 'radial', 'normal'], fallback.direction),
    contrast: readClamped(record.contrast, fallback.contrast, 0, 2),
    offsetX: readClamped(record.offsetX, fallback.offsetX, -5, 5),
    offsetY: readClamped(record.offsetY, fallback.offsetY, -5, 5),
  }
}

function sanitizeInflate(value: unknown, fallback: CharacterMeshInflate): CharacterMeshInflate {
  const record = asRecord(value)
  return {
    enabled: readBoolean(record.enabled, fallback.enabled),
    amount: readClamped(record.amount, fallback.amount, 0, 10),
    balance: readClamped(record.balance, fallback.balance, 0, 1),
    radius: readClamped(record.radius, fallback.radius, 0.05, 2),
    falloff: readClamped(record.falloff, fallback.falloff, 0, 1),
    centerX: readClamped(record.centerX, fallback.centerX, -1, 1),
    centerY: readClamped(record.centerY, fallback.centerY, -1, 1),
    uniform: readBoolean(record.uniform, fallback.uniform),
    deflate: readBoolean(record.deflate, fallback.deflate),
  }
}

function sanitizeCurl(value: unknown, fallback: CharacterMeshCurl): CharacterMeshCurl {
  const record = asRecord(value)
  const angleValue = record.angle ?? record.amount
  return {
    enabled: readBoolean(record.enabled, fallback.enabled),
    angle: readClamped(angleValue, fallback.angle, -360, 360),
    axis: readEnum(record.axis, ['x', 'y', 'z'], fallback.axis),
    tightness: readClamped(record.tightness, fallback.tightness, 0.1, 4),
    pivot: readClamped(record.pivot, fallback.pivot, -1, 1),
    offset: readClamped(record.offset, fallback.offset, -1, 1),
    turns: readInteger(record.turns, fallback.turns, -5, 5),
    falloff: readClamped(record.falloff, fallback.falloff, 0, 1),
    clamp: readBoolean(record.clamp, fallback.clamp),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function readClamped(value: unknown, fallback: number, min: number, max: number) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, numeric))
}

function readInteger(value: unknown, fallback: number, min: number, max: number) {
  return Math.round(readClamped(value, fallback, min, max))
}

function readEnum<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? value as T : fallback
}
