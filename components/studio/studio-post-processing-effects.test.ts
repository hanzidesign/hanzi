import { Vector2 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  StudioBackgroundRestoreEffect,
  StudioCrtCurveEffect,
  StudioGrainEffect,
  StudioPhosphorEffect,
  StudioScanlineEffect,
} from './studio-post-processing-effects'

describe('Studio shared post-processing effects', () => {
  it('restores the exact Voronoi background from the preserved model alpha mask', () => {
    const effect = new StudioBackgroundRestoreEffect()

    effect.setParameters({ background: '#123456', fillCanvas: false })
    effect.setMaskTexture({})

    expect(effect.uniforms.get('uBackground')?.value).toEqual([0x12 / 255, 0x34 / 255, 0x56 / 255])
    expect(effect.uniforms.get('uFillCanvas')?.value).toBe(0)
    expect(effect.uniforms.get('uHasModelMask')?.value).toBe(1)
    expect(effect.getFragmentShader()).toContain(
      'mix(uBackground, inputColor.rgb, modelMask)',
    )
    expect(effect.getFragmentShader()).toContain('texture2D(uModelMask, uv)')
    expect(effect.getFragmentShader()).toContain('uHasModelMask')
    expect(effect.getFragmentShader()).not.toContain('inputColor.a')

    effect.setMaskTexture(null)
    expect(effect.uniforms.get('uHasModelMask')?.value).toBe(0)

    effect.dispose()
  })

  it('maps Grain controls into deterministic bounded uniforms', () => {
    const effect = new StudioGrainEffect()

    effect.setParameters({ intensity: 1.5, mode: 'pixel', size: 18, speed: 200, time: 4.25 })
    effect.setSize(640, 360)
    effect.setVisualSize(320, 180)

    expect(effect.uniforms.get('uIntensity')?.value).toBe(1.5)
    expect(effect.uniforms.get('uMode')?.value).toBe(1)
    expect(effect.uniforms.get('uSize')?.value).toBe(10)
    expect(effect.uniforms.get('uSpeed')?.value).toBe(200)
    expect(effect.uniforms.get('uTime')?.value).toBe(4.25)
    expect(effect.uniforms.get('uResolution')?.value).toEqual(new Vector2(640, 360))
    expect(effect.uniforms.get('uVisualResolution')?.value).toEqual(new Vector2(320, 180))
    expect(effect.getFragmentShader()).toContain('grainCell')
    expect(effect.getFragmentShader()).toContain('visualPixel / max(uSize, 1.0)')
    expect(effect.getFragmentShader()).toContain(
      'fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453)',
    )
    expect(effect.getFragmentShader()).toContain('float pixelFrameRate = mix(')
    expect(effect.getFragmentShader()).toContain(
      'clamp((uSpeed - 1.0) / 199.0, 0.0, 1.0)',
    )
    expect(effect.getFragmentShader()).toContain('uTime')

    effect.setParameters({ intensity: 1, mode: 'unknown', size: 2, speed: -1, time: 0 })
    expect(effect.uniforms.get('uMode')?.value).toBe(0)
    expect(effect.uniforms.get('uSpeed')?.value).toBe(1)

    effect.dispose()
  })

  it('uses a UV warp for CRT Curve instead of a brightness-only grade', () => {
    const effect = new StudioCrtCurveEffect()

    effect.setAmount(0.2)

    expect(effect.uniforms.get('uAmount')?.value).toBe(0.2)
    expect(effect.getFragmentShader()).toContain('void mainUv(inout vec2 uv)')
    expect(effect.getFragmentShader()).toContain('radiusSquared')

    effect.dispose()
  })

  it('uses clamped framebuffer-sized uniforms for custom Scanlines', () => {
    const effect = new StudioScanlineEffect()

    expect(effect.uniforms.get('uOpacity')?.value).toBe(0.5)
    expect(effect.uniforms.get('uSpacing')?.value).toBe(80)
    expect(effect.uniforms.get('uOffset')?.value).toBe(0)
    expect(effect.uniforms.get('uSpeed')?.value).toBe(1)
    expect(effect.uniforms.get('uTime')?.value).toBe(0)

    effect.setParameters({ opacity: 1.5, spacing: 1250, offset: 25, speed: 25 })
    effect.setTime(-4.5)
    effect.setSize(1024, 768)
    effect.setVisualSize(512, 384)

    expect(effect.uniforms.get('uOpacity')?.value).toBe(1)
    expect(effect.uniforms.get('uSpacing')?.value).toBe(1000)
    expect(effect.uniforms.get('uOffset')?.value).toBe(20)
    expect(effect.uniforms.get('uSpeed')?.value).toBe(10)
    expect(effect.uniforms.get('uTime')?.value).toBe(-4.5)
    expect(effect.uniforms.get('uResolution')?.value).toEqual(new Vector2(1024, 768))
    expect(effect.uniforms.get('uVisualResolution')?.value).toEqual(new Vector2(512, 384))
    expect(effect.getFragmentShader()).toContain('float fragY = uv.y * uVisualResolution.y')
    expect(effect.getFragmentShader()).toContain(
      'uOffset + uTime * uSpeed * uSpacing * 2.0',
    )
    expect(effect.getFragmentShader()).toContain('mod(fragY + uOffset + uTime')
    expect(effect.getFragmentShader()).toContain('uSpacing * 2.0')
    expect(effect.getFragmentShader()).toContain('phase < uSpacing')
    expect(effect.getFragmentShader()).not.toMatch(/\bactive\b/)

    effect.dispose()
  })

  it('tints exact luminance with the selected Phosphor color', () => {
    const effect = new StudioPhosphorEffect()

    effect.setColor([1, 0.75, 0])

    expect(effect.uniforms.get('uPhosphorColor')?.value).toEqual([1, 0.75, 0])
    expect(effect.getFragmentShader()).toContain(
      'dot(inputColor.rgb, vec3(0.299, 0.587, 0.114))',
    )
    expect(effect.getFragmentShader()).toContain('uPhosphorColor * luminance')

    effect.dispose()
  })
})
