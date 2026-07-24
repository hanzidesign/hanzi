import {
  Color,
  DoubleSide,
  ShaderMaterial,
  Vector2,
  type IUniform,
} from 'three'
import type {
  StudioAsciiCharsetStyle,
  StudioAsciiPalette,
  StudioAsciiState,
  StudioTheme,
} from '@/app/studio/studio-store'
import {
  compileStudioEffectRuntime,
  type StudioEffectRuntime,
} from '@/components/studio/studio-effect-runtime'
import {
  CHARACTER_SETS,
  createCharacterGlyphAtlas,
  resolveCharacterSet,
} from '@/components/studio/character-glyph-atlas'

export const ASCII_CHARACTER_SETS: Record<StudioAsciiCharsetStyle, string> = CHARACTER_SETS

export function resolveAsciiCharacterSet(
  style: StudioAsciiCharsetStyle,
  customChars: string,
) {
  return resolveCharacterSet(style, customChars)
}

export const ASCII_VERTEX_SHADER = `
varying vec2 v_uv;
varying vec3 v_worldNormal;
varying float v_viewDepth;

void main() {
  v_uv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  v_worldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  v_viewDepth = -viewPosition.z;
  gl_Position = projectionMatrix * viewPosition;
}
`

export const ASCII_FRAGMENT_SHADER = `
precision highp float;

uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform vec2 u_visualResolution;
uniform float u_asciiCellSize;
uniform float u_asciiDensity;
uniform float u_asciiContrast;
uniform float u_asciiBrightness;
uniform float u_asciiSaturation;
uniform float u_asciiHueRotation;
uniform float u_asciiSharpness;
uniform float u_asciiGamma;
uniform float u_asciiInvert;
uniform float u_asciiCharsetStyle;
uniform float u_asciiPalette;
uniform float u_colorIntensity;
uniform float u_depthInfluence;
uniform float u_normalInfluence;
uniform vec3 u_foregroundColor;
uniform vec3 u_backgroundColor;
uniform float u_scanlineAmount;
uniform float u_bloomAmount;
uniform float u_curvature;
uniform float u_vignette;
uniform float u_chromaticOffset;
uniform float u_grain;
uniform float u_studioEffectId;
uniform float u_effectA;
uniform float u_effectB;
uniform float u_effectC;
uniform float u_effectD;
uniform float u_effectE;
uniform float u_effectF;
uniform float u_effectG;
uniform float u_effectH;
uniform float u_effectI;
uniform float u_effectJ;
uniform float u_effectK;
uniform float u_effectL;
uniform float u_effectM;
uniform float u_effectN;
uniform float u_effectO;
uniform float u_effectP;
uniform float u_effectQ;
uniform float u_effectR;
uniform float u_effectS;
uniform float u_effectT;
uniform float u_processingA;
uniform float u_processingB;
uniform float u_processingC;
uniform float u_processingD;
uniform float u_processingE;
uniform float u_processingF;
uniform float u_postA;
uniform float u_postB;
uniform float u_postC;
uniform float u_postD;
uniform float u_postE;
uniform float u_postF;
uniform float u_postG;
uniform float u_postH;
uniform float u_postI;
uniform float u_customGlyphHash;
uniform float u_customGlyphCount;
uniform sampler2D u_asciiGlyphAtlas;
uniform float u_asciiGlyphCount;
uniform float u_asciiGlyphColumns;
uniform vec3 u_effectColorA;
uniform vec3 u_effectColorB;

varying vec2 v_uv;
varying vec3 v_worldNormal;
varying float v_viewDepth;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float studioLuma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec2 rotateUv(vec2 uv, float turns) {
  float angle = turns * 3.14159265;
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c) * uv;
}

float linePattern(vec2 uv, float turns, float density, float width) {
  vec2 rotated = rotateUv(uv, turns);
  float line = abs(fract(rotated.y * max(density, 0.1)) - 0.5);
  return 1.0 - smoothstep(width, width + 0.015, line);
}

float shapePattern(float shape, vec2 local, float radius) {
  vec2 centered = abs(local - 0.5);
  float circle = length(centered);
  float square = max(centered.x, centered.y);
  float diamond = centered.x + centered.y;
  float line = abs(local.y - 0.5);
  float dist = circle;

  if (shape > 0.5 && shape < 1.5) {
    dist = square;
  } else if (shape > 1.5 && shape < 2.5) {
    dist = diamond;
  } else if (shape > 2.5) {
    dist = line;
  }

  return 1.0 - smoothstep(radius, radius + 0.02, dist);
}

float quantizeValue(float value, float levels) {
  float safeLevels = max(levels, 2.0);
  return floor(clamp(value, 0.0, 0.999) * safeLevels) / max(safeLevels - 1.0, 1.0);
}

vec3 colorModeMix(float mode, vec3 original, float mask, vec3 foreground, vec3 background) {
  vec3 mono = mix(background, foreground, mask);
  vec3 tonal = vec3(mask);
  vec3 palette = mix(vec3(0.05, 0.12, 0.1), mix(vec3(0.35, 1.0, 0.45), vec3(1.0, 0.72, 0.28), mask), mask);
  vec3 rgb = vec3(mask, mask * 0.72 + hash12(vec2(mask, mode)) * 0.12, 1.0 - mask * 0.45);

  if (mode > 0.5 && mode < 1.5) {
    return tonal;
  }

  if (mode > 1.5 && mode < 2.5) {
    return palette;
  }

  if (mode > 2.5 && mode < 3.5) {
    return rgb;
  }

  if (mode > 3.5) {
    return mix(original, mono, 0.35);
  }

  return mono;
}

float fbmNoise(vec2 p, float octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  vec2 point = p;

  for (int index = 0; index < 6; index++) {
    if (float(index) >= octaves) {
      break;
    }

    value += hash12(floor(point)) * amplitude;
    point *= 2.03;
    amplitude *= 0.5;
  }

  return value;
}

float voronoiPattern(vec2 p, float randomize) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  float best = 8.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 point = vec2(
        hash12(cell + offset + randomize),
        hash12(cell + offset + randomize + 17.13)
      );
      best = min(best, length(offset + point - local));
    }
  }

  return best;
}

float glyph5x7(float index, vec2 uv) {
  vec2 cell = floor(clamp(uv, 0.0, 0.999) * vec2(5.0, 7.0));
  float x = cell.x;
  float y = cell.y;
  float border = step(x, 0.5) + step(3.5, x) + step(y, 0.5) + step(5.5, y);
  float diagA = step(abs(x - y * 0.66), 0.55);
  float diagB = step(abs((4.0 - x) - y * 0.66), 0.55);
  float mid = step(abs(y - 3.0), 0.45);
  float column = step(abs(x - 2.0), 0.45);
  float sparse = step(0.73, hash12(cell + index * 13.7));

  if (index < 0.5) {
    return 0.0;
  }

  if (index < 1.5) {
    return sparse * step(4.0, y);
  }

  if (index < 2.5) {
    return max(column * step(2.0, y), sparse);
  }

  if (index < 3.5) {
    return max(mid, diagA * 0.9);
  }

  if (index < 4.5) {
    return max(max(diagA, diagB), mid);
  }

  if (index < 5.5) {
    return max(border, max(mid, column) * 0.75);
  }

  return max(border, max(diagA, diagB));
}

float asciiCell(float brightness, vec2 cellUv, float style) {
  float styleBias = mix(-0.12, 0.16, clamp(style / 6.0, 0.0, 1.0));
  float ramp = clamp((brightness + styleBias) * 6.0, 0.0, 6.0);
  float index = floor(ramp + 0.0001);

  if (style > 2.5 && style < 3.5) {
    cellUv = floor(cellUv * 2.0) / 2.0;
  }

  if (style > 4.5 && style < 5.5) {
    cellUv.x += sin(u_time * 3.0 + cellUv.y * 16.0) * 0.04;
  }

  return glyph5x7(index, cellUv);
}

float sampleAsciiGlyphAtlas(float brightness, vec2 cellUv) {
  float glyphCount = max(u_asciiGlyphCount, 1.0);
  float columns = max(u_asciiGlyphColumns, 1.0);
  float rows = max(ceil(glyphCount / columns), 1.0);
  float glyphIndex = floor((1.0 - clamp(brightness, 0.0, 0.999)) * glyphCount);
  glyphIndex = clamp(glyphIndex, 0.0, glyphCount - 1.0);
  vec2 glyphCell = vec2(mod(glyphIndex, columns), floor(glyphIndex / columns));
  vec2 atlasUv = (glyphCell + clamp(cellUv, vec2(0.01), vec2(0.99))) / vec2(columns, rows);
  vec4 glyphSample = texture2D(u_asciiGlyphAtlas, atlasUv);

  return max(glyphSample.a, studioLuma(glyphSample.rgb));
}

float studioAsciiGlyph(float brightness, vec2 cellUv, vec2 cellId, float setId) {
  float standardGlyph = asciiCell(brightness, cellUv, 0.0);
  float blockBody = smoothstep(0.02, 0.12, cellUv.x) *
    smoothstep(0.02, 0.12, cellUv.y) *
    smoothstep(0.02, 0.12, 1.0 - cellUv.x) *
    smoothstep(0.02, 0.12, 1.0 - cellUv.y);
  float blockGlyph = blockBody * smoothstep(0.08, 0.92, brightness);
  float binaryIndex = mix(1.0, 2.0, step(0.5, hash12(cellId + floor(brightness * 4.0))));
  float binaryGlyph = glyph5x7(binaryIndex, cellUv);
  float detailedGlyph = max(asciiCell(brightness, cellUv, 6.0), glyph5x7(floor(brightness * 6.0), fract(cellUv * 1.35)));
  float minimalGlyph = asciiCell(quantizeValue(brightness, 3.0), cellUv, 1.0);
  float alphabeticGlyph = glyph5x7(2.0 + floor(hash12(cellId + 4.1) * 5.0), cellUv);
  float numericGlyph = glyph5x7(1.0 + floor(clamp(brightness, 0.0, 0.999) * 6.0), cellUv);
  float mathGlyph = max(
    linePattern(cellUv, 0.25, 1.0, 0.08),
    max(linePattern(cellUv, -0.25, 1.0, 0.08), linePattern(cellUv, 0.0, 1.0, 0.06))
  ) * smoothstep(0.12, 0.88, brightness);
  float symbolDot = shapePattern(0.0, cellUv, 0.11 + brightness * 0.12);
  float symbolSlash = linePattern(cellUv + hash12(cellId) * 0.1, 0.33, 1.0, 0.05);
  float symbolGlyph = max(symbolDot, symbolSlash * step(0.35, brightness));
  float customIndex = 1.0 + mod(floor(hash12(cellId + u_customGlyphHash * 29.0) * max(u_customGlyphCount, 1.0)), 6.0);
  float customGlyph = glyph5x7(customIndex, cellUv);
  customGlyph = max(customGlyph, step(0.48, hash12(cellId + u_customGlyphHash * 31.0)) * blockBody * 0.72);

  float glyph = standardGlyph;
  if (setId > 0.5 && setId < 1.5) {
    glyph = blockGlyph;
  } else if (setId > 1.5 && setId < 2.5) {
    glyph = binaryGlyph;
  } else if (setId > 2.5 && setId < 3.5) {
    glyph = detailedGlyph;
  } else if (setId > 3.5 && setId < 4.5) {
    glyph = minimalGlyph;
  } else if (setId > 4.5 && setId < 5.5) {
    glyph = alphabeticGlyph;
  } else if (setId > 5.5 && setId < 6.5) {
    glyph = numericGlyph;
  } else if (setId > 6.5 && setId < 7.5) {
    glyph = mathGlyph;
  } else if (setId > 7.5 && setId < 8.5) {
    glyph = symbolGlyph;
  } else if (setId > 8.5) {
    glyph = customGlyph;
  }

  return clamp(glyph, 0.0, 1.0);
}

vec3 rotateHue(vec3 color, float degrees) {
  float angle = radians(degrees);
  float s = sin(angle);
  float c = cos(angle);
  mat3 transform = mat3(
    0.213 + c * 0.787 - s * 0.213,
    0.715 - c * 0.715 - s * 0.715,
    0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143,
    0.715 + c * 0.285 + s * 0.140,
    0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787,
    0.715 - c * 0.715 + s * 0.715,
    0.072 + c * 0.928 + s * 0.072
  );

  return clamp(transform * color, 0.0, 1.0);
}

vec3 adjustSaturation(vec3 color, float amount) {
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(gray), color, 1.0 + amount);
}

vec3 paletteColor(float brightness, float mask) {
  vec3 fg = u_foregroundColor;
  vec3 bg = u_backgroundColor;

  if (u_asciiPalette < 0.5) {
    fg = vec3(0.45, 1.0, 0.58);
    bg = vec3(0.01, 0.02, 0.015);
  } else if (u_asciiPalette < 1.5) {
    fg = vec3(1.0, 0.66, 0.26);
    bg = vec3(0.035, 0.024, 0.01);
  } else if (u_asciiPalette < 2.5) {
    fg = vec3(0.93, 0.95, 0.91);
    bg = vec3(0.015, 0.016, 0.018);
  } else if (u_asciiPalette < 3.5) {
    fg = mix(vec3(0.1, 0.9, 1.0), vec3(1.0, 0.2, 0.74), brightness);
    bg = vec3(0.025, 0.018, 0.06);
  }

  return mix(bg, fg, mask * u_colorIntensity);
}

vec3 applyEffectAdjustments(vec3 color, float brightnessDelta, float contrastDelta) {
  color += brightnessDelta;
  color = (color - 0.5) * (1.0 + contrastDelta) + 0.5;
  return clamp(color, 0.0, 1.0);
}

vec4 applyStudioAscii(vec3 color, float glyph, float brightness, vec2 cellUv, vec2 cellId) {
  float mask = glyph;
  float studioAsciiIntensity = max(u_effectM, 0.01) * max(u_colorIntensity, 0.0);
  vec3 monoAsciiColor = mix(u_effectColorB, u_effectColorA, mask * studioAsciiIntensity);
  vec3 originalAsciiColor = mix(u_backgroundColor, color, mask * studioAsciiIntensity);
  vec3 asciiColor = mix(monoAsciiColor, originalAsciiColor, step(0.5, u_effectL));
  asciiColor = applyEffectAdjustments(asciiColor, u_effectF, u_effectG);
  asciiColor = adjustSaturation(asciiColor, u_effectH);
  asciiColor = rotateHue(asciiColor, u_effectI * 360.0);
  asciiColor = mix(asciiColor, vec3(smoothstep(0.5, 0.52, brightness)), clamp(u_effectJ, 0.0, 1.0) * 0.3);
  asciiColor = pow(max(asciiColor, vec3(0.0)), vec3(1.0 / max(u_effectK, 0.1)));
  return vec4(asciiColor, mask);
}

vec4 applyStudioProcessing(vec4 effectColor, float brightness) {
  vec3 color = effectColor.rgb;
  float mask = effectColor.a;
  color = mix(color, 1.0 - color, u_processingA);
  color *= u_processingB;
  color += fwidth(brightness) * u_processingC * 4.0;
  vec3 softenedProcessingColor = mix(vec3(studioLuma(color)), color, 0.35 + smoothstep(0.0, 1.0, mask) * 0.4);
  softenedProcessingColor = mix(softenedProcessingColor, vec3(brightness), 0.25);
  color = mix(color, softenedProcessingColor, clamp(u_processingD, 0.0, 1.0));
  if (u_processingE > 0.0) {
    float quantizeLevels = max(u_processingE, 2.0);
    color = floor(color * (quantizeLevels - 1.0) + 0.5) / (quantizeLevels - 1.0);
  }
  color = mix(color, color * smoothstep(0.15, 0.85, mask), u_processingF);
  return vec4(clamp(color, 0.0, 1.0), mask);
}

vec3 applyStudioPostProcessing(vec3 color, float brightness, vec2 screenUv, vec2 centered, vec2 cellId, vec2 visualPixel) {
  color += smoothstep(0.58, 1.0, brightness) * u_postA * 0.35;
  color.r += (hash12(cellId + 12.0) - 0.5) * u_postE * 0.1;
  color.b -= (hash12(cellId + 15.0) - 0.5) * u_postE * 0.1;
  color *= 1.0 - sin(visualPixel.y * 3.14159) * 0.16 * u_postF;
  color *= mix(1.0, smoothstep(1.2, 0.2, length(centered)), u_postG);
  color = mix(color, color * (1.0 - dot(centered, centered) * 0.12), u_postH);
  color = mix(color, color * vec3(0.92, 1.05, 0.9), u_postI);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec2 screenUv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));
  vec2 visualPixel = screenUv * u_visualResolution;
  vec2 centered = screenUv * 2.0 - 1.0;
  float curve = dot(centered, centered) * u_curvature;
  vec2 curvedUv = screenUv + centered * curve * 0.08;
  vec2 cellId = floor(curvedUv * u_visualResolution / max(u_asciiCellSize, 1.0));
  float asciiEffectCellSize = max(u_asciiCellSize, 1.0);
  vec2 asciiEffectCellId = floor(curvedUv * u_visualResolution / asciiEffectCellSize);
  vec2 asciiEffectCellUv = fract(curvedUv * u_visualResolution / asciiEffectCellSize);
  float glyphScale = max(u_effectB, 0.01);
  vec2 spacedAsciiEffectCellUv = (asciiEffectCellUv - 0.5) / max(glyphScale, 0.001) + 0.5;
  float insideGlyphBox = step(0.0, min(spacedAsciiEffectCellUv.x, spacedAsciiEffectCellUv.y)) *
    step(max(spacedAsciiEffectCellUv.x, spacedAsciiEffectCellUv.y), 1.0);

  vec3 normal = normalize(v_worldNormal);
  float lighting = dot(normal, normalize(vec3(-0.35, 0.5, 0.78))) * 0.5 + 0.5;
  float depthCue = 1.0 - smoothstep(2.2, 6.0, v_viewDepth);
  float normalCue = 1.0 - abs(normal.z);
  float shimmer = (hash12(cellId + floor(u_time * 6.0)) - 0.5) * 0.09 * u_asciiDensity;
  float brightness = lighting;
  brightness = mix(brightness, depthCue, u_depthInfluence);
  brightness = mix(brightness, max(brightness, normalCue), u_normalInfluence);
  brightness = clamp((brightness - 0.5) * u_asciiContrast + 0.5 + u_asciiBrightness + shimmer, 0.0, 1.0);
  brightness = pow(brightness, 1.0 / max(u_asciiGamma, 0.001));
  brightness = mix(brightness, smoothstep(0.35, 0.65, brightness), u_asciiSharpness);
  brightness = mix(brightness, 1.0 - brightness, u_asciiInvert);

  float atlasGlyph = sampleAsciiGlyphAtlas(brightness, spacedAsciiEffectCellUv);
  float studioAsciiMask = studioAsciiGlyph(brightness, spacedAsciiEffectCellUv, asciiEffectCellId, u_asciiCharsetStyle);
  studioAsciiMask = mix(studioAsciiMask, atlasGlyph, step(0.5, u_asciiGlyphCount));
  studioAsciiMask *= insideGlyphBox;
  studioAsciiMask *= smoothstep(0.0, 0.12, u_asciiDensity);

  vec3 color = paletteColor(brightness, studioAsciiMask);
  vec4 studioColor = applyStudioAscii(color, studioAsciiMask, brightness, spacedAsciiEffectCellUv, asciiEffectCellId);

  studioColor = applyStudioProcessing(studioColor, brightness);
  float finalAlpha = max(studioAsciiMask, studioColor.a);
  color = studioColor.rgb;
  float scanline = 1.0 - sin(visualPixel.y * 3.14159) * 0.5 * u_scanlineAmount;
  float vignette = smoothstep(1.15, 0.2, length(centered)) * u_vignette + (1.0 - u_vignette);
  float grain = (hash12(visualPixel + u_time * 17.0) - 0.5) * u_grain;
  float bloom = smoothstep(0.68, 1.0, brightness) * u_bloomAmount;
  float chroma = (hash12(cellId + u_mouse * 31.0) - 0.5) * u_chromaticOffset;

  color = adjustSaturation(color, u_asciiSaturation);
  color = rotateHue(color, u_asciiHueRotation);
  color = color * scanline * vignette + bloom + grain + chroma;
  color = applyStudioPostProcessing(color, brightness, screenUv, centered, cellId, visualPixel);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), finalAlpha);
}
`

