import {
  HalfFloatType,
  Mesh,
  NearestFilter,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three'
import type { PixelSortDirection, PixelSortSettings } from './pixel-sort-core'

export type PixelSortTrailDimensions = Readonly<{
  width: number
  height: number
}>

export type PixelSortRadialDimensions = Readonly<{
  maxRadius: number
  angularBins: number
  radialBins: number
}>

const MAX_RADIAL_ANGULAR_BINS = 4096

export function getPixelSortRadialDimensions(
  width: number,
  height: number,
): PixelSortRadialDimensions {
  const safeWidth = Math.max(1, Math.round(width))
  const safeHeight = Math.max(1, Math.round(height))
  const maxRadius = Math.max(1, Math.ceil(Math.hypot(safeWidth, safeHeight) / 2))
  return {
    maxRadius,
    angularBins: Math.max(
      1,
      Math.min(MAX_RADIAL_ANGULAR_BINS, Math.ceil(Math.PI * 2 * maxRadius)),
    ),
    radialBins: maxRadius + 1,
  }
}

export function getPixelSortRadialBin(
  x: number,
  y: number,
  width: number,
  height: number,
): { angleBin: number; radiusBin: number } {
  const radial = getPixelSortRadialDimensions(width, height)
  const px = x + 0.5 - width / 2
  const py = y + 0.5 - height / 2
  const angle = Math.atan2(py, px)
  const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2)
  return {
    angleBin: Math.min(
      radial.angularBins - 1,
      Math.floor(normalizedAngle / (Math.PI * 2) * radial.angularBins),
    ),
    radiusBin: Math.min(radial.maxRadius, Math.round(Math.hypot(px, py))),
  }
}

export function getPixelSortRadialUv(
  angleBin: number,
  radiusBin: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const radial = getPixelSortRadialDimensions(width, height)
  const angle = (angleBin + 0.5) / radial.angularBins * Math.PI * 2
  const radius = Math.min(radial.maxRadius, Math.max(0, radiusBin))
  return {
    x: width / 2 + Math.cos(angle) * radius - 0.5,
    y: height / 2 + Math.sin(angle) * radius - 0.5,
  }
}

export function getPixelSortLinearStep(
  direction: PixelSortDirection,
  step: number,
  reverse = false,
): { x: number; y: number } {
  const sign = reverse ? -1 : 1
  switch (direction) {
    case 'vertical':
      return { x: 0, y: sign * step }
    case 'diagonal':
      return { x: sign * step, y: sign * step }
    case 'anti-diagonal':
      return { x: sign * step, y: -sign * step }
    case 'horizontal':
    case 'radial':
      return { x: sign * step, y: 0 }
  }
}

export function getPixelSortTrailPipeline(direction: PixelSortDirection): 'linear' | 'radial' {
  return direction === 'radial' ? 'radial' : 'linear'
}

export function isPixelSortTrailSupported(renderer: WebGLRenderer) {
  if (!renderer.capabilities.isWebGL2) return false
  return renderer.extensions.has('EXT_color_buffer_float')
    || renderer.extensions.has('EXT_color_buffer_half_float')
}

export const PIXEL_SORT_TRAIL_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/** Seeds every occupied source pixel. RG stores source UV, B is zero on the
 * model and becomes exterior distance during propagation, and A stores reach. */
export const PIXEL_SORT_TRAIL_SEED_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceFrame;
uniform vec2 u_resolution;
uniform float u_direction;
uniform float u_sortMode;
uniform float u_threshold;
uniform float u_reverse;
varying vec2 v_uv;

vec4 sourceAtPixel(vec2 pixel) {
  if (pixel.x < 0.0 || pixel.y < 0.0 || pixel.x >= u_resolution.x || pixel.y >= u_resolution.y) {
    return vec4(0.0);
  }
  return texture2D(u_sourceFrame, (pixel + 0.5) / u_resolution);
}

float sourceMaximum(vec3 color) {
  return max(color.r, max(color.g, color.b));
}

