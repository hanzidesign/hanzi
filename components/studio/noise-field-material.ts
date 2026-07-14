import { ShaderMaterial, Vector2, type Texture } from 'three'

export type NoiseFieldControlValue = string | number | boolean
export type NoiseFieldControls = Readonly<Record<string, NoiseFieldControlValue>>

export const NOISE_FIELD_TYPE_IDS = {
  perlin: 0,
  simplex: 1,
  worley: 2,
} as const

export type CreateNoiseFieldShaderMaterialOptions = Readonly<{
  controls: NoiseFieldControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const NOISE_FIELD_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const NOISE_FIELD_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_scale;
uniform float u_intensity;
uniform float u_speed;
uniform float u_time;
uniform float u_octaves;
uniform float u_animate;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_noiseType;
uniform float u_distortOnly;
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

float noiseFieldHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 noiseFieldHash2(vec2 p) {
  return vec2(
    fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453),
    fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453)
  );
}

float noiseFieldPerlin(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(noiseFieldHash(i + vec2(0.0, 0.0)), noiseFieldHash(i + vec2(1.0, 0.0)), u.x),
    mix(noiseFieldHash(i + vec2(0.0, 1.0)), noiseFieldHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float noiseFieldSimplex(vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;

  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = step(a.yx, a.xy);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;

  vec3 h = max(
    0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)),
    vec3(0.0)
  );
  vec3 n = h * h * h * h * vec3(
    dot(a, noiseFieldHash2(i) - 0.5),
    dot(b, noiseFieldHash2(i + o) - 0.5),
    dot(c, noiseFieldHash2(i + vec2(1.0)) - 0.5)
  );

  return dot(n, vec3(70.0));
}

float noiseFieldWorley(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float minDistance = 1.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = noiseFieldHash2(i + neighbor);
      vec2 difference = neighbor + point - f;
      minDistance = min(minDistance, length(difference));
    }
  }

  return minDistance;
}

float noiseFieldGetNoise(vec2 p, float noiseType) {
  int typeId = int(noiseType + 0.5);
  if (typeId == 1) {
    return noiseFieldSimplex(p) * 0.5 + 0.5;
  }
  if (typeId == 2) {
    return noiseFieldWorley(p);
  }
  return noiseFieldPerlin(p);
}

