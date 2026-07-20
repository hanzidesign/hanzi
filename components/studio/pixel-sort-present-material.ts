import { Color, ShaderMaterial, Vector2, type Texture } from 'three'
import type { PixelSortSettings } from './pixel-sort-core'

export type PixelSortPresentMode = 'preview' | 'exact'

export type PixelSortPresentOptions = Readonly<{
  mode?: PixelSortPresentMode
  resolution?: { width: number; height: number }
  settings?: PixelSortSettings
}>

/**
 * The preview is intentionally a bounded approximation. It samples the source
 * texture at most twice and never reads a neighbour window or sorts on the GPU.
 * Exact mode is a single pass-through of the CPU result.
 */
export const PIXEL_SORT_PRESENT_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const PIXEL_SORT_PRESENT_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceFrame;
uniform sampler2D u_sortedFrame;
uniform vec2 u_resolution;
uniform float u_renderMode;
uniform float u_direction;
uniform float u_sortMode;
uniform float u_threshold;
uniform float u_streakLength;
uniform float u_intensity;
uniform float u_randomness;
uniform float u_reverse;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_mix;
uniform vec3 u_shadow;
uniform vec3 u_midtone;
uniform vec3 u_highlight;
uniform vec3 u_background;
varying vec2 v_uv;

float hash11(float value) {
  value = fract(value * 0.1031);
  value *= value + 33.33;
  return fract(value * (value + value));
}

float pixelSortLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec3 previewPalette(float value) {
  vec3 lower = mix(u_shadow, u_midtone, smoothstep(0.0, 0.5, value));
  return mix(lower, u_highlight, smoothstep(0.5, 1.0, value));
}

