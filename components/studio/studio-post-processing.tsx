'use client'

import { useEffect, useMemo, type ReactElement } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Scanline,
  Vignette,
} from '@react-three/postprocessing'
import { Vector2 } from 'three'
import { useStudioStore } from '@/app/studio/studio-store'
import { computeEffectiveAnimationTime } from '@/components/studio/animation-time'
import {
  StudioCrtCurveEffect,
  StudioGrainEffect,
  StudioPhosphorEffect,
} from '@/components/studio/studio-post-processing-effects'
import { StudioProcessingEffect } from '@/components/studio/studio-processing-effect'

const CHROMATIC_OFFSET = new Vector2(0.0035, 0.0025)

export default function StudioPostProcessing() {
  const controls = useStudioStore((store) => (
    store.grainradEffect.controls[store.grainradEffect.selectedEffectId]
  ))
  const animation = useStudioStore((store) => store.animation)
  const processingEffect = useMemo(() => new StudioProcessingEffect(), [])
  const grainEffect = useMemo(() => new StudioGrainEffect(), [])
  const crtCurveEffect = useMemo(() => new StudioCrtCurveEffect(), [])
  const phosphorEffect = useMemo(() => new StudioPhosphorEffect(), [])

  const bloomEnabled = controls?.bloom === true
  const chromaticEnabled = controls?.chromatic === true
  const scanlinesEnabled = controls?.scanlines === true
  const vignetteEnabled = controls?.vignette === true
  const crtCurveEnabled = controls?.['crt-curve'] === true
  const phosphorEnabled = controls?.phosphor === true
  const grainIntensity = readNumber(controls?.['grain-intensity'], 0) / 100
  const grainSize = readNumber(controls?.['grain-size'], 2)
  const grainSpeed = readNumber(controls?.['grain-speed'], 50) / 100

  useEffect(() => {
    processingEffect.updateFromControls(controls)
  }, [controls, processingEffect])

  useEffect(() => () => {
    processingEffect.dispose()
    grainEffect.dispose()
    crtCurveEffect.dispose()
    phosphorEffect.dispose()
  }, [crtCurveEffect, grainEffect, phosphorEffect, processingEffect])

  useFrame(({ clock }) => {
    const time = computeEffectiveAnimationTime({
      elapsedSeconds: clock.getElapsedTime(),
      speed: animation.animatePost ? animation.speed : 0,
      timeOffset: animation.timeOffset,
      playing: animation.playing,
    })

    grainEffect.setParameters({
      intensity: grainIntensity,
      size: grainSize,
      speed: grainSpeed,
      time,
    })
  })

  const effects: ReactElement[] = [
    <primitive key="processing" object={processingEffect} dispose={null} />,
  ]
  if (crtCurveEnabled) {
    effects.push(<primitive key="crt-curve" object={crtCurveEffect} dispose={null} />)
  }
  if (chromaticEnabled) {
    effects.push(
      <ChromaticAberration
        key="chromatic"
        offset={CHROMATIC_OFFSET}
        radialModulation
        modulationOffset={0.1}
      />,
    )
  }
  if (bloomEnabled) {
    effects.push(
      <Bloom
        key="bloom"
        mipmapBlur
        intensity={1.3}
        radius={0.72}
        luminanceThreshold={0.45}
        luminanceSmoothing={0.2}
      />,
    )
  }
  if (grainIntensity > 0) {
    effects.push(<primitive key="grain" object={grainEffect} dispose={null} />)
  }
  if (scanlinesEnabled) {
    effects.push(<Scanline key="scanlines" density={1.25} opacity={0.55} />)
  }
  if (phosphorEnabled) {
    effects.push(<primitive key="phosphor" object={phosphorEffect} dispose={null} />)
  }
  if (vignetteEnabled) {
    effects.push(<Vignette key="vignette" offset={0.25} darkness={0.68} />)
  }

  return (
    <EffectComposer multisampling={0} renderPriority={1}>
      {effects}
    </EffectComposer>
  )
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
