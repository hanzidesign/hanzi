import { Color, ShaderMaterial, Vector2, type Texture } from 'three'

import type { StudioControlValue } from './studio-effects'
import {
  readStudioBoolean as readBoolean,
  readStudioEnum as readEnum,
  readStudioNumber as readNumber,
  readStudioString as readString,
} from './studio-control-readers'

export type EdgeDetectionControlValue = StudioControlValue
export type EdgeDetectionControls = Readonly<Record<string, EdgeDetectionControlValue>>

export const EDGE_DETECTION_ALGORITHM_IDS = { sobel: 0, prewitt: 1, laplacian: 2 } as const
export const EDGE_DETECTION_COLOR_MODE_IDS = { mono: 0, custom: 0, original: 1 } as const

type CreateOptions = Readonly<{
  controls: EdgeDetectionControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const EDGE_DETECTION_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const EDGE_DETECTION_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_lineWidth;
uniform float u_invert;
uniform float u_algorithm;
uniform float u_brightness;
uniform float u_contrast;
uniform vec3 u_edgeColor;
uniform vec3 u_background;
uniform float u_colorMode;
uniform float u_processingInvert;
uniform float u_brightnessMap;
uniform float u_edgeEnhance;
uniform float u_blur;
uniform float u_quantizeColors;
uniform float u_shapeMatching;
uniform float u_time;
uniform float u_bloom;
uniform float u_postChromatic;
uniform float u_scanlines;
uniform float u_vignette;
uniform float u_crtCurve;
uniform float u_phosphor;
varying vec2 v_uv;

vec3 edgeSourceSample(vec2 uv) {
  return texture2D(u_sourceTexture, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
}

vec3 edgeAdjustedSample(vec2 uv) {
  vec3 color = edgeSourceSample(uv);
  if (u_blur > 0.0) {
    vec2 blurTexel = min(u_blur, 12.0) / max(u_sourceSize, vec2(1.0));
    color = (
      color * 4.0 +
      edgeSourceSample(uv + vec2(blurTexel.x, 0.0)) +
      edgeSourceSample(uv - vec2(blurTexel.x, 0.0)) +
      edgeSourceSample(uv + vec2(0.0, blurTexel.y)) +
      edgeSourceSample(uv - vec2(0.0, blurTexel.y))
    ) / 8.0;
  }
  color += u_brightness;
  float factor = (1.0 + u_contrast) / (1.0 - 0.99 * u_contrast);
  return clamp((color - 0.5) * factor + 0.5, 0.0, 1.0);
}

float edgeLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 applyEdgeDetectionProcessing(vec3 color, float sourceLuminance) {
  color = mix(color, 1.0 - color, u_processingInvert);
  color *= u_brightnessMap;
  color += length(fwidth(vec2(sourceLuminance))) * u_edgeEnhance * 8.0;
  if (u_quantizeColors >= 1.0) {
    float quantizeLevels = max(u_quantizeColors, 2.0);
    float quantizeScale = quantizeLevels - 1.0;
    color = floor(color * quantizeScale + 0.5) / quantizeScale;
  }
  color = mix(color, vec3(step(0.5, sourceLuminance)), u_shapeMatching);
  return clamp(color, 0.0, 1.0);
}

float edgeGaussianLuminance(vec2 uv, vec2 stepSize) {
  float result = 0.0;
  result += edgeLuminance(edgeAdjustedSample(uv + vec2(-stepSize.x, -stepSize.y))) * 0.0625;
  result += edgeLuminance(edgeAdjustedSample(uv + vec2(0.0, -stepSize.y))) * 0.125;
  result += edgeLuminance(edgeAdjustedSample(uv + vec2(stepSize.x, -stepSize.y))) * 0.0625;
  result += edgeLuminance(edgeAdjustedSample(uv + vec2(-stepSize.x, 0.0))) * 0.125;
  result += edgeLuminance(edgeAdjustedSample(uv)) * 0.25;
  result += edgeLuminance(edgeAdjustedSample(uv + vec2(stepSize.x, 0.0))) * 0.125;
  result += edgeLuminance(edgeAdjustedSample(uv + vec2(-stepSize.x, stepSize.y))) * 0.0625;
  result += edgeLuminance(edgeAdjustedSample(uv + vec2(0.0, stepSize.y))) * 0.125;
  result += edgeLuminance(edgeAdjustedSample(uv + stepSize)) * 0.0625;
  return result;
}

float edgeDetector(vec2 uv, vec2 stepSize, float algorithm) {
  float tl = edgeGaussianLuminance(uv + vec2(-stepSize.x, -stepSize.y), stepSize);
  float tc = edgeGaussianLuminance(uv + vec2(0.0, -stepSize.y), stepSize);
  float tr = edgeGaussianLuminance(uv + vec2(stepSize.x, -stepSize.y), stepSize);
  float ml = edgeGaussianLuminance(uv + vec2(-stepSize.x, 0.0), stepSize);
  float mc = edgeGaussianLuminance(uv, stepSize);
  float mr = edgeGaussianLuminance(uv + vec2(stepSize.x, 0.0), stepSize);
  float bl = edgeGaussianLuminance(uv + vec2(-stepSize.x, stepSize.y), stepSize);
  float bc = edgeGaussianLuminance(uv + vec2(0.0, stepSize.y), stepSize);
  float br = edgeGaussianLuminance(uv + stepSize, stepSize);
  if (algorithm > 1.5) {
    return abs(mc * 8.0 - (tl + tc + tr + ml + mr + bl + bc + br));
  }
  float middleWeight = algorithm > 0.5 ? 1.0 : 2.0;
  float gx = -tl - middleWeight * ml - bl + tr + middleWeight * mr + br;
  float gy = -tl - middleWeight * tc - tr + bl + middleWeight * bc + br;
  return length(vec2(gx, gy));
}

float edgePostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyEdgeDetectionPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (edgePostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (edgePostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec2 pixelSize = vec2(u_lineWidth) / u_resolution;
  float coarseEdge = edgeDetector(v_uv, pixelSize, u_algorithm);
  float fineAlgorithm = u_algorithm > 1.5 ? 2.0 : 0.0;
  float fineEdge = edgeDetector(v_uv, pixelSize * 0.5, fineAlgorithm);
  float combinedEdge = max(coarseEdge, fineEdge * 0.7);
  float softness = u_threshold * 0.3;
  float mask = smoothstep(u_threshold - softness, u_threshold + softness, combinedEdge);
  if (u_invert > 0.5) mask = 1.0 - mask;
  vec3 processedOriginal = edgeAdjustedSample(v_uv);
  vec3 foreground = u_colorMode > 0.5 ? processedOriginal : u_edgeColor;
  vec3 effectColor = mix(u_background, foreground, mask);
  float effectLuminance = edgeLuminance(effectColor);
  effectColor = applyEdgeDetectionProcessing(effectColor, effectLuminance);
  effectColor = applyEdgeDetectionPostProcessing(effectColor, effectLuminance, v_uv);
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createEdgeDetectionShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    vertexShader: EDGE_DETECTION_VERTEX_SHADER,
    fragmentShader: EDGE_DETECTION_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_threshold: { value: 0.3 },
      u_lineWidth: { value: 1 },
      u_invert: { value: 0 },
      u_algorithm: { value: 0 },
      u_brightness: { value: 0 },
      u_contrast: { value: 0 },
      u_edgeColor: { value: new Color('#ffffff') },
      u_background: { value: new Color('#000000') },
      u_colorMode: { value: 0 },
      u_processingInvert: { value: 0 },
      u_brightnessMap: { value: 1 },
      u_edgeEnhance: { value: 0 },
      u_blur: { value: 0 },
      u_quantizeColors: { value: 0 },
      u_shapeMatching: { value: 0 },
      u_time: { value: 0 },
      u_bloom: { value: 0 },
      u_postChromatic: { value: 0 },
      u_scanlines: { value: 0 },
      u_vignette: { value: 0 },
      u_crtCurve: { value: 0 },
      u_phosphor: { value: 0 },
    },
  })
  applyEdgeDetectionUniforms(material, controls)
  return material
}

