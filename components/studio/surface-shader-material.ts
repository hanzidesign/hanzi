import { DataTexture, LinearFilter, ShaderMaterial, Vector2, Vector4, type Texture } from 'three'
import type { StudioMorphLayer, StudioShaderLayer, StudioSurfaceShaderLayer } from '@/app/studio/studio-store'
import {
  createFallbackGlyphDistancePack,
  type GlyphDistancePack,
} from '@/components/studio/glyph-derived-buffers'
import {
  DEFAULT_GRADIENT_STOPS,
  normalizeGradientStops,
  readGradientAngle,
  readGradientStopOpacity,
  readGradientType,
} from '@/components/studio/gradient-stops'
import {
  compileMorphRuntimeLayers,
} from '@/components/studio/morph-layer-runtime'
import type { PatternLayerTextureTarget } from '@/components/studio/pattern-layer-texture'
import { hexToVector3 } from '@/shaders/uniforms'

export const SURFACE_SHADER_STYLE_IDS = ['solid', 'soft-gradient', 'depth-lit', 'gradient'] as const

type SurfaceShaderStyleId = (typeof SURFACE_SHADER_STYLE_IDS)[number]

type CharacterSurfaceMaterialOptions = {
  maskTexture: Texture
  glyphDistancePack?: GlyphDistancePack
  foreground: Pick<StudioSurfaceShaderLayer, 'color' | 'stylePresetId'> &
    Partial<Pick<StudioSurfaceShaderLayer, 'params'>>
  background: Pick<StudioSurfaceShaderLayer, 'color' | 'stylePresetId'> &
    Partial<Pick<StudioSurfaceShaderLayer, 'params'>>
  patterns: {
    foreground?: SurfacePatternInput
    background?: SurfacePatternInput
    morphStack?: SurfacePatternInput
  }
  morphLayers?: StudioMorphLayer[]
  shaderLayers?: StudioShaderLayer[]
  timeSeconds?: number
}

type SurfacePatternInput = Texture | PatternLayerTextureTarget[]

const MAX_FOREGROUND_GRADIENT_STOPS = 6