type CreateAsciiShaderMaterialOptions = {
  ascii: StudioAsciiState
  studioRuntime?: StudioEffectRuntime
  theme?: StudioTheme
  foregroundColor: string
  backgroundColor: string
}

export type UpdateAsciiShaderUniformsOptions = {
  ascii: StudioAsciiState
  studioRuntime?: StudioEffectRuntime
  theme?: StudioTheme
  foregroundColor?: string
  backgroundColor?: string
}

type AsciiMaterialGlyphState = {
  characters: string
  disposed: boolean
}

const asciiMaterialGlyphStates = new WeakMap<ShaderMaterial, AsciiMaterialGlyphState>()
const asciiUniformGlyphStates = new WeakMap<object, AsciiMaterialGlyphState>()
const disposedAsciiMaterials = new WeakSet<ShaderMaterial>()

export function createAsciiShaderMaterial({
  ascii,
  studioRuntime = compileStudioEffectRuntime({
    selectedEffectId: 'ascii',
    controls: {},
  }),
  theme = 'light',
  foregroundColor,
  backgroundColor,
}: CreateAsciiShaderMaterialOptions) {
  const material = new ShaderMaterial({
    vertexShader: ASCII_VERTEX_SHADER,
    fragmentShader: ASCII_FRAGMENT_SHADER,
    side: DoubleSide,
    transparent: true,
    uniforms: createAsciiShaderUniforms({
      ascii,
      studioRuntime,
      theme,
      foregroundColor,
      backgroundColor,
    }),
  })

  const glyphState = {
    characters: resolveAsciiCharacterSet(ascii.charsetStyle, studioRuntime.customGlyphChars),
    disposed: false,
  }
  asciiMaterialGlyphStates.set(material, glyphState)
  asciiUniformGlyphStates.set(material.uniforms, glyphState)

  return material
}

