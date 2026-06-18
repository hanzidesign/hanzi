import { describe, expect, it } from 'vitest'

import {
  createDisabledFeedbackSimulation,
  createFeedbackSimulationState,
  resetFeedbackSimulation,
} from './feedback-simulation'

describe('feedback simulation contract', () => {
  it('keeps feedback disabled unless an experimental row is explicitly enabled', () => {
    const disabled = createDisabledFeedbackSimulation()

    expect(disabled.enabled).toBe(false)
    expect(disabled.effectId).toBeNull()
    expect(disabled.intensity).toBe(0)
    expect(disabled.available).toBe(false)
  })

  it('freezes simulation time when speed is zero', () => {
    const simulation = createFeedbackSimulationState({
      effectId: 'advection-ink',
      enabled: true,
      intensity: 0.7,
      speed: 0,
      elapsedSeconds: 12,
    })

    expect(simulation.enabled).toBe(true)
    expect(simulation.effectiveTime).toBe(0)
    expect(simulation.maskClipped).toBe(true)
  })

  it('increments reset token without changing selected effect', () => {
    const simulation = createFeedbackSimulationState({
      effectId: 'reaction-diffusion-skin',
      enabled: true,
      intensity: 0.5,
      speed: 1,
      elapsedSeconds: 3,
    })

    expect(resetFeedbackSimulation(simulation)).toMatchObject({
      effectId: 'reaction-diffusion-skin',
      resetToken: simulation.resetToken + 1,
    })
  })
})