export const CHARACTER_SURFACE_VERTEX_SHADER = `
  varying vec2 v_uv;

  void main() {
    v_uv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const CHARACTER_SURFACE_FRAGMENT_SHADER = `
  uniform sampler2D u_characterMask;
  uniform sampler2D u_glyphMask;
  uniform sampler2D u_glyphSdf;
  uniform sampler2D u_glyphEdge;
  uniform sampler2D u_glyphHeight;
  uniform sampler2D u_glyphNormal;
  uniform sampler2D u_glyphFlow;
  uniform sampler2D u_glyphScatter;
  uniform sampler2D u_foregroundPattern0;
  uniform sampler2D u_foregroundPattern1;
  uniform sampler2D u_foregroundPattern2;
  uniform sampler2D u_backgroundPattern0;
  uniform sampler2D u_backgroundPattern1;
  uniform sampler2D u_backgroundPattern2;
  uniform sampler2D u_morphStackPattern0;
  uniform sampler2D u_morphStackPattern1;
  uniform sampler2D u_morphStackPattern2;
  uniform vec3 u_foregroundColor;
  uniform vec3 u_backgroundColor;
  uniform vec3 u_foregroundGradientColors[6];
  uniform float u_foregroundGradientOpacities[6];
  uniform float u_foregroundGradientPositions[6];
  uniform float u_foregroundGradientStopCount;
  uniform float u_foregroundGradientType;
  uniform float u_foregroundGradientAngle;
  uniform float u_foregroundOpacity;
  uniform float u_backgroundOpacity;
  uniform float u_foregroundStyle;
  uniform float u_backgroundStyle;
  uniform float u_foregroundDepthStrength;
  uniform float u_foregroundHighlightStrength;
  uniform float u_foregroundRimStrength;
  uniform float u_foregroundEdgeSoftness;
  uniform float u_foregroundPatternCount;
  uniform float u_foregroundPatternIntensities[3];
  uniform float u_foregroundPatternBlendModes[3];
  uniform float u_backgroundPatternCount;
  uniform float u_backgroundPatternIntensities[3];
  uniform float u_backgroundPatternBlendModes[3];
  uniform float u_morphStackPatternCount;
  uniform float u_morphStackPatternIntensities[3];
  uniform float u_morphLayerCount;
  uniform float u_morphLayerKinds[8];
  uniform float u_morphLayerIntensities[8];
  uniform vec4 u_morphLayerParams[8];
  uniform float u_shaderLayerCount;
  uniform float u_shaderLayerKinds[8];
  uniform float u_shaderLayerTargets[8];
  uniform float u_shaderLayerIntensities[8];
  uniform float u_shaderLayerBlendModes[8];
  uniform vec4 u_shaderLayerParams[8];
  uniform float u_glyphBufferAvailable;
  uniform vec2 u_glyphBufferResolution;
  uniform float u_timeEffective;

  varying vec2 v_uv;

  float readForegroundGradientPosition(vec2 uv) {
    if (u_foregroundGradientType > 0.5) {
      return clamp(distance(uv, vec2(0.5)) / 0.70710678, 0.0, 1.0);
    }

    float angle = radians(u_foregroundGradientAngle);
    vec2 direction = vec2(sin(angle), cos(angle));
    float range = max(abs(direction.x) + abs(direction.y), 0.0001);
    return clamp(dot(uv - vec2(0.5), direction) / range + 0.5, 0.0, 1.0);
  }

  vec3 sampleForegroundGradient(vec2 uv) {
    float gradientPosition = readForegroundGradientPosition(uv);
    vec3 color = u_foregroundGradientColors[0];

    for (int index = 1; index < 6; index++) {
      if (float(index) >= u_foregroundGradientStopCount) {
        break;
      }

      float previousPosition = u_foregroundGradientPositions[index - 1];
      float nextPosition = u_foregroundGradientPositions[index];
      float range = max(nextPosition - previousPosition, 0.0001);
      float amount = clamp((gradientPosition - previousPosition) / range, 0.0, 1.0);
      vec3 nextColor = mix(u_foregroundGradientColors[index - 1], u_foregroundGradientColors[index], amount);

      if (gradientPosition >= previousPosition) {
        color = nextColor;
      }
    }

    return color;
  }

  float sampleForegroundGradientOpacity(vec2 uv) {
    float gradientPosition = readForegroundGradientPosition(uv);
    float opacity = u_foregroundGradientOpacities[0];

    for (int index = 1; index < 6; index++) {
      if (float(index) >= u_foregroundGradientStopCount) {
        break;
      }

      float previousPosition = u_foregroundGradientPositions[index - 1];
      float nextPosition = u_foregroundGradientPositions[index];
      float range = max(nextPosition - previousPosition, 0.0001);
      float amount = clamp((gradientPosition - previousPosition) / range, 0.0, 1.0);
      float nextOpacity = mix(u_foregroundGradientOpacities[index - 1], u_foregroundGradientOpacities[index], amount);

      if (gradientPosition >= previousPosition) {
        opacity = nextOpacity;
      }
    }

    return opacity;
  }

  vec3 applySurfaceStyle(vec3 baseColor, float styleIndex, float mask, vec2 uv) {
    if (styleIndex < 0.5) {
      return baseColor;
    }

    if (styleIndex < 1.5) {
      float gradient = smoothstep(0.0, 1.0, uv.y);
      return mix(baseColor * 0.82, min(baseColor * 1.18, vec3(1.0)), gradient);
    }

    if (styleIndex > 2.5) {
      return sampleForegroundGradient(uv);
    }

    float edgeSoftness = clamp(u_foregroundEdgeSoftness, 0.0, 0.45);
    float depth = clamp(u_foregroundDepthStrength, 0.0, 1.0);
    float edge = smoothstep(edgeSoftness, 0.9, mask);
    float bevel = edge * (1.0 - smoothstep(0.86, 1.0, mask));
    float highlight = smoothstep(0.22, 0.92, uv.x * 0.62 + uv.y * 0.38);
    float rimLight = bevel * u_foregroundRimStrength;
    vec3 additiveHighlight = vec3(0.16, 0.18, 0.2) * (highlight * u_foregroundHighlightStrength + rimLight);
    return min(baseColor * (1.0 - depth * 0.28 + edge * depth * 0.32), vec3(1.0)) + additiveHighlight;
  }

  vec2 rotateMorphDelta(vec2 delta, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(delta.x * c - delta.y * s, delta.x * s + delta.y * c);
  }

  vec2 applySingleMorphLayer(vec2 uv, float kind, vec4 params, float intensity) {
    if (kind < 0.5) {
      return uv;
    }

    if (kind < 1.5) {
      float bend = sin((uv.y + params.z) * 6.2831853 * max(params.y, 0.01));
      uv.x += bend * params.x * 0.16 * intensity;
      return clamp(uv, vec2(0.0), vec2(1.0));
    }

    if (kind < 2.5) {
      vec2 center = vec2(params.z, params.w);
      vec2 delta = uv - center;
      float radius = max(params.y, 0.001);
      float falloff = smoothstep(radius, 0.0, length(delta));
      float angle = params.x * falloff * 2.4 * intensity;
      return clamp(center + rotateMorphDelta(delta, angle), vec2(0.0), vec2(1.0));
    }

    if (kind < 3.5) {
      float scale = max(params.y, 0.01);
      vec2 field = vec2(
        sin((uv.y * scale + params.z) * 6.2831853),
        cos((uv.x * scale - params.z) * 6.2831853)
      );
      return clamp(uv + field * params.x * 0.045 * intensity, vec2(0.0), vec2(1.0));
    }

    if (kind < 4.5) {
      float bands = max(params.y, 1.0);
      float coordinate = params.z > 0.5 ? uv.x : uv.y;
      float band = floor(coordinate * bands);
      float direction = mod(band, 2.0) * 2.0 - 1.0;
      vec2 offset = params.z > 0.5 ? vec2(0.0, direction) : vec2(direction, 0.0);
      return clamp(uv + offset * params.x * 0.075 * intensity, vec2(0.0), vec2(1.0));
    }

    if (kind < 5.5) {
      float cells = max(params.x, 1.0);
      vec2 gridUv = (floor(uv * cells) + 0.5) / cells;
      return mix(uv, gridUv, clamp(params.y * intensity, 0.0, 1.0));
    }

    return uv;
  }

  vec2 applyMorphLayerStack(vec2 uv) {
    vec2 morphedUv = uv;

    for (int index = 0; index < 8; index++) {
      if (float(index) >= u_morphLayerCount) {
        break;
      }

      morphedUv = applySingleMorphLayer(
        morphedUv,
        u_morphLayerKinds[index],
        u_morphLayerParams[index],
        u_morphLayerIntensities[index]
      );
    }

    return morphedUv;
  }

  float applyMaskMorphLayers(float mask) {
    float morphedMask = mask;

    for (int index = 0; index < 8; index++) {
      if (float(index) >= u_morphLayerCount) {
        break;
      }

      if (u_morphLayerKinds[index] > 5.5 && u_morphLayerKinds[index] < 6.5) {
        float amount = u_morphLayerParams[index].x * u_morphLayerIntensities[index];
        float softness = clamp(u_morphLayerParams[index].y, 0.0, 0.45);
        morphedMask = smoothstep(softness, 1.0 - softness, clamp(morphedMask + amount, 0.0, 1.0));
      }
    }

    return morphedMask;
  }

  vec3 applySurfaceDepthMorphLayers(vec3 color, float mask, vec2 uv) {
    vec3 morphedColor = color;

    for (int index = 0; index < 8; index++) {
      if (float(index) >= u_morphLayerCount) {
        break;
      }

      if (u_morphLayerKinds[index] > 6.5 && u_morphLayerKinds[index] < 7.5) {
        vec4 params = u_morphLayerParams[index];
        float depth = params.x * u_morphLayerIntensities[index];
        float angle = radians(params.y);
        float specular = params.z;
        vec2 lightDirection = vec2(cos(angle), sin(angle));
        float bevel = smoothstep(0.04, 0.92, mask) * (1.0 - smoothstep(0.86, 1.0, mask));
        float light = clamp(dot(normalize(uv - vec2(0.5)), lightDirection) * 0.5 + 0.5, 0.0, 1.0);
        morphedColor = min(
          morphedColor * (1.0 - depth * 0.16) + vec3(light * bevel * depth * 0.42 + specular * bevel * 0.22),
          vec3(1.0)
        );
      }
    }

    return morphedColor;
  }

  float sampleGlyphScalar(sampler2D sourceTexture, vec2 uv) {
    return texture2D(sourceTexture, uv).r;
  }

  vec3 sampleGlyphNormal(vec2 uv) {
    return normalize(texture2D(u_glyphNormal, uv).rgb * 2.0 - 1.0);
  }

  vec3 applySdfReliefShaderLayer(vec3 color, float mask, vec2 uv, vec4 params, float intensity) {
    float sdf = sampleGlyphScalar(u_glyphSdf, uv) * 2.0 - 1.0;
    float edge = sampleGlyphScalar(u_glyphEdge, uv);
    float height = sampleGlyphScalar(u_glyphHeight, uv);
    vec3 normal = sampleGlyphNormal(uv);
    float edgeWidth = max(params.x, 0.001);
    float bevelDepth = params.y * intensity;
    float roughness = params.z;
    float readabilityClamp = max(params.w, 0.05);
    float edgeBand = smoothstep(-edgeWidth, edgeWidth, sdf) * edge;
    float light = clamp(dot(normal, normalize(vec3(-0.35, 0.42, 0.84))) * 0.5 + 0.5, 0.0, 1.0);
    vec3 relief = color * (readabilityClamp + height * bevelDepth * 0.35);
    relief += vec3(edgeBand * bevelDepth * 0.45 + light * bevelDepth * 0.22);
    relief -= vec3(roughness * sampleGlyphScalar(u_glyphScatter, uv) * 0.16 * intensity);
    return mix(color, min(relief, vec3(1.0)), clamp(mask * intensity, 0.0, 1.0));
  }

  vec3 applyPrintDamageShaderLayer(vec3 color, float mask, vec2 uv, vec4 params, float intensity) {
    float threshold = params.x;
    float contrast = max(params.y, 0.01);
    float scale = max(params.z, 1.0);
    float scatter = sampleGlyphScalar(u_glyphScatter, uv);
    float dither = step(threshold, fract(scatter * contrast + floor(uv.x * scale) * 0.071 + floor(uv.y * scale) * 0.113));
    float scanline = 0.82 + 0.18 * sin((uv.y * scale + u_timeEffective * 0.25) * 6.2831853);
    vec3 damaged = color * mix(scanline, dither, 0.45);
    return mix(color, damaged, clamp(mask * intensity, 0.0, 1.0));
  }

  vec3 applyChromeGlassShaderLayer(vec3 color, float mask, vec2 uv, vec4 params, float intensity) {
    float flowStrength = params.x;
    float metalness = params.y;
    float refraction = params.z;
    vec2 flow = texture2D(u_glyphFlow, uv).rg * 2.0 - 1.0;
    vec2 refractedUv = clamp(uv + flow * refraction * 0.05 * intensity, vec2(0.0), vec2(1.0));
    vec3 normal = sampleGlyphNormal(refractedUv);
    float band = 0.5 + 0.5 * sin((refractedUv.x + refractedUv.y + flow.x * flowStrength + u_timeEffective * 0.08) * 18.0);
    vec3 chrome = mix(color, vec3(0.76, 0.84, 0.92) * band + vec3(max(normal.z, 0.0) * 0.35), metalness);
    return mix(color, min(chrome, vec3(1.0)), clamp(mask * intensity, 0.0, 1.0));
  }

  vec3 blendShaderLayer(vec3 baseColor, vec3 effectColor, float intensity, float blendMode) {
    vec3 multiplyColor = baseColor * effectColor;
    vec3 screenColor = 1.0 - (1.0 - baseColor) * (1.0 - effectColor);
    vec3 overlayColor = mix(
      2.0 * baseColor * effectColor,
      1.0 - 2.0 * (1.0 - baseColor) * (1.0 - effectColor),
      step(0.5, baseColor)
    );
    vec3 blended = effectColor;

    if (blendMode > 0.5 && blendMode < 1.5) {
      blended = multiplyColor;
    }

    if (blendMode > 1.5 && blendMode < 2.5) {
      blended = screenColor;
    }

    if (blendMode > 2.5 && blendMode < 3.5) {
      blended = overlayColor;
    }

    return mix(baseColor, blended, clamp(intensity, 0.0, 1.0));
  }

  vec3 applyShaderLayerStack(vec3 color, float mask, vec2 uv, float target) {
    vec3 stackedColor = color;

    for (int index = 0; index < 8; index++) {
      if (float(index) >= u_shaderLayerCount) {
        break;
      }

      if (abs(u_shaderLayerTargets[index] - target) > 0.5) {
        continue;
      }

      vec3 effectColor = stackedColor;
      float kind = u_shaderLayerKinds[index];
      float intensity = u_shaderLayerIntensities[index];
      vec4 params = u_shaderLayerParams[index];

      if (kind > 0.5 && kind < 19.5) {
        effectColor = applySdfReliefShaderLayer(stackedColor, mask, uv, params, intensity);
      } else if (kind > 19.5 && kind < 39.5) {
        effectColor = applyPrintDamageShaderLayer(stackedColor, mask, uv, params, intensity);
      } else if (kind > 39.5) {
        effectColor = applyChromeGlassShaderLayer(stackedColor, mask, uv, params, intensity);
      }

      stackedColor = blendShaderLayer(stackedColor, effectColor, intensity, u_shaderLayerBlendModes[index]);
    }

    return stackedColor;
  }

  float readForegroundOpacity(vec2 uv) {
    if (u_foregroundStyle > 2.5) {
      return sampleForegroundGradientOpacity(uv);
    }

    return u_foregroundOpacity;
  }

  vec3 blendPatternColor(vec3 baseColor, vec3 patternColor, float intensity, float blendMode) {
    float amount = clamp(intensity, 0.0, 1.0);
    vec3 multiplyColor = baseColor * patternColor;
    vec3 screenColor = 1.0 - (1.0 - baseColor) * (1.0 - patternColor);
    vec3 overlayColor = mix(
      2.0 * baseColor * patternColor,
      1.0 - 2.0 * (1.0 - baseColor) * (1.0 - patternColor),
      step(0.5, baseColor)
    );
    vec3 softLightColor = mix(
      2.0 * baseColor * patternColor + baseColor * baseColor * (1.0 - 2.0 * patternColor),
      sqrt(max(baseColor, vec3(0.0))) * (2.0 * patternColor - 1.0) + 2.0 * baseColor * (1.0 - patternColor),
      step(0.5, patternColor)
    );
    vec3 blendedColor = patternColor;

    if (blendMode < 1.5) {
      blendedColor = multiplyColor;
    }

    if (blendMode > 1.5 && blendMode < 2.5) {
      blendedColor = screenColor;
    }

    if (blendMode > 2.5 && blendMode < 3.5) {
      blendedColor = overlayColor;
    }

    if (blendMode > 3.5) {
      blendedColor = softLightColor;
    }

    return mix(baseColor, blendedColor, amount);
  }

  vec3 applyPatternSlot(vec3 baseColor, vec3 patternColor, float intensity, float blendMode) {
    return blendPatternColor(baseColor, patternColor, intensity, blendMode);
  }

  vec3 sampleForegroundPatterns(vec3 baseColor, vec2 uv) {
    vec3 color = baseColor;

    if (u_foregroundPatternCount > 0.5) {
      color = applyPatternSlot(
        color,
        min(texture2D(u_foregroundPattern0, uv).rgb * 1.35, vec3(1.0)),
        u_foregroundPatternIntensities[0],
        u_foregroundPatternBlendModes[0]
      );
    }

    if (u_foregroundPatternCount > 1.5) {
      color = applyPatternSlot(
        color,
        min(texture2D(u_foregroundPattern1, uv).rgb * 1.35, vec3(1.0)),
        u_foregroundPatternIntensities[1],
        u_foregroundPatternBlendModes[1]
      );
    }

    if (u_foregroundPatternCount > 2.5) {
      color = applyPatternSlot(
        color,
        min(texture2D(u_foregroundPattern2, uv).rgb * 1.35, vec3(1.0)),
        u_foregroundPatternIntensities[2],
        u_foregroundPatternBlendModes[2]
      );
    }

    return color;
  }

  vec3 sampleBackgroundPatterns(vec3 baseColor, vec2 uv) {
    vec3 color = baseColor;

    if (u_backgroundPatternCount > 0.5) {
      color = applyPatternSlot(
        color,
        texture2D(u_backgroundPattern0, uv).rgb,
        u_backgroundPatternIntensities[0],
        u_backgroundPatternBlendModes[0]
      );
    }

    if (u_backgroundPatternCount > 1.5) {
      color = applyPatternSlot(
        color,
        texture2D(u_backgroundPattern1, uv).rgb,
        u_backgroundPatternIntensities[1],
        u_backgroundPatternBlendModes[1]
      );
    }

    if (u_backgroundPatternCount > 2.5) {
      color = applyPatternSlot(
        color,
        texture2D(u_backgroundPattern2, uv).rgb,
        u_backgroundPatternIntensities[2],
        u_backgroundPatternBlendModes[2]
      );
    }

    return color;
  }

  vec2 sampleMorphStackPatternOffset(vec2 uv) {
    vec2 offset = vec2(0.0);

    if (u_morphStackPatternCount > 0.5) {
      offset += (texture2D(u_morphStackPattern0, uv).rg - 0.5) * 0.018 * u_morphStackPatternIntensities[0];
    }

    if (u_morphStackPatternCount > 1.5) {
      offset += (texture2D(u_morphStackPattern1, uv).rg - 0.5) * 0.018 * u_morphStackPatternIntensities[1];
    }

    if (u_morphStackPatternCount > 2.5) {
      offset += (texture2D(u_morphStackPattern2, uv).rg - 0.5) * 0.018 * u_morphStackPatternIntensities[2];
    }

    return offset;
  }

  vec3 applyForegroundLayer(vec3 foregroundColor, float mask, vec2 uv) {
    vec3 color = applySurfaceStyle(foregroundColor, u_foregroundStyle, mask, uv);
    color = applySurfaceDepthMorphLayers(color, mask, uv);
    color = applyShaderLayerStack(color, mask, uv, 1.0);

    return sampleForegroundPatterns(color, uv);
  }

  vec3 applyBackgroundLayer(vec3 backgroundColor, float mask, vec2 uv) {
    vec3 color = applySurfaceStyle(backgroundColor, u_backgroundStyle, 1.0 - mask, uv);
    color = applyShaderLayerStack(color, 1.0 - mask, uv, 2.0);

    return sampleBackgroundPatterns(color, uv);
  }

  vec2 applyMorphStackPattern(vec2 uv) {
    if (u_morphStackPatternCount < 0.5) {
      return uv;
    }

    vec2 offset = sampleMorphStackPatternOffset(uv);
    return clamp(uv + offset, vec2(0.0), vec2(1.0));
  }

  void main() {
    vec2 sampledUv = applyMorphStackPattern(applyMorphLayerStack(v_uv));
    float mask = applyMaskMorphLayers(texture2D(u_characterMask, sampledUv).a);
    float alpha = smoothstep(0.01, 0.99, mask);
    vec3 foregroundColor = applyForegroundLayer(u_foregroundColor, mask, sampledUv);
    vec3 backgroundColor = applyBackgroundLayer(u_backgroundColor, mask, v_uv);
    vec3 visibleBackgroundColor = mix(vec3(1.0), backgroundColor, u_backgroundOpacity);
    float foregroundAlpha = alpha * readForegroundOpacity(sampledUv);
    vec3 color = mix(visibleBackgroundColor, foregroundColor, foregroundAlpha);

    gl_FragColor = vec4(color, max(u_backgroundOpacity, foregroundAlpha));
  }
