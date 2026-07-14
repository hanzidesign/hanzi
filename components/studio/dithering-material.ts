import {
  Color,
  ShaderMaterial,
  Vector2,
  Vector3,
  type IUniform,
  type Texture,
} from 'three'

export type DitheringControlValue = string | number | boolean
export type DitheringControls = Readonly<Record<string, DitheringControlValue>>

export const DITHERING_ALGORITHM_IDS = {
  'floyd-steinberg': 0,
  atkinson: 1,
  'jarvis-judice-ninke': 2,
  stucki: 3,
  burkes: 4,
  sierra: 5,
  'sierra-two-row': 6,
  'sierra-lite': 7,
  'bayer-2x2': 8,
  'bayer-4x4': 9,
  'bayer-8x8': 10,
  'bayer-16x16': 11,
  'clustered-dot': 14,
  'blue-noise': 17,
  'interleaved-gradient': 19,
  crosshatch: 20,
} as const

const DITHERING_COLOR_MODE_IDS = {
  mono: 0,
  tonal: 1,
  palette: 2,
  rgb: 3,
  original: 4,
} as const

const DITHERING_MODULATION_TYPE_IDS = {
  wave: 0,
  grid: 1,
  radial: 2,
  horizontal: 3,
  'rgb-split': 4,
} as const

const DITHERING_PALETTE_IDS = {
  'gameboy-4': 0,
  'cga-16': 1,
  'nes-54': 2,
  'pico-8-16': 3,
  'c64-16': 4,
  'apple-ii-16': 5,
  'macintosh-16': 6,
  'sepia-5': 7,
  'cyberpunk-6': 8,
  'newspaper-2': 9,
  'risograph-5': 10,
  custom: 11,
} as const

const MAX_PALETTE_COLORS = 64