export function applyEdgeDetectionUniforms(material: ShaderMaterial, controls: EdgeDetectionControls) {
  material.uniforms.u_algorithm.value = readEnum(controls.algorithm, EDGE_DETECTION_ALGORITHM_IDS, 'sobel')
  material.uniforms.u_threshold.value = readNumber(controls.threshold, 0.3)
  material.uniforms.u_lineWidth.value = readNumber(controls['line-width'], 1)
  material.uniforms.u_invert.value = readBoolean(controls.invert)
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
  material.uniforms.u_edgeColor.value.set(readString(controls['edge-color'], '#ffffff'))
  material.uniforms.u_background.value.set(readString(controls.background, '#000000'))
  material.uniforms.u_colorMode.value = readEnum(controls['color-mode'], EDGE_DETECTION_COLOR_MODE_IDS, 'mono')
  material.uniforms.u_processingInvert.value = readBoolean(controls['processing-invert'])
  material.uniforms.u_brightnessMap.value = readNumber(controls['brightness-map'], 1)
  material.uniforms.u_edgeEnhance.value = readNumber(controls['edge-enhance'], 0)
  material.uniforms.u_blur.value = readNumber(controls.blur, 0)
  material.uniforms.u_quantizeColors.value = readNumber(controls['quantize-colors'], 0)
  material.uniforms.u_shapeMatching.value = readNumber(controls['shape-matching'], 0)
  material.uniforms.u_bloom.value = readBoolean(controls.bloom)
  material.uniforms.u_postChromatic.value = readBoolean(controls.chromatic)
  material.uniforms.u_scanlines.value = readBoolean(controls.scanlines)
  material.uniforms.u_vignette.value = readBoolean(controls.vignette)
  material.uniforms.u_crtCurve.value = readBoolean(controls['crt-curve'])
  material.uniforms.u_phosphor.value = readBoolean(controls.phosphor)
}

export function disposeEdgeDetectionShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}