`

const neutralPatternTexture = createNeutralPatternTexture()
const neutralGlyphDistancePack = createFallbackGlyphDistancePack('No derived glyph buffers were provided.')

export function createCharacterSurfaceMaterial({
  maskTexture,
  glyphDistancePack = neutralGlyphDistancePack,
  foreground,
  background,
  patterns,
  morphLayers = [],
  shaderLayers = [],
  timeSeconds = 0,
}: CharacterSurfaceMaterialOptions) {
  const foregroundGradientStops = normalizeGradientStops(foreground.params?.gradientStops)
  const foregroundPatternSlots = readPatternSlots(patterns.foreground)
  const backgroundPatternSlots = readPatternSlots(patterns.background)
  const morphStackPatternSlots = readPatternSlots(patterns.morphStack)
  const morphRuntime = compileMorphRuntimeLayers(morphLayers)
  const shaderRuntime = compileShaderRuntimeLayers(shaderLayers)

  return new ShaderMaterial({
    vertexShader: CHARACTER_SURFACE_VERTEX_SHADER,
    fragmentShader: CHARACTER_SURFACE_FRAGMENT_SHADER,
    uniforms: {
      u_characterMask: { value: maskTexture },
      u_glyphMask: { value: glyphDistancePack.textures.mask },
      u_glyphSdf: { value: glyphDistancePack.textures.sdf },
      u_glyphEdge: { value: glyphDistancePack.textures.edge },
      u_glyphHeight: { value: glyphDistancePack.textures.height },
      u_glyphNormal: { value: glyphDistancePack.textures.normal },
      u_glyphFlow: { value: glyphDistancePack.textures.flow },
      u_glyphScatter: { value: glyphDistancePack.textures.scatter },
      u_glyphBufferAvailable: {
        value: glyphDistancePack.available ? 1 : 0,
      },
      u_glyphBufferResolution: {
        value: new Vector2(glyphDistancePack.width, glyphDistancePack.height),
      },
      u_foregroundColor: { value: readSurfaceColor(foreground.color, '#000000') },
      u_backgroundColor: { value: readSurfaceColor(background.color, '#ffffff') },
      u_foregroundGradientColors: {
        value: readGradientColors(foregroundGradientStops),
      },
      u_foregroundGradientOpacities: {
        value: readGradientOpacities(foregroundGradientStops),
      },
      u_foregroundGradientPositions: {
        value: readGradientPositions(foregroundGradientStops),
      },
      u_foregroundGradientStopCount: {
        value: foregroundGradientStops.length,
      },
      u_foregroundGradientType: {
        value: readSurfaceGradientType(foreground.params?.gradientType),
      },
      u_foregroundGradientAngle: {
        value: readGradientAngle(foreground.params?.gradientAngle),
      },
      u_foregroundStyle: {
        value: toSurfaceShaderStyleIndex(foreground.stylePresetId),
      },
      u_foregroundOpacity: {
        value: readSurfaceOpacity(foreground.params?.opacity),
      },
      u_backgroundOpacity: {
        value: readSurfaceOpacity(background.params?.opacity),
      },
      u_backgroundStyle: {
        value: toSurfaceShaderStyleIndex(background.stylePresetId),
      },
      u_foregroundDepthStrength: {
        value: readSurfaceUnitParam(foreground.params?.depthStrength, 0.72),
      },
      u_foregroundHighlightStrength: {
        value: readSurfaceUnitParam(foreground.params?.highlightStrength, 0.42),
      },
      u_foregroundRimStrength: {
        value: readSurfaceUnitParam(foreground.params?.rimStrength, 0.32),
      },
      u_foregroundEdgeSoftness: {
        value: readSurfaceUnitParam(foreground.params?.edgeSoftness, 0.08),
      },
      u_foregroundPattern0: {
        value: foregroundPatternSlots.textures[0],
      },
      u_foregroundPattern1: {
        value: foregroundPatternSlots.textures[1],
      },
      u_foregroundPattern2: {
        value: foregroundPatternSlots.textures[2],
      },
      u_foregroundPatternCount: { value: foregroundPatternSlots.count },
      u_foregroundPatternIntensities: { value: foregroundPatternSlots.intensities },
      u_foregroundPatternBlendModes: { value: foregroundPatternSlots.blendModes },
      u_backgroundPattern0: {
        value: backgroundPatternSlots.textures[0],
      },
      u_backgroundPattern1: {
        value: backgroundPatternSlots.textures[1],
      },
      u_backgroundPattern2: {
        value: backgroundPatternSlots.textures[2],
      },
      u_backgroundPatternCount: { value: backgroundPatternSlots.count },
      u_backgroundPatternIntensities: { value: backgroundPatternSlots.intensities },
      u_backgroundPatternBlendModes: { value: backgroundPatternSlots.blendModes },
      u_morphStackPattern0: {
        value: morphStackPatternSlots.textures[0],
      },
      u_morphStackPattern1: {
        value: morphStackPatternSlots.textures[1],
      },
      u_morphStackPattern2: {
        value: morphStackPatternSlots.textures[2],
      },
      u_morphStackPatternCount: { value: morphStackPatternSlots.count },
      u_morphStackPatternIntensities: { value: morphStackPatternSlots.intensities },
      u_morphLayerCount: { value: morphRuntime.count },
      u_morphLayerKinds: { value: morphRuntime.kinds },
      u_morphLayerIntensities: { value: morphRuntime.intensities },
      u_morphLayerParams: { value: morphRuntime.params.map(toVector4) },
      u_shaderLayerCount: { value: shaderRuntime.count },
      u_shaderLayerKinds: { value: shaderRuntime.kinds },
      u_shaderLayerTargets: { value: shaderRuntime.targets },
      u_shaderLayerIntensities: { value: shaderRuntime.intensities },
      u_shaderLayerBlendModes: { value: shaderRuntime.blendModes },
      u_shaderLayerParams: { value: shaderRuntime.params.map(toVector4) },
      u_timeEffective: { value: timeSeconds },
    },
    transparent: true,
  })
}

function readPatternSlots(pattern: SurfacePatternInput | undefined) {
  const patternTargets = Array.isArray(pattern)
    ? pattern.slice(0, 3)
    : pattern
      ? [
          {
            id: 'legacy-pattern',
            texture: pattern,
            intensity: 1,
            blendMode: 'normal' as const,
          },
        ]
      : []

  const textures = patternTargets.map((target) => target.texture)
  const intensities = patternTargets.map((target) => clamp01(target.intensity))
  const blendModes = patternTargets.map((target) => toPatternBlendModeIndex(target.blendMode))

  while (textures.length < 3) {
    textures.push(neutralPatternTexture)
  }

  while (intensities.length < 3) {
    intensities.push(0)
  }

  while (blendModes.length < 3) {
    blendModes.push(0)
  }

  return {
    textures,
    intensities,
    blendModes,
    count: patternTargets.length,
  }
}

function compileShaderRuntimeLayers(layers: StudioShaderLayer[]) {
  const activeLayers = layers.filter((layer) => layer.enabled).slice(0, 8)
  const kinds: number[] = activeLayers.map((layer) => toShaderLayerKind(layer.effectId))
  const targets: number[] = activeLayers.map((layer) => (layer.target === 'background-shader' ? 2 : 1))
  const intensities = activeLayers.map((layer) => clamp01(layer.intensity))
  const blendModes: number[] = activeLayers.map((layer) => toPatternBlendModeIndex(layer.blendMode))
  const params = activeLayers.map((layer) => readShaderLayerParams(layer))

  while (kinds.length < 8) {
    kinds.push(0)
    targets.push(0)
    intensities.push(0)
    blendModes.push(0)
    params.push([0, 0, 0, 0])
  }

  return {
    count: activeLayers.length,
    kinds,
    targets,
    intensities,
    blendModes,
    params,
  }
}

function toShaderLayerKind(effectId: string) {
  if (
    effectId === 'dithered-reveal' ||
    effectId === 'damaged-sensor' ||
    effectId === 'halftone-ink' ||
    effectId === 'scratch-field' ||
    effectId === 'scanline-mask' ||
    effectId === 'technical-hatch'
  ) {
    return 20
  }

  if (
    effectId === 'fluid-chrome' ||
    effectId === 'frosted-fluted-glass' ||
    effectId === 'holofoil'
  ) {
    return 40
  }

  if (effectId === 'watercolor-paper') {
    return 41
  }

  return 1
}

function readShaderLayerParams(layer: StudioShaderLayer): [number, number, number, number] {
  switch (layer.effectId) {
    case 'dithered-reveal':
    case 'damaged-sensor':
    case 'halftone-ink':
    case 'scratch-field':
    case 'scanline-mask':
    case 'technical-hatch':
      return [
        readNumberParam(layer.params.threshold, readNumberParam(layer.params.dropout, 0.45)),
        readNumberParam(layer.params.contrast, readNumberParam(layer.params.scanlineStrength, 1)),
        readNumberParam(layer.params.scale, 12),
        readNumberParam(layer.params.seed, 0),
      ]
    case 'fluid-chrome':
      return [
        readNumberParam(layer.params.flowStrength, 0.42),
        readNumberParam(layer.params.metalness, 0.88),
        readNumberParam(layer.params.refraction, 0.26),
        0,
      ]
    case 'frosted-fluted-glass':
      return [
        readNumberParam(layer.params.distortion, 0.28),
        readNumberParam(layer.params.frost, 0.36),
        readNumberParam(layer.params.fluteScale, 12),
        0,
      ]
    case 'holofoil':
      return [
        readNumberParam(layer.params.iridescence, 0.72),
        readNumberParam(layer.params.banding, 0.48),
        readNumberParam(layer.params.sparkle, 0.28),
        0,
      ]
    case 'watercolor-paper':
      return [
        readNumberParam(layer.params.wash, 0.46),
        readNumberParam(layer.params.grain, 0.32),
        readNumberParam(layer.params.scale, 2.4),
        0,
      ]
    default:
      return [
        readNumberParam(layer.params.edgeWidth, 0.32),
        readNumberParam(layer.params.bevelDepth, readNumberParam(layer.params.gloss, 0.52)),
        readNumberParam(layer.params.roughness, readNumberParam(layer.params.grainScale, 0.45)),
        readNumberParam(layer.params.readabilityClamp, readNumberParam(layer.params.rim, 0.78)),
      ]
  }
}

function readNumberParam(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toPatternBlendModeIndex(blendMode: PatternLayerTextureTarget['blendMode']) {
  if (blendMode === 'multiply') {
    return 1
  }

  if (blendMode === 'screen') {
    return 2
  }

  if (blendMode === 'overlay') {
    return 3
  }

  if (blendMode === 'soft-light') {
    return 4
  }

  return 0
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 1))
}

function toVector4(values: [number, number, number, number]) {
  return new Vector4(values[0], values[1], values[2], values[3])
}

function readGradientColors(stops: typeof DEFAULT_GRADIENT_STOPS) {
  return padGradientStops(stops).map((stop) => readSurfaceColor(stop.color, '#000000'))
}

function readGradientPositions(stops: typeof DEFAULT_GRADIENT_STOPS) {
  return padGradientStops(stops).map((stop) => stop.position)
}

function readGradientOpacities(stops: typeof DEFAULT_GRADIENT_STOPS) {
  return padGradientStops(stops).map((stop) => readGradientStopOpacity(stop))
}

function padGradientStops(stops: typeof DEFAULT_GRADIENT_STOPS) {
  const fallbackStop = stops[stops.length - 1] ?? DEFAULT_GRADIENT_STOPS[1]
  const paddedStops = [...stops]

  while (paddedStops.length < MAX_FOREGROUND_GRADIENT_STOPS) {
    paddedStops.push(fallbackStop)
  }

  return paddedStops.slice(0, MAX_FOREGROUND_GRADIENT_STOPS)
}

export function toSurfaceShaderStyleIndex(stylePresetId: string) {
  const styleIndex = SURFACE_SHADER_STYLE_IDS.indexOf(stylePresetId as SurfaceShaderStyleId)

  return styleIndex >= 0 ? styleIndex : 0
}

function readSurfaceColor(color: string, fallback: string) {
  try {
    return hexToVector3(color)
  } catch {
    return hexToVector3(fallback)
  }
}

function readSurfaceOpacity(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1
}

function readSurfaceUnitParam(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback
}

function readSurfaceGradientType(value: unknown) {
  return readGradientType(value) === 'radial' ? 1 : 0
}

function createNeutralPatternTexture() {
  const texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true

  return texture
}
