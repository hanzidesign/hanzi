import { Uniform, Vector2 } from 'three'
import { BlendFunction, Effect } from 'postprocessing'

const GRAIN_FRAGMENT_SHADER = /* glsl */ `
uniform float uIntensity;
uniform float uMode;
uniform float uSize;
uniform float uSpeed;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uVisualResolution;

float studioPostHash(vec2 value) {
  vec3 p3 = fract(vec3(value.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float noise;
  if (uMode < 0.5) {
    vec2 grainCell = floor(uv * uVisualResolution / max(uSize, 1.0));
    float normalizedSpeed = clamp(uSpeed / 100.0, 0.0, 2.0);
    float frame = floor(uTime * mix(2.0, 30.0, normalizedSpeed));
    noise = studioPostHash(grainCell + vec2(frame * 0.7549, frame));
  } else {
    vec2 visualPixel = uv * uVisualResolution;
    vec2 pixel = floor(visualPixel / max(uSize, 1.0));
    float pixelFrameRate = mix(
      1.0,
      60.0,
      clamp((uSpeed - 1.0) / 199.0, 0.0, 1.0)
    );
    float movingTime = floor(uTime * pixelFrameRate);
    pixel += movingTime;
    noise = fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
  }
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

const SCANLINE_FRAGMENT_SHADER = /* glsl */ `
uniform float uOpacity;
uniform float uSpacing;
uniform float uOffset;
uniform float uSpeed;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uVisualResolution;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float fragY = uv.y * uVisualResolution.y;
  float phase = mod(fragY + uOffset + uTime * uSpeed * uSpacing * 2.0, uSpacing * 2.0);
  float scanlineMask = phase < uSpacing ? 1.0 : 0.0;
  vec3 color = inputColor.rgb;
  color *= 1.0 - uOpacity * scanlineMask;
  outputColor = vec4(color, inputColor.a);
}
`

const PHOSPHOR_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uPhosphorColor;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float luminance = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
  outputColor = vec4(uPhosphorColor * luminance, inputColor.a);
}
`

