import type { StudioExportFormat } from '@/app/studio/studio-store'
import {
  getSignedRotationSpeed,
  MIN_MOTION_SPEED,
} from '@/components/studio/motion-speed'

export type AnimatedStudioExportFormat = Exclude<StudioExportFormat, 'png'>

export const EXPORT_FPS: Record<AnimatedStudioExportFormat, number> = {
  apng: 24,
  gif: 12,
  mp4: 30,
}

export type ExportAnimationPlan = {
  durationSeconds: number
  fps: number
  frameCount: number
  frameDurationSeconds: number
}

export function createExportAnimationPlan({
  format,
  autoRotate,
  autoRotateSpeed,
  motionSpeed,
}: {
  format: AnimatedStudioExportFormat
  autoRotate: boolean
  autoRotateSpeed: number
  motionSpeed: number
  reverse?: boolean
}): ExportAnimationPlan {
  const angularSpeed = autoRotateSpeed * motionSpeed

  if (!autoRotate || !Number.isFinite(angularSpeed) || autoRotateSpeed <= 0 || motionSpeed < MIN_MOTION_SPEED) {
    throw new Error('Set 3D Motion Speed to 0.5 or higher before exporting animation')
  }

  const fps = EXPORT_FPS[format]
  const exactDurationSeconds = (Math.PI * 2) / angularSpeed

  const frameCount = Math.max(1, Math.round(exactDurationSeconds * fps))

  return {
    durationSeconds: frameCount / fps,
    fps,
    frameCount,
    frameDurationSeconds: 1 / fps,
  }
}

export function readExportFrame({
  plan,
  frameIndex,
  baseRotationY,
  baseTime,
  motionSpeed,
  reverse,
}: {
  plan: ExportAnimationPlan
  frameIndex: number
  baseRotationY: number
  baseTime: number
  motionSpeed: number
  reverse?: boolean
}) {
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= plan.frameCount) {
    throw new RangeError('Export frame index is outside the animation plan')
  }

  const progress = frameIndex / plan.frameCount
  const signedSpeed = getSignedRotationSpeed(motionSpeed, reverse ?? false)

  return {
    rotationY: baseRotationY + Math.PI * 2 * progress * Math.sign(signedSpeed),
    animationTime: baseTime + frameIndex * plan.frameDurationSeconds * Math.abs(motionSpeed),
  }
}

export function createFrameDelaySchedule(
  frameCount: number,
  fps: number,
  unitMilliseconds: number,
) {
  const unitsPerSecond = 1000 / unitMilliseconds

  return Array.from({ length: frameCount }, (_, frameIndex) => {
    const currentUnits = Math.round((frameIndex * unitsPerSecond) / fps)
    const nextUnits = Math.round(((frameIndex + 1) * unitsPerSecond) / fps)

    return Math.max(1, nextUnits - currentUnits) * unitMilliseconds
  })
}
