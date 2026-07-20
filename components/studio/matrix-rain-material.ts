import {
  Color,
  ShaderMaterial,
  Vector2,
  type Texture,
} from 'three'

import type { MatrixRainGlyphAtlas } from './matrix-rain-charset'
import { MATRIX_RAIN_DIRECTION_IDS } from './matrix-rain-core'

export { MATRIX_RAIN_DIRECTION_IDS } from './matrix-rain-core'

export type MatrixRainControlValue = string | number | boolean
export type MatrixRainControls = Readonly<Record<string, MatrixRainControlValue>>

export type CreateMatrixRainShaderMaterialOptions = Readonly<{
  controls: MatrixRainControls
  sourceTexture: Texture
  glyphAtlas: MatrixRainGlyphAtlas
  sourceSize?: Vector2
  resolution?: Vector2
}>

export const MATRIX_RAIN_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const MATRIX_RAIN_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceTexture;
uniform sampler2D u_glyphAtlas;
uniform vec2 u_sourceSize;
uniform vec2 u_resolution;
uniform vec2 u_atlasSize;
uniform vec2 u_atlasCharacterSize;
uniform float u_atlasColumns;
uniform float u_characterCount;
uniform float u_cellSize;
uniform float u_spacing;
uniform float u_speed;
uniform float u_trailLength;
uniform float u_direction;
uniform float u_glowIntensity;
uniform float u_backgroundOpacity;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_threshold;
uniform vec3 u_foreground;
uniform vec3 u_rainColor;
uniform vec3 u_background;
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

float matrixHash11(float value) {
  float hashValue = fract(value * 0.1031);
  hashValue *= hashValue + 33.33;
  hashValue *= hashValue + hashValue;
  return fract(hashValue);
}

float matrixHash21(vec2 value) {
  vec3 hashValue = fract(vec3(value.x, value.y, value.x) * 0.1031);
  hashValue += dot(hashValue, hashValue.yzx + 33.33);
  return fract((hashValue.x + hashValue.y) * hashValue.z);
}

float matrixRainLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 applyMatrixBrightnessContrast(vec3 color) {
  vec3 result = color + vec3(u_brightness);
  float contrastFactor = (1.0 + u_contrast) / (1.0 - u_contrast * 0.99);
  result = (result - 0.5) * contrastFactor + 0.5;
  return clamp(result, 0.0, 1.0);
}

vec3 sampleAdjustedBackgroundSource(vec2 sourceUv) {
  vec3 center = texture2D(u_sourceTexture, sourceUv).rgb;
  if (u_blur > 0.0) {
    vec2 texel = 1.0 / max(u_sourceSize, vec2(1.0));
    vec2 blurTexel = texel * min(u_blur, 12.0);
    center = (
      center * 4.0 +
      texture2D(u_sourceTexture, sourceUv + vec2(blurTexel.x, 0.0)).rgb +
      texture2D(u_sourceTexture, sourceUv - vec2(blurTexel.x, 0.0)).rgb +
      texture2D(u_sourceTexture, sourceUv + vec2(0.0, blurTexel.y)).rgb +
      texture2D(u_sourceTexture, sourceUv - vec2(0.0, blurTexel.y)).rgb
    ) / 8.0;
  }
  return applyMatrixBrightnessContrast(center);
}

float sampleMatrixGlyph(vec2 cellUv, float characterIndex) {
  float margin = 0.05 + u_spacing * 0.15;
  bool inMargin = cellUv.x < margin || cellUv.x > 1.0 - margin ||
    cellUv.y < margin || cellUv.y > 1.0 - margin;
  vec2 innerUv = clamp(
    (cellUv - margin) / max(1.0 - 2.0 * margin, 0.0001),
    0.0,
    1.0
  );
  float atlasColumn = mod(characterIndex, max(u_atlasColumns, 1.0));
  float atlasRow = floor(characterIndex / max(u_atlasColumns, 1.0));
  vec2 characterUvSize = u_atlasCharacterSize / max(u_atlasSize, vec2(1.0));
  vec2 atlasUv = vec2(
    (atlasColumn + innerUv.x) * characterUvSize.x,
    (atlasRow + innerUv.y) * characterUvSize.y
  );
  float sampledGlyph = texture2D(u_glyphAtlas, atlasUv).r;
  return inMargin ? 0.0 : sampledGlyph;
}

