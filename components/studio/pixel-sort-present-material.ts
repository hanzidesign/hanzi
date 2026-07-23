import { Color, ShaderMaterial, Vector2, type Texture } from 'three'
import type { PixelSortSettings } from './pixel-sort-core'

export function resolvePixelSortFallbackOverlay(
  sourceNonBlack: boolean,
  fallbackOverlay: number,
) {
  return Math.max(sourceNonBlack ? 1 : 0, fallbackOverlay)
}

export type PixelSortPresentMode = 'preview' | 'exact'

export type PixelSortPresentOptions = Readonly<{
  mode?: PixelSortPresentMode
  resolution?: { width: number; height: number }
  settings?: PixelSortSettings
}>

/** Preview and export present the same connected GPU-propagated trail over the
 * rendered 2D source. Exact mode is retained only for compatibility helpers. */
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
uniform sampler2D u_trailFrame;
uniform vec2 u_resolution;
uniform vec2 u_visualResolution;
uniform float u_renderMode;
uniform float u_trailAvailable;
uniform float u_trailRadial;
uniform float u_trailMaxRadius;
uniform float u_trailAngularBins;
uniform float u_trailRadialBins;
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
uniform vec3 u_startColor;
uniform vec3 u_middleColor;
uniform vec3 u_endColor;
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

float sourceMaximum(vec3 color) {
  return max(color.r, max(color.g, color.b));
}

bool sourceIsNonBlack(vec3 color) {
  return sourceMaximum(color) > 0.0001;
}

vec3 previewGradient(float value) {
  vec3 lower = mix(u_startColor, u_middleColor, smoothstep(0.0, 0.5, value));
  return mix(lower, u_endColor, smoothstep(0.5, 1.0, value));
}

float sourceModeValue(vec4 color) {
  float luminance = pixelSortLuminance(color.rgb);
  float maximum = sourceMaximum(color.rgb);
  if (u_sortMode < 0.5) return luminance;
  if (u_sortMode < 1.5) return 1.0 - luminance;
  if (u_sortMode < 2.5) return maximum;
  if (u_sortMode < 3.5) return 1.0 - maximum;
  return color.a;
}

float depthReach(float depth, float threshold, bool nonBlack) {
  if (!nonBlack || depth < threshold) return 0.0;
  if (threshold >= 1.0) return depth >= 1.0 ? 1.0 : 0.0;
  return clamp((depth - threshold) / max(1.0 - threshold, 0.0001), 0.0, 1.0);
}

float candidateModeReach(vec4 candidate) {
  bool nonBlack = sourceIsNonBlack(candidate.rgb);
  if (!nonBlack) return 0.0;
  float maximum = sourceMaximum(candidate.rgb);
  if (u_sortMode > 3.5) return max(depthReach(candidate.a, u_threshold, nonBlack), maximum);
  float luminance = pixelSortLuminance(candidate.rgb);
  bool eligible = u_sortMode < 0.5
    ? luminance >= u_threshold * 0.25
    : u_sortMode < 1.5
      ? luminance <= 1.0 - u_threshold * 0.25
      : u_sortMode < 2.5
        ? maximum >= u_threshold
        : maximum <= u_threshold;
  if (!eligible) return 0.0;
  return clamp(sourceModeValue(candidate), 0.0, 1.0);
}

float pixelSortLine(vec2 pixel, vec2 radialPixels) {
  if (u_direction < 0.5) return pixel.y;
  if (u_direction < 1.5) return pixel.x;
  if (u_direction < 2.5) return pixel.x - pixel.y;
  if (u_direction < 3.5) return pixel.x + pixel.y;
  float angle = atan(radialPixels.y, radialPixels.x);
  if (angle < 0.0) angle += 6.28318530718;
  return floor(angle / 6.28318530718 * u_trailAngularBins);
}

vec2 pixelSortAxis(vec2 radialPixels) {
  if (u_direction < 0.5) return vec2(1.0, 0.0);
  if (u_direction < 1.5) return vec2(0.0, 1.0);
  if (u_direction < 2.5) return vec2(0.70710678, 0.70710678);
  if (u_direction < 3.5) return vec2(0.70710678, -0.70710678);
  return radialPixels / max(length(radialPixels), 0.0001);
}

