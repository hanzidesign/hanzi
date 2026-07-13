import {
  Color,
  ShaderMaterial,
  Vector2,
  type Texture,
} from 'three'

export type HalftoneControlValue = string | number | boolean
export type HalftoneControls = Readonly<Record<string, HalftoneControlValue>>

export type CreateHalftoneShaderMaterialOptions = Readonly<{
  controls: HalftoneControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const HALFTONE_SHAPE_IDS = {
  circle: 0,
  square: 1,
  diamond: 2,
  line: 3,
} as const

export const HALFTONE_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const HALFTONE_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_dotScale;
uniform float u_spacing;
uniform float u_angle;
uniform float u_shape;
uniform float u_invert;
uniform float u_colorMode;
uniform vec3 u_foreground;
uniform vec3 u_background;
uniform float u_brightness;
uniform float u_contrast;
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

vec3 mod289(vec3 value) {
  return value - floor(value * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 value) {
  return value - floor(value * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 value) {
  return mod289(((value * 34.0) + 1.0) * value);
}

float simplexNoise(vec2 value) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
    -0.577350269189626,
    0.024390243902439
  );
  vec2 lattice = floor(value + dot(value, C.yy));
  vec2 x0 = value - lattice + dot(lattice, C.xx);
  vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  lattice = mod289(lattice);
  vec3 p = permute(
    permute(lattice.y + vec3(0.0, i1.y, 1.0)) +
    lattice.x + vec3(0.0, i1.x, 1.0)
  );
  vec3 m = max(
    vec3(0.5) - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)),
    vec3(0.0)
  );
  m *= m;
  m *= m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 gradient = vec3(
    a0.x * x0.x + h.x * x0.y,
    a0.y * x12.x + h.y * x12.y,
    a0.z * x12.z + h.z * x12.w
  );
  return 130.0 * dot(m, gradient);
}

float antiAliasedStep(float threshold, float value) {
  float width = 0.7 * length(vec2(dFdx(value), dFdy(value)));
  return smoothstep(threshold - width, threshold + width, value);
}

float halftoneLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 sampleHalftoneSource(vec2 sourceUv) {
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

vec3 applySharedProcessing(vec3 color, float sourceLuminance) {
  color = mix(color, 1.0 - color, u_processingInvert);
  color *= u_brightnessMap;
  float edge = length(fwidth(vec2(sourceLuminance))) * u_edgeEnhance * 8.0;
  color += edge;
  if (u_quantizeColors > 1.0) {
    color = floor(color * (u_quantizeColors - 1.0) + 0.5) / (u_quantizeColors - 1.0);
  }
  color = mix(color, vec3(step(0.5, sourceLuminance)), u_shapeMatching);
  return clamp(color, 0.0, 1.0);
}

float postNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applySharedPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  float noiseScale = max(u_grainSize, 1.0);
  float movingTime = floor(u_time * (1.0 + u_grainSpeed * 0.1));
  color += (postNoise(floor(gl_FragCoord.xy / noiseScale) + movingTime) - 0.5) * (u_grainIntensity / 100.0);
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (postNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (postNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

vec3 applyBrightnessContrast(vec3 color) {
  float contrastFactor = (1.0 + u_contrast) / (1.0 - u_contrast * 0.99);
  return clamp((color + u_brightness - 0.5) * contrastFactor + 0.5, 0.0, 1.0);
}

float halftonePattern(vec2 fragmentCoordinate, float value) {
  float radians = u_angle * 0.017453292519943295;
  float sine = sin(radians);
  float cosine = cos(radians);
  vec2 rotated = vec2(
    fragmentCoordinate.x * cosine - fragmentCoordinate.y * sine,
    fragmentCoordinate.x * sine + fragmentCoordinate.y * cosine
  );
  vec2 nearest = rotated / max(u_spacing, 0.0001);
  nearest = nearest - floor(nearest) - 0.5;
  float distanceToCenter;
  if (u_shape < 0.5) {
    distanceToCenter = length(nearest);
  } else if (u_shape < 1.5) {
    distanceToCenter = max(abs(nearest.x), abs(nearest.y));
  } else if (u_shape < 2.5) {
    distanceToCenter = abs(nearest.x) + abs(nearest.y);
  } else {
    distanceToCenter = abs(nearest.y);
  }
  float radius = sqrt(max(value, 0.0)) * 0.5;
  return antiAliasedStep(radius, distanceToCenter);
}

void main() {
  vec3 sourceColor = applyBrightnessContrast(sampleHalftoneSource(v_uv));
  vec2 fragmentCoordinate = v_uv * u_resolution;
  float paperNoise = (
    simplexNoise(fragmentCoordinate * 0.1) * 0.5 +
    simplexNoise(fragmentCoordinate * 0.2) * 0.25 +
    simplexNoise(fragmentCoordinate * 0.4) * 0.125
  ) * 0.02 * u_dotScale;
  float sourceLuminance = halftoneLuminance(sourceColor);
  float value = sourceLuminance;
  if (u_invert > 0.5) {
    value = 1.0 - value;
  }
  float pattern = halftonePattern(fragmentCoordinate, value + paperNoise);
  vec3 originalMode = mix(sourceColor, u_background, pattern);
  vec3 monoMode = mix(u_foreground, u_background, pattern);
  vec3 effectColor = mix(monoMode, originalMode, u_colorMode);
  effectColor = applySharedProcessing(effectColor, sourceLuminance);
  effectColor = applySharedPostProcessing(effectColor, sourceLuminance, v_uv);
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createHalftoneShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateHalftoneShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: HALFTONE_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_dotScale: { value: 1 },
      u_spacing: { value: 8 },
      u_angle: { value: 45 },
      u_shape: { value: 0 },
      u_invert: { value: 0 },
      u_colorMode: { value: 0 },
      u_foreground: { value: new Color('#ffffff') },
      u_background: { value: new Color('#000000') },
      u_brightness: { value: 0 },
      u_contrast: { value: 0 },
      u_time: { value: 0 },
      u_processingInvert: { value: 0 },
      u_brightnessMap: { value: 1 },
      u_edgeEnhance: { value: 0 },
      u_blur: { value: 0 },
      u_quantizeColors: { value: 0 },
      u_shapeMatching: { value: 0 },
      u_bloom: { value: 0 },
      u_grainIntensity: { value: 35 },
      u_grainSize: { value: 2 },
      u_grainSpeed: { value: 50 },
      u_postChromatic: { value: 0 },
      u_scanlines: { value: 0 },
      u_vignette: { value: 0 },
      u_crtCurve: { value: 0 },
      u_phosphor: { value: 0 },
    },
    vertexShader: HALFTONE_VERTEX_SHADER,
  })

  applyHalftoneUniforms(material, controls)
  return material
}