export function disposeAsciiShaderMaterial(material: ShaderMaterial) {
  if (disposedAsciiMaterials.has(material)) {
    return
  }

  disposedAsciiMaterials.add(material)
  const glyphAtlas = material.uniforms.u_asciiGlyphAtlas?.value as
    | { dispose?: () => void }
    | undefined

  glyphAtlas?.dispose?.()
  const state = asciiMaterialGlyphStates.get(material)
  if (state) {
    state.disposed = true
  }
  material.dispose()
}

/**
 * Updates every ASCII/material-facing control while retaining material and
 * glyph-atlas identity. A new atlas is allocated only when the effective
 * character string changes (for example, a custom charset edit).
 */
export function updateAsciiShaderUniforms(
  target: ShaderMaterial | Record<string, IUniform>,
  {
    ascii,
    studioRuntime = compileStudioEffectRuntime({
      selectedEffectId: 'ascii',
      controls: {},
    }),
    theme = 'light',
    foregroundColor = ascii.foregroundColor,
    backgroundColor = ascii.backgroundColor,
  }: UpdateAsciiShaderUniformsOptions,
) {
  const uniforms = target instanceof ShaderMaterial ? target.uniforms : target
  setUniformValue(uniforms, 'u_asciiCellSize', ascii.cellSize)
  setUniformValue(uniforms, 'u_asciiDensity', ascii.density)
  setUniformValue(uniforms, 'u_asciiContrast', ascii.contrast)
  setUniformValue(uniforms, 'u_asciiBrightness', resolveAsciiThemeBrightness(ascii.brightness, theme))
  setUniformValue(uniforms, 'u_asciiSaturation', ascii.saturation)
  setUniformValue(uniforms, 'u_asciiHueRotation', ascii.hueRotation)
  setUniformValue(uniforms, 'u_asciiSharpness', ascii.sharpness)
  setUniformValue(uniforms, 'u_asciiGamma', ascii.gamma)
  setUniformValue(uniforms, 'u_asciiInvert', ascii.invert ? 1 : 0)
  setUniformValue(uniforms, 'u_asciiCharsetStyle', charsetStyleToUniform(ascii.charsetStyle))
  setUniformValue(uniforms, 'u_asciiPalette', paletteToUniform(ascii.palette))
  setUniformValue(uniforms, 'u_colorIntensity', ascii.colorIntensity)
  setUniformValue(uniforms, 'u_depthInfluence', ascii.depthInfluence)
  setUniformValue(uniforms, 'u_normalInfluence', ascii.normalInfluence)
  setUniformColorValue(uniforms, 'u_foregroundColor', foregroundColor)
  setUniformColorValue(uniforms, 'u_backgroundColor', backgroundColor)
  setUniformValue(uniforms, 'u_scanlineAmount', ascii.scanlineAmount)
  setUniformValue(uniforms, 'u_bloomAmount', ascii.bloomAmount)
  setUniformValue(uniforms, 'u_curvature', ascii.curvature)
  setUniformValue(uniforms, 'u_vignette', ascii.vignette)
  setUniformValue(uniforms, 'u_chromaticOffset', ascii.chromaticOffset)
  setUniformValue(uniforms, 'u_grain', ascii.grain)

  const glyphState = target instanceof ShaderMaterial
    ? asciiMaterialGlyphStates.get(target)
    : asciiUniformGlyphStates.get(target)
  if (glyphState && !glyphState.disposed) {
    const characters = resolveAsciiCharacterSet(ascii.charsetStyle, studioRuntime.customGlyphChars)
    if (glyphState.characters !== characters) {
      const previousTexture = uniforms.u_asciiGlyphAtlas?.value as
        | { dispose?: () => void }
        | undefined
      const nextAtlas = createCharacterGlyphAtlas(ascii.charsetStyle, studioRuntime.customGlyphChars)
      uniforms.u_asciiGlyphAtlas.value = nextAtlas.texture
      uniforms.u_asciiGlyphCount.value = nextAtlas.count
      uniforms.u_asciiGlyphColumns.value = nextAtlas.columns
      previousTexture?.dispose?.()
      glyphState.characters = characters
    }
  }

  applyStudioRuntimeUniforms(uniforms, studioRuntime)
}