float localReach(vec4 source) {
  float maximum = sourceMaximum(source.rgb);
  if (maximum <= 0.0001) return 0.0;
  float luminance = dot(source.rgb, vec3(0.299, 0.587, 0.114));
  if (u_sortMode < 0.5) return luminance > u_threshold * 0.25 ? luminance : 0.0;
  if (u_sortMode < 1.5) return luminance < 1.0 - u_threshold * 0.25 ? 1.0 - luminance : 0.0;
  if (u_sortMode < 2.5) return maximum > u_threshold ? maximum : 0.0;
  if (u_sortMode < 3.5) return maximum < u_threshold ? 1.0 - maximum : 0.0;
  float depthReach = 0.0;
  if (source.a >= u_threshold) {
    if (u_threshold >= 1.0) {
      depthReach = source.a >= 1.0 ? 1.0 : 0.0;
    } else {
      depthReach = clamp((source.a - u_threshold) / max(1.0 - u_threshold, 0.0001), 0.0, 1.0);
    }
  }
  return max(depthReach, maximum);
}

void main() {
  vec2 pixel = gl_FragCoord.xy - 0.5;
  vec4 source = sourceAtPixel(pixel);
  float occupied = step(0.0001, sourceMaximum(source.rgb));
  float reach = localReach(source);
  gl_FragColor = occupied > 0.5
    ? vec4((pixel + 0.5) / u_resolution, 0.0, reach)
    : vec4(0.0, 0.0, -1.0, reach);
}
`

/** Jump propagation over one discrete scanline step. The CPU executes this
 * pass at powers of two, making the preview O(log extent) without a fragment
 * loop or readback. */
export const PIXEL_SORT_TRAIL_PROPAGATE_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_previous;
uniform vec2 u_resolution;
uniform float u_direction;
uniform float u_step;
uniform float u_reverse;
varying vec2 v_uv;

void main() {
  vec4 current = texture2D(u_previous, v_uv);
  vec2 stepPixels;
  if (u_direction < 0.5) {
    stepPixels = vec2(u_step, 0.0);
  } else if (u_direction < 1.5) {
    stepPixels = vec2(0.0, u_step);
  } else if (u_direction < 2.5) {
    stepPixels = vec2(u_step, u_step);
  } else {
    stepPixels = vec2(u_step, -u_step);
  }
  stepPixels *= mix(1.0, -1.0, u_reverse);
  vec2 delta = stepPixels / max(u_resolution, vec2(1.0));
  vec2 upstreamUv = v_uv - delta;
  vec4 upstream = (upstreamUv.x < 0.0 || upstreamUv.y < 0.0 || upstreamUv.x > 1.0 || upstreamUv.y > 1.0)
    ? vec4(0.0, 0.0, -1.0, 0.0)
    : texture2D(u_previous, upstreamUv);
  if (current.b >= 0.0) {
    gl_FragColor = vec4(current.rgb, clamp(current.a, 0.0, 1.0));
  } else if (upstream.b >= 0.0) {
    gl_FragColor = vec4(upstream.rg, upstream.b + u_step, clamp(max(current.a, upstream.a), 0.0, 1.0));
  } else {
    gl_FragColor = vec4(0.0, 0.0, -1.0, clamp(max(current.a, upstream.a), 0.0, 1.0));
  }
}
`

/** Polar seed pass. Polar bins map back to the rendered source and inspect a
 * nearest 2x2 source neighborhood so the center seam does not introduce a
 * disconnected one-pixel hole. */
export const PIXEL_SORT_TRAIL_RADIAL_SEED_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_sourceFrame;
uniform vec2 u_sourceResolution;
uniform float u_maxRadius;
uniform float u_angularBins;
uniform float u_radialBins;
uniform float u_sortMode;
uniform float u_threshold;
uniform float u_reverse;
varying vec2 v_uv;

float sourceMaximum(vec3 color) {
  return max(color.r, max(color.g, color.b));
}

vec4 polarSource(float angle, float radius, out vec2 sourceUv) {
  vec2 center = (u_sourceResolution - 1.0) * 0.5;
  vec2 sourcePixel = floor(center + vec2(cos(angle), sin(angle)) * radius + 0.5);
  sourceUv = (sourcePixel + 0.5) / u_sourceResolution;
  if (radius < 0.0 || sourcePixel.x < 0.0 || sourcePixel.y < 0.0
    || sourcePixel.x >= u_sourceResolution.x || sourcePixel.y >= u_sourceResolution.y) {
    return vec4(0.0);
  }
  return texture2D(u_sourceFrame, sourceUv);
}

