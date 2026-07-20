import {
  Color,
  ShaderMaterial,
  Vector2,
  type Texture,
} from 'three'

export type DotsControlValue = string | number | boolean
export type DotsControls = Readonly<Record<string, DotsControlValue>>

export const DOTS_SHAPE_IDS = {
  circle: 0,
  square: 1,
  diamond: 2,
} as const

export const DOTS_GRID_IDS = {
  square: 0,
  hex: 1,
} as const

type CreateDotsShaderMaterialOptions = Readonly<{
  controls: DotsControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const DOTS_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const DOTS_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_sizeMultiplier;
uniform float u_spacing;
uniform float u_shape;
uniform float u_gridType;
uniform float u_brightness;
uniform float u_contrast;
uniform vec3 u_background;
uniform float u_colorMode;
uniform vec3 u_foreground;
uniform float u_invert;
uniform float u_time;
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

float dotsLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 applyDotsBrightnessContrast(vec3 color) {
  float contrastFactor = (1.0 + u_contrast) / (1.0 - u_contrast * 0.99);
  return clamp((color + u_brightness - 0.5) * contrastFactor + 0.5, 0.0, 1.0);
}

vec3 sampleDotsSource(vec2 sourceUv) {
  vec3 center = texture2D(u_sourceTexture, sourceUv).rgb;
  if (u_blur <= 0.0) {
    return center;
  }
  vec2 texel = 1.0 / max(u_sourceSize, vec2(1.0));
  vec2 blurTexel = texel * min(u_blur, 12.0);
  return (
    center * 4.0 +
    texture2D(u_sourceTexture, sourceUv + vec2(blurTexel.x, 0.0)).rgb +
    texture2D(u_sourceTexture, sourceUv - vec2(blurTexel.x, 0.0)).rgb +
    texture2D(u_sourceTexture, sourceUv + vec2(0.0, blurTexel.y)).rgb +
    texture2D(u_sourceTexture, sourceUv - vec2(0.0, blurTexel.y)).rgb
  ) / 8.0;
}

vec3 applyDotsProcessing(vec3 color, float sourceLuminance) {
  color = mix(color, 1.0 - color, u_processingInvert);
  color *= u_brightnessMap;
  color += length(fwidth(vec2(sourceLuminance))) * u_edgeEnhance * 8.0;
  if (u_quantizeColors > 0.0) {
    float levels = max(floor(u_quantizeColors + 0.5), 2.0);
    color = floor(color * (levels - 1.0) + 0.5) / (levels - 1.0);
  }
  color = mix(color, vec3(step(0.5, sourceLuminance)), u_shapeMatching);
  return clamp(color, 0.0, 1.0);
}

float dotsPostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyDotsPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (dotsPostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (dotsPostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec2 pixelPosition = v_uv * u_resolution;
  float baseSpacing = 8.0 * u_spacing;
  float dotRadius = baseSpacing * 0.4 * u_sizeMultiplier;
  vec2 cellCenter;

  if (u_gridType > 0.5) {
    float hexSpacingY = baseSpacing * 0.866;
    float row = floor(pixelPosition.y / hexSpacingY);
    bool oddRow = mod(row, 2.0) > 0.5;
    float xOffset = oddRow ? baseSpacing * 0.5 : 0.0;
    float cellX = floor((pixelPosition.x - xOffset) / baseSpacing);
    cellCenter = vec2(
      (cellX + 0.5) * baseSpacing + xOffset,
      (row + 0.5) * hexSpacingY
    );
  } else {
    vec2 cellPosition = floor(pixelPosition / baseSpacing);
    cellCenter = (cellPosition + 0.5) * baseSpacing;
  }

  vec2 cellUv = cellCenter / u_resolution;
  vec3 adjustedColor = applyDotsBrightnessContrast(
    sampleDotsSource(cellUv)
  );
  float cellLuminance = dotsLuminance(adjustedColor);
  if (u_invert > 0.5) {
    cellLuminance = 1.0 - cellLuminance;
  }

  vec2 localPosition = pixelPosition - cellCenter;
  vec2 absoluteLocal = abs(localPosition);
  float radius = dotRadius * (0.2 + cellLuminance * 0.8);
  float distanceSquared = dot(localPosition, localPosition);
  bool circleCheck = distanceSquared < radius * radius;
  bool squareCheck = max(absoluteLocal.x, absoluteLocal.y) < radius;
  bool diamondCheck = absoluteLocal.x + absoluteLocal.y < radius * 1.4;
  bool inShape = u_shape > 1.5
    ? diamondCheck
    : (u_shape > 0.5 ? squareCheck : circleCheck);

  vec3 modeColor = u_colorMode < 0.5 ? adjustedColor : vec3(cellLuminance);
  vec3 dotColor = u_colorMode > 0.5 ? u_foreground * cellLuminance : modeColor;
  vec3 dotsColor = inShape ? dotColor : u_background;
  dotsColor = applyDotsProcessing(dotsColor, dotsLuminance(adjustedColor));
  dotsColor = applyDotsPostProcessing(dotsColor, dotsLuminance(adjustedColor), v_uv);
  gl_FragColor = vec4(dotsColor, 1.0);
}
`

export function createDotsShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateDotsShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: DOTS_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_sizeMultiplier: { value: 1 },
      u_spacing: { value: 1 },
      u_shape: { value: DOTS_SHAPE_IDS.circle },
      u_gridType: { value: DOTS_GRID_IDS.square },
      u_brightness: { value: 0 },
      u_contrast: { value: 0 },
      u_background: { value: new Color('#000000') },
      u_colorMode: { value: 0 },
      u_foreground: { value: new Color('#ffffff') },
      u_invert: { value: 0 },
      u_time: { value: 0 },
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
    vertexShader: DOTS_VERTEX_SHADER,
  })

  applyDotsUniforms(material, controls)
  return material
}

export function applyDotsUniforms(material: ShaderMaterial, controls: DotsControls) {
  material.uniforms.u_sizeMultiplier.value = readNumber(controls.size, 1)
  material.uniforms.u_spacing.value = readNumber(controls.spacing, 1)
  material.uniforms.u_shape.value = readEnum(controls.shape, DOTS_SHAPE_IDS, 'circle')
  material.uniforms.u_gridType.value = readEnum(controls['grid-type'], DOTS_GRID_IDS, 'square')
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
  material.uniforms.u_background.value.set(readString(controls.background, '#000000'))
  material.uniforms.u_colorMode.value =
    readString(controls['color-mode'], 'mono') === 'original' ? 0 : 1
  material.uniforms.u_foreground.value.set(readString(controls.foreground, '#ffffff'))
  material.uniforms.u_invert.value = controls.invert === true ? 1 : 0
  material.uniforms.u_processingInvert.value = controls['processing-invert'] === true ? 1 : 0
  material.uniforms.u_brightnessMap.value = readNumber(controls['brightness-map'], 1)
  material.uniforms.u_edgeEnhance.value = readNumber(controls['edge-enhance'], 0)
  material.uniforms.u_blur.value = readNumber(controls.blur, 0)
  material.uniforms.u_quantizeColors.value = readNumber(controls['quantize-colors'], 0)
  material.uniforms.u_shapeMatching.value = readNumber(controls['shape-matching'], 0)
  material.uniforms.u_bloom.value = controls.bloom === true ? 1 : 0
  material.uniforms.u_postChromatic.value = controls.chromatic === true ? 1 : 0
  material.uniforms.u_scanlines.value = controls.scanlines === true ? 1 : 0
  material.uniforms.u_vignette.value = controls.vignette === true ? 1 : 0
  material.uniforms.u_crtCurve.value = controls['crt-curve'] === true ? 1 : 0
  material.uniforms.u_phosphor.value = controls.phosphor === true ? 1 : 0
}

export function disposeDotsShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}

function readNumber(value: DotsControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readString(value: DotsControlValue | undefined, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function readEnum<T extends Record<string, number>>(
  value: DotsControlValue | undefined,
  values: T,
  fallback: keyof T,
) {
  return typeof value === 'string' && value in values
    ? values[value as keyof T]
    : values[fallback]
}