// Keep a descriptive alias for callers that treat the material itself as the
// resource being updated.
export const applyAsciiShaderUniforms = updateAsciiShaderUniforms

function createAsciiShaderUniforms({
  ascii,
  studioRuntime,
  theme,
  foregroundColor,
  backgroundColor,
}: Required<CreateAsciiShaderMaterialOptions>): Record<string, IUniform> {
  const glyphAtlas = createCharacterGlyphAtlas(
    ascii.charsetStyle,
    studioRuntime.customGlyphChars,
  )
  const uniforms: Record<string, IUniform> = {
    u_time: { value: 0 },
    u_mouse: { value: new Vector2(0, 0) },
    u_resolution: { value: new Vector2(1, 1) },
    u_visualResolution: { value: new Vector2(1, 1) },
    u_asciiCellSize: { value: ascii.cellSize },
    u_asciiDensity: { value: ascii.density },
    u_asciiContrast: { value: ascii.contrast },
    u_asciiBrightness: { value: resolveAsciiThemeBrightness(ascii.brightness, theme) },
    u_asciiSaturation: { value: ascii.saturation },
    u_asciiHueRotation: { value: ascii.hueRotation },
    u_asciiSharpness: { value: ascii.sharpness },
    u_asciiGamma: { value: ascii.gamma },
    u_asciiInvert: { value: ascii.invert ? 1 : 0 },
    u_asciiCharsetStyle: { value: charsetStyleToUniform(ascii.charsetStyle) },
    u_asciiPalette: { value: paletteToUniform(ascii.palette) },
    u_colorIntensity: { value: ascii.colorIntensity },
    u_depthInfluence: { value: ascii.depthInfluence },
    u_normalInfluence: { value: ascii.normalInfluence },
    u_foregroundColor: { value: new Color(foregroundColor) },
    u_backgroundColor: { value: new Color(backgroundColor) },
    u_scanlineAmount: { value: ascii.scanlineAmount },
    u_bloomAmount: { value: ascii.bloomAmount },
    u_curvature: { value: ascii.curvature },
    u_vignette: { value: ascii.vignette },
    u_chromaticOffset: { value: ascii.chromaticOffset },
    u_grain: { value: ascii.grain },
    u_asciiGlyphAtlas: { value: glyphAtlas.texture },
    u_asciiGlyphCount: { value: glyphAtlas.count },
    u_asciiGlyphColumns: { value: glyphAtlas.columns },
  }

  assignStudioRuntimeUniforms(uniforms, studioRuntime)

  return uniforms
}