float localReach(vec4 source) {
  float maximum = sourceMaximum(source.rgb);
  if (maximum <= 0.0001) return 0.0;
  float luminance = dot(source.rgb, vec3(0.299, 0.587, 0.114));
  if (u_sortMode < 0.5) return luminance > u_threshold * 0.25 ? luminance : 0.0;
  if (u_sortMode < 1.5) return luminance < 1.0 - u_threshold * 0.25 ? 1.0 - luminance : 0.0;
  if (u_sortMode < 2.5) return maximum > u_threshold ? maximum : 0.0;
  if (u_sortMode < 3.5) return maximum < u_threshold ? 1.0 - maximum : 0.0;
  float depthReach = 0.0;
  if (source.a >= u_threshold) {
    if (u_threshold >= 1.0) {
      depthReach = source.a >= 1.0 ? 1.0 : 0.0;
    } else {
      depthReach = clamp((source.a - u_threshold) / max(1.0 - u_threshold, 0.0001), 0.0, 1.0);
    }
  }
  return max(depthReach, maximum);
}

void main() {
  float angle = (gl_FragCoord.x - 0.5) / u_angularBins * 6.28318530718;
  float radius = gl_FragCoord.y - 0.5;
  vec2 sourceUv;
  vec4 source = polarSource(angle, radius, sourceUv);
  float occupied = step(0.0001, sourceMaximum(source.rgb));
  float reach = localReach(source);
  gl_FragColor = occupied > 0.5
    ? vec4(sourceUv, 0.0, reach)
    : vec4(0.0, 0.0, -1.0, reach);
}
`

export const PIXEL_SORT_TRAIL_RADIAL_PROPAGATE_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D u_previous;
uniform vec2 u_resolution;
uniform float u_step;
uniform float u_reverse;
varying vec2 v_uv;

void main() {
  vec4 current = texture2D(u_previous, v_uv);
  vec2 delta = vec2(0.0, u_step) / max(u_resolution, vec2(1.0));
  delta *= mix(1.0, -1.0, u_reverse);
  vec2 upstreamUv = v_uv - delta;
  vec4 upstream = (upstreamUv.y < 0.0 || upstreamUv.y > 1.0)
    ? vec4(0.0, 0.0, -1.0, 0.0)
    : texture2D(u_previous, upstreamUv);
  if (current.b >= 0.0) {
    gl_FragColor = vec4(current.rgb, clamp(current.a, 0.0, 1.0));
  } else if (upstream.b >= 0.0) {
    gl_FragColor = vec4(upstream.rg, upstream.b + u_step, clamp(max(current.a, upstream.a), 0.0, 1.0));
  } else {
    gl_FragColor = vec4(0.0, 0.0, -1.0, clamp(max(current.a, upstream.a), 0.0, 1.0));
  }
}
`

export type PixelSortTrailResources = {
  linearTargets: [WebGLRenderTarget, WebGLRenderTarget]
  radialTargets: [WebGLRenderTarget, WebGLRenderTarget]
  seedMaterial: ShaderMaterial
  propagateMaterial: ShaderMaterial
  radialSeedMaterial: ShaderMaterial
  radialPropagateMaterial: ShaderMaterial
  scene: Scene
  camera: OrthographicCamera
  quad: Mesh<PlaneGeometry, ShaderMaterial>
  width: number
  height: number
  linearTexture: Texture
  radialTexture: Texture
}

function createTrailTarget(width: number, height: number) {
  const target = new WebGLRenderTarget(width, height, {
    depthBuffer: false,
    format: RGBAFormat,
    magFilter: NearestFilter,
    minFilter: NearestFilter,
    type: HalfFloatType,
  })
  target.texture.generateMipmaps = false
  target.texture.colorSpace = NoColorSpace
  return target
}

function createPassMaterial(fragmentShader: string, uniforms: Record<string, { value: unknown }>) {
  return new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader,
    uniforms,
    vertexShader: PIXEL_SORT_TRAIL_VERTEX_SHADER,
  })
}

