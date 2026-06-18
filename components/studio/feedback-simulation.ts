export type FeedbackSimulationEffectId =
  | 'reaction-diffusion-skin'
  | 'advection-ink'
  | 'smoke-diffusion'
  | 'pixel-sort-edge'

export type FeedbackSimulationState = {
  effectId: FeedbackSimulationEffectId | null
  enabled: boolean
  intensity: number
  speed: number
  effectiveTime: number
  resetToken: number
  maskClipped: boolean
  available: boolean
}

export function createDisabledFeedbackSimulation(): FeedbackSimulationState {
  return {
    effectId: null,
    enabled: false,
    intensity: 0,
    speed: 0,
    effectiveTime: 0,
    resetToken: 0,
    maskClipped: true,
    available: false,
  }
}

export function createFeedbackSimulationState({
  effectId,
  enabled,
  intensity,
  speed,
  elapsedSeconds,
  resetToken = 0,
}: {
  effectId: FeedbackSimulationEffectId
  enabled: boolean
  intensity: number
  speed: number
  elapsedSeconds: number
  resetToken?: number
}): FeedbackSimulationState {
  if (!enabled) {
    return createDisabledFeedbackSimulation()
  }

  const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0

  return {
    effectId,
    enabled: true,
    intensity: clamp01(intensity),
    speed: safeSpeed,
    effectiveTime: safeSpeed <= 0 ? 0 : Math.max(0, elapsedSeconds) * safeSpeed,
    resetToken,
    maskClipped: true,
    available: true,
  }
}

export function resetFeedbackSimulation(state: FeedbackSimulationState): FeedbackSimulationState {
  return {
    ...state,
    effectiveTime: 0,
    resetToken: state.resetToken + 1,
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}