vec4 sampleTrail(vec2 radialPixels) {
  if (u_trailRadial > 0.5) {
    float radius = length(radialPixels);
    float angle = atan(radialPixels.y, radialPixels.x);
    if (angle < 0.0) angle += 6.28318530718;
    vec2 radialUv = vec2(
      angle / 6.28318530718,
      radius / max(u_trailMaxRadius, 1.0)
    );
    return texture2D(u_trailFrame, clamp(radialUv, vec2(0.0), vec2(1.0)));
  }
  return texture2D(u_trailFrame, v_uv);
}

vec4 sampleSourceFrame(vec2 uv) {
  return texture2D(u_sourceFrame, clamp(uv, vec2(0.0), vec2(1.0)));
}

void main() {
  if (u_renderMode > 0.5) {
    vec4 exact = texture2D(u_sortedFrame, v_uv);
    gl_FragColor = vec4(exact.rgb, 1.0);
    return;
  }

  vec4 source = texture2D(u_sourceFrame, v_uv);
  bool sourceNonBlack = sourceIsNonBlack(source.rgb);
  vec2 pixel = v_uv * u_resolution - 0.5;
  vec2 radialPixels = (v_uv - vec2(0.5)) * u_resolution;
  vec2 visualPixel = v_uv * u_visualResolution - 0.5;
  vec2 visualRadialPixels = (v_uv - vec2(0.5)) * u_visualResolution;
  float line = pixelSortLine(visualPixel, visualRadialPixels);
  float lineHash = clamp(hash11(line * 0.173), 0.0, 1.0);
  float lineFactor = u_randomness == 0.0 ? 1.0 : pow(lineHash, u_randomness);
  vec2 visualToActualScale = u_resolution / max(u_visualResolution, vec2(1.0));
  vec2 visualAxis = pixelSortAxis(visualRadialPixels);
  vec2 scaledAxis = visualAxis * visualToActualScale;
  float directionalScale = max(length(scaledAxis), 0.0001);
  float streakLength = u_streakLength * directionalScale;
  vec2 axis = scaledAxis / directionalScale;
  vec4 trail = sampleTrail(radialPixels);
  float effectiveLimit = min(
    streakLength,
    streakLength * lineFactor * clamp(trail.a, 0.0, 1.0)
  );
  float validTrail = step(0.0, trail.b)
    * step(0.0001, effectiveLimit)
    * step(trail.b, effectiveLimit);
  float foregroundTrail = float(sourceNonBlack) * step(0.0, trail.b);
  float trailGradientT = sourceNonBlack
    ? fract(
        dot(pixel, axis) * mix(1.0, -1.0, u_reverse)
          / max(streakLength * lineFactor, 1.0)
      )
    : clamp(trail.b / max(effectiveLimit, 0.0001), 0.0, 1.0);
  vec3 base = sourceNonBlack
    ? mix(source.rgb, previewGradient(source.a), u_mix)
    : u_background;
  vec3 lineColor = previewGradient(trailGradientT);
  float overlay = u_trailAvailable * max(foregroundTrail, validTrail);

  // The unsupported path stays bounded and mask-based. It can only probe one
  // upstream source candidate, but it never replaces or erases the depth base.
  if (u_trailAvailable < 0.5) {
    float direction = mix(1.0, -1.0, u_reverse);
    vec2 fullProbeUv = clamp(
      v_uv - axis * direction * streakLength * lineFactor
        / max(u_resolution, vec2(1.0)),
      vec2(0.0), vec2(1.0)
    );
    vec4 fullProbe = sampleSourceFrame(fullProbeUv);
    float fallbackReach = candidateModeReach(fullProbe);
    float fallbackLimit = min(
      streakLength,
      streakLength * lineFactor * clamp(fallbackReach, 0.0, 1.0)
    );
    vec2 fallbackUv = clamp(
      v_uv - axis * direction * fallbackLimit / max(u_resolution, vec2(1.0)),
      vec2(0.0), vec2(1.0)
    );
    vec4 fallbackCandidate = sampleSourceFrame(fallbackUv);
    float fallbackOverlay = step(0.0001, fallbackLimit)
      * step(0.0001, sourceMaximum(fallbackCandidate.rgb));
    overlay = max(float(sourceNonBlack), fallbackOverlay);
    lineColor = previewGradient(1.0);
  }

  vec3 composed = mix(base, lineColor, u_intensity * overlay);
  float normalizedBrightness = u_brightness / 100.0;
  float normalizedContrast = u_contrast / 100.0;
  float contrastFactor = (1.0 + normalizedContrast)
    / (1.0 - normalizedContrast * 0.99);
  composed = (composed + vec3(normalizedBrightness) - 0.5) * contrastFactor + 0.5;
  gl_FragColor = vec4(clamp(composed, 0.0, 1.0), 1.0);
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
  depth: 4,
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
      u_trailFrame: { value: sourceFrame },
      u_resolution: { value: new Vector2(resolution.width, resolution.height) },
      u_visualResolution: { value: new Vector2(resolution.width, resolution.height) },
      u_renderMode: { value: options.mode === 'exact' ? 1 : 0 },
      u_trailAvailable: { value: 0 },
      u_trailRadial: { value: 0 },
      u_trailMaxRadius: { value: 1 },
      u_trailAngularBins: { value: 1 },
      u_trailRadialBins: { value: 1 },
      u_direction: { value: directionId(settings?.direction) },
      u_sortMode: { value: sortModeId(settings?.mode) },
      u_threshold: { value: settings?.threshold ?? 0.25 },
      u_streakLength: { value: settings?.streakLength ?? 500 },
      u_intensity: { value: settings?.intensity ?? 1 },
      u_randomness: { value: settings?.randomness ?? 0.5 },
      u_reverse: { value: settings?.reverse ? 1 : 0 },
      u_brightness: { value: settings?.brightness ?? 0 },
      u_contrast: { value: settings?.contrast ?? 0 },
      u_mix: { value: settings?.mix ?? 1 },
      u_startColor: { value: new Color(settings?.startColor ?? '#35115c') },
      u_middleColor: { value: new Color(settings?.middleColor ?? '#c93472') },
      u_endColor: { value: new Color(settings?.endColor ?? '#e6a928') },
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

export function setPixelSortPreviewTrail(
  material: ShaderMaterial,
  frame: Texture,
  options: Readonly<{
    available: boolean
    radial?: boolean
    maxRadius?: number
    angularBins?: number
    radialBins?: number
  }>,
) {
  material.uniforms.u_trailFrame.value = frame
  material.uniforms.u_trailAvailable.value = options.available ? 1 : 0
  material.uniforms.u_trailRadial.value = options.radial ? 1 : 0
  material.uniforms.u_trailMaxRadius.value = Math.max(1, options.maxRadius ?? 1)
  material.uniforms.u_trailAngularBins.value = Math.max(1, options.angularBins ?? 1)
  material.uniforms.u_trailRadialBins.value = Math.max(1, options.radialBins ?? 1)
}

export function setPixelSortPresentMode(material: ShaderMaterial, mode: PixelSortPresentMode) {
  material.uniforms.u_renderMode.value = mode === 'exact' ? 1 : 0
}

export function setPixelSortPreviewResolution(
  material: ShaderMaterial,
  width: number,
  height: number,
  visualWidth = width,
  visualHeight = height,
) {
  const resolution = material.uniforms.u_resolution.value as Vector2
  resolution.set(Math.max(1, width), Math.max(1, height))
  const visualResolution = material.uniforms.u_visualResolution.value as Vector2
  visualResolution.set(Math.max(1, visualWidth), Math.max(1, visualHeight))
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
  ;(material.uniforms.u_startColor.value as Color).set(settings.startColor)
  ;(material.uniforms.u_middleColor.value as Color).set(settings.middleColor)
  ;(material.uniforms.u_endColor.value as Color).set(settings.endColor)
  ;(material.uniforms.u_background.value as Color).set(settings.background)
}

function directionId(direction: PixelSortSettings['direction'] | undefined) {
  return DIRECTION_IDS[direction ?? 'horizontal'] ?? 0
}

function sortModeId(mode: PixelSortSettings['mode'] | undefined) {
  return SORT_MODE_IDS[mode ?? 'depth'] ?? 4
}