export function createPixelSortTrailResources(): PixelSortTrailResources {
  const linearTargets: [WebGLRenderTarget, WebGLRenderTarget] = [
    createTrailTarget(1, 1),
    createTrailTarget(1, 1),
  ]
  const radialTargets: [WebGLRenderTarget, WebGLRenderTarget] = [
    createTrailTarget(1, 1),
    createTrailTarget(1, 1),
  ]
  const seedMaterial = createPassMaterial(PIXEL_SORT_TRAIL_SEED_FRAGMENT_SHADER, {
    u_sourceFrame: { value: null },
    u_resolution: { value: new Vector2(1, 1) },
    u_direction: { value: 0 },
    u_sortMode: { value: 4 },
    u_threshold: { value: 0.25 },
    u_reverse: { value: 0 },
  })
  const propagateMaterial = createPassMaterial(PIXEL_SORT_TRAIL_PROPAGATE_FRAGMENT_SHADER, {
    u_previous: { value: null },
    u_resolution: { value: new Vector2(1, 1) },
    u_direction: { value: 0 },
    u_step: { value: 1 },
    u_reverse: { value: 0 },
  })
  const radialSeedMaterial = createPassMaterial(PIXEL_SORT_TRAIL_RADIAL_SEED_FRAGMENT_SHADER, {
    u_sourceFrame: { value: null },
    u_sourceResolution: { value: new Vector2(1, 1) },
    u_maxRadius: { value: 1 },
    u_angularBins: { value: 1 },
    u_radialBins: { value: 2 },
    u_sortMode: { value: 4 },
    u_threshold: { value: 0.25 },
    u_reverse: { value: 0 },
  })
  const radialPropagateMaterial = createPassMaterial(PIXEL_SORT_TRAIL_RADIAL_PROPAGATE_FRAGMENT_SHADER, {
    u_previous: { value: null },
    u_resolution: { value: new Vector2(1, 1) },
    u_step: { value: 1 },
    u_reverse: { value: 0 },
  })
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quad = new Mesh(new PlaneGeometry(2, 2), seedMaterial)
  scene.add(quad)
  return {
    linearTargets,
    radialTargets,
    seedMaterial,
    propagateMaterial,
    radialSeedMaterial,
    radialPropagateMaterial,
    scene,
    camera,
    quad,
    width: 1,
    height: 1,
    linearTexture: linearTargets[0].texture,
    radialTexture: radialTargets[0].texture,
  }
}

export function resizePixelSortTrailResources(
  resources: PixelSortTrailResources,
  width: number,
  height: number,
  direction: PixelSortDirection = 'horizontal',
) {
  const nextWidth = Math.max(1, Math.round(width))
  const nextHeight = Math.max(1, Math.round(height))
  if (getPixelSortTrailPipeline(direction) === 'radial') {
    const radial = getPixelSortRadialDimensions(nextWidth, nextHeight)
    for (const target of resources.radialTargets) target.setSize(radial.angularBins, radial.radialBins)
  } else {
    for (const target of resources.linearTargets) target.setSize(nextWidth, nextHeight)
  }
  resources.width = nextWidth
  resources.height = nextHeight
  resources.linearTexture = resources.linearTargets[0].texture
  resources.radialTexture = resources.radialTargets[0].texture
}

function renderPass(
  renderer: WebGLRenderer,
  resources: PixelSortTrailResources,
  material: ShaderMaterial,
  target: WebGLRenderTarget,
) {
  const previousTarget = renderer.getRenderTarget()
  resources.quad.material = material
  renderer.setRenderTarget(target)
  renderer.clear()
  renderer.render(resources.scene, resources.camera)
  renderer.setRenderTarget(previousTarget)
}

function directionId(direction: PixelSortDirection) {
  return direction === 'horizontal'
    ? 0
    : direction === 'vertical'
      ? 1
      : direction === 'diagonal'
        ? 2
        : direction === 'anti-diagonal'
          ? 3
          : 0
}

function sortModeId(mode: PixelSortSettings['mode']) {
  return mode === 'brightness' ? 0 : mode === 'hue' ? 1 : mode === 'saturation' ? 2 : mode === 'dark' ? 3 : 4
}

