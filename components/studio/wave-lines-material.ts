import { Color, ShaderMaterial, Vector2, type Texture } from 'three'

export type WaveLinesControlValue = string | number | boolean
export type WaveLinesControls = Readonly<Record<string, WaveLinesControlValue>>

export const WAVE_LINES_DIRECTION_IDS = {
  horizontal: 0,
  vertical: 1,
} as const

export const WAVE_LINES_COLOR_MODE_IDS = {
  original: 0,
  mono: 1,
  custom: 1,
} as const

export type CreateWaveLinesShaderMaterialOptions = Readonly<{
  controls: WaveLinesControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const WAVE_LINES_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const WAVE_LINES_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_lineCount;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_time;
uniform float u_direction;
uniform float u_lineThickness;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_colorMode;
uniform vec3 u_lineColor;
uniform vec3 u_background;
uniform float u_animate;
uniform float u_processingInvert;
uniform float u_brightnessMap;
uniform float u_edgeEnhance;
uniform float u_blur;
uniform float u_quantizeColors;
uniform float u_shapeMatching;
uniform float u_bloom;
uniform float u_postChromatic;
uniform float u_scanlines;
uniform float u_vignette;
uniform float u_crtCurve;
uniform float u_phosphor;
varying vec2 v_uv;

const float WAVE_LINES_TWO_PI = 6.28318530718;

float waveLinesLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 applyWaveLinesBrightnessContrast(vec3 color) {
  vec3 result = color + vec3(u_brightness);
  float contrastFactor = (1.0 + u_contrast) / (1.0 - 0.99 * u_contrast);
  return clamp((result - 0.5) * contrastFactor + 0.5, 0.0, 1.0);
}

vec3 waveLinesSourceSample(vec2 uv) {
  return texture2D(u_sourceTexture, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
}

vec3 waveLinesBlurredSource(vec2 uv) {
  vec3 center = waveLinesSourceSample(uv);
  if (u_blur <= 0.0) {
    return center;
  }
  vec2 blurTexel = min(u_blur, 12.0) / max(u_sourceSize, vec2(1.0));
  return (
    center * 4.0 +
    waveLinesSourceSample(uv + vec2(blurTexel.x, 0.0)) +
    waveLinesSourceSample(uv - vec2(blurTexel.x, 0.0)) +
    waveLinesSourceSample(uv + vec2(0.0, blurTexel.y)) +
    waveLinesSourceSample(uv - vec2(0.0, blurTexel.y))
  ) / 8.0;
}

vec3 applyWaveLinesProcessing(vec3 color, float sourceLuminance) {
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

float waveLinesPostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyWaveLinesPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (waveLinesPostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (waveLinesPostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec3 sourceColor = waveLinesBlurredSource(v_uv);
  vec3 adjustedColor = applyWaveLinesBrightnessContrast(clamp(sourceColor, 0.0, 1.0));
  float luminanceValue = waveLinesLuminance(adjustedColor);
  float animTime = u_animate > 0.5 ? u_time : 0.0;
  vec2 pixelPosition = v_uv * u_resolution;

  float spacing;
  float lineIndex;
  float phase;
  float offset;
  float center;
  float distanceToLine;
  if (u_direction < 0.5) {
    spacing = u_resolution.y / u_lineCount;
    lineIndex = floor(pixelPosition.y / spacing);
    phase = (pixelPosition.x / u_resolution.x) * WAVE_LINES_TWO_PI * u_frequency;
    offset = sin(phase + animTime) * u_amplitude * luminanceValue;
    center = (lineIndex + 0.5) * spacing + offset;
    distanceToLine = abs(pixelPosition.y - center);
  } else {
    spacing = u_resolution.x / u_lineCount;
    lineIndex = floor(pixelPosition.x / spacing);
    phase = (pixelPosition.y / u_resolution.y) * WAVE_LINES_TWO_PI * u_frequency;
    offset = sin(phase + animTime) * u_amplitude * luminanceValue;
    center = (lineIndex + 0.5) * spacing + offset;
    distanceToLine = abs(pixelPosition.x - center);
  }

  float halfWidth = spacing * u_lineThickness * luminanceValue;
  bool isLine = distanceToLine < halfWidth;
  vec3 linePixelColor = u_colorMode > 0.5 ? u_lineColor : adjustedColor;
  vec3 effectColor = isLine ? linePixelColor : u_background;
  effectColor = applyWaveLinesProcessing(effectColor, waveLinesLuminance(effectColor));
  effectColor = applyWaveLinesPostProcessing(effectColor, luminanceValue, v_uv);
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createWaveLinesShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateWaveLinesShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: WAVE_LINES_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_lineCount: { value: 50 },
      u_amplitude: { value: 20 },
      u_frequency: { value: 1 },
      u_time: { value: 0 },
      u_direction: { value: WAVE_LINES_DIRECTION_IDS.horizontal },
      u_lineThickness: { value: 0.4 },
      u_brightness: { value: 0 },
      u_contrast: { value: 0 },
      u_colorMode: { value: WAVE_LINES_COLOR_MODE_IDS.mono },
      u_lineColor: { value: new Color('#ffffff') },
      u_background: { value: new Color('#000000') },
      u_animate: { value: 1 },
      u_processingInvert: { value: 0 },
      u_brightnessMap: { value: 1 },
      u_edgeEnhance: { value: 0 },
      u_blur: { value: 0 },
      u_quantizeColors: { value: 0 },
      u_shapeMatching: { value: 0 },
      u_bloom: { value: 0 },
      u_postChromatic: { value: 0 },
      u_scanlines: { value: 0 },
      u_vignette: { value: 0 },
      u_crtCurve: { value: 0 },
      u_phosphor: { value: 0 },
    },
    vertexShader: WAVE_LINES_VERTEX_SHADER,
  })

  applyWaveLinesUniforms(material, controls)
  return material
}

export function applyWaveLinesUniforms(
  material: ShaderMaterial,
  controls: WaveLinesControls,
) {
  material.uniforms.u_lineCount.value = readNumber(controls['line-count'], 50)
  material.uniforms.u_amplitude.value = readNumber(controls.amplitude, 20)
  material.uniforms.u_frequency.value = readNumber(controls.frequency, 1)
  material.uniforms.u_direction.value = readEnum(
    controls.direction,
    WAVE_LINES_DIRECTION_IDS,
    'horizontal',
  )
  material.uniforms.u_lineThickness.value = readNumber(controls['line-thickness'], 0.4)
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
  material.uniforms.u_colorMode.value = readEnum(
    controls['color-mode'],
    WAVE_LINES_COLOR_MODE_IDS,
    'mono',
  )
  material.uniforms.u_lineColor.value.set(readString(controls['line-color'], '#ffffff'))
  material.uniforms.u_background.value.set(readString(controls.background, '#000000'))
  material.uniforms.u_animate.value = controls.animate === false ? 0 : 1
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

export function disposeWaveLinesShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}

function readNumber(value: WaveLinesControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readString(value: WaveLinesControlValue | undefined, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function readBoolean(value: WaveLinesControlValue | undefined) {
  return value === true ? 1 : 0
}

function readEnum<T extends Record<string, number>>(
  value: WaveLinesControlValue | undefined,
  values: T,
  fallback: keyof T,
) {
  return typeof value === 'string' && value in values
    ? values[value as keyof T]
    : values[fallback]
}
