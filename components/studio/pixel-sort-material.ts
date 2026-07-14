import { ShaderMaterial, Vector2, type Texture } from 'three'

export type PixelSortControlValue = string | number | boolean
export type PixelSortControls = Readonly<Record<string, PixelSortControlValue>>

export const PIXEL_SORT_DIRECTION_IDS = {
  horizontal: 0,
  vertical: 1,
  diagonal: 2,
} as const

export const PIXEL_SORT_MODE_IDS = {
  brightness: 0,
  hue: 1,
  saturation: 2,
} as const

export const PIXEL_SORT_MAX_STREAK_STEPS = 300
export const PIXEL_SORT_SAMPLE_COUNT = 24

type CreatePixelSortShaderMaterialOptions = Readonly<{
  controls: PixelSortControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const PIXEL_SORT_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const PIXEL_SORT_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_threshold;
uniform float u_direction;
uniform float u_mode;
uniform float u_streakLength;
uniform float u_intensity;
uniform float u_randomness;
uniform float u_reverse;
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

const int PIXEL_SORT_MAX_STREAK_STEPS = 300;
const int PIXEL_SORT_SAMPLE_COUNT = 24;

float pixelSortHash11(float value) {
  float hashed = fract(value * 0.1031);
  hashed *= hashed + 33.33;
  return fract(hashed * (hashed + hashed));
}

float pixelSortLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float pixelSortBrightness(vec3 color) {
  return max(color.r, max(color.g, color.b));
}

bool isPixelSortSpanStart(vec3 color, float threshold) {
  if (u_mode < 0.5) {
    float blackThreshold = threshold * 0.25;
    return pixelSortLuminance(color) > blackThreshold;
  }
  if (u_mode < 1.5) {
    float whiteThreshold = 1.0 - threshold * 0.25;
    return pixelSortLuminance(color) < whiteThreshold;
  }
  if (u_mode < 2.5) {
    return pixelSortBrightness(color) > threshold;
  }
  return pixelSortBrightness(color) < threshold;
}

bool isPixelSortSpanEnd(vec3 color, float threshold) {
  if (u_mode < 0.5) {
    float blackThreshold = threshold * 0.25;
    return pixelSortLuminance(color) <= blackThreshold;
  }
  if (u_mode < 1.5) {
    float whiteThreshold = 1.0 - threshold * 0.25;
    return pixelSortLuminance(color) >= whiteThreshold;
  }
  if (u_mode < 2.5) {
    return pixelSortBrightness(color) <= threshold;
  }
  return pixelSortBrightness(color) >= threshold;
}

vec3 applyPixelSortBrightnessContrast(vec3 color) {
  vec3 result = color + u_brightness;
  float contrastFactor = (1.0 + u_contrast) / (1.0 - u_contrast * 0.99);
  return clamp((result - 0.5) * contrastFactor + 0.5, 0.0, 1.0);
}

vec3 samplePixelSortSource(vec2 sourceUv) {
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

vec3 applyPixelSortProcessing(vec3 color, float sourceLuminance) {
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

float pixelSortPostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyPixelSortPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  float noiseScale = max(u_grainSize, 1.0);
  float movingTime = floor(u_time * (1.0 + u_grainSpeed * 0.1));
  color += (pixelSortPostNoise(floor(gl_FragCoord.xy / noiseScale) + movingTime) - 0.5)
    * (u_grainIntensity / 100.0);
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (pixelSortPostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (pixelSortPostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec2 pixelSize = 1.0 / u_resolution;
  vec2 pixel = v_uv * u_resolution;
  vec2 direction;
  float lineCoord;

  if (u_direction > 1.5) {
    direction = normalize(vec2(1.0, 1.0));
    lineCoord = floor(pixel.x - pixel.y);
  } else if (u_direction > 0.5) {
    direction = vec2(0.0, 1.0);
    lineCoord = floor(pixel.x);
  } else {
    direction = vec2(1.0, 0.0);
    lineCoord = floor(pixel.y);
  }

  float lineRand = pixelSortHash11(lineCoord * 0.173);
  float thresholdVar = u_threshold * (1.0 + (lineRand - 0.5) * u_randomness * 0.5);
  vec3 currentColor = samplePixelSortSource(v_uv);
  vec3 effectColor = currentColor;

  if (isPixelSortSpanStart(currentColor, thresholdVar)) {
    vec2 directionNormalized = direction * pixelSize;
    int spanStartDist = 0;
    int spanEndDist = 0;

    for (int i = 1; i <= PIXEL_SORT_MAX_STREAK_STEPS; i++) {
      if (float(i) > u_streakLength) break;
      vec2 checkUV = v_uv - directionNormalized * float(i);
      spanStartDist = i;
      if (checkUV.x < 0.0 || checkUV.x > 1.0 || checkUV.y < 0.0 || checkUV.y > 1.0) {
        break;
      }
      vec3 checkColor = samplePixelSortSource(checkUV);
      if (!isPixelSortSpanStart(checkColor, thresholdVar)) {
        break;
      }
      if (isPixelSortSpanEnd(checkColor, thresholdVar)) {
        break;
      }
    }

    for (int i = 1; i <= PIXEL_SORT_MAX_STREAK_STEPS; i++) {
      if (float(i) > u_streakLength) break;
      vec2 checkUV = v_uv + directionNormalized * float(i);
      spanEndDist = i;
      if (checkUV.x < 0.0 || checkUV.x > 1.0 || checkUV.y < 0.0 || checkUV.y > 1.0) {
        break;
      }
      vec3 checkColor = samplePixelSortSource(checkUV);
      if (isPixelSortSpanEnd(checkColor, thresholdVar)) {
        break;
      }
      if (!isPixelSortSpanStart(checkColor, thresholdVar)) {
        break;
      }
    }

    int spanSize = spanStartDist + spanEndDist;
    if (spanSize < 3) {
      effectColor = currentColor;
    } else {
      vec3 colors[PIXEL_SORT_SAMPLE_COUNT];
      float sortValues[PIXEL_SORT_SAMPLE_COUNT];
      int actualSamples = min(spanSize, PIXEL_SORT_SAMPLE_COUNT);

      for (int i = 0; i < PIXEL_SORT_SAMPLE_COUNT; i++) {
        if (i < actualSamples) {
          float t = float(i) / float(actualSamples - 1);
          float sampleOffset = float(-spanStartDist) + t * float(spanSize);
          vec2 sampleUV = v_uv + directionNormalized * sampleOffset;
          sampleUV = clamp(sampleUV, vec2(0.001), vec2(0.999));
          vec3 sampleColor = samplePixelSortSource(sampleUV);
          colors[i] = sampleColor;
          sortValues[i] = pixelSortLuminance(sampleColor);
        } else {
          colors[i] = currentColor;
          sortValues[i] = pixelSortLuminance(currentColor);
        }
      }

      for (int pass = 0; pass < PIXEL_SORT_SAMPLE_COUNT - 1; pass++) {
        if (pass >= actualSamples - 1) break;
        for (int i = 0; i < PIXEL_SORT_SAMPLE_COUNT - 1; i++) {
          if (i >= actualSamples - 1 - pass) break;
          bool shouldSwap = u_reverse < 0.5
            ? sortValues[i] > sortValues[i + 1]
            : sortValues[i] < sortValues[i + 1];
          if (shouldSwap) {
            float temporaryValue = sortValues[i];
            sortValues[i] = sortValues[i + 1];
            sortValues[i + 1] = temporaryValue;
            vec3 temporaryColor = colors[i];
            colors[i] = colors[i + 1];
            colors[i + 1] = temporaryColor;
          }
        }
      }

      float positionInSpan = float(spanStartDist) / float(spanSize);
      float sortedIndex = positionInSpan * float(actualSamples - 1);
      int idxLow = int(floor(sortedIndex));
      int idxHigh = min(idxLow + 1, actualSamples - 1);
      float fraction = fract(sortedIndex);
      vec3 sortedColor = mix(colors[idxLow], colors[idxHigh], fraction);
      effectColor = mix(currentColor, sortedColor, u_intensity);
    }
  }

  effectColor = applyPixelSortBrightnessContrast(effectColor);
  effectColor = applyPixelSortProcessing(
    effectColor,
    pixelSortLuminance(currentColor)
  );
  effectColor = applyPixelSortPostProcessing(
    effectColor,
    pixelSortLuminance(currentColor),
    v_uv
  );
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createPixelSortShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreatePixelSortShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: PIXEL_SORT_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_threshold: { value: 0.25 },
      u_direction: { value: PIXEL_SORT_DIRECTION_IDS.horizontal },
      u_mode: { value: PIXEL_SORT_MODE_IDS.brightness },
      u_streakLength: { value: 100 },
      u_intensity: { value: 0.8 },
      u_randomness: { value: 0.3 },
      u_reverse: { value: 0 },
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
      u_grainIntensity: { value: 0 },
      u_grainSize: { value: 2 },
      u_grainSpeed: { value: 50 },
      u_postChromatic: { value: 0 },
      u_scanlines: { value: 0 },
      u_vignette: { value: 0 },
      u_crtCurve: { value: 0 },
      u_phosphor: { value: 0 },
    },
    vertexShader: PIXEL_SORT_VERTEX_SHADER,
  })

  applyPixelSortUniforms(material, controls)
  return material
}

export function applyPixelSortUniforms(
  material: ShaderMaterial,
  controls: PixelSortControls,
) {
  material.uniforms.u_direction.value = readEnum(
    controls.direction,
    PIXEL_SORT_DIRECTION_IDS,
    'horizontal',
  )
  material.uniforms.u_mode.value = readEnum(
    controls['sort-mode'],
    PIXEL_SORT_MODE_IDS,
    'hue',
  )
  material.uniforms.u_threshold.value = readNumber(controls.threshold, 0.25)
  material.uniforms.u_streakLength.value = readNumber(controls['streak-length'], 100)
  material.uniforms.u_intensity.value = readNumber(controls.intensity, 0.8)
  material.uniforms.u_randomness.value = readNumber(controls.randomness, 0.3)
  material.uniforms.u_reverse.value = readBoolean(controls.reverse)
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
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

export function disposePixelSortShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}

function readNumber(value: PixelSortControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readBoolean(value: PixelSortControlValue | undefined) {
  return value === true ? 1 : 0
}

function readEnum<T extends Record<string, number>>(
  value: PixelSortControlValue | undefined,
  values: T,
  fallback: keyof T,
) {
  return typeof value === 'string' && value in values
    ? values[value as keyof T]
    : values[fallback]
}
