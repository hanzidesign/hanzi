import { Color, ShaderMaterial, Vector2, type Texture } from 'three'

import type { StudioControlValue } from './studio-effects'
import {
  readStudioBoolean as readBoolean,
  readStudioNumber as readNumber,
  readStudioString as readString,
} from './studio-control-readers'

export type CrosshatchControlValue = StudioControlValue
export type CrosshatchControls = Readonly<Record<string, CrosshatchControlValue>>

export type CreateCrosshatchShaderMaterialOptions = Readonly<{
  controls: CrosshatchControls
  sourceTexture: Texture
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const CROSSHATCH_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const CROSSHATCH_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform float u_density;
uniform float u_angle;
uniform float u_layers;
uniform float u_lineWidth;
uniform float u_backgroundDensity;
uniform float u_backgroundLayers;
uniform float u_backgroundAngle;
uniform float u_backgroundLineWidth;
uniform float u_backgroundRandomness;
uniform float u_backgroundSpeed;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_invert;
uniform vec3 u_lineColor;
uniform vec3 u_background;
uniform float u_randomness;
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

const float CROSSHATCH_PI = 3.14159265359;

float crosshatchLuminance(vec3 color) {
  return dot(color, vec3(0.2326, 0.7152, 0.0722));
}

vec3 applyCrosshatchBrightnessContrast(vec3 color) {
  vec3 result = color + vec3(u_brightness);
  float contrastFactor = (1.0 + u_contrast) / (1.0 - u_contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, vec3(0.0), vec3(1.0));
}

vec3 crosshatchSourceSample(vec2 uv) {
  return texture2D(u_sourceTexture, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
}

vec3 crosshatchBlurredSource(vec2 uv) {
  vec3 center = crosshatchSourceSample(uv);
  if (u_blur <= 0.0) {
    return center;
  }
  vec2 blurTexel = min(u_blur, 12.0) / max(u_sourceSize, vec2(1.0));
  return (
    center * 4.0 +
    crosshatchSourceSample(uv + vec2(blurTexel.x, 0.0)) +
    crosshatchSourceSample(uv - vec2(blurTexel.x, 0.0)) +
    crosshatchSourceSample(uv + vec2(0.0, blurTexel.y)) +
    crosshatchSourceSample(uv - vec2(0.0, blurTexel.y))
  ) / 8.0;
}

vec3 applyCrosshatchProcessing(vec3 color, float sourceLuminance) {
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

float crosshatchHash21(vec2 p) {
  vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float crosshatchValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(crosshatchHash21(i), crosshatchHash21(i + vec2(1.0, 0.0)), u.x),
    mix(crosshatchHash21(i + vec2(0.0, 1.0)), crosshatchHash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float crosshatchPattern(vec2 uv, float angle, float spacing, float width, float seed, float phase, float randomness) {
  float sine = sin(angle);
  float cosine = cos(angle);
  vec2 pixelPosition = uv * u_resolution;
  float rotatedX = pixelPosition.x * cosine - pixelPosition.y * sine;
  float rotatedY = pixelPosition.x * sine + pixelPosition.y * cosine;
  float scaledX = rotatedX / spacing + phase;

  float wobble = 0.0;
  if (randomness > 0.0) {
    vec2 noiseCoord = vec2(floor(scaledX) * 0.1 + seed * 7.0, rotatedY * 0.02);
    wobble = (crosshatchValueNoise(noiseCoord * 3.0) - 0.5) * randomness * 0.4;
  }

  float distanceToLine = abs(fract(scaledX + wobble) - 0.5);
  float halfWidth = width * 0.5;
  float aa = 1.5 / max(spacing, 0.0001);
  return 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, distanceToLine);
}

float crosshatchPostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyCrosshatchPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (crosshatchPostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (crosshatchPostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec3 rawSourceColor = crosshatchSourceSample(v_uv);
  vec3 sourceColor = crosshatchBlurredSource(v_uv);
  float backgroundMotionMask = smoothstep(0.92, 0.995, crosshatchLuminance(rawSourceColor));
  float backgroundPhase = backgroundMotionMask * u_time * 0.08 * u_backgroundSpeed;
  vec3 adjustedColor = applyCrosshatchBrightnessContrast(clamp(sourceColor, 0.0, 1.0));
  float luminanceValue = crosshatchLuminance(adjustedColor);
  if (u_invert > 0.5) {
    luminanceValue = 1.0 - luminanceValue;
  }
  float backgroundHatchStrength = clamp(0.04 - u_brightness * 0.2, 0.006, 0.2);
  float backgroundHatchFloor = backgroundMotionMask * backgroundHatchStrength;
  float darkness = max(1.0 - luminanceValue, backgroundHatchFloor);

  float spacing = u_density;
  float width = u_lineWidth;
  float baseAngle = u_angle;

  float hatch0 = crosshatchPattern(v_uv, baseAngle, spacing * 1.5, width * 0.7, 0.0, 0.0, u_randomness);
  float hatch1New = crosshatchPattern(v_uv, baseAngle + CROSSHATCH_PI * 0.5, spacing * 1.5, width * 0.7, 1.0, 0.0, u_randomness);
  float hatch1 = max(hatch0, hatch1New);
  float hatch2New = crosshatchPattern(v_uv, baseAngle, spacing, width * 0.8, 2.0, 0.0, u_randomness);
  float hatch2 = max(hatch1, hatch2New);
  float hatch3New = crosshatchPattern(v_uv, baseAngle + CROSSHATCH_PI * 0.5, spacing, width * 0.8, 3.0, 0.0, u_randomness);
  float hatch3 = max(hatch2, hatch3New);
  float hatch4New = crosshatchPattern(v_uv, baseAngle + CROSSHATCH_PI * 0.25, spacing * 0.85, width * 0.9, 4.0, 0.0, u_randomness);
  float hatch4 = max(hatch3, hatch4New);
  float hatch5New = crosshatchPattern(v_uv, baseAngle + CROSSHATCH_PI * 0.75, spacing * 0.85, width * 0.9, 5.0, 0.0, u_randomness);
  float hatch5 = max(hatch4, hatch5New);

  float level0 = hatch0;
  float level1 = hatch1;
  float level2 = hatch2;
  float level3 = hatch3;
  float level4 = hatch4;
  float level5 = hatch5;
  if (u_layers < 2.0) {
    level1 = level0;
    level2 = level0;
    level3 = level0;
    level4 = level0;
    level5 = level0;
  } else if (u_layers < 3.0) {
    level4 = level3;
    level5 = level3;
  } else if (u_layers < 4.0) {
    level5 = level4;
  }

  float tone = darkness * 6.0;
  float ramp0 = clamp(tone, 0.0, 1.0);
  float ramp1 = clamp(tone - 1.0, 0.0, 1.0);
  float ramp2 = clamp(tone - 2.0, 0.0, 1.0);
  float ramp3 = clamp(tone - 3.0, 0.0, 1.0);
  float ramp4 = clamp(tone - 4.0, 0.0, 1.0);
  float ramp5 = clamp(tone - 5.0, 0.0, 1.0);
  float weight0 = ramp0 - ramp1;
  float weight1 = ramp1 - ramp2;
  float weight2 = ramp2 - ramp3;
  float weight3 = ramp3 - ramp4;
  float weight4 = ramp4 - ramp5;
  float weight5 = ramp5;

  float characterHatchValue = level0 * weight0
    + level1 * weight1
    + level2 * weight2
    + level3 * weight3
    + level4 * weight4
    + level5 * weight5;

  float backgroundSpacing = u_backgroundDensity * 1.5;
  float backgroundWidth = u_backgroundLineWidth * 0.7;
  float background0 = crosshatchPattern(v_uv, u_backgroundAngle, backgroundSpacing, backgroundWidth, 0.0, backgroundPhase, u_backgroundRandomness);
  float background90 = crosshatchPattern(v_uv, u_backgroundAngle + CROSSHATCH_PI * 0.5, backgroundSpacing, backgroundWidth, 1.0, backgroundPhase, u_backgroundRandomness);
  float background45 = crosshatchPattern(v_uv, u_backgroundAngle + CROSSHATCH_PI * 0.25, backgroundSpacing, backgroundWidth, 2.0, backgroundPhase, u_backgroundRandomness);
  float background135 = crosshatchPattern(v_uv, u_backgroundAngle + CROSSHATCH_PI * 0.75, backgroundSpacing, backgroundWidth, 3.0, backgroundPhase, u_backgroundRandomness);
  float backgroundPattern = background0;
  if (u_backgroundLayers >= 2.0) {
    backgroundPattern = max(backgroundPattern, background90);
  }
  if (u_backgroundLayers >= 3.0) {
    backgroundPattern = max(backgroundPattern, background45);
  }
  if (u_backgroundLayers >= 4.0) {
    backgroundPattern = max(backgroundPattern, background135);
  }
  float backgroundHatchValue = backgroundPattern * ramp0;
  float hatchValue = mix(characterHatchValue, backgroundHatchValue, backgroundMotionMask);

  vec3 effectColor = mix(u_background, u_lineColor, hatchValue);
  float effectLuminance = crosshatchLuminance(effectColor);
  effectColor = applyCrosshatchProcessing(effectColor, effectLuminance);
  effectColor = applyCrosshatchPostProcessing(effectColor, effectLuminance, v_uv);
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createCrosshatchShaderMaterial({
  controls,
  sourceTexture,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateCrosshatchShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: CROSSHATCH_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_density: { value: 6 },
      u_angle: { value: Math.PI / 4 },
      u_layers: { value: 3 },
      u_lineWidth: { value: 0.08 },
      u_backgroundDensity: { value: 12 },
      u_backgroundLayers: { value: 1 },
      u_backgroundAngle: { value: Math.PI / 4 },
      u_backgroundLineWidth: { value: 0.08 },
      u_backgroundRandomness: { value: 0 },
      u_backgroundSpeed: { value: 0.1 },
      u_brightness: { value: -0.04 },
      u_contrast: { value: 0 },
      u_invert: { value: 0 },
      u_lineColor: { value: new Color('#000000') },
      u_background: { value: new Color('#ffffff') },
      u_randomness: { value: 0 },
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
    vertexShader: CROSSHATCH_VERTEX_SHADER,
  })

  applyCrosshatchUniforms(material, controls)
  return material
}

export function applyCrosshatchUniforms(
  material: ShaderMaterial,
  controls: CrosshatchControls,
) {
  material.uniforms.u_density.value = readNumber(controls.density, 6)
  material.uniforms.u_angle.value = readNumber(controls.angle, 45) * (Math.PI / 180)
  material.uniforms.u_layers.value = readNumber(controls.layers, 3)
  material.uniforms.u_lineWidth.value = readNumber(controls['line-width'], 0.08)
  material.uniforms.u_backgroundDensity.value = readNumber(controls['background-density'], 12)
  material.uniforms.u_backgroundLayers.value = readNumber(controls['background-layers'], 1)
  material.uniforms.u_backgroundAngle.value = readNumber(controls['background-angle'], 45) * (Math.PI / 180)
  material.uniforms.u_backgroundLineWidth.value = readNumber(controls['background-line-width'], 0.08)
  material.uniforms.u_backgroundRandomness.value = readNumber(controls['background-randomness'], 0)
  material.uniforms.u_backgroundSpeed.value = readNumber(controls['background-speed'], 0.1)
  material.uniforms.u_brightness.value = readNumber(controls.brightness, -4) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
  material.uniforms.u_invert.value = readBoolean(controls.invert)
  material.uniforms.u_lineColor.value.set(readString(controls['line-color'], '#000000'))
  material.uniforms.u_background.value.set(readString(controls.background, '#ffffff'))
  material.uniforms.u_randomness.value = readNumber(controls.randomness, 0)
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

export function disposeCrosshatchShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}
