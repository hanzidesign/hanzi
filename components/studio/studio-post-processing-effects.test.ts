import { Vector2 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  StudioCrtCurveEffect,
  StudioGrainEffect,
  StudioPhosphorEffect,
} from './studio-post-processing-effects'

describe('Studio shared post-processing effects', () => {
  it('maps Grain controls into deterministic bounded uniforms', () => {
    const effect = new StudioGrainEffect()

    effect.setParameters({ intensity: 1.5, size: 18, speed: -1, time: 4.25 })
    effect.setSize(640, 360)

    expect(effect.uniforms.get('uIntensity')?.value).toBe(1)
    expect(effect.uniforms.get('uSize')?.value).toBe(10)
    expect(effect.uniforms.get('uSpeed')?.value).toBe(0)
    expect(effect.uniforms.get('uTime')?.value).toBe(4.25)
    expect(effect.uniforms.get('uResolution')?.value).toEqual(new Vector2(640, 360))
    expect(effect.getFragmentShader()).toContain('grainCell')
    expect(effect.getFragmentShader()).toContain('uTime')

    effect.dispose()
  })

  it('uses a UV warp for CRT Curve instead of a brightness-only grade', () => {
    const effect = new StudioCrtCurveEffect()

    effect.amount = 0.2

    expect(effect.uniforms.get('uAmount')?.value).toBe(0.2)
    expect(effect.getFragmentShader()).toContain('void mainUv(inout vec2 uv)')
    expect(effect.getFragmentShader()).toContain('radiusSquared')

    effect.dispose()
  })

  it('uses framebuffer-sized RGB triads for Phosphor', () => {
    const effect = new StudioPhosphorEffect()

    effect.intensity = 0.6
    effect.setSize(1024, 1024)

    expect(effect.uniforms.get('uIntensity')?.value).toBe(0.6)
    expect(effect.uniforms.get('uResolution')?.value).toEqual(new Vector2(1024, 1024))
    expect(effect.getFragmentShader()).toContain('mod(floor(uv.x * uResolution.x), 3.0)')
    expect(effect.getFragmentShader()).toContain('phosphorMask')

    effect.dispose()
  })
})