function resolveAsciiThemeBrightness(brightness: number, theme: StudioTheme) {
  return theme === 'dark' ? -brightness : brightness
}

export function applyStudioRuntimeUniforms(
  uniforms: Record<string, IUniform>,
  runtime: StudioEffectRuntime,
) {
  assignStudioRuntimeUniforms(uniforms, runtime)
}

function assignStudioRuntimeUniforms(
  uniforms: Record<string, IUniform>,
  runtime: StudioEffectRuntime,
) {
  setUniformValue(uniforms, 'u_studioEffectId', runtime.effectId)
  setUniformValue(uniforms, 'u_effectColorA', readUniformColor(uniforms, 'u_effectColorA', runtime.effectColorA))
  setUniformValue(uniforms, 'u_effectColorB', readUniformColor(uniforms, 'u_effectColorB', runtime.effectColorB))
  setUniformValue(uniforms, 'u_customGlyphHash', runtime.customGlyphHash)
  setUniformValue(uniforms, 'u_customGlyphCount', runtime.customGlyphCount)

  assignUniformSlots(uniforms, 'u_effect', runtime.effectValues, EFFECT_SLOT_NAMES)
  assignUniformSlots(uniforms, 'u_processing', runtime.processingValues, PROCESSING_SLOT_NAMES)
  assignUniformSlots(uniforms, 'u_post', runtime.postValues, POST_SLOT_NAMES)
}