vec2 matrixRainIntensity(
  float columnIndex,
  float rowPosition,
  float time,
  float speed,
  float trailLength,
  float direction
) {
  float maximumIntensity = 0.0;
  float isHead = 0.0;

  for (int dropIndex = 0; dropIndex < 3; dropIndex += 1) {
    float dropSeed = columnIndex * 73.156 + float(dropIndex) * 31.71;
    float dropSpeed = 0.5 + matrixHash11(dropSeed) * 0.5;
    float dropPhase = matrixHash11(dropSeed + 17.3);
    float dropLength = trailLength * (0.7 + matrixHash11(dropSeed + 41.7) * 0.6);
    float headPosition = fract(time * speed * dropSpeed * 0.15 + dropPhase);
    float distanceFromHead;

    if (direction < 0.5 || direction > 2.5) {
      distanceFromHead = headPosition - rowPosition;
      if (distanceFromHead < 0.0) {
        distanceFromHead += 1.0;
      }
    } else {
      float invertedHead = 1.0 - headPosition;
      distanceFromHead = rowPosition - invertedHead;
      if (distanceFromHead < 0.0) {
        distanceFromHead += 1.0;
      }
    }

    if (distanceFromHead < dropLength) {
      float trailIntensity = 1.0 - distanceFromHead / max(dropLength, 0.0001);
      maximumIntensity = max(maximumIntensity, trailIntensity * trailIntensity);
      if (distanceFromHead < 0.02) {
        isHead = 1.0;
      }
    }
  }

  return vec2(maximumIntensity, isHead);
}

vec3 applyMatrixSharedProcessing(vec3 color, float sourceLuminance) {
  color = mix(color, 1.0 - color, u_processingInvert);
  color *= u_brightnessMap;
  float edge = length(fwidth(vec2(sourceLuminance))) * u_edgeEnhance * 8.0;
  color += edge;
  if (u_quantizeColors > 0.0) {
    float quantizeLevels = max(u_quantizeColors, 2.0);
    color = floor(color * (quantizeLevels - 1.0) + 0.5) / (quantizeLevels - 1.0);
  }
  color = mix(color, vec3(step(0.5, sourceLuminance)), u_shapeMatching);
  return clamp(color, 0.0, 1.0);
}

