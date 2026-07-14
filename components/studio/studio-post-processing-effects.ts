import { Uniform, Vector2 } from 'three'
import { BlendFunction, Effect } from 'postprocessing'

const GRAIN_FRAGMENT_SHADER = /* glsl */ `
uniform float uIntensity;
uniform float uSize;
uniform float uSpeed;
uniform float uTime;
uniform vec2 uResolution;

float studioPostHash(vec2 value) {
  vec3 p3 = fract(vec3(value.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 grainCell = floor(uv * uResolution / max(uSize, 1.0));
  float frame = floor(uTime * mix(2.0, 30.0, uSpeed));
  float noise = studioPostHash(grainCell + vec2(frame * 0.7549, frame));
  vec3 color = inputColor.rgb + (noise - 0.5) * uIntensity;
  outputColor = vec4(clamp(color, 0.0, 1.0), inputColor.a);
}
`

const CRT_CURVE_FRAGMENT_SHADER = /* glsl */ `
uniform float uAmount;

void mainUv(inout vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  float radiusSquared = dot(centered, centered);
  uv = 0.5 + centered * (1.0 + uAmount * radiusSquared) * 0.5;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float inside = step(0.0, uv.x) * step(uv.x, 1.0)
    * step(0.0, uv.y) * step(uv.y, 1.0);
  outputColor = vec4(inputColor.rgb * inside, inputColor.a);
}
`

const PHOSPHOR_FRAGMENT_SHADER = /* glsl */ `
uniform float uIntensity;
uniform vec2 uResolution;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float stripe = mod(floor(uv.x * uResolution.x), 3.0);
  vec3 phosphorMask = stripe < 1.0
    ? vec3(1.65, 0.55, 0.55)
    : (stripe < 2.0 ? vec3(0.55, 1.65, 0.55) : vec3(0.55, 0.55, 1.65));
  vec3 graded = inputColor.rgb * phosphorMask;
  outputColor = vec4(mix(inputColor.rgb, graded, uIntensity), inputColor.a);
}
`

export class StudioGrainEffect extends Effect {
  constructor() {
    super('StudioGrainEffect', GRAIN_FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uIntensity', new Uniform(0)],
        ['uSize', new Uniform(2)],
        ['uSpeed', new Uniform(0.5)],
        ['uTime', new Uniform(0)],
        ['uResolution', new Uniform(new Vector2(1, 1))],
      ]),
    })
  }

  setParameters({
    intensity,
    size,
    speed,
    time,
  }: {
    intensity: number
    size: number
    speed: number
    time: number
  }) {
    this.uniforms.get('uIntensity')!.value = clamp(intensity, 0, 1)
    this.uniforms.get('uSize')!.value = clamp(size, 1, 10)
    this.uniforms.get('uSpeed')!.value = clamp(speed, 0, 1)
    this.uniforms.get('uTime')!.value = Number.isFinite(time) ? time : 0
  }

  override setSize(width: number, height: number) {
    const resolution = this.uniforms.get('uResolution')!.value as Vector2
    resolution.set(Math.max(1, width), Math.max(1, height))
  }

}

export class StudioCrtCurveEffect extends Effect {
  constructor() {
    super('StudioCrtCurveEffect', CRT_CURVE_FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uAmount', new Uniform(0.12)],
      ]),
    })
  }

  set amount(value: number) {
    this.uniforms.get('uAmount')!.value = clamp(value, 0, 0.3)
  }
}

export class StudioPhosphorEffect extends Effect {
  constructor() {
    super('StudioPhosphorEffect', PHOSPHOR_FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uIntensity', new Uniform(0.42)],
        ['uResolution', new Uniform(new Vector2(1, 1))],
      ]),
    })
  }

  set intensity(value: number) {
    this.uniforms.get('uIntensity')!.value = clamp(value, 0, 1)
  }

  override setSize(width: number, height: number) {
    const resolution = this.uniforms.get('uResolution')!.value as Vector2
    resolution.set(Math.max(1, width), Math.max(1, height))
  }
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}