export const BACKGROUND_RESTORE_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uBackground;
uniform sampler2D uModelMask;
uniform float uHasModelMask;
uniform float uFillCanvas;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float sourceTone = dot(texture2D(uModelMask, uv).rgb, vec3(0.299, 0.587, 0.114));
  float modelMask = smoothstep(0.01, 0.12, sourceTone) * uHasModelMask;
  modelMask = mix(modelMask, 1.0, uFillCanvas);
  outputColor = vec4(mix(uBackground, inputColor.rgb, modelMask), 1.0);
}
`

export class StudioGrainEffect extends Effect {
  constructor() {
    super('StudioGrainEffect', GRAIN_FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uIntensity', new Uniform(0)],
        ['uMode', new Uniform(0)],
        ['uSize', new Uniform(2)],
        ['uSpeed', new Uniform(50)],
        ['uTime', new Uniform(0)],
        ['uResolution', new Uniform(new Vector2(1, 1))],
        ['uVisualResolution', new Uniform(new Vector2(1, 1))],
      ]),
    })
  }

  setParameters({
    intensity,
    mode = 'noise',
    size,
    speed,
    time,
  }: {
    intensity: number
    mode?: string
    size: number
    speed: number
    time: number
  }) {
    this.uniforms.get('uIntensity')!.value = clamp(intensity, 0, 2)
    this.uniforms.get('uMode')!.value = mode === 'pixel' ? 1 : 0
    this.uniforms.get('uSize')!.value = clamp(size, 1, 10)
    this.uniforms.get('uSpeed')!.value = clamp(speed, 1, 200)
    this.uniforms.get('uTime')!.value = Number.isFinite(time) ? time : 0
  }

  override setSize(width: number, height: number) {
    const resolution = this.uniforms.get('uResolution')!.value as Vector2
    resolution.set(Math.max(1, width), Math.max(1, height))
  }

  setVisualSize(width: number, height: number) {
    const resolution = this.uniforms.get('uVisualResolution')!.value as Vector2
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

  setAmount(value: number) {
    this.uniforms.get('uAmount')!.value = clamp(value, 0, 0.5)
  }
}

export class StudioScanlineEffect extends Effect {
  constructor() {
    super('StudioScanlineEffect', SCANLINE_FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uOpacity', new Uniform(0.5)],
        ['uSpacing', new Uniform(80)],
        ['uOffset', new Uniform(0)],
        ['uSpeed', new Uniform(1)],
        ['uTime', new Uniform(0)],
        ['uResolution', new Uniform(new Vector2(1, 1))],
        ['uVisualResolution', new Uniform(new Vector2(1, 1))],
      ]),
    })
  }

  setParameters({
    opacity,
    spacing,
    offset,
    speed,
  }: {
    opacity: number
    spacing: number
    offset: number
    speed: number
  }) {
    this.uniforms.get('uOpacity')!.value = clamp(opacity, 0, 1)
    this.uniforms.get('uSpacing')!.value = clamp(spacing, 1, 1000)
    this.uniforms.get('uOffset')!.value = clamp(offset, 0, 20)
    this.uniforms.get('uSpeed')!.value = clamp(speed, 1, 10)
  }

  setTime(value: number) {
    this.uniforms.get('uTime')!.value = Number.isFinite(value) ? value : 0
  }

  override setSize(width: number, height: number) {
    const resolution = this.uniforms.get('uResolution')!.value as Vector2
    resolution.set(Math.max(1, width), Math.max(1, height))
  }

  setVisualSize(width: number, height: number) {
    const resolution = this.uniforms.get('uVisualResolution')!.value as Vector2
    resolution.set(Math.max(1, width), Math.max(1, height))
  }
}

export class StudioPhosphorEffect extends Effect {
  constructor() {
    super('StudioPhosphorEffect', PHOSPHOR_FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uPhosphorColor', new Uniform([0, 1, 0])],
      ]),
    })
  }

  setColor(value: unknown) {
    this.uniforms.get('uPhosphorColor')!.value = resolvePhosphorColor(value)
  }
}

export class StudioBackgroundRestoreEffect extends Effect {
  constructor() {
    super('StudioBackgroundRestoreEffect', BACKGROUND_RESTORE_FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uBackground', new Uniform([1, 1, 1])],
        ['uModelMask', new Uniform(null)],
        ['uHasModelMask', new Uniform(0)],
        ['uFillCanvas', new Uniform(0)],
      ]),
    })
  }

  setParameters({
    background,
    fillCanvas,
  }: {
    background: unknown
    fillCanvas: boolean
  }) {
    this.uniforms.get('uBackground')!.value = resolveRgbColor(background, [1, 1, 1])
    this.uniforms.get('uFillCanvas')!.value = fillCanvas ? 1 : 0
  }

  setMaskTexture(value: unknown) {
    this.uniforms.get('uModelMask')!.value = value
    this.uniforms.get('uHasModelMask')!.value = value ? 1 : 0
  }
}

export function resolvePhosphorColor(value: unknown): [number, number, number] {
  return resolveRgbColor(value, [0, 1, 0])
}

function resolveRgbColor(
  value: unknown,
  fallback: [number, number, number],
): [number, number, number] {
  if (typeof value === 'string') {
    const match = value.match(/^#?([0-9a-f]{6})$/i)
    if (!match) {
      return fallback
    }

    const color = Number.parseInt(match[1], 16)
    return [
      ((color >> 16) & 255) / 255,
      ((color >> 8) & 255) / 255,
      (color & 255) / 255,
    ]
  }

  if (!Array.isArray(value) || value.length !== 3 || !value.every(
    (entry) => typeof entry === 'number' && Number.isFinite(entry),
  )) {
    return fallback
  }

  return [
    clamp(value[0], 0, 1),
    clamp(value[1], 0, 1),
    clamp(value[2], 0, 1),
  ]
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}