float noiseFieldFbm(vec2 p, int octaves, float noiseType) {
  float value = 0.0;
  float amplitude = 0.5;
  vec2 position = p;

  for (int i = 0; i < 8; i++) {
    if (i >= octaves) {
      break;
    }
    value += amplitude * noiseFieldGetNoise(position, noiseType);
    position *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

vec3 applyNoiseFieldBrightnessContrast(vec3 color) {
  vec3 result = color + vec3(u_brightness);
  float contrastFactor = (1.0 + u_contrast) / (1.0 - 0.99 * u_contrast);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3(0.0), vec3(1.0));
}

float noiseFieldLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 sampleNoiseFieldSource(vec2 uv) {
  vec2 sourceUv = clamp(uv, vec2(0.0), vec2(1.0));
  vec3 center = texture2D(u_sourceTexture, sourceUv).rgb;
  if (u_blur <= 0.0) {
    return center;
  }

  vec2 blurTexel = min(u_blur, 12.0) / max(u_sourceSize, vec2(1.0));
  return (
    center * 4.0 +
    texture2D(u_sourceTexture, clamp(sourceUv + vec2(blurTexel.x, 0.0), vec2(0.0), vec2(1.0))).rgb +
    texture2D(u_sourceTexture, clamp(sourceUv - vec2(blurTexel.x, 0.0), vec2(0.0), vec2(1.0))).rgb +
    texture2D(u_sourceTexture, clamp(sourceUv + vec2(0.0, blurTexel.y), vec2(0.0), vec2(1.0))).rgb +
    texture2D(u_sourceTexture, clamp(sourceUv - vec2(0.0, blurTexel.y), vec2(0.0), vec2(1.0))).rgb
  ) / 8.0;
}

vec3 applyNoiseFieldProcessing(vec3 color, float luminance) {
  color = mix(color, 1.0 - color, u_processingInvert);
  color *= u_brightnessMap;
  color += length(fwidth(vec2(luminance))) * u_edgeEnhance * 8.0;
  if (u_quantizeColors >= 1.0) {
    float levels = max(u_quantizeColors, 2.0);
    color = floor(color * (levels - 1.0) + 0.5) / (levels - 1.0);
  }
  color = mix(color, vec3(step(0.5, luminance)), u_shapeMatching);
  return clamp(color, 0.0, 1.0);
}

float noiseFieldPostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyNoiseFieldPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  float noiseScale = max(u_grainSize, 1.0);
  float movingTime = floor(u_time * (1.0 + u_grainSpeed * 0.1));
  color += (noiseFieldPostNoise(floor(gl_FragCoord.xy / noiseScale) + movingTime) - 0.5)
    * (u_grainIntensity / 100.0);
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (noiseFieldPostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (noiseFieldPostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  float animatedTime = u_animate > 0.5 ? u_time * u_speed : 0.0;
  int octaveCount = int(u_octaves + 0.5);
  vec2 noisePosition = v_uv * u_scale + vec2(animatedTime * 0.1);
  float noiseValue = noiseFieldFbm(noisePosition, octaveCount, u_noiseType);
  float noiseValue2 = noiseFieldFbm(
    noisePosition + vec2(100.0, 100.0),
    octaveCount,
    u_noiseType
  );

  vec2 displacement = (vec2(noiseValue, noiseValue2) - 0.5)
    * 2.0 * u_intensity * 0.02;
  vec2 displacedUv = v_uv + displacement;
  vec3 effectColor = sampleNoiseFieldSource(displacedUv);
  effectColor = applyNoiseFieldBrightnessContrast(effectColor);

  if (u_distortOnly < 0.5) {
    float overlay = noiseFieldFbm(
      v_uv * u_scale * 2.0 + vec2(animatedTime),
      octaveCount,
      u_noiseType
    ) * 0.1;
    effectColor += vec3(overlay * u_intensity * 0.3);
  }

  effectColor = clamp(effectColor, vec3(0.0), vec3(1.0));
  effectColor = applyNoiseFieldProcessing(
    effectColor,
    noiseFieldLuminance(effectColor)
  );
  effectColor = applyNoiseFieldPostProcessing(
    effectColor,
    noiseFieldLuminance(effectColor),
    v_uv
  );
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createNoiseFieldShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateNoiseFieldShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: NOISE_FIELD_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_scale: { value: 50 },
      u_intensity: { value: 1 },
      u_speed: { value: 1 },
      u_time: { value: 0 },
      u_octaves: { value: 4 },
      u_animate: { value: 1 },
      u_brightness: { value: 0 },
      u_contrast: { value: 0 },
      u_noiseType: { value: NOISE_FIELD_TYPE_IDS.perlin },
      u_distortOnly: { value: 1 },
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
    },
    vertexShader: NOISE_FIELD_VERTEX_SHADER,
  })

  applyNoiseFieldUniforms(material, controls)
  return material
}

export function applyNoiseFieldUniforms(
  material: ShaderMaterial,
  controls: NoiseFieldControls,
) {
  material.uniforms.u_scale.value = readNumber(controls.scale, 50)
  material.uniforms.u_intensity.value = readNumber(controls.intensity, 1)
  material.uniforms.u_speed.value = readNumber(controls.speed, 1)
  material.uniforms.u_octaves.value = readNumber(controls.octaves, 4)
  material.uniforms.u_animate.value = controls.animate === false ? 0 : 1
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
  material.uniforms.u_noiseType.value = readEnum(
    controls['noise-type'],
    NOISE_FIELD_TYPE_IDS,
    'perlin',
  )
  material.uniforms.u_distortOnly.value = controls['distort-only'] === false ? 0 : 1
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

export function disposeNoiseFieldShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}

function readNumber(value: NoiseFieldControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readBoolean(value: NoiseFieldControlValue | undefined) {
  return value === true ? 1 : 0
}

function readEnum<T extends Record<string, number>>(
  value: NoiseFieldControlValue | undefined,
  values: T,
  fallback: keyof T,
) {
  return typeof value === 'string' && value in values
    ? values[value as keyof T]
    : values[fallback]
}