function assignUniformSlots(
  uniforms: Record<string, IUniform>,
  _prefix: string,
  values: number[],
  slotNames: string[],
) {
  for (let index = 0; index < slotNames.length; index += 1) {
    setUniformValue(uniforms, slotNames[index], values[index] ?? 0)
  }
}

function setUniformValue(uniforms: Record<string, IUniform>, name: string, value: unknown) {
  if (uniforms[name]) {
    uniforms[name].value = value
    return
  }

  uniforms[name] = { value }
}

function readUniformColor(
  uniforms: Record<string, IUniform>,
  name: string,
  value: [number, number, number],
) {
  const color = uniforms[name]?.value instanceof Color
    ? uniforms[name].value
    : new Color()

  color.setRGB(value[0], value[1], value[2])

  return color
}

function setUniformColorValue(
  uniforms: Record<string, IUniform>,
  name: string,
  value: string,
) {
  const color = uniforms[name]?.value instanceof Color
    ? uniforms[name].value as Color
    : new Color()
  color.set(value)
  if (uniforms[name]) {
    uniforms[name].value = color
  } else {
    uniforms[name] = { value: color }
  }
}

const EFFECT_SLOT_NAMES = [
  'u_effectA',
  'u_effectB',
  'u_effectC',
  'u_effectD',
  'u_effectE',
  'u_effectF',
  'u_effectG',
  'u_effectH',
  'u_effectI',
  'u_effectJ',
  'u_effectK',
  'u_effectL',
  'u_effectM',
  'u_effectN',
  'u_effectO',
  'u_effectP',
  'u_effectQ',
  'u_effectR',
  'u_effectS',
  'u_effectT',
]

const PROCESSING_SLOT_NAMES = [
  'u_processingA',
  'u_processingB',
  'u_processingC',
  'u_processingD',
  'u_processingE',
  'u_processingF',
]

const POST_SLOT_NAMES = [
  'u_postA',
  'u_postB',
  'u_postC',
  'u_postD',
  'u_postE',
  'u_postF',
  'u_postG',
  'u_postH',
  'u_postI',
]

function charsetStyleToUniform(style: StudioAsciiCharsetStyle) {
  const values: Record<StudioAsciiCharsetStyle, number> = {
    standard: 0,
    blocks: 1,
    binary: 2,
    detailed: 3,
    minimal: 4,
    alphabetic: 5,
    numeric: 6,
    math: 7,
    symbols: 8,
    custom: 9,
  }

  return values[style]
}

function paletteToUniform(palette: StudioAsciiPalette) {
  const values: Record<StudioAsciiPalette, number> = {
    green: 0,
    amber: 1,
    noir: 2,
    synthwave: 3,
    custom: 4,
  }

  return values[palette]
}
