import { DataTexture, LinearFilter, ShaderMaterial, type Texture } from 'three'
import type { StudioSurfaceShaderLayer } from '@/app/studio/studio-store'
import {
  DEFAULT_GRADIENT_STOPS,
  normalizeGradientStops,
  readGradientAngle,
  readGradientStopOpacity,
  readGradientType,
} from '@/components/studio/gradient-stops'
import { hexToVector3 } from '@/shaders/uniforms'

export const SURFACE_SHADER_STYLE_IDS = ['solid', 'soft-gradient', 'depth-lit', 'gradient'] as const

type SurfaceShaderStyleId = (typeof SURFACE_SHADER_STYLE_IDS)[number]

type CharacterSurfaceMaterialOptions = {
  maskTexture: Texture
  foreground: Pick<StudioSurfaceShaderLayer, 'color' | 'stylePresetId'> &
    Partial<Pick<StudioSurfaceShaderLayer, 'params'>>
  background: Pick<StudioSurfaceShaderLayer, 'color' | 'stylePresetId'> &
    Partial<Pick<StudioSurfaceShaderLayer, 'params'>>
  patterns: {
    foreground?: Texture
    background?: Texture
    morphStack?: Texture
  }
}

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
  uniform sampler2D u_foregroundPattern;
  uniform sampler2D u_backgroundPattern;
  uniform sampler2D u_morphStackPattern;
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
  uniform float u_hasForegroundPattern;
  uniform float u_hasBackgroundPattern;
  uniform float u_hasMorphStackPattern;

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

    float edge = smoothstep(0.08, 0.9, mask);
    float bevel = edge * (1.0 - smoothstep(0.86, 1.0, mask));
    float highlight = smoothstep(0.22, 0.92, uv.x * 0.62 + uv.y * 0.38);
    float rimLight = bevel * 0.32;
    vec3 additiveHighlight = vec3(0.16, 0.18, 0.2) * (highlight * 0.42 + rimLight);
    return min(baseColor * (0.72 + edge * 0.26), vec3(1.0)) + additiveHighlight;
  }

  float readForegroundOpacity(vec2 uv) {
    if (u_foregroundStyle > 2.5) {
      return sampleForegroundGradientOpacity(uv);
    }

    return u_foregroundOpacity;
  }

  vec3 applyForegroundLayer(vec3 foregroundColor, float mask, vec2 uv) {
    vec3 color = applySurfaceStyle(foregroundColor, u_foregroundStyle, mask, uv);

    if (u_hasForegroundPattern > 0.5) {
      vec3 pattern = texture2D(u_foregroundPattern, uv).rgb;
      color *= mix(vec3(1.0), pattern * 1.35, 0.28);
    }

    return color;
  }

  vec3 applyBackgroundLayer(vec3 backgroundColor, float mask, vec2 uv) {
    vec3 color = applySurfaceStyle(backgroundColor, u_backgroundStyle, 1.0 - mask, uv);

    if (u_hasBackgroundPattern > 0.5) {
      vec3 pattern = texture2D(u_backgroundPattern, uv).rgb;
      color = mix(color, pattern, 0.18);
    }

    return color;
  }

  vec2 applyMorphStackPattern(vec2 uv) {
    if (u_hasMorphStackPattern < 0.5) {
      return uv;
    }

    vec3 pattern = texture2D(u_morphStackPattern, uv).rgb;
    vec2 offset = (pattern.rg - 0.5) * 0.018;
    return clamp(uv + offset, vec2(0.0), vec2(1.0));
  }

  void main() {
    vec2 sampledUv = applyMorphStackPattern(v_uv);
    float mask = texture2D(u_characterMask, sampledUv).a;
    float alpha = smoothstep(0.01, 0.99, mask);
    vec3 foregroundColor = applyForegroundLayer(u_foregroundColor, mask, sampledUv);
    vec3 backgroundColor = applyBackgroundLayer(u_backgroundColor, mask, sampledUv);
    vec3 visibleBackgroundColor = mix(vec3(1.0), backgroundColor, u_backgroundOpacity);
    float foregroundAlpha = alpha * readForegroundOpacity(sampledUv);
    vec3 color = mix(visibleBackgroundColor, foregroundColor, foregroundAlpha);

    gl_FragColor = vec4(color, max(u_backgroundOpacity, foregroundAlpha));
  }
`

const neutralPatternTexture = createNeutralPatternTexture()

export function createCharacterSurfaceMaterial({
  maskTexture,
  foreground,
  background,
  patterns,
}: CharacterSurfaceMaterialOptions) {
  const foregroundGradientStops = normalizeGradientStops(foreground.params?.gradientStops)

  return new ShaderMaterial({
    vertexShader: CHARACTER_SURFACE_VERTEX_SHADER,
    fragmentShader: CHARACTER_SURFACE_FRAGMENT_SHADER,
    uniforms: {
      u_characterMask: { value: maskTexture },
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
      u_foregroundPattern: {
        value: patterns.foreground ?? neutralPatternTexture,
      },
      u_backgroundPattern: {
        value: patterns.background ?? neutralPatternTexture,
      },
      u_morphStackPattern: {
        value: patterns.morphStack ?? neutralPatternTexture,
      },
      u_hasForegroundPattern: { value: patterns.foreground ? 1 : 0 },
      u_hasBackgroundPattern: { value: patterns.background ? 1 : 0 },
      u_hasMorphStackPattern: { value: patterns.morphStack ? 1 : 0 },
    },
    transparent: true,
  })
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
