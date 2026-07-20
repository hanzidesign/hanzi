import { ShaderMaterial, Vector2, type Texture } from 'three'

export type VoronoiControlValue = string | number | boolean
export type VoronoiControls = Readonly<Record<string, VoronoiControlValue>>

export const VORONOI_EDGE_COLOR_IDS = {
  '0': 0,
  '1': 1,
  '2': 2,
} as const

export const VORONOI_COLOR_MODE_IDS = {
  '0': 0,
  '1': 1,
  '2': 2,
} as const

export type CreateVoronoiShaderMaterialOptions = Readonly<{
  controls: VoronoiControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const VORONOI_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const VORONOI_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_cellSize;
uniform float u_edgeWidth;
uniform float u_edgeColor;
uniform float u_colorMode;
uniform float u_randomize;
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
uniform float u_postChromatic;
uniform float u_scanlines;
uniform float u_vignette;
uniform float u_crtCurve;
uniform float u_phosphor;
varying vec2 v_uv;

vec2 voronoiHash2(vec2 p) {
  vec2 k = vec2(0.3183099, 0.3678794);
  vec2 pp = p * k + k.yx;
  float q = fract(pp.x * pp.y * (pp.x + pp.y));
  return fract(16.0 * k * q) * 2.0 - 1.0;
}

vec4 findVoronoiCell(vec2 p, float randomness) {
  vec2 cellPosition = floor(p);
  vec2 fractionalPosition = fract(p);
  float closestDistance = 8.0;
  float secondClosestDistance = 8.0;
  vec2 closestCell = vec2(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 integerCell = cellPosition + neighbor;
      vec2 randomOffset = voronoiHash2(integerCell) * randomness * 0.5;
      vec2 featurePoint = neighbor + 0.5 + randomOffset;
      float distanceToPoint = length(featurePoint - fractionalPosition);

      if (distanceToPoint < closestDistance) {
        secondClosestDistance = closestDistance;
        closestDistance = distanceToPoint;
        closestCell = integerCell;
      } else if (distanceToPoint < secondClosestDistance) {
        secondClosestDistance = distanceToPoint;
      }
    }
  }

  return vec4(closestCell, closestDistance, secondClosestDistance);
}

vec3 sampleVoronoiMipZero(vec2 uv) {
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

vec3 applyVoronoiBrightnessContrast(vec3 color) {
  vec3 result = color + vec3(u_brightness);
  float contrastFactor = (1.0 + u_contrast) / (1.0 - 0.99 * u_contrast);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3(0.0), vec3(1.0));
}

float voronoiLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 applyVoronoiProcessing(vec3 color, float luminance) {
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

float voronoiPostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyVoronoiPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (voronoiPostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (voronoiPostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec2 pixelPosition = v_uv * u_resolution;
  vec2 scaledPosition = pixelPosition / u_cellSize;
  vec4 cell = findVoronoiCell(scaledPosition, u_randomize);
  vec2 closestCell = cell.xy;
  float closestDistance = cell.z;
  float secondClosestDistance = cell.w;

  float edgeDistance = secondClosestDistance - closestDistance;
  float interiorMask = smoothstep(0.0, u_edgeWidth * 0.3, edgeDistance);
  vec3 cellColor;

  if (u_colorMode < 0.5) {
    vec3 averageColor = vec3(0.0);
    float sampleCount = 0.0;
    for (int dy = -2; dy <= 2; dy++) {
      for (int dx = -2; dx <= 2; dx++) {
        vec2 sampleOffset = vec2(float(dx), float(dy)) * 0.2;
        vec2 sampleUv = (closestCell + 0.5 + sampleOffset)
          * u_cellSize / u_resolution;
        averageColor += sampleVoronoiMipZero(sampleUv);
        sampleCount += 1.0;
      }
    }
    cellColor = averageColor / sampleCount;
  } else if (u_colorMode < 1.5) {
    vec2 centerUv = (closestCell + 0.5) * u_cellSize / u_resolution;
    cellColor = sampleVoronoiMipZero(centerUv);
  } else {
    vec2 centerUv = (closestCell + 0.5) * u_cellSize / u_resolution;
    vec3 currentColor = sampleVoronoiMipZero(v_uv);
    vec3 centerColor = sampleVoronoiMipZero(centerUv);
    float gradientAmount = smoothstep(0.0, 0.7, closestDistance);
    cellColor = mix(centerColor, currentColor, gradientAmount * 0.5);
  }

  vec3 edgePixelColor;
  if (u_edgeColor < 0.5) {
    edgePixelColor = vec3(0.0);
  } else if (u_edgeColor < 1.5) {
    edgePixelColor = vec3(1.0);
  } else {
    edgePixelColor = cellColor * 0.3;
  }

  vec3 effectColor = mix(edgePixelColor, cellColor, interiorMask);
  effectColor = applyVoronoiBrightnessContrast(effectColor);
  effectColor = applyVoronoiProcessing(
    effectColor,
    voronoiLuminance(effectColor)
  );
  effectColor = applyVoronoiPostProcessing(
    effectColor,
    voronoiLuminance(effectColor),
    v_uv
  );
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createVoronoiShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateVoronoiShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: VORONOI_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_cellSize: { value: 30 },
      u_edgeWidth: { value: 0.3 },
      u_edgeColor: { value: VORONOI_EDGE_COLOR_IDS['0'] },
      u_colorMode: { value: VORONOI_COLOR_MODE_IDS['0'] },
      u_randomize: { value: 0.8 },
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
      u_postChromatic: { value: 0 },
      u_scanlines: { value: 0 },
      u_vignette: { value: 0 },
      u_crtCurve: { value: 0 },
      u_phosphor: { value: 0 },
    },
    vertexShader: VORONOI_VERTEX_SHADER,
  })

  applyVoronoiUniforms(material, controls)
  return material
}

export function applyVoronoiUniforms(
  material: ShaderMaterial,
  controls: VoronoiControls,
) {
  material.uniforms.u_cellSize.value = readNumber(controls['cell-size'], 30)
  material.uniforms.u_edgeWidth.value = readNumber(controls['edge-width'], 0.3)
  material.uniforms.u_edgeColor.value = readEnum(
    controls['edge-color'],
    VORONOI_EDGE_COLOR_IDS,
    '0',
  )
  material.uniforms.u_colorMode.value = readEnum(
    controls['cell-color-mode'],
    VORONOI_COLOR_MODE_IDS,
    '0',
  )
  material.uniforms.u_randomize.value = readNumber(controls.randomize, 0.8)
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
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

export function disposeVoronoiShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}

function readNumber(value: VoronoiControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readBoolean(value: VoronoiControlValue | undefined) {
  return value === true ? 1 : 0
}

function readEnum<T extends Record<string, number>>(
  value: VoronoiControlValue | undefined,
  values: T,
  fallback: keyof T,
) {
  return typeof value === 'string' && value in values
    ? values[value as keyof T]
    : values[fallback]
}