void main() {
  if (u_renderMode > 0.5) {
    gl_FragColor = texture2D(u_sortedFrame, v_uv);
    return;
  }

  vec4 source = texture2D(u_sourceFrame, v_uv);
  float value = pixelSortLuminance(source.rgb);
  vec2 pixel = v_uv * u_resolution;
  vec2 radialPixels = (v_uv - vec2(0.5)) * u_resolution;
  float line = u_direction < 0.5
    ? v_uv.y * u_resolution.y
    : u_direction < 1.5
      ? v_uv.x * u_resolution.x
      : u_direction < 2.5
        ? (pixel.x - pixel.y)
        : u_direction < 3.5
          ? (pixel.x + pixel.y)
          : atan(radialPixels.y, radialPixels.x) * 8.0;
  float lineRandom = hash11(line * 0.173);
  float variedThreshold = u_threshold * (1.0 + (lineRandom - 0.5) * u_randomness * 0.5);
  float eligible = u_sortMode < 0.5
    ? step(variedThreshold * 0.25, value)
    : u_sortMode < 1.5
      ? step(value, 1.0 - variedThreshold * 0.25)
      : u_sortMode < 2.5
        ? step(variedThreshold, max(source.r, max(source.g, source.b)))
        : step(max(source.r, max(source.g, source.b)), variedThreshold);

  vec2 axis;
  if (u_direction < 0.5) {
    axis = vec2(1.0, 0.0);
  } else if (u_direction < 1.5) {
    axis = vec2(0.0, 1.0);
  } else if (u_direction < 2.5) {
    axis = vec2(0.70710678, 0.70710678);
  } else if (u_direction < 3.5) {
    axis = vec2(0.70710678, -0.70710678);
  } else {
    axis = radialPixels / max(length(radialPixels), 0.0001);
  }
  float linePosition = u_direction < 0.5
    ? pixel.x
    : u_direction < 1.5
      ? pixel.y
      : u_direction < 2.5
        ? (pixel.x + pixel.y) * 0.70710678
        : u_direction < 3.5
          ? (pixel.x - pixel.y + u_resolution.y) * 0.70710678
          : length(radialPixels);
  float palettePhase = hash11((line + 1.0) * 0.619)
    * u_streakLength
    * u_randomness;
  float paletteT = eligible * fract(
    (linePosition + palettePhase) / max(u_streakLength, 1.0)
  );
  float orderingValue = mix(value, 1.0 - value, u_reverse);
  float displacement = u_streakLength * u_intensity * eligible * (orderingValue * 2.0 - 1.0);
  displacement *= mix(1.0, lineRandom, clamp(u_randomness, 0.0, 1.0));
  vec2 sampleUv = clamp(v_uv + axis * displacement / max(u_resolution, vec2(1.0)), vec2(0.0), vec2(1.0));
  vec4 shifted = texture2D(u_sourceFrame, sampleUv);
  float shiftedValue = pixelSortLuminance(shifted.rgb);
  vec3 palette = previewPalette(paletteT);
  vec3 composed = mix(shifted.rgb, palette, u_mix);
  composed = mix(composed, u_background, 1.0 - step(0.0001, shiftedValue));
  float normalizedBrightness = u_brightness / 100.0;
  float normalizedContrast = u_contrast / 100.0;
  float contrastFactor = (1.0 + normalizedContrast)
    / (1.0 - normalizedContrast * 0.99);
  composed = (composed + vec3(normalizedBrightness) - 0.5) * contrastFactor + 0.5;
  gl_FragColor = vec4(clamp(composed, 0.0, 1.0), shifted.a);
}
`

const DIRECTION_IDS: Record<string, number> = {
  horizontal: 0,
  vertical: 1,
  diagonal: 2,
  'anti-diagonal': 3,
  radial: 4,
}

const SORT_MODE_IDS: Record<string, number> = {
  brightness: 0,
  hue: 1,
  saturation: 2,
  dark: 3,
}

export function createPixelSortPresentMaterial(
  sourceFrame: Texture,
  options: PixelSortPresentOptions = {},
) {
  const settings = options.settings
  const resolution = options.resolution ?? { width: 1, height: 1 }
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: PIXEL_SORT_PRESENT_FRAGMENT_SHADER,
    uniforms: {
      u_sourceFrame: { value: sourceFrame },
      // Keep the exact-frame uniform available from construction so changing
      // modes never allocates or replaces a preview texture.
      u_sortedFrame: { value: sourceFrame },
      u_resolution: { value: new Vector2(resolution.width, resolution.height) },
      u_renderMode: { value: options.mode === 'exact' ? 1 : 0 },
      u_direction: { value: directionId(settings?.direction) },
      u_sortMode: { value: sortModeId(settings?.mode) },
      u_threshold: { value: settings?.threshold ?? 0.25 },
      u_streakLength: { value: settings?.streakLength ?? 100 },
      u_intensity: { value: settings?.intensity ?? 0.8 },
      u_randomness: { value: settings?.randomness ?? 0.3 },
      u_reverse: { value: settings?.reverse ? 1 : 0 },
      u_brightness: { value: settings?.brightness ?? 0 },
      u_contrast: { value: settings?.contrast ?? 0 },
      u_mix: { value: settings?.mix ?? 1 },
      u_shadow: { value: new Color(settings?.shadow ?? '#35115c') },
      u_midtone: { value: new Color(settings?.midtone ?? '#c93472') },
      u_highlight: { value: new Color(settings?.highlight ?? '#e6a928') },
      u_background: { value: new Color(settings?.background ?? '#ffffff') },
    },
    vertexShader: PIXEL_SORT_PRESENT_VERTEX_SHADER,
  })

  return material
}

export function setPixelSortPresentFrame(material: ShaderMaterial, frame: Texture) {
  setPixelSortExactFrame(material, frame)
}

export function setPixelSortExactFrame(material: ShaderMaterial, frame: Texture) {
  material.uniforms.u_sortedFrame.value = frame
}

export function setPixelSortPreviewSource(material: ShaderMaterial, frame: Texture) {
  material.uniforms.u_sourceFrame.value = frame
}

export function setPixelSortPresentMode(material: ShaderMaterial, mode: PixelSortPresentMode) {
  material.uniforms.u_renderMode.value = mode === 'exact' ? 1 : 0
}

export function setPixelSortPreviewResolution(
  material: ShaderMaterial,
  width: number,
  height: number,
) {
  const resolution = material.uniforms.u_resolution.value as Vector2
  resolution.set(Math.max(1, width), Math.max(1, height))
}

export function setPixelSortPreviewSettings(
  material: ShaderMaterial,
  settings: PixelSortSettings,
) {
  material.uniforms.u_direction.value = directionId(settings.direction)
  material.uniforms.u_sortMode.value = sortModeId(settings.mode)
  material.uniforms.u_threshold.value = settings.threshold
  material.uniforms.u_streakLength.value = settings.streakLength
  material.uniforms.u_intensity.value = settings.intensity
  material.uniforms.u_randomness.value = settings.randomness
  material.uniforms.u_reverse.value = settings.reverse ? 1 : 0
  material.uniforms.u_brightness.value = settings.brightness
  material.uniforms.u_contrast.value = settings.contrast
  material.uniforms.u_mix.value = settings.mix
  ;(material.uniforms.u_shadow.value as Color).set(settings.shadow)
  ;(material.uniforms.u_midtone.value as Color).set(settings.midtone)
  ;(material.uniforms.u_highlight.value as Color).set(settings.highlight)
  ;(material.uniforms.u_background.value as Color).set(settings.background)
}

function directionId(direction: PixelSortSettings['direction'] | undefined) {
  return DIRECTION_IDS[direction ?? 'horizontal'] ?? 0
}

function sortModeId(mode: PixelSortSettings['mode'] | undefined) {
  return SORT_MODE_IDS[mode ?? 'hue'] ?? 1
}
