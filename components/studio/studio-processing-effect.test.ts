import { BlendFunction, EffectAttribute } from 'postprocessing'
import { Vector2, type WebGLRenderTarget, type WebGLRenderer } from 'three'
import { describe, expect, it } from 'vitest'

import {
  STUDIO_PROCESSING_FRAGMENT_SHADER,
  STUDIO_PROCESSING_LIMITS,
  StudioProcessingEffect,
  resolveStudioProcessingValues,
} from './studio-processing-effect'
import { getGrainradProcessingGroups } from './grainrad-effects'

describe('StudioProcessingEffect', () => {
  it('exposes useful controller ranges while preserving normalized blend bounds', () => {
    expect(rangeControl('ascii', 'brightness-map')).toMatchObject({ min: 0, max: 4, step: 0.01 })
    expect(rangeControl('matrix-rain', 'brightness-map')).toMatchObject({ min: 0, max: 6, defaultValue: 1 })
    expect(rangeControl('ascii', 'edge-enhance')).toMatchObject({ min: 0, max: 4, step: 0.01 })
    expect(rangeControl('ascii', 'blur')).toMatchObject({ min: 0, max: 64, step: 1 })
    expect(rangeControl('ascii', 'quantize-colors')).toMatchObject({ min: 0, max: 64, step: 1 })
    expect(rangeControl('ascii', 'shape-matching')).toMatchObject({ min: 0, max: 1, step: 0.01 })
  })

  it('maps absent controls to an identity transform', () => {
    const values = resolveStudioProcessingValues(undefined)

    expect(values).toEqual({
      invert: 0,
      brightnessMap: 1,
      edgeEnhance: 0,
      blurRadius: 0,
      quantizeLevels: 0,
      shapeMatching: 0,
    })

    const effect = new StudioProcessingEffect()

    expect(effect.blendMode.blendFunction).toBe(BlendFunction.SRC)
    expect(effect.getAttributes() & EffectAttribute.CONVOLUTION).toBe(EffectAttribute.CONVOLUTION)
    expect(uniformValue(effect, 'u_processingInvert')).toBe(0)
    expect(uniformValue(effect, 'u_brightnessMap')).toBe(1)
    expect(uniformValue(effect, 'u_edgeEnhance')).toBe(0)
    expect(uniformValue(effect, 'u_blurRadius')).toBe(0)
    expect(uniformValue(effect, 'u_quantizeLevels')).toBe(0)
    expect(uniformValue(effect, 'u_shapeMatching')).toBe(0)
  })

  it('clamps unsafe values and keeps quantize strength disabled at zero', () => {
    expect(resolveStudioProcessingValues({
      'processing-invert': true,
      'brightness-map': -10,
      'edge-enhance': -10,
      blur: -10,
      'quantize-colors': -10,
      'shape-matching': -10,
    })).toEqual({
      invert: 1,
      brightnessMap: STUDIO_PROCESSING_LIMITS.brightnessMap.min,
      edgeEnhance: STUDIO_PROCESSING_LIMITS.edgeEnhance.min,
      blurRadius: STUDIO_PROCESSING_LIMITS.blurRadius.min,
      quantizeLevels: STUDIO_PROCESSING_LIMITS.quantizeLevels.min,
      shapeMatching: STUDIO_PROCESSING_LIMITS.shapeMatching.min,
    })

    expect(resolveStudioProcessingValues({
      'brightness-map': 100,
      'edge-enhance': 100,
      blur: 100,
      'quantize-colors': 100,
      'shape-matching': 100,
    })).toEqual({
      invert: 0,
      brightnessMap: STUDIO_PROCESSING_LIMITS.brightnessMap.max,
      edgeEnhance: STUDIO_PROCESSING_LIMITS.edgeEnhance.max,
      blurRadius: STUDIO_PROCESSING_LIMITS.blurRadius.max,
      quantizeLevels: 2,
      shapeMatching: STUDIO_PROCESSING_LIMITS.shapeMatching.max,
    })

    expect(resolveStudioProcessingValues({ 'quantize-colors': 1 }).quantizeLevels).toBe(64)
  })

  it('maps quantize strength logarithmically from weak to strong', () => {
    const levelsAtOne = resolveStudioProcessingValues({ 'quantize-colors': 1 }).quantizeLevels
    const levelsAtMidpoint = resolveStudioProcessingValues({ 'quantize-colors': 32 }).quantizeLevels
    const levelsAtMax = resolveStudioProcessingValues({ 'quantize-colors': 64 }).quantizeLevels

    expect(resolveStudioProcessingValues({ 'quantize-colors': 0 }).quantizeLevels).toBe(0)
    expect(levelsAtOne).toBe(64)
    expect(levelsAtMidpoint).toBeLessThan(64)
    expect(levelsAtOne).toBeGreaterThan(levelsAtMidpoint)
    expect(levelsAtMidpoint).toBeGreaterThan(levelsAtMax)
    expect(levelsAtMax).toBe(2)

    for (let strength = 1; strength < 64; strength += 1) {
      const current = resolveStudioProcessingValues({ 'quantize-colors': strength }).quantizeLevels
      const next = resolveStudioProcessingValues({ 'quantize-colors': strength + 1 }).quantizeLevels
      expect(current).toBeGreaterThanOrEqual(next)
    }
  })

  it('updates all Processing uniforms from Grainrad controls', () => {
    const effect = new StudioProcessingEffect()

    effect.updateFromControls({
      'processing-invert': true,
      'brightness-map': 3,
      'edge-enhance': 2.5,
      blur: 32,
      'quantize-colors': 12,
      'shape-matching': 0.75,
    })

    expect(uniformValue(effect, 'u_processingInvert')).toBe(1)
    expect(uniformValue(effect, 'u_brightnessMap')).toBe(3)
    expect(uniformValue(effect, 'u_edgeEnhance')).toBe(2.5)
    expect(uniformValue(effect, 'u_blurRadius')).toBe(32)
    expect(uniformValue(effect, 'u_quantizeLevels')).toBe(
      resolveStudioProcessingValues({ 'quantize-colors': 12 }).quantizeLevels,
    )
    expect(uniformValue(effect, 'u_shapeMatching')).toBe(0.75)
  })

  it('tracks explicit and input-buffer resolution safely', () => {
    const effect = new StudioProcessingEffect(undefined, new Vector2(640, 360))

    expect(resolutionValue(effect).toArray()).toEqual([640, 360])

    effect.setSize(0, Number.NaN)
    expect(resolutionValue(effect).toArray()).toEqual([1, 1])

    effect.update(
      null as unknown as WebGLRenderer,
      { width: 1280, height: 720 } as WebGLRenderTarget,
    )
    expect(resolutionValue(effect).toArray()).toEqual([1280, 720])
  })

  it('implements neighbor-sampled screen-space Processing with identity gates', () => {
    const shader = STUDIO_PROCESSING_FRAGMENT_SHADER

    expect(occurrences(shader, 'processingSample(')).toBeGreaterThanOrEqual(18)
    expect(shader).toContain('texture2D(inputBuffer')
    expect(shader).toContain('1.0 / max(u_processingResolution, vec2(1.0))')
    expect(shader).toContain('if (u_blurRadius > 0.0)')
    expect(shader).toContain('processingSpatialBlur(uv, texel, u_blurRadius)')
    expect(shader).toContain('(center.rgb - neighborMean) * u_edgeEnhance')
    expect(shader).toContain('vec3(1.0 / u_brightnessMap)')
    expect(shader).toContain('mix(color, 1.0 - color, u_processingInvert)')
    expect(shader).toContain('if (u_quantizeLevels >= 2.0)')
    expect(shader).toContain('float centerLuma = processingLuminance(center.rgb)')
    expect(shader).toContain('vec3(step(0.5, centerLuma))')
    expect(shader).toContain('mix(color, vec3(step(0.5, centerLuma)), u_shapeMatching)')
    expect(shader).not.toContain('neighborLuma')
    expect(shader).not.toContain('processedLuma')
    expect(shader).not.toContain('shapeLuma')
    expect(shader).not.toContain('shapeMatched')
    expect(shader).toContain('inputColor.a')
  })
})

function uniformValue(effect: StudioProcessingEffect, name: string) {
  return effect.uniforms.get(name)!.value as number
}

function resolutionValue(effect: StudioProcessingEffect) {
  return effect.uniforms.get('u_processingResolution')!.value as Vector2
}

function occurrences(value: string, pattern: string) {
  return value.split(pattern).length - 1
}

function rangeControl(effectId: 'ascii' | 'matrix-rain', controlId: string) {
  return getGrainradProcessingGroups(effectId)
    .flatMap((group) => group.controls)
    .find((control) => control.id === controlId)
}