export type CreateDitheringShaderMaterialOptions = Readonly<{
  controls: DitheringControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const DITHERING_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const DITHERING_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_algorithm;
uniform float u_matrixSize;
uniform float u_intensity;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_gamma;
uniform float u_sharpen;
uniform float u_levels;
uniform float u_lineWeight;
uniform float u_lineSpacing;
uniform float u_layers;
uniform float u_modulationEnabled;
uniform float u_modulationType;
uniform float u_modFrequency;
uniform float u_modAmplitude;
uniform float u_colorMode;
uniform float u_paletteId;
uniform vec3 u_paletteColors[64];
uniform float u_paletteCount;
uniform vec3 u_foreground;
uniform vec3 u_background;
uniform float u_colorDepth;
uniform float u_chromaticEnabled;
uniform float u_maxDisplace;
uniform vec3 u_channelAngles;
uniform float u_time;
uniform float u_processingInvert;
uniform float u_brightnessMap;
uniform float u_edgeEnhance;
uniform float u_blur;
uniform float u_quantizeColors;
uniform float u_shapeMatching;
uniform float u_bloom;
uniform float u_grainIntensity;
uniform float u_grainSize;
uniform float u_grainSpeed;
uniform float u_postChromatic;
uniform float u_scanlines;
uniform float u_vignette;
uniform float u_crtCurve;
uniform float u_phosphor;
varying vec2 v_uv;

float bayerQuadrant(float xBit, float yBit) {
  if (yBit < 0.5) {
    return xBit < 0.5 ? 0.0 : 2.0;
  }
  return xBit < 0.5 ? 3.0 : 1.0;
}

float bayer8Threshold(vec2 cell) {
  vec2 wrapped = mod(cell, 8.0);
  float value =
    bayerQuadrant(floor(wrapped.x / 4.0), floor(wrapped.y / 4.0)) +
    4.0 * bayerQuadrant(floor(mod(wrapped.x / 2.0, 2.0)), floor(mod(wrapped.y / 2.0, 2.0))) +
    16.0 * bayerQuadrant(mod(wrapped.x, 2.0), mod(wrapped.y, 2.0));
  return value / 64.0;
}

float randomThreshold(vec2 pixel, float seed) {
  return fract(sin(dot(pixel + seed, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 channelOffset(float degrees) {
  float radians = degrees * 0.017453292519943295;
  return vec2(cos(radians), sin(radians)) * u_maxDisplace / max(u_sourceSize, vec2(1.0));
}

vec3 applyChromaticDisplacement(vec2 sourceUv) {
  if (u_chromaticEnabled < 0.5 || u_maxDisplace <= 0.0) {
    return texture2D(u_sourceTexture, sourceUv).rgb;
  }
  float red = texture2D(u_sourceTexture, sourceUv + channelOffset(u_channelAngles.x)).r;
  float green = texture2D(u_sourceTexture, sourceUv + channelOffset(u_channelAngles.y)).g;
  float blue = texture2D(u_sourceTexture, sourceUv + channelOffset(u_channelAngles.z)).b;
  return vec3(red, green, blue);
}

vec3 sampleSharpenedSource(vec2 sourceUv) {
  vec2 texel = 1.0 / max(u_sourceSize, vec2(1.0));
  vec3 center = applyChromaticDisplacement(sourceUv);
  if (u_blur > 0.0) {
    vec2 blurTexel = texel * min(u_blur, 12.0);
    center = (
      center * 4.0 +
      applyChromaticDisplacement(sourceUv + vec2(blurTexel.x, 0.0)) +
      applyChromaticDisplacement(sourceUv - vec2(blurTexel.x, 0.0)) +
      applyChromaticDisplacement(sourceUv + vec2(0.0, blurTexel.y)) +
      applyChromaticDisplacement(sourceUv - vec2(0.0, blurTexel.y))
    ) / 8.0;
  }
  vec3 neighbors =
    applyChromaticDisplacement(sourceUv + vec2(texel.x, 0.0)) +
    applyChromaticDisplacement(sourceUv - vec2(texel.x, 0.0)) +
    applyChromaticDisplacement(sourceUv + vec2(0.0, texel.y)) +
    applyChromaticDisplacement(sourceUv - vec2(0.0, texel.y));
  return clamp(center + (center * 4.0 - neighbors) * u_sharpen, 0.0, 1.0);
}

vec3 applySharedProcessing(vec3 color, float luminance) {
  color = mix(color, 1.0 - color, u_processingInvert);
  color *= u_brightnessMap;
  float edge = length(fwidth(vec2(luminance))) * u_edgeEnhance * 8.0;
  color += edge;
  if (u_quantizeColors > 0.0) {
    float quantizeLevels = max(u_quantizeColors, 2.0);
    color = floor(color * (quantizeLevels - 1.0) + 0.5) / (quantizeLevels - 1.0);
  }
  color = mix(color, vec3(step(0.5, luminance)), u_shapeMatching);
  return clamp(color, 0.0, 1.0);
}

float postNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applySharedPostProcessing(vec3 color, float luminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  float noiseScale = max(u_grainSize, 1.0);
  float movingTime = floor(u_time * (1.0 + u_grainSpeed * 0.1));
  color += (postNoise(floor(gl_FragCoord.xy / noiseScale) + movingTime) - 0.5) * (u_grainIntensity / 100.0);
  color += smoothstep(0.65, 1.0, luminance) * u_bloom * 0.24;
  color.r += (postNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (postNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

float adjustLuminance(float luminance) {
  float brightnessAdjusted = luminance + u_brightness / 100.0;
  float contrast = clamp(u_contrast / 100.0, -1.0, 1.0);
  float contrastFactor = (1.0 + contrast) / (1.0 - contrast * 0.99);
  float adjusted = clamp((brightnessAdjusted - 0.5) * contrastFactor + 0.5, 0.0, 1.0);
  adjusted = pow(adjusted, 1.0 / max(u_gamma, 0.0001));
  float blackPoint = max(0.0, (u_intensity - 1.0) * 0.5);
  float whitePoint = min(1.0, 1.0 + (u_intensity - 1.0) * 0.5);
  return clamp((adjusted - blackPoint) / max(whitePoint - blackPoint, 0.001), 0.0, 1.0);
}

float applyModulation(float luminance, vec2 pixel) {
  if (u_modulationEnabled < 0.5 || u_modAmplitude <= 0.0) {
    return luminance;
  }
  vec2 normalized = pixel / max(u_sourceSize, vec2(1.0));
  float frequency = max(u_modFrequency, 0.0001);
  float signal = sin(normalized.x * frequency * 6.2831853);
  if (u_modulationType > 0.5 && u_modulationType < 1.5) {
    signal = sin(normalized.x * frequency * 6.2831853) * sin(normalized.y * frequency * 6.2831853);
  } else if (u_modulationType > 1.5 && u_modulationType < 2.5) {
    signal = sin(length(normalized - 0.5) * frequency * 12.5663706);
  } else if (u_modulationType > 2.5 && u_modulationType < 3.5) {
    signal = sin(normalized.y * frequency * 6.2831853);
  } else if (u_modulationType > 3.5) {
    signal = sin((normalized.x - normalized.y) * frequency * 6.2831853);
  }
  return clamp(luminance + signal * u_modAmplitude * 0.1, 0.0, 1.0);
}

float crosshatch(float luminance, vec2 pixel) {
  float spacing = max(u_lineSpacing, 1.0);
  float lineWidth = max(u_lineWeight, 0.01);
  float ink = 0.0;
  for (int layer = 0; layer < 4; layer++) {
    if (float(layer) >= u_layers) {
      continue;
    }
    float angle = 0.78539816 + float(layer) * 1.5707963;
    vec2 direction = vec2(cos(angle), sin(angle));
    float line = abs(fract(dot(pixel, direction) / spacing) - 0.5);
    float layerGate = 1.0 - float(layer + 1) / max(u_layers + 1.0, 2.0);
    ink = max(ink, step(line, lineWidth * 0.08) * step(luminance, layerGate));
  }
  return 1.0 - ink;
}

float applyDitheringAlgorithm(float luminance, vec2 ditherCell) {
  float threshold = bayer8Threshold(ditherCell);
  if (u_algorithm < 8.0) {
    threshold = randomThreshold(ditherCell, u_algorithm * 17.0) * 0.75 + 0.125;
  } else if (abs(u_algorithm - 14.0) < 0.5) {
    vec2 centered = fract(ditherCell / 4.0) - 0.5;
    threshold = clamp(length(centered) * 1.4142, 0.0, 1.0);
  } else if (abs(u_algorithm - 17.0) < 0.5) {
    threshold = randomThreshold(ditherCell, 71.0);
  } else if (abs(u_algorithm - 19.0) < 0.5) {
    threshold = fract(52.9829189 * fract(dot(ditherCell, vec2(0.06711056, 0.00583715))));
  } else if (abs(u_algorithm - 20.0) < 0.5) {
    return crosshatch(luminance, ditherCell * u_matrixSize);
  }
  return step(threshold, luminance);
}

vec3 paletteColor(float luminance) {
  float paletteIndex = floor(clamp(luminance, 0.0, 0.999999) * max(u_paletteCount, 1.0));
  vec3 selected = u_paletteColors[0];
  for (int index = 0; index < 64; index++) {
    if (float(index) < u_paletteCount && abs(float(index) - paletteIndex) < 0.5) {
      selected = u_paletteColors[index];
    }
  }
  return selected;
}

vec3 applyColorMode(vec3 sourceColor, float luminance, float dithered, vec2 ditherCell) {
  if (u_colorMode < 0.5) {
    return mix(u_background, u_foreground, dithered);
  }
  if (u_colorMode < 1.5) {
    float tonal = floor(luminance * max(u_levels - 1.0, 1.0) + dithered) / max(u_levels - 1.0, 1.0);
    return mix(u_background, u_foreground, clamp(tonal, 0.0, 1.0));
  }
  if (u_colorMode < 2.5) {
    return paletteColor(luminance);
  }
  if (u_colorMode < 3.5) {
    float depth = max(u_colorDepth - 1.0, 1.0);
    vec3 quantized = floor(sourceColor * depth + vec3(
      applyDitheringAlgorithm(sourceColor.r, ditherCell),
      applyDitheringAlgorithm(sourceColor.g, ditherCell + vec2(3.0, 5.0)),
      applyDitheringAlgorithm(sourceColor.b, ditherCell + vec2(5.0, 3.0))
    )) / depth;
    return clamp(quantized, 0.0, 1.0);
  }
  return mix(u_background, sourceColor, dithered);
}

void main() {
  vec2 sourcePixel = floor(v_uv * u_sourceSize / u_matrixSize) * u_matrixSize;
  vec2 sourceUv = (sourcePixel + vec2(0.5)) / u_sourceSize;
  vec3 sourceColor = sampleSharpenedSource(sourceUv);
  float luminance = adjustLuminance(dot(sourceColor, vec3(0.299, 0.587, 0.114)));
  luminance = applyModulation(luminance, sourcePixel);
  vec2 ditherCell = floor(sourcePixel / u_matrixSize);
  float dithered = applyDitheringAlgorithm(luminance, ditherCell);
  vec3 color = applyColorMode(sourceColor, luminance, dithered, ditherCell);
  color = applySharedProcessing(color, luminance);
  color = applySharedPostProcessing(color, luminance, v_uv);
  gl_FragColor = vec4(color, 1.0);
}
`

export function createDitheringShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateDitheringShaderMaterialOptions) {
  const material = new ShaderMaterial({
    fragmentShader: DITHERING_FRAGMENT_SHADER,
    uniforms: {
      u_algorithm: { value: DITHERING_ALGORITHM_IDS['bayer-8x8'] },
      u_brightness: { value: 0 },
      u_contrast: { value: 0 },
      u_gamma: { value: 1 },
      u_intensity: { value: 1 },
      u_levels: { value: 2 },
      u_lineWeight: { value: 0.5 },
      u_lineSpacing: { value: 10 },
      u_layers: { value: 2 },
      u_matrixSize: { value: 4 },
      u_modulationEnabled: { value: 0 },
      u_modulationType: { value: 0 },
      u_modFrequency: { value: 5 },
      u_modAmplitude: { value: 0.1 },
      u_sharpen: { value: 0 },
      u_colorMode: { value: 0 },
      u_paletteId: { value: 0 },
      u_paletteColors: { value: createPaletteUniform('#9bbc0f,#8bac0f,#306230,#0f380f') },
      u_paletteCount: { value: 4 },
      u_foreground: { value: new Color('#ffffff') },
      u_background: { value: new Color('#000000') },
      u_colorDepth: { value: 2 },
      u_chromaticEnabled: { value: 0 },
      u_maxDisplace: { value: 6 },
      u_channelAngles: { value: new Vector3(23, 50, 80) },
      u_time: { value: 0 },
      u_processingInvert: { value: 0 },
      u_brightnessMap: { value: 1 },
      u_edgeEnhance: { value: 0 },
      u_blur: { value: 0 },
      u_quantizeColors: { value: 0 },
      u_shapeMatching: { value: 0 },
      u_bloom: { value: 0 },
      u_grainIntensity: { value: 0 },
      u_grainSize: { value: 2 },
      u_grainSpeed: { value: 50 },
      u_postChromatic: { value: 0 },
      u_scanlines: { value: 0 },
      u_vignette: { value: 0 },
      u_crtCurve: { value: 0 },
      u_phosphor: { value: 0 },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_sourceTexture: { value: sourceTexture },
    } satisfies Record<string, IUniform>,
    vertexShader: DITHERING_VERTEX_SHADER,
  })

  applyDitheringUniforms(material, controls)
  return material
}

function resolveAlgorithm(value: DitheringControlValue | undefined) {
  if (typeof value !== 'string') {
    return DITHERING_ALGORITHM_IDS['bayer-8x8']
  }

  return DITHERING_ALGORITHM_IDS[value as keyof typeof DITHERING_ALGORITHM_IDS]
    ?? DITHERING_ALGORITHM_IDS['bayer-8x8']
}

export function applyDitheringUniforms(
  material: ShaderMaterial,
  controls: DitheringControls,
) {
  material.uniforms.u_algorithm.value = resolveAlgorithm(controls.algorithm)
  material.uniforms.u_intensity.value = readNumber(controls.intensity, 1)
  material.uniforms.u_levels.value = readNumber(controls.levels, 2)
  material.uniforms.u_matrixSize.value = readMatrixSize(controls['matrix-size'])
  material.uniforms.u_lineWeight.value = readNumber(controls['line-weight'], 0.5)
  material.uniforms.u_lineSpacing.value = readNumber(controls['line-spacing'], 10)
  material.uniforms.u_layers.value = readNumber(controls.layers, 2)
  material.uniforms.u_modulationEnabled.value = readBoolean(controls.modulation)
  material.uniforms.u_modulationType.value = readId(
    controls['mod-type'],
    DITHERING_MODULATION_TYPE_IDS,
    'wave',
  )
  material.uniforms.u_modFrequency.value = readNumber(controls['mod-frequency'], 5)
  material.uniforms.u_modAmplitude.value = readNumber(controls['mod-amplitude'], 0.1)
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0)
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0)
  material.uniforms.u_gamma.value = readNumber(controls.gamma, 1)
  material.uniforms.u_sharpen.value = readNumber(controls.sharpen, 0)
  material.uniforms.u_colorMode.value = readId(
    controls['color-mode'],
    DITHERING_COLOR_MODE_IDS,
    'mono',
  )
  const paletteName = readString(controls.palette, 'gameboy-4')
  material.uniforms.u_paletteId.value = readId(
    paletteName,
    DITHERING_PALETTE_IDS,
    'gameboy-4',
  )
  const palette = resolvePalette(paletteName, controls['custom-palette'])
  material.uniforms.u_paletteColors.value = createPaletteUniform(palette.join(','))
  material.uniforms.u_paletteCount.value = palette.length
  material.uniforms.u_foreground.value.set(readString(controls.foreground, '#ffffff'))
  material.uniforms.u_background.value.set(readString(controls.background, '#000000'))
  material.uniforms.u_colorDepth.value = readNumber(controls['color-depth'], 2)
  material.uniforms.u_chromaticEnabled.value = readBoolean(controls['chromatic-enabled'])
  material.uniforms.u_maxDisplace.value = readNumber(controls['max-displace'], 6)
  material.uniforms.u_channelAngles.value.set(
    readNumber(controls['red-channel'], 23),
    readNumber(controls['green-channel'], 50),
    readNumber(controls['blue-channel'], 80),
  )
  material.uniforms.u_processingInvert.value = readBoolean(controls['processing-invert'])
  material.uniforms.u_brightnessMap.value = readNumber(controls['brightness-map'], 1)
  material.uniforms.u_edgeEnhance.value = readNumber(controls['edge-enhance'], 0)
  material.uniforms.u_blur.value = readNumber(controls.blur, 0)
  material.uniforms.u_quantizeColors.value = readNumber(controls['quantize-colors'], 0)
  material.uniforms.u_shapeMatching.value = readNumber(controls['shape-matching'], 0)
  material.uniforms.u_bloom.value = readBoolean(controls.bloom)
  material.uniforms.u_grainIntensity.value = readNumber(controls['grain-intensity'], 0)
  material.uniforms.u_grainSize.value = readNumber(controls['grain-size'], 2)
  material.uniforms.u_grainSpeed.value = readNumber(controls['grain-speed'], 50)
  material.uniforms.u_postChromatic.value = readBoolean(controls.chromatic)
  material.uniforms.u_scanlines.value = readBoolean(controls.scanlines)
  material.uniforms.u_vignette.value = readBoolean(controls.vignette)
  material.uniforms.u_crtCurve.value = readBoolean(controls['crt-curve'])
  material.uniforms.u_phosphor.value = readBoolean(controls.phosphor)
}

function readNumber(value: DitheringControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readMatrixSize(value: DitheringControlValue | undefined) {
  const parsed = typeof value === 'string' ? Number(value) : value
  return parsed === 2 || parsed === 4 || parsed === 8 || parsed === 16 ? parsed : 4
}

function readBoolean(value: DitheringControlValue | undefined) {
  return value === true ? 1 : 0
}

function readString(value: DitheringControlValue | undefined, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function readId<T extends string>(
  value: DitheringControlValue | undefined,
  ids: Record<T, number>,
  fallback: T,
) {
  return typeof value === 'string' && value in ids ? ids[value as T] : ids[fallback]
}

const PALETTES: Record<string, readonly string[]> = {
  'gameboy-4': ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'],
  'cga-16': ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa', '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'],
  'nes-54': ['#000000', '#001e74', '#081090', '#300088', '#440064', '#5c0030', '#540400', '#3c1800', '#202a00', '#083a00', '#004000', '#003c00', '#00323c', '#000000', '#000000', '#000000', '#989698', '#084cc4', '#3032ec', '#5c1ee4', '#8814b0', '#a01464', '#982220', '#783c00', '#545a00', '#287200', '#087c00', '#007628', '#006678', '#000000', '#000000', '#000000', '#eceeec', '#4c9aec', '#787cec', '#b062ec', '#e454ec', '#ec58b4', '#ec6a64', '#d48820', '#a0aa00', '#74c400', '#4cd020', '#38cc6c', '#38b4cc', '#3c3c3c', '#000000', '#000000', '#eceeec', '#a8ccec', '#bcbcec', '#d4b2ec', '#ecaeec', '#ecaed4'],
  'pico-8-16': ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'],
  'c64-16': ['#000000', '#ffffff', '#880000', '#aaffee', '#cc44cc', '#00cc55', '#0000aa', '#eeee77', '#dd8855', '#664400', '#ff7777', '#333333', '#777777', '#aaff66', '#0088ff', '#bbbbbb'],
  'apple-ii-16': ['#000000', '#9d0966', '#2a2aa5', '#c734ff', '#006d25', '#808080', '#0d97ff', '#bfbfff', '#6b4f00', '#ff6400', '#a0a0a0', '#ff99cc', '#14f53c', '#d0d000', '#72ffd0', '#ffffff'],
  'macintosh-16': ['#ffffff', '#fcf305', '#ff6402', '#dd0806', '#f20884', '#4600a5', '#0000d4', '#02abea', '#1fb714', '#006411', '#562c05', '#90713a', '#c0c0c0', '#808080', '#404040', '#000000'],
  'sepia-5': ['#1b1009', '#54351f', '#8c6239', '#c69c6d', '#f0dfc2'],
  'cyberpunk-6': ['#05001a', '#2b0a3d', '#7b2cbf', '#00f5d4', '#f15bb5', '#fee440'],
  'newspaper-2': ['#111111', '#f5f2e8'],
  'risograph-5': ['#211a1d', '#ff665e', '#ffb000', '#0078bf', '#f7f2df'],
}

function resolvePalette(name: string, customValue: DitheringControlValue | undefined) {
  if (name === 'custom') {
    const custom = parseCustomPalette(customValue)
    if (custom.length > 0) {
      return custom
    }
  }

  return [...(PALETTES[name] ?? PALETTES['gameboy-4'])]
}

function parseCustomPalette(value: DitheringControlValue | undefined) {
  if (typeof value !== 'string') {
    return []
  }

  return value
    .split(/[\s,;]+/)
    .filter((candidate) => /^#[\da-f]{6}$/i.test(candidate))
    .slice(0, MAX_PALETTE_COLORS)
}

function createPaletteUniform(colors: string) {
  const palette = colors.split(',').filter(Boolean).map((value) => new Color(value))
  return Array.from({ length: MAX_PALETTE_COLORS }, (_, index) => {
    const color = palette[Math.min(index, palette.length - 1)] ?? new Color('#000000')
    return new Vector3(color.r, color.g, color.b)
  })
}
