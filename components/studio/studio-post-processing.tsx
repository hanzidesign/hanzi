'use client'

import { useEffect, useMemo, type ReactElement } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette,
} from '@react-three/postprocessing'
import { Vector2 } from 'three'
import { useStudioStore } from '@/app/studio/studio-store'
import { useStudioRenderMode } from '@/components/studio/studio-render-context'
import {
  StudioCrtCurveEffect,
  StudioBackgroundRestoreEffect,
  StudioGrainEffect,
  StudioPhosphorEffect,
  StudioScanlineEffect,
} from '@/components/studio/studio-post-processing-effects'
import { StudioProcessingEffect } from '@/components/studio/studio-processing-effect'

export default function StudioPostProcessing() {
  const { gl, size } = useThree()
  const {
    readAnimationTime,
    resolveVisualFrameSize,
    voronoiMaskTextureRef,
  } = useStudioRenderMode()
  const selectedEffectId = useStudioStore((store) => store.studioEffect.selectedEffectId)
  const controls = useStudioStore((store) => (
    store.studioEffect.controls[store.studioEffect.selectedEffectId]
  ))
  const animation = useStudioStore((store) => store.animation)
  const processingEffect = useMemo(() => new StudioProcessingEffect(), [])
  const grainEffect = useMemo(() => new StudioGrainEffect(), [])
  const scanlineEffect = useMemo(() => new StudioScanlineEffect(), [])
  const crtCurveEffect = useMemo(() => new StudioCrtCurveEffect(), [])
  const phosphorEffect = useMemo(() => new StudioPhosphorEffect(), [])
  const backgroundRestoreEffect = useMemo(() => new StudioBackgroundRestoreEffect(), [])

  const bloomEnabled = controls?.bloom === true
  const chromaticEnabled = controls?.chromatic === true
  const scanlinesEnabled = controls?.scanlines === true
  const vignetteEnabled = controls?.vignette === true
  const crtCurveEnabled = controls?.['crt-curve'] === true
  const phosphorEnabled = controls?.phosphor === true
  const grainEnabled = controls?.grain === true
  const fillCanvas = controls?.['fill-canvas'] === true
  const bloomThreshold = clamp(readNumber(controls?.['bloom-threshold'], 0.5), 0, 1)
  const bloomSoftThreshold = clamp(readNumber(controls?.['bloom-soft-threshold'], 0.2), 0, 1)
  const bloomIntensity = clamp(readNumber(controls?.['bloom-intensity'], 1.5), 0, 2)
  const bloomRadius = clamp(readNumber(controls?.['bloom-radius'], 12) / 20, 0, 1)
  const grainMode = readString(controls?.['grain-mode'], 'noise')
  const grainIntensity = readNumber(controls?.['grain-intensity'], 1) / 100
  const grainSize = readNumber(controls?.['grain-size'], 2)
  const grainSpeed = readNumber(controls?.['grain-speed'], 50)
  const chromaticOffsetPixels = clamp(readNumber(controls?.['chromatic-offset'], 5), 0, 100)
  const scanlineOpacity = clamp(readNumber(controls?.['scanline-opacity'], 0.2), 0, 1)
  const scanlineSpacing = clamp(readNumber(controls?.['scanline-spacing'], 80), 1, 1000)
  const scanlineOffset = clamp(readNumber(controls?.['scanline-offset'], 0), 0, 20)
  const scanlineSpeed = clamp(readNumber(controls?.['scanline-speed'], 1), 1, 10)
  const scanlineDirection = readString(controls?.['scanline-direction'], 'down')
  const vignetteIntensity = clamp(readNumber(controls?.['vignette-intensity'], 0.5), 0, 1)
  const vignetteRadius = clamp(readNumber(controls?.['vignette-radius'], 0.5), 0, 1)
  const crtAmount = clamp(readNumber(controls?.['crt-amount'], 0.1), 0, 0.5)
  const phosphorColorMode = readString(controls?.['phosphor-color'], 'green')
  const phosphorCustomColor = controls?.['phosphor-custom-color']
  const phosphorColor = useMemo(
    () => resolvePhosphorColor(phosphorColorMode, phosphorCustomColor),
    [phosphorColorMode, phosphorCustomColor],
  )
  const drawingWidth = Math.max(
    1,
    gl.domElement.width || Math.round(size.width * gl.getPixelRatio()),
  )
  const drawingHeight = Math.max(
    1,
    gl.domElement.height || Math.round(size.height * gl.getPixelRatio()),
  )
  const visualFrameSize = resolveVisualFrameSize('canvas', drawingWidth, drawingHeight)
  const chromaticOffset = useMemo(
    () => new Vector2(chromaticOffsetPixels / visualFrameSize.width, 0),
    [chromaticOffsetPixels, visualFrameSize.width],
  )

  useEffect(() => {
    processingEffect.updateFromControls(controls)
    scanlineEffect.setParameters({
      opacity: scanlineOpacity,
      spacing: scanlineSpacing,
      offset: scanlineOffset,
      speed: scanlineSpeed,
    })
    crtCurveEffect.setAmount(crtAmount)
    phosphorEffect.setColor(phosphorColor)
    backgroundRestoreEffect.setParameters({
      background: controls?.background,
      fillCanvas,
    })
  }, [
    controls,
    backgroundRestoreEffect,
    crtAmount,
    crtCurveEffect,
    fillCanvas,
    phosphorColor,
    phosphorEffect,
    processingEffect,
    scanlineEffect,
    scanlineOffset,
    scanlineOpacity,
    scanlineSpacing,
    scanlineSpeed,
  ])

  useEffect(() => () => {
    processingEffect.dispose()
    grainEffect.dispose()
    scanlineEffect.dispose()
    crtCurveEffect.dispose()
    phosphorEffect.dispose()
    backgroundRestoreEffect.dispose()
  }, [backgroundRestoreEffect, crtCurveEffect, grainEffect, phosphorEffect, processingEffect, scanlineEffect])

  useFrame(() => {
    processingEffect.setVisualSize(visualFrameSize.width, visualFrameSize.height)
    grainEffect.setVisualSize(visualFrameSize.width, visualFrameSize.height)
    scanlineEffect.setVisualSize(visualFrameSize.width, visualFrameSize.height)
    backgroundRestoreEffect.setMaskTexture(voronoiMaskTextureRef.current)
    const time = animation.animatePost ? readAnimationTime() : animation.timeOffset

    grainEffect.setParameters({
      intensity: grainIntensity,
      mode: grainMode,
      size: grainSize,
      speed: grainSpeed,
      time,
    })
    scanlineEffect.setTime(scanlineDirection === 'up' ? -time : time)
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
        offset={chromaticOffset}
      />,
    )
  }
  if (bloomEnabled) {
    effects.push(
      <Bloom
        key="bloom"
        mipmapBlur
        intensity={bloomIntensity}
        radius={bloomRadius}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={bloomSoftThreshold}
      />,
    )
  }
  if (grainEnabled && grainIntensity > 0) {
    effects.push(<primitive key="grain" object={grainEffect} dispose={null} />)
  }
  if (scanlinesEnabled) {
    effects.push(<primitive key="scanlines" object={scanlineEffect} dispose={null} />)
  }
  if (phosphorEnabled) {
    effects.push(<primitive key="phosphor" object={phosphorEffect} dispose={null} />)
  }
  if (vignetteEnabled) {
    effects.push(<Vignette key="vignette" offset={vignetteRadius} darkness={vignetteIntensity} />)
  }
  if (selectedEffectId === 'voronoi') {
    effects.push(<primitive key="background-restore" object={backgroundRestoreEffect} dispose={null} />)
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

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

function resolvePhosphorColor(mode: string, customColor: unknown): [number, number, number] {
  if (mode === 'amber') {
    return [1, 0xbf / 255, 0]
  }

  if (mode === 'white') {
    return [1, 1, 1]
  }

  if (mode === 'custom' && typeof customColor === 'string') {
    const match = customColor.match(/^#?([0-9a-f]{6})$/i)
    if (match) {
      const value = Number.parseInt(match[1], 16)
      return [
        ((value >> 16) & 255) / 255,
        ((value >> 8) & 255) / 255,
        (value & 255) / 255,
      ]
    }
  }

  return [0, 1, 0]
}
