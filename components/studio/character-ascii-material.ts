import {
  CanvasTexture,
  Color,
  ClampToEdgeWrapping,
  DataTexture,
  DoubleSide,
  NearestFilter,
  RGBAFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  type IUniform,
} from 'three'
import type {
  StudioAsciiCharsetStyle,
  StudioAsciiPalette,
  StudioAsciiState,
} from '@/app/studio/studio-store'
import {
  compileGrainradEffectRuntime,
  type GrainradEffectRuntime,
} from '@/components/studio/grainrad-effect-runtime'

export const ASCII_CHARACTER_SETS: Record<StudioAsciiCharsetStyle, string> = {
  standard: '@%#*+=-:. ',
  blocks: '█▓▒░',
  binary: '01',
  detailed: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
  minimal: '#.',
  alphabetic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  numeric: '0123456789',
  math: '+-*/=<>^%()[]{}|~',
  symbols: '!@#$%^&*()_+-=[]{}|;\':",./<>?`~',
  custom: '█▓▒░@#%*+=-:. ',
}

export function resolveAsciiCharacterSet(
  style: StudioAsciiCharsetStyle,
  customChars: string,
) {
  if (style === 'custom' && customChars.length > 0) {
    return customChars
  }

  return ASCII_CHARACTER_SETS[style]
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
uniform float u_grainradEffectId;
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

float grainradLuma(vec3 color) {
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

  return max(glyphSample.a, grainradLuma(glyphSample.rgb));
}

float grainradAsciiGlyph(float brightness, vec2 cellUv, vec2 cellId, float setId) {
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

vec4 applyGrainradAscii(vec3 color, float glyph, float brightness, vec2 cellUv, vec2 cellId) {
  float mask = glyph;
  float grainradAsciiIntensity = max(u_effectM, 0.01) * max(u_colorIntensity, 0.0);
  vec3 monoAsciiColor = mix(u_effectColorB, u_effectColorA, mask * grainradAsciiIntensity);
  vec3 originalAsciiColor = mix(u_backgroundColor, color, mask * grainradAsciiIntensity);
  vec3 asciiColor = mix(monoAsciiColor, originalAsciiColor, step(0.5, u_effectL));
  asciiColor = applyEffectAdjustments(asciiColor, u_effectF, u_effectG);
  asciiColor = adjustSaturation(asciiColor, u_effectH);
  asciiColor = rotateHue(asciiColor, u_effectI * 360.0);
  asciiColor = mix(asciiColor, vec3(smoothstep(0.5, 0.52, brightness)), clamp(u_effectJ, 0.0, 1.0) * 0.3);
  asciiColor = pow(max(asciiColor, vec3(0.0)), vec3(1.0 / max(u_effectK, 0.1)));
  return vec4(asciiColor, mask);
}

vec4 applyGrainradDithering(vec3 color, float brightness, vec2 cellId, vec2 screenUv) {
  float matrixScale = mix(2.0, 16.0, clamp(u_effectC / 3.0, 0.0, 1.0));
  float ordered = hash12(floor(screenUv * u_resolution / matrixScale) + u_effectA * 13.0);
  ordered = mix(ordered, fract((cellId.x + cellId.y * 3.0 + u_effectA) / max(matrixScale, 1.0)), 0.45);
  float mask = step(ordered, clamp((brightness + u_effectE) * (1.0 + u_effectF) * u_effectB, 0.0, 1.0));
  mask = mix(mask, mask * (0.65 + 0.35 * sin((cellId.x + cellId.y) * 0.35)), u_effectD);
  vec3 result = colorModeMix(u_effectI, color, mask, u_effectColorA, u_effectColorB);
  float chroma = u_effectJ * u_effectK;
  result.r += chroma * (u_effectL - 0.5) * hash12(cellId + 1.0);
  result.g += chroma * (u_effectM - 0.5) * hash12(cellId + 2.0);
  result.b += chroma * (u_effectN - 0.5) * hash12(cellId + 3.0);
  result = pow(max(result, vec3(0.0)), vec3(1.0 / max(u_effectG, 0.1)));
  result = mix(result, smoothstep(vec3(0.3), vec3(0.7), result), clamp(u_effectH, 0.0, 1.0));
  return vec4(clamp(result, 0.0, 1.0), mask);
}

vec4 applyGrainradHalftone(vec3 color, float brightness, vec2 screenUv) {
  vec2 uv = rotateUv(screenUv - 0.5, u_effectD);
  float spacing = mix(10.0, 72.0, clamp(u_effectC, 0.0, 1.0));
  vec2 local = fract(uv * spacing);
  float radius = clamp((1.0 - brightness + u_effectF) * 0.35 * max(u_effectB, 0.1), 0.02, 0.48);
  float mask = shapePattern(u_effectA, local, radius);
  mask = mix(mask, 1.0 - mask, u_effectE);
  vec3 result = colorModeMix(u_effectH, color, mask, u_effectColorA, u_effectColorB);
  return vec4(applyEffectAdjustments(result, u_effectF, u_effectG), mask);
}

vec4 applyGrainradMatrixRain(vec3 color, float brightness, vec2 screenUv, vec2 cellId) {
  vec2 axisUv = screenUv;
  if (u_effectF > 1.5 && u_effectF < 2.5) {
    axisUv = screenUv.yx;
  } else if (u_effectF > 2.5) {
    axisUv = vec2(1.0 - screenUv.y, screenUv.x);
  } else if (u_effectF > 0.5) {
    axisUv.y = 1.0 - axisUv.y;
  }

  float column = floor(axisUv.x * 60.0 / max(u_effectB, 0.05));
  float head = fract(hash12(vec2(column, u_effectA)) + u_time * u_effectD * 0.18);
  float trail = smoothstep(u_effectE, 0.0, abs(axisUv.y - head));
  float glyph = step(0.48, hash12(cellId + floor(u_time * 12.0) + u_effectA));
  float mask = max(step(u_effectK, brightness) * trail * glyph, trail * 0.25) * (1.0 - clamp(u_effectC * 0.18, 0.0, 0.6));
  vec3 rain = u_effectColorA * (mask * (1.0 + u_effectG));
  rain = applyEffectAdjustments(rain, u_effectI, u_effectJ);
  return vec4(mix(color * u_effectH, rain, clamp(mask + u_effectG * 0.12, 0.0, 1.0)), mask);
}

vec4 applyGrainradDots(vec3 color, float brightness, vec2 screenUv) {
  vec2 gridUv = screenUv * mix(24.0, 92.0, clamp(u_effectD, 0.0, 2.0) / 2.0);
  if (u_effectB > 0.5) {
    gridUv.x += floor(gridUv.y) * 0.5;
  }
  vec2 local = fract(gridUv);
  float mask = shapePattern(u_effectA, local, clamp((1.0 - brightness + u_effectF) * 0.24 * u_effectC, 0.03, 0.48));
  mask = mix(mask, 1.0 - mask, u_effectE);
  vec3 result = mix(color, vec3(mask), step(u_effectH, 0.5));
  return vec4(applyEffectAdjustments(result, u_effectF, u_effectG), mask);
}

vec4 applyGrainradContour(vec3 color, float brightness) {
  float levels = max(u_effectB, 2.0);
  float band = fract(brightness * levels);
  float line = 1.0 - smoothstep(0.0, clamp(u_effectC, 0.01, 6.0) * 0.035, min(band, 1.0 - band));
  float filled = floor(brightness * levels) / levels;
  float mask = mix(filled, line, step(0.5, u_effectA));
  mask = mix(mask, 1.0 - mask, u_effectD);
  vec3 result = mix(vec3(mask), color * mask, step(0.5, u_effectG));
  return vec4(applyEffectAdjustments(result, u_effectE, u_effectF), mask);
}

vec4 applyGrainradPixelSort(vec3 color, float brightness, vec2 screenUv, vec2 cellId) {
  float sortValue = brightness;
  if (u_effectB > 0.5 && u_effectB < 1.5) {
    sortValue = fract(color.r - color.b + 1.0);
  } else if (u_effectB > 1.5) {
    sortValue = max(color.r, max(color.g, color.b)) - min(color.r, min(color.g, color.b));
  }
  float axis = u_effectA < 0.5 ? screenUv.x : (u_effectA < 1.5 ? screenUv.y : (screenUv.x + screenUv.y) * 0.5);
  float streak = smoothstep(u_effectC, u_effectC + 0.2, sortValue);
  float streakSegments = mix(160.0, 8.0, clamp(u_effectD, 0.0, 1.0));
  float bands = step(0.72, hash12(vec2(floor(axis * max(streakSegments, 1.0)), u_effectF * 41.0)));
  float mask = streak * mix(1.0, bands, u_effectF) * u_effectE;
  mask = mix(mask, 1.0 - mask, u_effectG);
  vec3 shifted = mix(color, color.gbr, mask);
  shifted += (hash12(cellId + u_time) - 0.5) * u_effectF * 0.2;
  return vec4(applyEffectAdjustments(shifted, u_effectH, u_effectI), max(mask, brightness * 0.35));
}

vec4 applyGrainradBlockify(vec3 color, float brightness, vec2 screenUv) {
  float blocks = mix(90.0, 8.0, clamp(u_effectB, 0.0, 1.0));
  vec2 blockUv = floor(screenUv * blocks) / blocks;
  vec2 local = fract(screenUv * blocks);
  float border = step(local.x, u_effectC) + step(1.0 - u_effectC, local.x) + step(local.y, u_effectC) + step(1.0 - u_effectC, local.y);
  float blockLight = hash12(blockUv + brightness) * 0.28 + brightness * 0.72;
  vec3 blockColor = mix(vec3(blockLight), color, step(u_effectF, 0.5));
  blockColor = mix(blockColor, blockColor * blockLight, step(0.5, u_effectA) * step(u_effectA, 1.5));
  blockColor = mix(blockColor, u_effectColorA, clamp(border, 0.0, 1.0) * step(1.5, u_effectA));
  return vec4(applyEffectAdjustments(blockColor, u_effectD, u_effectE), max(brightness, border));
}

vec4 applyGrainradThreshold(vec3 color, float brightness, vec2 cellId) {
  float dither = (hash12(cellId) - 0.5) * 0.22 * u_effectC;
  float mask = step(u_effectB, brightness + dither);
  mask = quantizeValue(mask, u_effectA);
  mask = mix(mask, 1.0 - mask, u_effectD);
  vec3 result = colorModeMix(u_effectG, color, mask, u_effectColorA, u_effectColorB);
  return vec4(applyEffectAdjustments(result, u_effectE, u_effectF), mask);
}

vec4 applyGrainradEdgeDetection(vec3 color, float brightness) {
  float edge = fwidth(brightness) * mix(60.0, 120.0, clamp(u_effectA / 2.0, 0.0, 1.0));
  edge += abs(v_worldNormal.x) * 0.08 * u_effectC;
  float mask = smoothstep(u_effectB, u_effectB + 0.08, edge * max(u_effectC, 0.1));
  mask = mix(mask, 1.0 - mask, u_effectD);
  vec3 result = colorModeMix(u_effectG, color, mask, u_effectColorA, u_effectColorB);
  return vec4(applyEffectAdjustments(result, u_effectE, u_effectF), mask);
}

vec4 applyGrainradCrosshatch(vec3 color, float brightness, vec2 screenUv) {
  float mask = 0.0;
  for (int index = 0; index < 8; index++) {
    if (float(index) >= u_effectB) {
      break;
    }
    float turn = u_effectC + float(index) * 0.18;
    float width = clamp(u_effectD * 0.08, 0.004, 0.08);
    mask += linePattern(screenUv + hash12(vec2(float(index), u_effectE)) * u_effectE * 0.1, turn, u_effectA * 3.0 + float(index) * 2.0, width) * step(brightness, 1.0 - float(index) / max(u_effectB, 1.0));
  }
  mask = clamp(mask, 0.0, 1.0);
  mask = mix(mask, 1.0 - mask, u_effectF);
  vec3 result = mix(u_effectColorB, u_effectColorA, mask);
  return vec4(applyEffectAdjustments(result, u_effectG, u_effectH), mask);
}

vec4 applyGrainradWaveLines(vec3 color, float brightness, vec2 screenUv) {
  float axis = u_effectE < 0.5 ? screenUv.y : screenUv.x;
  float wave = sin((axis * u_effectA + sin(screenUv.x * u_effectC * 12.0 + u_time * u_effectF) * u_effectB) * 6.28318);
  float mask = 1.0 - smoothstep(0.0, clamp(u_effectD, 0.02, 6.0) * 0.06, abs(wave) * (1.0 - brightness));
  vec3 result = mix(vec3(mask), color, step(0.5, u_effectI));
  return vec4(applyEffectAdjustments(result, u_effectG, u_effectH), mask);
}

vec4 applyGrainradNoiseField(vec3 color, float brightness, vec2 screenUv) {
  vec2 p = screenUv * max(u_effectB * 14.0, 0.1);
  p += u_time * u_effectE * u_effectF * 0.08;
  float noiseValue = fbmNoise(p + u_effectA * 9.0, max(u_effectD, 1.0));
  if (u_effectA > 1.5) {
    noiseValue = 1.0 - smoothstep(0.05, 0.28, voronoiPattern(p, u_effectA));
  } else if (u_effectA > 0.5) {
    noiseValue = fbmNoise(p.yx + 5.37, max(u_effectD, 1.0));
  }
  float mask = mix(brightness, noiseValue, clamp(u_effectC, 0.0, 2.0) * 0.5);
  vec3 result = mix(vec3(mask), color + (noiseValue - 0.5) * u_effectC, u_effectG);
  return vec4(applyEffectAdjustments(result, u_effectH, u_effectI), mask);
}

vec4 applyGrainradVoronoi(vec3 color, float brightness, vec2 screenUv) {
  float cellDistance = voronoiPattern(screenUv * mix(8.0, 72.0, clamp(u_effectA, 0.0, 1.0)), u_effectE);
  float edge = 1.0 - smoothstep(u_effectB * 0.05, u_effectB * 0.05 + 0.025, cellDistance);
  vec3 edgeColor = u_effectC < 0.5 ? vec3(0.0) : (u_effectC < 1.5 ? vec3(1.0) : color * 0.35);
  vec3 cellAverage = mix(color, vec3(brightness), 0.35);
  vec3 centerSample = mix(color, vec3(hash12(floor(screenUv * 24.0))), 0.35);
  vec3 gradient = mix(vec3(0.1, 0.25, 0.45), vec3(0.9, 0.75, 0.35), brightness);
  vec3 result = u_effectD < 0.5 ? cellAverage : (u_effectD < 1.5 ? centerSample : gradient);
  result = mix(result, edgeColor, edge);
  return vec4(applyEffectAdjustments(result, u_effectF, u_effectG), max(edge, brightness));
}

vec4 applyGrainradVhs(vec3 color, float brightness, vec2 screenUv, vec2 cellId) {
  float tracking = step(0.96 - u_effectE * 0.2, hash12(vec2(floor(screenUv.y * 80.0), floor(u_time * 8.0))));
  float scan = 1.0 - sin(screenUv.y * u_resolution.y * 3.14159) * 0.18 * u_effectD;
  vec3 result = color;
  result.r += u_effectC * 0.18 * hash12(cellId + 4.0);
  result.b -= u_effectC * 0.14 * hash12(cellId + 8.0);
  result += (hash12(gl_FragCoord.xy + u_time * 30.0) - 0.5) * u_effectB;
  result = mix(result, result.gbr, u_effectA * 0.18 + tracking * u_effectE);
  result *= scan;
  result += tracking * 0.25;
  return vec4(applyEffectAdjustments(result, u_effectF, u_effectG), brightness);
}

vec4 applyGrainradProcessing(vec4 effectColor, float brightness) {
  vec3 color = effectColor.rgb;
  float mask = effectColor.a;
  color = mix(color, 1.0 - color, u_processingA);
  color *= u_processingB;
  color += fwidth(brightness) * u_processingC * 4.0;
  vec3 softenedProcessingColor = mix(vec3(grainradLuma(color)), color, 0.35 + smoothstep(0.0, 1.0, mask) * 0.4);
  softenedProcessingColor = mix(softenedProcessingColor, vec3(brightness), 0.25);
  color = mix(color, softenedProcessingColor, clamp(u_processingD, 0.0, 1.0));
  if (u_processingE > 0.5) {
    color = floor(color * u_processingE) / max(u_processingE, 1.0);
  }
  color = mix(color, color * smoothstep(0.15, 0.85, mask), u_processingF);
  return vec4(clamp(color, 0.0, 1.0), mask);
}

vec3 applyGrainradPostProcessing(vec3 color, float brightness, vec2 screenUv, vec2 centered, vec2 cellId) {
  float grainAmount = u_postB * (0.5 + u_postC) * (0.5 + u_postD);
  color += (hash12(gl_FragCoord.xy * max(u_postC * 10.0, 1.0) + u_time * (8.0 + u_postD * 24.0)) - 0.5) * grainAmount;
  color += smoothstep(0.58, 1.0, brightness) * u_postA * 0.35;
  color.r += (hash12(cellId + 12.0) - 0.5) * u_postE * 0.1;
  color.b -= (hash12(cellId + 15.0) - 0.5) * u_postE * 0.1;
  color *= 1.0 - sin(gl_FragCoord.y * 3.14159) * 0.16 * u_postF;
  color *= mix(1.0, smoothstep(1.2, 0.2, length(centered)), u_postG);
  color = mix(color, color * (1.0 - dot(centered, centered) * 0.12), u_postH);
  color = mix(color, color * vec3(0.92, 1.05, 0.9), u_postI);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec2 screenUv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));
  vec2 centered = screenUv * 2.0 - 1.0;
  float curve = dot(centered, centered) * u_curvature;
  vec2 curvedUv = screenUv + centered * curve * 0.08;
  vec2 cellId = floor(curvedUv * u_resolution / max(u_asciiCellSize, 1.0));
  vec2 cellUv = fract(curvedUv * u_resolution / max(u_asciiCellSize, 1.0));
  float outputColumnCount = clamp(u_effectC, 0.0, 600.0);
  float outputCellSize = max(u_resolution.x / max(outputColumnCount, 1.0), 1.0);
  float asciiEffectCellSize = mix(max(u_asciiCellSize, 1.0), outputCellSize, step(1.0, outputColumnCount));
  vec2 asciiEffectCellId = floor(curvedUv * u_resolution / asciiEffectCellSize);
  vec2 asciiEffectCellUv = fract(curvedUv * u_resolution / asciiEffectCellSize);
  float glyphScale = mix(1.0, 0.25, clamp(u_effectB, 0.0, 1.0));
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

  float glyph = asciiCell(brightness, cellUv, u_asciiCharsetStyle);
  glyph *= smoothstep(0.0, 0.12, u_asciiDensity);
  float atlasGlyph = sampleAsciiGlyphAtlas(brightness, spacedAsciiEffectCellUv);
  float grainradAsciiMask = grainradAsciiGlyph(brightness, spacedAsciiEffectCellUv, asciiEffectCellId, u_asciiCharsetStyle);
  grainradAsciiMask = mix(grainradAsciiMask, atlasGlyph, step(0.5, u_asciiGlyphCount));
  grainradAsciiMask *= insideGlyphBox;
  grainradAsciiMask *= smoothstep(0.0, 0.12, u_asciiDensity);

  vec3 color = paletteColor(brightness, glyph);
  vec4 grainradColor = applyGrainradAscii(color, grainradAsciiMask, brightness, spacedAsciiEffectCellUv, asciiEffectCellId);

  if (u_grainradEffectId > 0.5 && u_grainradEffectId < 1.5) {
    grainradColor = applyGrainradDithering(color, brightness, cellId, screenUv);
  } else if (u_grainradEffectId > 1.5 && u_grainradEffectId < 2.5) {
    grainradColor = applyGrainradHalftone(color, brightness, screenUv);
  } else if (u_grainradEffectId > 2.5 && u_grainradEffectId < 3.5) {
    grainradColor = applyGrainradMatrixRain(color, brightness, screenUv, cellId);
  } else if (u_grainradEffectId > 3.5 && u_grainradEffectId < 4.5) {
    grainradColor = applyGrainradDots(color, brightness, screenUv);
  } else if (u_grainradEffectId > 4.5 && u_grainradEffectId < 5.5) {
    grainradColor = applyGrainradContour(color, brightness);
  } else if (u_grainradEffectId > 5.5 && u_grainradEffectId < 6.5) {
    grainradColor = applyGrainradPixelSort(color, brightness, screenUv, cellId);
  } else if (u_grainradEffectId > 6.5 && u_grainradEffectId < 7.5) {
    grainradColor = applyGrainradBlockify(color, brightness, screenUv);
  } else if (u_grainradEffectId > 7.5 && u_grainradEffectId < 8.5) {
    grainradColor = applyGrainradThreshold(color, brightness, cellId);
  } else if (u_grainradEffectId > 8.5 && u_grainradEffectId < 9.5) {
    grainradColor = applyGrainradEdgeDetection(color, brightness);
  } else if (u_grainradEffectId > 9.5 && u_grainradEffectId < 10.5) {
    grainradColor = applyGrainradCrosshatch(color, brightness, screenUv);
  } else if (u_grainradEffectId > 10.5 && u_grainradEffectId < 11.5) {
    grainradColor = applyGrainradWaveLines(color, brightness, screenUv);
  } else if (u_grainradEffectId > 11.5 && u_grainradEffectId < 12.5) {
    grainradColor = applyGrainradNoiseField(color, brightness, screenUv);
  } else if (u_grainradEffectId > 12.5 && u_grainradEffectId < 13.5) {
    grainradColor = applyGrainradVoronoi(color, brightness, screenUv);
  } else if (u_grainradEffectId > 13.5) {
    grainradColor = applyGrainradVhs(color, brightness, screenUv, cellId);
  }

  grainradColor = applyGrainradProcessing(grainradColor, brightness);
  float finalAlpha = max(mix(grainradAsciiMask, glyph, step(0.5, u_grainradEffectId)), grainradColor.a);
  color = grainradColor.rgb;
  float scanline = 1.0 - sin(gl_FragCoord.y * 3.14159) * 0.5 * u_scanlineAmount;
  float vignette = smoothstep(1.15, 0.2, length(centered)) * u_vignette + (1.0 - u_vignette);
  float grain = (hash12(gl_FragCoord.xy + u_time * 17.0) - 0.5) * u_grain;
  float bloom = smoothstep(0.68, 1.0, brightness) * u_bloomAmount;
  float chroma = (hash12(cellId + u_mouse * 31.0) - 0.5) * u_chromaticOffset;

  color = adjustSaturation(color, u_asciiSaturation);
  color = rotateHue(color, u_asciiHueRotation);
  color = color * scanline * vignette + bloom + grain + chroma;
  color = applyGrainradPostProcessing(color, brightness, screenUv, centered, cellId);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), finalAlpha);
}
`

type CreateAsciiShaderMaterialOptions = {
  ascii: StudioAsciiState
  grainradRuntime?: GrainradEffectRuntime
  foregroundColor: string
  backgroundColor: string
}

export function createAsciiShaderMaterial({
  ascii,
  grainradRuntime = compileGrainradEffectRuntime({
    selectedEffectId: 'ascii',
    controls: {},
  }),
  foregroundColor,
  backgroundColor,
}: CreateAsciiShaderMaterialOptions) {
  return new ShaderMaterial({
    vertexShader: ASCII_VERTEX_SHADER,
    fragmentShader: ASCII_FRAGMENT_SHADER,
    side: DoubleSide,
    transparent: true,
    uniforms: createAsciiShaderUniforms({
      ascii,
      grainradRuntime,
      foregroundColor,
      backgroundColor,
    }),
  })
}

export function disposeAsciiShaderMaterial(material: ShaderMaterial) {
  const glyphAtlas = material.uniforms.u_asciiGlyphAtlas?.value as
    | { dispose?: () => void }
    | undefined

  glyphAtlas?.dispose?.()
  material.dispose()
}

function createAsciiShaderUniforms({
  ascii,
  grainradRuntime,
  foregroundColor,
  backgroundColor,
}: Required<CreateAsciiShaderMaterialOptions>): Record<string, IUniform> {
  const asciiCharacterSet = resolveAsciiCharacterSet(ascii.charsetStyle, grainradRuntime.customGlyphChars)
  const glyphAtlas = createAsciiGlyphAtlasTexture(asciiCharacterSet)
  const uniforms: Record<string, IUniform> = {
    u_time: { value: 0 },
    u_mouse: { value: new Vector2(0, 0) },
    u_resolution: { value: new Vector2(1, 1) },
    u_asciiCellSize: { value: ascii.cellSize },
    u_asciiDensity: { value: ascii.density },
    u_asciiContrast: { value: ascii.contrast },
    u_asciiBrightness: { value: ascii.brightness },
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

  assignGrainradRuntimeUniforms(uniforms, grainradRuntime)

  return uniforms
}

type AsciiGlyphAtlas = {
  texture: CanvasTexture | DataTexture
  count: number
  columns: number
}

const ASCII_GLYPH_ATLAS_CELL_SIZE = 64

function createAsciiGlyphAtlasTexture(characterSet: string): AsciiGlyphAtlas {
  const glyphs = Array.from(characterSet.length > 0 ? characterSet : ASCII_CHARACTER_SETS.standard)
  const count = glyphs.length
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)))
  const rows = Math.max(1, Math.ceil(count / columns))

  if (typeof document === 'undefined') {
    return {
      texture: createFallbackGlyphTexture(),
      count,
      columns,
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = columns * ASCII_GLYPH_ATLAS_CELL_SIZE
  canvas.height = rows * ASCII_GLYPH_ATLAS_CELL_SIZE

  const context = canvas.getContext('2d')

  if (!context) {
    return {
      texture: createFallbackGlyphTexture(),
      count,
      columns,
    }
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `${Math.floor(ASCII_GLYPH_ATLAS_CELL_SIZE * 0.76)}px ${readAsciiCanvasFontFamily()}`

  glyphs.forEach((glyph, index) => {
    if (glyph === ' ') {
      return
    }

    const column = index % columns
    const row = Math.floor(index / columns)
    const x = column * ASCII_GLYPH_ATLAS_CELL_SIZE + ASCII_GLYPH_ATLAS_CELL_SIZE / 2
    const y = row * ASCII_GLYPH_ATLAS_CELL_SIZE + ASCII_GLYPH_ATLAS_CELL_SIZE * 0.55

    context.fillText(glyph, x, y)
  })

  const texture = new CanvasTexture(canvas)
  configureGlyphTexture(texture)

  return {
    texture,
    count,
    columns,
  }
}

function createFallbackGlyphTexture() {
  const texture = new DataTexture(
    new Uint8Array([255, 255, 255, 255]),
    1,
    1,
    RGBAFormat,
    UnsignedByteType,
  )

  configureGlyphTexture(texture)

  return texture
}

function configureGlyphTexture(texture: CanvasTexture | DataTexture) {
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.needsUpdate = true
}

function readAsciiCanvasFontFamily() {
  if (typeof window === 'undefined') {
    return 'monospace'
  }

  const styles = window.getComputedStyle(document.documentElement)
  const bodyFont = styles.getPropertyValue('--font-body').trim()
  const notoFont = styles.getPropertyValue('--font-noto').trim()

  return [bodyFont, notoFont, 'monospace'].filter(Boolean).join(', ')
}

export function applyGrainradRuntimeUniforms(
  uniforms: Record<string, IUniform>,
  runtime: GrainradEffectRuntime,
) {
  assignGrainradRuntimeUniforms(uniforms, runtime)
}

function assignGrainradRuntimeUniforms(
  uniforms: Record<string, IUniform>,
  runtime: GrainradEffectRuntime,
) {
  setUniformValue(uniforms, 'u_grainradEffectId', runtime.effectId)
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