float matrixPostNoise(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyMatrixSharedPostProcessing(vec3 color, float sourceLuminance, vec2 uv) {
  vec2 centered = uv * 2.0 - 1.0;
  color += smoothstep(0.65, 1.0, sourceLuminance) * u_bloom * 0.24;
  color.r += (matrixPostNoise(gl_FragCoord.xy + 13.0) - 0.5) * u_postChromatic * 0.08;
  color.b -= (matrixPostNoise(gl_FragCoord.xy + 29.0) - 0.5) * u_postChromatic * 0.08;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159265) * u_scanlines * 0.12;
  color *= mix(1.0, smoothstep(1.25, 0.25, length(centered)), u_vignette);
  color *= mix(1.0, 1.0 - dot(centered, centered) * 0.1, u_crtCurve);
  color = mix(color, color * vec3(0.9, 1.06, 0.92), u_phosphor);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec3 rawSourceColor = texture2D(u_sourceTexture, v_uv).rgb;
  vec3 adjustedSourceColor = sampleAdjustedBackgroundSource(v_uv);
  float sourceLuminance = matrixRainLuminance(rawSourceColor);
  float baseCellSize = max(u_cellSize, 4.0);
  float totalCellSize = baseCellSize * (1.0 + u_spacing);
  float cellsX = u_resolution.x / totalCellSize;
  float cellsY = u_resolution.y / totalCellSize;
  float cellX = floor(v_uv.x * cellsX);
  float cellY = floor(v_uv.y * cellsY);
  vec2 cellUv;

  if (u_direction > 1.5) {
    cellUv = vec2(fract(v_uv.y * cellsY), fract(v_uv.x * cellsX));
  } else {
    cellUv = vec2(fract(v_uv.x * cellsX), fract(v_uv.y * cellsY));
  }

  float columnIndex;
  float rowPosition;
  if (u_direction > 1.5) {
    columnIndex = cellY;
    rowPosition = v_uv.x;
  } else {
    columnIndex = cellX;
    rowPosition = v_uv.y;
  }

  float trailLength = u_trailLength / 50.0;
  vec2 rainData = matrixRainIntensity(
    columnIndex,
    rowPosition,
    u_time,
    u_speed,
    trailLength,
    u_direction
  );
  float rainIntensity = rainData.x;
  float isHead = rainData.y;
  vec2 cellCenterUv = (vec2(cellX, cellY) + 0.5) / vec2(cellsX, cellsY);
  vec3 cellColor = texture2D(u_sourceTexture, cellCenterUv).rgb;
  float cellBrightness = matrixRainLuminance(cellColor);
  float characterSeed = matrixHash21(vec2(cellX, cellY));
  float characterAnimationIndex = floor(characterSeed * 50.0 + u_time * 2.0);
  float characterCount = max(u_characterCount, 1.0);
  float characterIndex = mod(
    floor(matrixHash11(characterAnimationIndex) * characterCount),
    characterCount
  );
  float characterPattern = sampleMatrixGlyph(cellUv, characterIndex);
  float edgeSampleOffset = 1.0 / max(cellsX, cellsY);
  float leftBrightness = matrixRainLuminance(texture2D(u_sourceTexture, v_uv + vec2(-edgeSampleOffset, 0.0)).rgb);
  float rightBrightness = matrixRainLuminance(texture2D(u_sourceTexture, v_uv + vec2(edgeSampleOffset, 0.0)).rgb);
  float topBrightness = matrixRainLuminance(texture2D(u_sourceTexture, v_uv + vec2(0.0, -edgeSampleOffset)).rgb);
  float bottomBrightness = matrixRainLuminance(texture2D(u_sourceTexture, v_uv + vec2(0.0, edgeSampleOffset)).rgb);
  float edgeStrength = abs(leftBrightness - rightBrightness) + abs(topBrightness - bottomBrightness);
  float sourcePresence = step(0.0001, cellBrightness);
  float rainThresholdMask = step(u_threshold, cellBrightness);
  float modelThresholdMask = sourcePresence * rainThresholdMask;
  float effectiveRain = rainIntensity * rainThresholdMask;
  float characterVisibility = characterPattern * rainThresholdMask;
  float modelGlyphMask = characterPattern * modelThresholdMask;
  float modelOpacity = clamp(modelGlyphMask, 0.0, 1.0);
  float modelShade = mix(
    0.55,
    1.0,
    matrixRainLuminance(adjustedSourceColor)
  );
  vec3 modelCharacterColor = u_foreground * modelShade;
  vec3 modelCharacters = modelCharacterColor * modelOpacity;
  vec3 tintedRain = mix(
    u_rainColor,
    u_rainColor * (0.5 + cellBrightness * 0.5),
    0.3
  );
  tintedRain = applyMatrixBrightnessContrast(tintedRain);
  float rainOpacity = effectiveRain * characterVisibility;
  vec3 characterColor = tintedRain * rainOpacity;

  if (isHead > 0.5 && characterPattern > 0.5) {
    float headBrightness = 0.7 + edgeStrength * 0.5;
    vec3 headColor = mix(u_rainColor, vec3(1.0), headBrightness);
    headColor = applyMatrixBrightnessContrast(headColor);
    characterColor = max(
      characterColor,
      headColor * characterVisibility * u_glowIntensity
    );
    rainOpacity = max(
      rainOpacity,
      characterVisibility * u_glowIntensity
    );
  }
  float backgroundRainOpacity = mix(u_backgroundOpacity, 1.0, sourcePresence);
  characterColor *= backgroundRainOpacity;
  rainOpacity *= backgroundRainOpacity;
  float effectOpacity = 1.0 -
    (1.0 - modelOpacity) * (1.0 - clamp(rainOpacity, 0.0, 1.0));

  vec3 effectLayerColor = clamp(modelCharacters + characterColor, 0.0, 1.0);
  effectLayerColor = applyMatrixSharedProcessing(effectLayerColor, sourceLuminance);
  vec3 effectColor = clamp(
    u_background * (1.0 - effectOpacity) + effectLayerColor,
    0.0,
    1.0
  );
  effectColor = applyMatrixSharedPostProcessing(effectColor, sourceLuminance, v_uv);
  gl_FragColor = vec4(effectColor, 1.0);
}
`

export function createMatrixRainShaderMaterial({
  controls,
  sourceTexture,
  glyphAtlas,
  sourceSize = new Vector2(1, 1),
  resolution = sourceSize,
}: CreateMatrixRainShaderMaterialOptions) {
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: MATRIX_RAIN_FRAGMENT_SHADER,
    uniforms: {
      u_sourceTexture: { value: sourceTexture },
      u_glyphAtlas: { value: glyphAtlas.texture },
      u_sourceSize: { value: sourceSize.clone() },
      u_resolution: { value: resolution.clone() },
      u_atlasSize: { value: glyphAtlas.size.clone() },
      u_atlasCharacterSize: { value: glyphAtlas.characterSize.clone() },
      u_atlasColumns: { value: glyphAtlas.columns },
      u_characterCount: { value: glyphAtlas.count },
      u_cellSize: { value: 12 },
      u_spacing: { value: 0 },
      u_speed: { value: 1 },
      u_trailLength: { value: 15 },
      u_direction: { value: MATRIX_RAIN_DIRECTION_IDS.down },
      u_glowIntensity: { value: 1 },
      u_backgroundOpacity: { value: 0.5 },
      u_brightness: { value: 0 },
      u_contrast: { value: 0 },
      u_threshold: { value: 0 },
      u_foreground: { value: new Color('#ffffff') },
      u_rainColor: { value: new Color('#00ff00') },
      u_background: { value: new Color('#000000') },
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
    vertexShader: MATRIX_RAIN_VERTEX_SHADER,
  })

  applyMatrixRainUniforms(material, controls, glyphAtlas)
  return material
}

export function applyMatrixRainUniforms(
  material: ShaderMaterial,
  controls: MatrixRainControls,
  glyphAtlas?: MatrixRainGlyphAtlas,
) {
  material.uniforms.u_cellSize.value = readNumber(controls['cell-size'], 12)
  material.uniforms.u_spacing.value = readNumber(controls.spacing, 0)
  material.uniforms.u_speed.value = readNumber(controls.speed, 1)
  material.uniforms.u_trailLength.value = readNumber(controls['trail-length'], 15)
  material.uniforms.u_direction.value = readDirection(controls.direction)
  material.uniforms.u_glowIntensity.value = readNumber(controls.glow, 1)
  material.uniforms.u_backgroundOpacity.value = readNumber(controls['bg-opacity'], 0.5)
  material.uniforms.u_brightness.value = readNumber(controls.brightness, 0) / 100
  material.uniforms.u_contrast.value = readNumber(controls.contrast, 0) / 100
  material.uniforms.u_threshold.value = readNumber(controls.threshold, 0)
  material.uniforms.u_foreground.value.set(readString(controls.foreground, '#ffffff'))
  material.uniforms.u_rainColor.value.set(readString(controls['rain-color'], '#00ff00'))
  material.uniforms.u_background.value.set(readString(controls.background, '#000000'))
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

  if (glyphAtlas) {
    material.uniforms.u_glyphAtlas.value = glyphAtlas.texture
    material.uniforms.u_atlasSize.value.copy(glyphAtlas.size)
    material.uniforms.u_atlasCharacterSize.value.copy(glyphAtlas.characterSize)
    material.uniforms.u_atlasColumns.value = glyphAtlas.columns
    material.uniforms.u_characterCount.value = glyphAtlas.count
  }
}

export function disposeMatrixRainShaderMaterial(material: ShaderMaterial) {
  material.dispose()
}

function readNumber(value: MatrixRainControlValue | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readBoolean(value: MatrixRainControlValue | undefined) {
  return value === true ? 1 : 0
}

function readString(value: MatrixRainControlValue | undefined, fallback: string) {
  return typeof value === 'string' ? value : fallback
}

function readDirection(value: MatrixRainControlValue | undefined) {
  return typeof value === 'string' && value in MATRIX_RAIN_DIRECTION_IDS
    ? MATRIX_RAIN_DIRECTION_IDS[value as keyof typeof MATRIX_RAIN_DIRECTION_IDS]
    : MATRIX_RAIN_DIRECTION_IDS.down
}