export function applyHalftoneUniforms(
  material: ShaderMaterial,
  controls: HalftoneControls,
) {
  material.uniforms.u_dotScale.value = readNumber(controls['dot-scale'], 1)
  material.uniforms.u_spacing.value = readNumber(controls.spacing, 8)
  material.uniforms.u_angle.value = readNumber(controls.angle, 45)
  material.uniforms.u_shape.value = readShape(controls.shape)
  material.uniforms.u_invert.value = readBoolean(controls.invert)
  material.uniforms.u_colorMode.value = controls['color-mode'] === 'color' ? 1 : 0
  material.uniforms.u_foreground.value.set(readString(controls.foreground, '#ffffff'))
  material.uniforms.u_background.value.set(readString(controls.background, '#000000'))
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
  material.uniforms.u_processingInvert.value = readBoolean(controls['processing-invert'])
  material.uniforms.u_brightnessMap.value = readNumber(controls['brightness-map'], 1)
  material.uniforms.u_edgeEnhance.value = readNumber(controls['edge-enhance'], 0)
  material.uniforms.u_blur.value = readNumber(controls.blur, 0)
  material.uniforms.u_quantizeColors.value = readNumber(controls['quantize-colors'], 0)
  material.uniforms.u_shapeMatching.value = readNumber(controls['shape-matching'], 0)
  material.uniforms.u_bloom.value = readBoolean(controls.bloom)
  material.uniforms.u_grainIntensity.value = readNumber(controls['grain-intensity'], 35)
  material.uniforms.u_grainSize.value = readNumber(controls['grain-size'], 2)
  material.uniforms.u_grainSpeed.value = readNumber(controls['grain-speed'], 50)
  material.uniforms.u_postChromatic.value = readBoolean(controls.chromatic)
  material.uniforms.u_scanlines.value = readBoolean(controls.scanlines)
  material.uniforms.u_vignette.value = readBoolean(controls.vignette)
  material.uniforms.u_crtCurve.value = readBoolean(controls['crt-curve'])
  material.uniforms.u_phosphor.value = readBoolean(controls.phosphor)
}

function readNumber(value: HalftoneControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readBoolean(value: HalftoneControlValue | undefined) {
  return value === true ? 1 : 0
}

function readString(value: HalftoneControlValue | undefined, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function readShape(value: HalftoneControlValue | undefined) {
  return typeof value === 'string' && value in HALFTONE_SHAPE_IDS
    ? HALFTONE_SHAPE_IDS[value as keyof typeof HALFTONE_SHAPE_IDS]
    : HALFTONE_SHAPE_IDS.circle
}
