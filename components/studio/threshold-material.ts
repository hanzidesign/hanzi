import {
  Color,
  ShaderMaterial,
  Vector2,
  type Texture,
} from 'three'

import type { StudioControlValue } from './studio-effects'
import {
  readStudioBoolean as readBoolean,
  readStudioEnum as readEnum,
  readStudioNumber as readNumber,
  readStudioString as readString,
} from './studio-control-readers'

export type ThresholdControlValue = StudioControlValue
export type ThresholdControls = Readonly<Record<string, ThresholdControlValue>>

export const THRESHOLD_COLOR_MODE_IDS = {
  mono: 0,
  custom: 0,
  color: 1,
} as const

type CreateThresholdShaderMaterialOptions = Readonly<{
  controls: ThresholdControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const THRESHOLD_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const THRESHOLD_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_levels;
uniform float u_dither;
uniform float u_thresholdPoint;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_invert;
uniform vec3 u_foreground;
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

float thresholdLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 thresholdSourceSample(vec2 uv) {
  return texture2D(u_sourceTexture, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
}

vec3 thresholdBlurredSource(vec2 uv) {
  vec3 center = thresholdSourceSample(uv);
  if (u_blur <= 0.0) {
    return center;
  }
  vec2 blurTexel = min(u_blur, 12.0) / max(u_sourceSize, vec2(1.0));
  return (
    center * 4.0 +
    thresholdSourceSample(uv + vec2(blurTexel.x, 0.0)) +
    thresholdSourceSample(uv - vec2(blurTexel.x, 0.0)) +
    thresholdSourceSample(uv + vec2(0.0, blurTexel.y)) +
    thresholdSourceSample(uv - vec2(0.0, blurTexel.y))
  ) / 8.0;
}

vec3 applyThresholdProcessing(vec3 color, float sourceLuminance) {
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

float thresholdMatrixRowValue(vec4 row, float x) {
  if (x < 1.0) return row.x;
  if (x < 2.0) return row.y;
  if (x < 3.0) return row.z;
  return row.w;
}

float thresholdBayer4x4(vec2 pixel) {
  vec2 cell = mod(floor(pixel), 4.0);
  vec4 row0 = vec4(0.0, 8.0, 2.0, 10.0);
  vec4 row1 = vec4(12.0, 4.0, 14.0, 6.0);
  vec4 row2 = vec4(3.0, 11.0, 1.0, 9.0);
  vec4 row3 = vec4(15.0, 7.0, 13.0, 5.0);
  float matrixValue;
  if (cell.y < 1.0) {
    matrixValue = thresholdMatrixRowValue(row0, cell.x);
  } else if (cell.y < 2.0) {
    matrixValue = thresholdMatrixRowValue(row1, cell.x);
  } else if (cell.y < 3.0) {
    matrixValue = thresholdMatrixRowValue(row2, cell.x);
  } else {
    matrixValue = thresholdMatrixRowValue(row3, cell.x);
  }
  return matrixValue / 16.0;
}

float thresholdPostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyThresholdPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (thresholdPostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (thresholdPostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec3 sourceColor = thresholdBlurredSource(v_uv);
  vec3 adjustedColor = sourceColor + u_brightness;
  float contrastFactor = (1.0 + u_contrast) / (1.0 - 0.99 * u_contrast);
  adjustedColor = clamp((adjustedColor - 0.5) * contrastFactor + 0.5, 0.0, 1.0);

  vec3 ditheredColor = adjustedColor;
  if (u_dither > 0.5) {
    float bayerValue = thresholdBayer4x4(v_uv * u_resolution);
    ditheredColor += vec3((bayerValue - 0.5) * 0.1);
  }

  float levels = max(u_levels, 2.0);
  vec3 effectColor;
  if (levels <= 2.0) {
    bool isLight = thresholdLuminance(ditheredColor) > u_thresholdPoint;
    if (u_invert > 0.5) {
      isLight = !isLight;
    }
    if (u_colorMode > 0.5) {
      effectColor = isLight ? adjustedColor : vec3(0.0);
    } else {
      effectColor = isLight ? u_foreground : u_background;
    }
  } else {
    float levelScale = levels - 1.0;
    vec3 posterized = floor(ditheredColor * levelScale + 0.5) / levelScale;
    if (u_invert > 0.5) {
      posterized = 1.0 - posterized;
    }
    if (u_colorMode > 0.5) {
      effectColor = clamp(posterized, 0.0, 1.0);
    } else {
      effectColor = mix(u_background, u_foreground, thresholdLuminance(posterized));
    }
  }

  float effectLuminance = thresholdLuminance(effectColor);
  effectColor = applyThresholdProcessing(effectColor, effectLuminance);
  effectColor = applyThresholdPostProcessing(effectColor, effectLuminance, v_uv);
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createThresholdShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateThresholdShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: THRESHOLD_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_levels: { value: 2 },
      u_dither: { value: 0 },
      u_thresholdPoint: { value: 0.5 },
      u_brightness: { value: 0 },
      u_contrast: { value: 0 },
      u_invert: { value: 0 },
      u_foreground: { value: new Color('#ffffff') },
      u_background: { value: new Color('#000000') },
      u_colorMode: { value: THRESHOLD_COLOR_MODE_IDS.mono },
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
    vertexShader: THRESHOLD_VERTEX_SHADER,
  })

  applyThresholdUniforms(material, controls)
  return material
}

export function applyThresholdUniforms(
  material: ShaderMaterial,
  controls: ThresholdControls,
) {
  material.uniforms.u_levels.value = Math.max(2, readNumber(controls.levels, 2))
  material.uniforms.u_dither.value = readBoolean(controls.dither)
  material.uniforms.u_thresholdPoint.value = readNumber(controls['threshold-point'], 0.5)
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
  material.uniforms.u_invert.value = readBoolean(controls.invert)
  material.uniforms.u_foreground.value.set(readString(controls.foreground, '#ffffff'))
  material.uniforms.u_background.value.set(readString(controls.background, '#000000'))
  material.uniforms.u_colorMode.value = readEnum(
    controls['color-mode'],
    THRESHOLD_COLOR_MODE_IDS,
    'mono',
  )
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

export function disposeThresholdShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}