/** Recomputes the GPU trail from the current rendered 2D source. */
export function renderPixelSortTrails(
  renderer: WebGLRenderer,
  resources: PixelSortTrailResources,
  sourceFrame: Texture,
  settings: PixelSortSettings,
): { texture: Texture; radial: boolean; dimensions: PixelSortRadialDimensions | null } | null {
  if (!isPixelSortTrailSupported(renderer)) return null
  resizePixelSortTrailResources(resources, resources.width, resources.height, settings.direction)

  const reverse = settings.reverse ? 1 : 0
  if (getPixelSortTrailPipeline(settings.direction) === 'radial') {
    const radial = getPixelSortRadialDimensions(resources.width, resources.height)
    resources.radialSeedMaterial.uniforms.u_sourceFrame.value = sourceFrame
    ;(resources.radialSeedMaterial.uniforms.u_sourceResolution.value as Vector2).set(resources.width, resources.height)
    resources.radialSeedMaterial.uniforms.u_maxRadius.value = radial.maxRadius
    resources.radialSeedMaterial.uniforms.u_angularBins.value = radial.angularBins
    resources.radialSeedMaterial.uniforms.u_radialBins.value = radial.radialBins
    resources.radialSeedMaterial.uniforms.u_sortMode.value = sortModeId(settings.mode)
    resources.radialSeedMaterial.uniforms.u_threshold.value = settings.threshold
    resources.radialSeedMaterial.uniforms.u_reverse.value = reverse
    resources.radialPropagateMaterial.uniforms.u_reverse.value = reverse
    ;(resources.radialPropagateMaterial.uniforms.u_resolution.value as Vector2).set(radial.angularBins, radial.radialBins)
    renderPass(renderer, resources, resources.radialSeedMaterial, resources.radialTargets[0])
    let previousRadial = 0
    let nextRadial = 1
    for (let step = 1; step < radial.radialBins; step *= 2) {
      resources.radialPropagateMaterial.uniforms.u_previous.value = resources.radialTargets[previousRadial].texture
      resources.radialPropagateMaterial.uniforms.u_step.value = step
      renderPass(renderer, resources, resources.radialPropagateMaterial, resources.radialTargets[nextRadial])
      ;[previousRadial, nextRadial] = [nextRadial, previousRadial]
    }
    resources.radialTexture = resources.radialTargets[previousRadial].texture
    return { texture: resources.radialTexture, radial: true, dimensions: radial }
  }

  const direction = directionId(settings.direction)
  resources.seedMaterial.uniforms.u_sourceFrame.value = sourceFrame
  ;(resources.seedMaterial.uniforms.u_resolution.value as Vector2).set(resources.width, resources.height)
  resources.seedMaterial.uniforms.u_direction.value = direction
  resources.seedMaterial.uniforms.u_sortMode.value = sortModeId(settings.mode)
  resources.seedMaterial.uniforms.u_threshold.value = settings.threshold
  resources.seedMaterial.uniforms.u_reverse.value = reverse
  resources.propagateMaterial.uniforms.u_direction.value = direction
  resources.propagateMaterial.uniforms.u_reverse.value = reverse
  ;(resources.propagateMaterial.uniforms.u_resolution.value as Vector2).set(resources.width, resources.height)
  renderPass(renderer, resources, resources.seedMaterial, resources.linearTargets[0])
  let previousLinear = 0
  let nextLinear = 1
  for (let step = 1; step < Math.max(resources.width, resources.height); step *= 2) {
    resources.propagateMaterial.uniforms.u_previous.value = resources.linearTargets[previousLinear].texture
    resources.propagateMaterial.uniforms.u_step.value = step
    renderPass(renderer, resources, resources.propagateMaterial, resources.linearTargets[nextLinear])
    ;[previousLinear, nextLinear] = [nextLinear, previousLinear]
  }
  resources.linearTexture = resources.linearTargets[previousLinear].texture
  return { texture: resources.linearTexture, radial: false, dimensions: null }
}

export function disposePixelSortTrailResources(resources: PixelSortTrailResources) {
  for (const target of resources.linearTargets) target.dispose()
  for (const target of resources.radialTargets) target.dispose()
  resources.seedMaterial.dispose()
  resources.propagateMaterial.dispose()
  resources.radialSeedMaterial.dispose()
  resources.radialPropagateMaterial.dispose()
  resources.quad.geometry.dispose()
}
