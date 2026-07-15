import { describe, expect, it } from 'vitest'

import {
  createExportAnimationPlan,
  createFrameDelaySchedule,
  readExportFrame,
} from './export-animation'

describe('Studio animated export plan', () => {
  it.each([
    ['mp4', 30],
    ['apng', 24],
    ['gif', 12],
  ] as const)('uses the required %s frame rate', (format, fps) => {
    const plan = createExportAnimationPlan({
      format,
      autoRotate: true,
      autoRotateSpeed: 0.5,
      motionSpeed: 1,
    })

    expect(plan.fps).toBe(fps)
    expect(plan.durationSeconds).toBeCloseTo(Math.PI * 4, 1)
    expect(plan.frameCount).toBe(Math.round(Math.PI * 4 * fps))
  })

  it('samples one full turn without duplicating the endpoint frame', () => {
    const plan = createExportAnimationPlan({
      format: 'mp4',
      autoRotate: true,
      autoRotateSpeed: 1,
      motionSpeed: 1,
    })
    const first = readExportFrame({
      plan,
      frameIndex: 0,
      baseRotationY: 0.25,
      baseTime: 3,
      motionSpeed: 1,
    })
    const last = readExportFrame({
      plan,
      frameIndex: plan.frameCount - 1,
      baseRotationY: 0.25,
      baseTime: 3,
      motionSpeed: 1,
    })

    expect(first.rotationY).toBe(0.25)
    expect(last.rotationY).toBeLessThan(0.25 + Math.PI * 2)
    expect(last.rotationY + Math.PI * 2 / plan.frameCount).toBeCloseTo(0.25 + Math.PI * 2)
  })

  it('uses negative Motion Speed for a reverse full turn', () => {
    const plan = createExportAnimationPlan({
      format: 'mp4',
      autoRotate: true,
      autoRotateSpeed: 1,
      motionSpeed: -1,
    })
    const frame = readExportFrame({
      plan,
      frameIndex: 1,
      baseRotationY: 0.25,
      baseTime: 3,
      motionSpeed: -1,
    })

    expect(frame.rotationY).toBeLessThan(0.25)
    expect(frame.animationTime).toBeLessThan(3)
    expect(plan.durationSeconds).toBeCloseTo(Math.PI * 2, 1)
  })

  it('rejects animation when the preview cannot rotate', () => {
    expect(() => createExportAnimationPlan({
      format: 'gif',
      autoRotate: true,
      autoRotateSpeed: 0.5,
      motionSpeed: 0,
    })).toThrow('3D Motion Speed')
  })

  it('uses format timing units while preserving the average frame rate', () => {
    const gifDelays = createFrameDelaySchedule(12, 12, 10)
    const apngDelays = createFrameDelaySchedule(24, 24, 1)

    expect(gifDelays.every((delay) => delay === 80 || delay === 90)).toBe(true)
    expect(gifDelays.reduce((sum, delay) => sum + delay, 0)).toBe(1000)
    expect(apngDelays.every((delay) => delay === 41 || delay === 42)).toBe(true)
    expect(apngDelays.reduce((sum, delay) => sum + delay, 0)).toBe(1000)
  })
})
