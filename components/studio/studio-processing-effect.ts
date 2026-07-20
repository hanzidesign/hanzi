import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import {
  Uniform,
  Vector2,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three'

import type { GrainradControlValue } from './grainrad-effects'

export const STUDIO_PROCESSING_LIMITS = {
  brightnessMap: { min: 0, max: 6, defaultValue: 1 },
  edgeEnhance: { min: 0, max: 4, defaultValue: 0 },
  blurRadius: { min: 0, max: 64, defaultValue: 0 },
  quantizeLevels: { min: 0, max: 64, defaultValue: 0 },
  shapeMatching: { min: 0, max: 1, defaultValue: 0 },
} as const

export type StudioProcessingValues = Readonly<{
  invert: number
  brightnessMap: number
  edgeEnhance: number
  blurRadius: number
  quantizeLevels: number
  shapeMatching: number
}>

export const STUDIO_PROCESSING_FRAGMENT_SHADER = /* glsl */ `
uniform vec2 u_processingResolution;
uniform float u_processingInvert;
uniform float u_brightnessMap;
uniform float u_edgeEnhance;
uniform float u_blurRadius;
uniform float u_quantizeLevels;
uniform float u_shapeMatching;

float processingLuminance(const in vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec4 processingSample(const in vec2 uv) {
  return texture2D(inputBuffer, clamp(uv, vec2(0.0), vec2(1.0)));
}

vec3 processingNeighborMean(const in vec2 uv, const in vec2 texel) {
  return (
    processingSample(uv + vec2(texel.x, 0.0)).rgb +
    processingSample(uv - vec2(texel.x, 0.0)).rgb +
    processingSample(uv + vec2(0.0, texel.y)).rgb +
    processingSample(uv - vec2(0.0, texel.y)).rgb
  ) * 0.25;
}

vec3 processingSpatialBlur(const in vec2 uv, const in vec2 texel, const in float radius) {
  vec2 nearOffset = texel * radius * 0.35;
  vec2 diagonalOffset = texel * radius * 0.7;
  vec2 farOffset = texel * radius;

  vec3 color = processingSample(uv).rgb * 0.25;
  color += processingSample(uv + vec2(nearOffset.x, 0.0)).rgb * 0.075;
  color += processingSample(uv - vec2(nearOffset.x, 0.0)).rgb * 0.075;
  color += processingSample(uv + vec2(0.0, nearOffset.y)).rgb * 0.075;
  color += processingSample(uv - vec2(0.0, nearOffset.y)).rgb * 0.075;
  color += processingSample(uv + diagonalOffset).rgb * 0.05;
  color += processingSample(uv - diagonalOffset).rgb * 0.05;
  color += processingSample(uv + vec2(diagonalOffset.x, -diagonalOffset.y)).rgb * 0.05;
  color += processingSample(uv + vec2(-diagonalOffset.x, diagonalOffset.y)).rgb * 0.05;
  color += processingSample(uv + vec2(farOffset.x, 0.0)).rgb * 0.0625;
  color += processingSample(uv - vec2(farOffset.x, 0.0)).rgb * 0.0625;
  color += processingSample(uv + vec2(0.0, farOffset.y)).rgb * 0.0625;
  color += processingSample(uv - vec2(0.0, farOffset.y)).rgb * 0.0625;
  return color;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 texel = 1.0 / max(u_processingResolution, vec2(1.0));
  vec4 center = processingSample(uv);
  vec3 neighborMean = processingNeighborMean(uv, texel);
  vec3 color = center.rgb;

  if (u_blurRadius > 0.0) {
    color = processingSpatialBlur(uv, texel, u_blurRadius);
  }

  color = clamp(color + (center.rgb - neighborMean) * u_edgeEnhance, 0.0, 1.0);

  if (u_brightnessMap <= 0.0) {
    color = vec3(0.0);
  } else {
    color = pow(max(color, vec3(0.0)), vec3(1.0 / u_brightnessMap));
  }

  color = mix(color, 1.0 - color, u_processingInvert);

  if (u_quantizeLevels >= 2.0) {
    float quantizeScale = u_quantizeLevels - 1.0;
    color = floor(color * quantizeScale + 0.5) / quantizeScale;
  }

  float centerLuma = processingLuminance(center.rgb);
  color = mix(color, vec3(step(0.5, centerLuma)), u_shapeMatching);

  outputColor = vec4(clamp(color, 0.0, 1.0), inputColor.a);
}
`

export function resolveStudioProcessingValues(
  controls: Record<string, GrainradControlValue> | undefined,
): StudioProcessingValues {
  return {
    invert: controls?.['processing-invert'] === true ? 1 : 0,
    brightnessMap: readClampedControl(
      controls?.['brightness-map'],
      STUDIO_PROCESSING_LIMITS.brightnessMap,
    ),
    edgeEnhance: readClampedControl(
      controls?.['edge-enhance'],
      STUDIO_PROCESSING_LIMITS.edgeEnhance,
    ),
    blurRadius: readClampedControl(
      controls?.blur,
      STUDIO_PROCESSING_LIMITS.blurRadius,
    ),
    quantizeLevels: resolveQuantizeLevels(controls?.['quantize-colors']),
    shapeMatching: readClampedControl(
      controls?.['shape-matching'],
      STUDIO_PROCESSING_LIMITS.shapeMatching,
    ),
  }
}

export class StudioProcessingEffect extends Effect {
  constructor(
    controls: Record<string, GrainradControlValue> | undefined = undefined,
    resolution = new Vector2(1, 1),
  ) {
    const values = resolveStudioProcessingValues(controls)
    const uniforms = new Map<string, Uniform>([
      ['u_processingResolution', new Uniform(new Vector2(1, 1))],
      ['u_processingInvert', new Uniform(values.invert)],
      ['u_brightnessMap', new Uniform(values.brightnessMap)],
      ['u_edgeEnhance', new Uniform(values.edgeEnhance)],
      ['u_blurRadius', new Uniform(values.blurRadius)],
      ['u_quantizeLevels', new Uniform(values.quantizeLevels)],
      ['u_shapeMatching', new Uniform(values.shapeMatching)],
    ])

    super('StudioProcessingEffect', STUDIO_PROCESSING_FRAGMENT_SHADER, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.SRC,
      uniforms,
    })

    this.setSize(resolution.x, resolution.y)
  }

  updateFromControls(
    controls: Record<string, GrainradControlValue> | undefined,
  ) {
    const values = resolveStudioProcessingValues(controls)
    this.uniforms.get('u_processingInvert')!.value = values.invert
    this.uniforms.get('u_brightnessMap')!.value = values.brightnessMap
    this.uniforms.get('u_edgeEnhance')!.value = values.edgeEnhance
    this.uniforms.get('u_blurRadius')!.value = values.blurRadius
    this.uniforms.get('u_quantizeLevels')!.value = values.quantizeLevels
    this.uniforms.get('u_shapeMatching')!.value = values.shapeMatching
  }

  override update(
    _renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget,
  ) {
    this.setSize(inputBuffer.width, inputBuffer.height)
  }

  override setSize(width: number, height: number) {
    const resolution = this.uniforms.get('u_processingResolution')!.value as Vector2
    resolution.set(safeDimension(width), safeDimension(height))
  }
}

function resolveQuantizeLevels(value: GrainradControlValue | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return STUDIO_PROCESSING_LIMITS.quantizeLevels.defaultValue
  }

  const strength = Math.min(
    Math.max(value, STUDIO_PROCESSING_LIMITS.quantizeLevels.min + 1),
    STUDIO_PROCESSING_LIMITS.quantizeLevels.max,
  )
  const maxLevels = STUDIO_PROCESSING_LIMITS.quantizeLevels.max
  const minLevels = 2
  const normalizedStrength = (strength - 1) / (maxLevels - 1)

  // The control is a strength value; map it logarithmically to effective levels.
  return Math.round(maxLevels * Math.pow(minLevels / maxLevels, normalizedStrength))
}

function readClampedControl(
  value: GrainradControlValue | undefined,
  limits: Readonly<{ min: number; max: number; defaultValue: number }>,
) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return limits.defaultValue
  }

  return Math.min(Math.max(value, limits.min), limits.max)
}

function safeDimension(value: number) {
  return Number.isFinite(value) ? Math.max(1, value) : 1
}
