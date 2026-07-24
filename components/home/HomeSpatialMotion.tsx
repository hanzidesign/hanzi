'use client'

import { useEffect, useRef } from 'react'
import classes from './HomePage.module.css'
import {
  getKaishuStrokePlacements,
  KaishuStrokePaths,
  serializeKaishuStrokeMaskSvg,
} from './homeStrokeLayout'
import {
  TRAIL_BLUR_TEXELS,
  TRAIL_DIRECTION_DECAY,
  TRAIL_DIRECTION_DEADZONE,
  TRAIL_MAX_DISPLACEMENT,
} from './homeTrailMath'

type HomeSpatialMotionProps = {
  theme: 'light' | 'dark'
}

type PointerTarget = {
  x: number
  y: number
  lastMovedAt: number
}

type GPUBufferLike = { destroy: () => void }
type GPUTextureViewLike = object
type GPUTextureLike = { createView: () => GPUTextureViewLike; destroy: () => void }
type GPUQueueLike = {
  writeBuffer: (buffer: GPUBufferLike, offset: number, data: ArrayBuffer) => void
  writeTexture: (
    destination: { texture: GPUTextureLike },
    data: ArrayBufferView,
    dataLayout: { bytesPerRow: number; rowsPerImage: number },
    size: { width: number; height: number }
  ) => void
  submit: (commands: object[]) => void
  onSubmittedWorkDone: () => Promise<void>
}
type GPURenderPassLike = {
  setPipeline: (pipeline: object) => void
  setBindGroup: (index: number, bindGroup: object) => void
  draw: (vertexCount: number) => void
  end: () => void
}
type GPUCommandEncoderLike = { beginRenderPass: (descriptor: object) => GPURenderPassLike; finish: () => object }
type GPUShaderModuleLike = {
  getCompilationInfo: () => Promise<{
    messages: Array<{ type: string; message: string; lineNum?: number; linePos?: number }>
  }>
}
type GPUDeviceLike = {
  createShaderModule: (descriptor: { code: string }) => GPUShaderModuleLike
  createRenderPipelineAsync: (descriptor: object) => Promise<object>
  createBuffer: (descriptor: { size: number; usage: number }) => GPUBufferLike
  createTexture: (descriptor: object) => GPUTextureLike
  createSampler: (descriptor: object) => object
  createBindGroup: (descriptor: object) => object
  createCommandEncoder: () => GPUCommandEncoderLike
  queue: GPUQueueLike
  destroy: () => void
}
type GPUAdapterLike = { requestDevice: () => Promise<GPUDeviceLike> }
type GPUCanvasContext = {
  configure: (descriptor: object) => void
  getCurrentTexture: () => GPUTextureLike
  unconfigure?: () => void
}
type GPU = {
  requestAdapter: (options: { powerPreference: 'high-performance' }) => Promise<GPUAdapterLike | null>
  getPreferredCanvasFormat: () => string
}

const trailFeedbackShader = /* wgsl */ `
struct Uniforms {
  uResolution: vec2f,
  uTime: f32,
  uTheme: f32,
  uPointer: vec2f,
  uPreviousPointer: vec2f,
  uPointerSpeed: f32,
  uDeltaTime: f32,
  uStrokeMaskReady: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var previousTrail: texture_2d<f32>;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

fn rotate2(point: vec2f, angle: f32) -> vec2f {
  let sine = sin(angle);
  let cosine = cos(angle);
  return vec2f(point.x * cosine - point.y * sine, point.x * sine + point.y * cosine);
}

fn decodeDirection(encoded: vec2f) -> vec2f {
  let direction = encoded * 2.0 - vec2f(1.0);
  let magnitude = length(direction);
  return select(vec2f(0.0), direction, magnitude > ${TRAIL_DIRECTION_DEADZONE});
}

fn liquify(uv: vec2f, direction: vec2f, strength: f32) -> vec2f {
  let aspectRatio = uniforms.uResolution.x / max(uniforms.uResolution.y, 1.0);
  var point = uv;
  point.x *= aspectRatio;
  point -= direction * 0.005;
  let frameScale = clamp(uniforms.uDeltaTime * 60.0, 0.25, 3.0);
  let amplitude = smoothstep(0.0, 1.0, strength) * 0.005 * frameScale;
  for (var iteration: i32 = 1; iteration <= 5; iteration += 1) {
    let amount = f32(iteration);
    point = rotate2(point, amount / 5.0 * 6.2831853);
    point += vec2f(
      amplitude * cos(amount * 5.0 * point.y + strength),
      amplitude * sin(amount * 5.0 * point.x + strength)
    );
  }
  point.x /= aspectRatio;
  return point;
}

fn distanceToSegment(point: vec2f, start: vec2f, end: vec2f) -> f32 {
  let segment = end - start;
  let progress = clamp(dot(point - start, segment) / max(dot(segment, segment), 0.00001), 0.0, 1.0);
  return distance(point, mix(start, end, progress));
}

@vertex
fn trailVertex(@builtin(vertex_index) index: u32) -> VertexOut {
  var positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let clipPosition = positions[index];
  var output: VertexOut;
  output.position = vec4f(clipPosition, 0.0, 1.0);
  output.uv = vec2f(clipPosition.x * 0.5 + 0.5, 0.5 - clipPosition.y * 0.5);
  return output;
}

@fragment
fn trailFragment(input: VertexOut) -> @location(0) vec4f {
  let blurRadius = ${TRAIL_BLUR_TEXELS} / vec2f(textureDimensions(previousTrail));
  let centerTrail = textureSample(previousTrail, linearSampler, input.uv);
  let centerDirection = decodeDirection(centerTrail.rg);
  let liquidUv = mix(input.uv, liquify(input.uv, centerDirection, centerTrail.b), 0.56);
  let contraction = uniforms.uDeltaTime * 0.174;
  let feedbackUv = liquidUv / (1.0 + contraction) + vec2f(contraction * 0.5);

  var feedback = textureSample(previousTrail, linearSampler, feedbackUv) * 0.4;
  feedback += textureSample(previousTrail, linearSampler, feedbackUv + vec2f(blurRadius.x, 0.0)) * 0.15;
  feedback += textureSample(previousTrail, linearSampler, feedbackUv - vec2f(blurRadius.x, 0.0)) * 0.15;
  feedback += textureSample(previousTrail, linearSampler, feedbackUv + vec2f(0.0, blurRadius.y)) * 0.15;
  feedback += textureSample(previousTrail, linearSampler, feedbackUv - vec2f(0.0, blurRadius.y)) * 0.15;

  let previousDirection = decodeDirection(feedback.rg);
  let retainedDirection = previousDirection * exp(-${TRAIL_DIRECTION_DECAY} * uniforms.uDeltaTime);
  let previousStrength = max(
    feedback.b * exp(-0.12 * uniforms.uDeltaTime) - 0.16 * uniforms.uDeltaTime,
    0.0
  );
  let aspectRatio = uniforms.uResolution.x / max(uniforms.uResolution.y, 1.0);
  let aspect = vec2f(aspectRatio, 1.0);
  let currentPointer = uniforms.uPointer * aspect;
  let previousPointer = uniforms.uPreviousPointer * aspect;
  let movement = currentPointer - previousPointer;
  let movementDistance = length(movement);
  let movementDirection = select(
    vec2f(1.0, 0.0),
    movement / max(movementDistance, 0.0001),
    movementDistance > 0.0001
  );
  let brushCenter = input.uv * aspect;
  let brushDistance = distanceToSegment(brushCenter, previousPointer, currentPointer);
  var brushRadius = 0.378 * 0.26 * mix(aspectRatio, 1.0, 0.5);
  brushRadius *= mix(0.5, 1.0, clamp(uniforms.uPointerSpeed * 0.3, 0.0, 1.0));
  let capsule = 1.0 - smoothstep(brushRadius * 0.22, brushRadius, brushDistance);
  let drawStrength = clamp(
    (1.0 - exp(-uniforms.uPointerSpeed * uniforms.uDeltaTime * 12.0)) * capsule * capsule,
    0.0,
    1.0
  );
  let nextStrength = mix(previousStrength, 1.0, drawStrength);
  let mixedDirection = retainedDirection * (1.0 - drawStrength) + movementDirection * drawStrength;
  let mixedMagnitude = length(mixedDirection);
  let nextDirection = select(
    mixedDirection,
    mixedDirection / max(mixedMagnitude, 1.0),
    mixedMagnitude > 1.0
  );
  return vec4f(nextDirection * 0.5 + vec2f(0.5), nextStrength, 1.0);
}
`

const atmosphereShader = /* wgsl */ `
struct Uniforms {
  uResolution: vec2f,
  uTime: f32,
  uTheme: f32,
  uPointer: vec2f,
  uPreviousPointer: vec2f,
  uPointerSpeed: f32,
  uDeltaTime: f32,
  uStrokeMaskReady: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var trailTexture: texture_2d<f32>;
@group(0) @binding(3) var strokeMask: texture_2d<f32>;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

fn hash21(p: vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 456.21));
  q += vec2f(dot(q, q + vec2f(45.32)));
  return fract(q.x * q.y);
}

fn valueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  var f = fract(p);
  f = f * f * (vec2f(3.0) - vec2f(2.0) * f);
  let a = hash21(i);
  let b = hash21(i + vec2f(1.0, 0.0));
  let c = hash21(i + vec2f(0.0, 1.0));
  let d = hash21(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

fn fbm(p: vec2f) -> f32 {
  var q = p;
  var value = 0.0;
  var amplitude = 0.5;
  for (var octave: i32 = 0; octave < 4; octave += 1) {
    value += valueNoise(q) * amplitude;
    q = q * 2.02 + vec2f(13.7, 8.3);
    amplitude *= 0.5;
  }
  return value;
}

fn hash23(p: vec2f) -> vec3f {
  let q = vec3f(
    dot(p, vec2f(127.1, 311.7)),
    dot(p, vec2f(269.5, 183.3)),
    dot(p, vec2f(419.2, 371.9))
  );
  return fract(sin(q) * 43758.5453);
}

// Omnera-style Voronoise: the cells stay in place while their control points breathe.
fn voronoise(p: vec2f, time: f32) -> f32 {
  let cell = floor(p);
  let local = fract(p);
  var value = 0.0;
  var weightTotal = 0.0;

  for (var cellY: i32 = -2; cellY <= 2; cellY += 1) {
    for (var cellX: i32 = -2; cellX <= 2; cellX += 1) {
      let neighbor = vec2f(f32(cellX), f32(cellY));
      let random = hash23(cell + neighbor);
      let animatedPoint = random.xy + 0.5 * vec2f(
        sin(time * 0.1 + random.x * 6.2831853),
        cos(time * 0.1 + random.y * 6.2831853)
      );
      let delta = neighbor - local + animatedPoint;
      let distanceToPoint = length(delta);
      let weight = 1.0 - smoothstep(0.0, 1.414, distanceToPoint);
      value += random.z * weight;
      weightTotal += weight;
    }
  }

  return value / max(weightTotal, 0.0001);
}

fn anchoredPalette(t: f32, colorA: vec3f, colorB: vec3f, richnessAmount: f32) -> vec3f {
  let midpoint = 0.5 * (colorA + colorB);
  let axisAmplitude = 0.5 * (colorB - colorA);
  let base = midpoint + axisAmplitude * cos(6.2831853 * t);
  let axisLength = length(axisAmplitude);
  let axis = select(
    vec3f(1.0, 0.0, 0.0),
    axisAmplitude / max(axisLength, 0.0001),
    axisLength > 0.0001
  );
  let reference = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(axis.x) > 0.9);
  let tangentA = normalize(cross(axis, reference));
  let tangentB = normalize(cross(axis, tangentA));
  let richness = 0.24 * axisLength + 0.02;
  let ripple =
    tangentA * sin(6.2831853 * (t * 2.0 + 0.123)) +
    tangentB * sin(6.2831853 * (t * 3.0 + 0.437));
  let paletteColor = base + richness * richnessAmount * ripple;
  return vec3f(1.0) / (vec3f(1.0) + exp(-paletteColor * 4.0 + vec3f(0.25)) * 7.5);
}

fn screenBlend(base: vec3f, layer: vec3f) -> vec3f {
  return vec3f(1.0) - (vec3f(1.0) - base) * (vec3f(1.0) - layer);
}

fn amplifyChroma(color: vec3f, amount: f32) -> vec3f {
  let luminance = dot(color, vec3f(0.2126, 0.7152, 0.0722));
  return clamp(mix(vec3f(luminance), color, amount), vec3f(0.0), vec3f(1.0));
}

fn subtleIridescence(phase: f32) -> vec3f {
  let spectrum = vec3f(0.5) + 0.5 * cos(6.2831853 * (phase + vec3f(0.0, 0.333, 0.667)));
  return mix(vec3f(0.08, 0.42, 0.95), spectrum, 0.44);
}

fn differenceBlend(base: vec3f, layer: vec3f) -> vec3f {
  return abs(base - layer);
}

fn decodeTrailDirection(encoded: vec2f) -> vec2f {
  let direction = encoded * 2.0 - vec2f(1.0);
  let magnitude = length(direction);
  return select(vec2f(0.0), direction, magnitude > ${TRAIL_DIRECTION_DEADZONE});
}

@vertex
fn fullscreenVertex(@builtin(vertex_index) index: u32) -> VertexOut {
  var positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let clipPosition = positions[index];
  var output: VertexOut;
  output.position = vec4f(clipPosition, 0.0, 1.0);
  output.uv = vec2f(clipPosition.x * 0.5 + 0.5, 0.5 - clipPosition.y * 0.5);
  return output;
}

@fragment
fn atmosphereFragment(input: VertexOut) -> @location(0) vec4f {
  let aspect = vec2f(uniforms.uResolution.x / max(uniforms.uResolution.y, 1.0), 1.0);
  let time = uniforms.uTime;
  let trail = textureSample(trailTexture, linearSampler, input.uv);
  let trailDirection = decodeTrailDirection(trail.rg);
  let trailDirectionMagnitude = length(trailDirection);
  let trailAxis = select(
    vec2f(1.0, 0.0),
    trailDirection / max(trailDirectionMagnitude, 0.0001),
    trailDirectionMagnitude > ${TRAIL_DIRECTION_DEADZONE}
  );
  let trailNormal = vec2f(-trailAxis.y, trailAxis.x);
  let trailStrength = trail.b * 0.7;
  let trailColorInfluence = smoothstep(0.015, 0.46, trail.b * trailDirectionMagnitude);
  let trailRainbowBand =
    (1.0 - smoothstep(0.06, 0.3, abs(trail.b - 0.45))) *
    smoothstep(0.02, 0.3, trailDirectionMagnitude);
  let trailVisibility =
    smoothstep(0.018, 0.34, trail.b) *
    smoothstep(0.008, 0.2, trailDirectionMagnitude);
  let fieldUv = clamp(input.uv - trailDirection * trailStrength * ${TRAIL_MAX_DISPLACEMENT}, vec2f(0.001), vec2f(0.999));
  let polarCenter = vec2f(0.52, 1.05) * aspect;
  let warpDelta = fieldUv * aspect - polarCenter;
  let warpRadius = length(warpDelta);
  let warpAngle = atan2(warpDelta.y, warpDelta.x);
  let warpRipple = vec2f(cos(warpAngle), sin(warpAngle)) *
    sin(warpRadius * 9.0 - time * 0.045) * 0.0028;
  let warpedUv = clamp(fieldUv + warpRipple / aspect, vec2f(0.001), vec2f(0.999));

  let primaryCell = voronoise((fieldUv - vec2f(0.5)) * aspect * 2.56, time);
  let staticTexture = fbm(fieldUv * 2.45 + vec2f(7.2, 3.4));
  let microCoord = warpedUv * uniforms.uResolution.y * 0.09;
  let cell = fract(microCoord) - vec2f(0.5);
  let microDot = 1.0 - smoothstep(0.055, 0.18, length(cell));
  let dither = hash21(floor(microCoord));
  let microTexture = microDot * (0.26 + dither * 0.74);
  let centerDistance = length((input.uv - vec2f(0.5)) * vec2f(1.15, 1.0));
  let quietCenter = 1.0 - smoothstep(0.1, 0.72, centerDistance);

  let deepIndigo = vec3f(0.007, 0.009, 0.035);
  let staticBase = vec3f(0.006, 0.009, 0.016) + vec3f(0.018, 0.026, 0.042) * staticTexture;
  let auroraColor = anchoredPalette(
    primaryCell + 0.31 + time * 0.01,
    vec3f(0.0, 0.149, 0.318),
    vec3f(0.592, 0.655, 0.996),
    0.63
  );
  var darkColor = differenceBlend(staticBase, auroraColor);
  let lightRainbowPhase =
    primaryCell * 0.7 + dot(fieldUv, vec2f(0.18, -0.14)) + time * 0.025;
  let rainbowPosition = (fieldUv - vec2f(0.5)) * aspect;
  let darkRainbowPhase =
    primaryCell * 0.42 +
    dot(rainbowPosition, trailAxis) * 1.52 +
    dot(rainbowPosition, trailNormal) * 0.24 +
    time * 0.025;
  let trailSpectrum = vec3f(0.5) + 0.5 * cos(
    6.2831853 * (darkRainbowPhase + vec3f(0.0, 0.333, 0.667))
  );
  let trailIridescence = subtleIridescence(lightRainbowPhase);
  let darkTrailIridescence = subtleIridescence(darkRainbowPhase);
  let vividTrailColor = mix(amplifyChroma(auroraColor, 1.38), trailIridescence, 0.24);
  var lightThemeDarkSource = screenBlend(
    darkColor,
    vividTrailColor * trailColorInfluence * 0.18
  );
  lightThemeDarkSource = screenBlend(
    lightThemeDarkSource,
    trailIridescence * trailRainbowBand * 0.18
  );

  let polarDelta = input.uv * aspect - polarCenter;
  let polarRadius = length(polarDelta);
  let polarAngle = atan2(polarDelta.y, polarDelta.x);
  let polarGamma = pow(2.0, 1.8);
  let polarUv = vec2f(
    pow(fract(polarRadius * 0.29), polarGamma),
    fract((polarAngle + time * 0.05 + 3.14159265) / 6.2831853)
  );
  let detailUv = vec2f(-polarUv.y, polarUv.x) * 26.22 + vec2f(0.0, -time * 0.018);
  let detailNoise = valueNoise(detailUv);
  let polarDistortion = 0.5 + 0.5 * sin(
    polarAngle * 1.45 +
    polarRadius * 11.0 +
    detailNoise * 3.4 -
    time * 0.075
  );
  let polarFlow = mix(detailNoise, polarDistortion, 0.38);
  let polarContour = smoothstep(0.12, 0.68, abs(polarFlow - 0.5));
  let indigoOverlay = anchoredPalette(
    polarFlow + 0.35,
    vec3f(0.239, 0.224, 0.655),
    vec3f(0.0),
    0.0
  );
  darkColor = screenBlend(darkColor, indigoOverlay * 0.12);
  lightThemeDarkSource = screenBlend(lightThemeDarkSource, indigoOverlay * 0.12);
  darkColor *= 0.84;
  lightThemeDarkSource *= 0.84;
  darkColor += vec3f((dither - 0.5) / 510.0);
  lightThemeDarkSource += vec3f((dither - 0.5) / 510.0);
  darkColor *= 1.0 - microTexture * 0.115;
  lightThemeDarkSource *= 1.0 - microTexture * 0.115;
  darkColor = mix(darkColor, deepIndigo + darkColor * 0.72, quietCenter * 0.08);
  lightThemeDarkSource = mix(
    lightThemeDarkSource,
    deepIndigo + lightThemeDarkSource * 0.72,
    quietCenter * 0.08
  );
  let darkTrailLuminance = dot(darkColor, vec3f(0.2126, 0.7152, 0.0722));
  let darkRainbowTarget =
    amplifyChroma(mix(darkTrailIridescence, trailSpectrum, 0.58), 1.58) *
    (0.36 + darkTrailLuminance * 0.28);
  let darkRainbowMix = clamp(
    trailVisibility * 0.26 + trailRainbowBand * 0.12,
    0.0,
    0.34
  );
  darkColor = screenBlend(
    darkColor,
    darkRainbowTarget * darkRainbowMix * 1.18
  );

  let lightBase = mix(vec3f(0.58, 0.79, 0.98), vec3f(0.86, 0.71, 0.98), staticTexture);
  let lightDetailTint = anchoredPalette(
    polarFlow + 0.2,
    vec3f(0.18, 0.4, 0.74),
    vec3f(0.65, 0.38, 0.86),
    0.3
  );
  var lightAurora = mix(lightBase, lightThemeDarkSource, 0.46);
  lightAurora = mix(lightAurora, lightDetailTint, 0.055 + polarContour * 0.045);
  lightAurora *= 1.0 - microTexture * 0.095;
  let vividLightAurora = amplifyChroma(lightAurora, 1.48);
  lightAurora = mix(lightAurora, vividLightAurora, trailColorInfluence * 0.82);
  lightAurora = screenBlend(lightAurora, vividTrailColor * trailColorInfluence * 0.09);
  lightAurora = screenBlend(lightAurora, trailIridescence * trailRainbowBand * 0.105);
  let base = mix(darkColor, lightAurora, uniforms.uTheme);
  let maskAlpha = textureSample(strokeMask, linearSampler, warpedUv).a * uniforms.uStrokeMaskReady;
  let lightComposite = mix(
    base,
    base * vec3f(52.0, 58.0, 92.0) / 255.0,
    maskAlpha * 0.56 * 0.46
  );
  let darkComposite = mix(
    base,
    screenBlend(base, vec3f(203.0, 220.0, 255.0) / 255.0),
    maskAlpha * 0.42 * 0.50
  );
  return vec4f(mix(darkComposite, lightComposite, uniforms.uTheme), 0.96);
}
`

export default function HomeSpatialMotion({ theme }: HomeSpatialMotionProps) {
  const pointerRef = useRef<PointerTarget>({ x: 0.5, y: 0.5, lastMovedAt: 0 })
  const strokeFieldRef = useRef<SVGSVGElement>(null)
  const strokesRandomizedRef = useRef(false)

  useEffect(() => {
    const readPointer = (event: PointerEvent) => {
      const x = event.clientX / Math.max(window.innerWidth, 1)
      const screenY = event.clientY / Math.max(window.innerHeight, 1)
      pointerRef.current.x = x
      pointerRef.current.y = screenY
      pointerRef.current.lastMovedAt = performance.now()

      const strokeField = strokeFieldRef.current
      strokeField?.style.setProperty('--stroke-pointer-x', `${x * 2 - 1}`)
      strokeField?.style.setProperty('--stroke-pointer-y', `${1 - screenY * 2}`)
    }

    window.addEventListener('pointermove', readPointer, { passive: true })
    return () => window.removeEventListener('pointermove', readPointer)
  }, [])

  useEffect(() => {
    if (strokesRandomizedRef.current) {
      return
    }

    const strokeField = strokeFieldRef.current
    if (!strokeField || strokeField.dataset.randomized === 'true') {
      return
    }

    strokesRandomizedRef.current = true
    const strokes = strokeField.querySelectorAll<SVGGElement>('[data-kaishu-stroke]')
    const placements = getKaishuStrokePlacements()
    strokes.forEach((stroke, index) => {
      const placement = placements[index]
      if (!placement) {
        return
      }

      stroke.setAttribute(
        'transform',
        `translate(${placement.translateX.toFixed(2)} ${placement.translateY.toFixed(2)}) rotate(${placement.rotation.toFixed(2)}) scale(${placement.scale.toFixed(3)})`
      )
      stroke.style.setProperty('opacity', placement.opacity.toFixed(3))
      stroke.style.setProperty('--kaishu-stroke-width', placement.strokeWidth.toFixed(2))
    })
    strokeField.dataset.randomized = 'true'
  }, [])

  return (
    <div className={classes.motionArtwork}>
      <WebGpuAtmosphere theme={theme} pointerRef={pointerRef} />

      <svg
        ref={strokeFieldRef}
        className={classes.strokeField}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <KaishuStrokePaths
          layerClassNames={[classes.strokeDepthFar, classes.strokeDepthMid, classes.strokeDepthNear]}
        />
      </svg>
    </div>
  )
}

function WebGpuAtmosphere({
  theme,
  pointerRef,
}: HomeSpatialMotionProps & {
  pointerRef: React.MutableRefObject<PointerTarget>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const themeRef = useRef(theme)

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    delete canvas.dataset.ready
    let cancelled = false
    let frameHandle = 0
    let resizeObserver: ResizeObserver | null = null
    let context: GPUCanvasContext | null = null
    let device: GPUDeviceLike | null = null
    let uniformBuffer: GPUBufferLike | null = null
    let trailTextures: GPUTextureLike[] = []
    let strokeMaskTexture: GPUTextureLike | null = null
    let retiredStrokeMaskTextures: GPUTextureLike[] = []
    let strokeMaskGeneration = 0

    const releaseGpuResources = () => {
      cancelAnimationFrame(frameHandle)
      resizeObserver?.disconnect()
      resizeObserver = null
      context?.unconfigure?.()
      context = null
      uniformBuffer?.destroy()
      uniformBuffer = null
      trailTextures.forEach((texture) => texture.destroy())
      trailTextures = []
      strokeMaskTexture?.destroy()
      strokeMaskTexture = null
      retiredStrokeMaskTextures.forEach((texture) => texture.destroy())
      retiredStrokeMaskTextures = []
      device?.destroy()
      device = null
    }

    const mount = async () => {
      // navigator.gpu is intentionally the only renderer entry point; CSS remains the graceful fallback.
      const gpu = (navigator as Navigator & { gpu?: GPU }).gpu
      if (!gpu) {
        return
      }

      const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' })
      if (!adapter || cancelled) {
        return
      }

      const nextDevice = (await adapter.requestDevice()) as unknown as GPUDeviceLike
      device = nextDevice
      if (cancelled) {
        nextDevice.destroy()
        return
      }

      context = (canvas.getContext as (contextId: string) => unknown)('webgpu') as GPUCanvasContext | null
      if (!context) {
        nextDevice.destroy()
        device = null
        return
      }

      const format = gpu.getPreferredCanvasFormat()
      context.configure({ device: nextDevice, format, alphaMode: 'premultiplied' })

      const trailModule = nextDevice.createShaderModule({ code: trailFeedbackShader })
      const atmosphereModule = nextDevice.createShaderModule({ code: atmosphereShader })
      for (const shaderModule of [trailModule, atmosphereModule]) {
        const compilationInfo = await shaderModule.getCompilationInfo()
        const compilationErrors = compilationInfo.messages.filter((message) => message.type === 'error')
        if (compilationErrors.length > 0) {
          throw new Error(
            compilationErrors
              .map((message) => `${message.lineNum ?? '?'}:${message.linePos ?? '?'} ${message.message}`)
              .join('\n')
          )
        }
      }

      const trailPipeline = (await nextDevice.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module: trailModule, entryPoint: 'trailVertex' },
        fragment: { module: trailModule, entryPoint: 'trailFragment', targets: [{ format: 'rgba8unorm' }] },
        primitive: { topology: 'triangle-list' },
      })) as GPURenderPipelineLike
      const atmospherePipeline = (await nextDevice.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module: atmosphereModule, entryPoint: 'fullscreenVertex' },
        fragment: { module: atmosphereModule, entryPoint: 'atmosphereFragment', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      })) as GPURenderPipelineLike

      const nextUniformBuffer = nextDevice.createBuffer({
        size: 48,
        usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
      })
      uniformBuffer = nextUniformBuffer
      const linearSampler = nextDevice.createSampler({
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
        magFilter: 'linear',
        minFilter: 'linear',
      })
      const uniformData = new ArrayBuffer(48)
      const uniformFloats = new Float32Array(uniformData)
      const viscousPointer = { x: 0.5, y: 0.5 }
      let previousFrameTime = performance.now()
      let readTrailIndex = 0
      let trailViews: GPUTextureViewLike[] = []
      let trailBindGroups: object[] = []
      let atmosphereBindGroups: object[] = []
      let strokeMaskView: GPUTextureViewLike
      let pendingStrokeMaskActivation = false
      let strokeMaskReady = false
      let strokeMaskFencePending = false
      let lastPointerMoveTime = performance.now()
      let observedMoveStamp = pointerRef.current.lastMovedAt
      let idleTrailCleared = false

      strokeMaskTexture = nextDevice.createTexture({
        size: { width: 1, height: 1, depthOrArrayLayers: 1 },
        format: 'rgba8unorm',
        usage: GPU_TEXTURE_USAGE_TEXTURE_BINDING | GPU_TEXTURE_USAGE_COPY_DST,
      })
      strokeMaskView = strokeMaskTexture.createView()

      const createAtmosphereBindGroups = () => {
        atmosphereBindGroups = trailViews.map((view) =>
          nextDevice.createBindGroup({
            layout: atmospherePipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: { buffer: nextUniformBuffer } },
              { binding: 1, resource: linearSampler },
              { binding: 2, resource: view },
              { binding: 3, resource: strokeMaskView },
            ],
          })
        )
      }

      const createTrailResources = () => {
        trailTextures.forEach((texture) => texture.destroy())
        trailTextures = [0, 1].map(() =>
          nextDevice.createTexture({
            size: { width: canvas.width, height: canvas.height, depthOrArrayLayers: 1 },
            format: 'rgba8unorm',
            usage: GPU_TEXTURE_USAGE_TEXTURE_BINDING | GPU_TEXTURE_USAGE_RENDER_ATTACHMENT,
          })
        )
        trailViews = trailTextures.map((texture) => texture.createView())
        trailBindGroups = trailViews.map((view) =>
          nextDevice.createBindGroup({
            layout: trailPipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: { buffer: nextUniformBuffer } },
              { binding: 1, resource: linearSampler },
              { binding: 2, resource: view },
            ],
          })
        )
        createAtmosphereBindGroups()

        const clearEncoder = nextDevice.createCommandEncoder()
        for (const view of trailViews) {
          const clearPass = clearEncoder.beginRenderPass({
            colorAttachments: [
              {
                view,
                clearValue: { r: 0.5, g: 0.5, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          })
          clearPass.end()
        }
        nextDevice.queue.submit([clearEncoder.finish()])
        readTrailIndex = 0
      }

      const uploadStrokeMask = async (width: number, height: number, strokeScale: number) => {
        const generation = ++strokeMaskGeneration
        const placements = getKaishuStrokePlacements()
        let imageUrl: string | null = null
        let nextMaskTexture: GPUTextureLike | null = null

        try {
          const svg = serializeKaishuStrokeMaskSvg(width, height, placements, strokeScale)
          imageUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
          const image = new Image()
          image.decoding = 'async'
          image.src = imageUrl
          await image.decode()
          if (cancelled || generation !== strokeMaskGeneration) {
            return
          }

          const rasterCanvas = document.createElement('canvas')
          rasterCanvas.width = width
          rasterCanvas.height = height
          const rasterContext = rasterCanvas.getContext('2d')
          if (!rasterContext) {
            throw new Error('Unable to create homepage SVG stroke mask canvas context.')
          }
          rasterContext.drawImage(image, 0, 0, width, height)
          const maskPixels = rasterContext.getImageData(0, 0, width, height).data

          nextMaskTexture = nextDevice.createTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format: 'rgba8unorm',
            usage: GPU_TEXTURE_USAGE_TEXTURE_BINDING | GPU_TEXTURE_USAGE_COPY_DST,
          })
          nextDevice.queue.writeTexture(
            { texture: nextMaskTexture },
            maskPixels,
            { bytesPerRow: width * 4, rowsPerImage: height },
            { width, height }
          )
          const previousMaskTexture = strokeMaskTexture
          strokeMaskTexture = nextMaskTexture
          nextMaskTexture = null
          strokeMaskView = strokeMaskTexture.createView()
          createAtmosphereBindGroups()
          if (previousMaskTexture) {
            retiredStrokeMaskTextures.push(previousMaskTexture)
            strokeMaskFencePending = true
          }
          if (!strokeMaskReady) {
            pendingStrokeMaskActivation = true
          }
        } catch (error: unknown) {
          if (!cancelled && generation === strokeMaskGeneration && !strokeMaskReady) {
            pendingStrokeMaskActivation = false
            delete canvas.dataset.strokeReady
          }
          console.error('Unable to rasterize homepage SVG stroke mask.', error)
        } finally {
          if (imageUrl) {
            URL.revokeObjectURL(imageUrl)
          }
          nextMaskTexture?.destroy()
        }
      }

      const resize = () => {
        const bounds = canvas.getBoundingClientRect()
        const maxPixelCount = 1_600_000
        const cssPixelCount = Math.max(bounds.width * bounds.height, 1)
        const pixelBudgetDpr = Math.sqrt(maxPixelCount / cssPixelCount)
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5, pixelBudgetDpr)
        const nextWidth = Math.max(1, Math.floor(bounds.width * dpr))
        const nextHeight = Math.max(1, Math.floor(bounds.height * dpr))
        if (canvas.width !== nextWidth || canvas.height !== nextHeight || trailTextures.length === 0) {
          canvas.width = nextWidth
          canvas.height = nextHeight
          createTrailResources()
          void uploadStrokeMask(nextWidth, nextHeight, dpr)
        }
      }
      resize()
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(canvas)

      const startedAt = performance.now()
      let revealRequested = false
      const render = (frameTime: number) => {
        if (cancelled || !context || !uniformBuffer) {
          return
        }

        const activatingStrokeMask = pendingStrokeMaskActivation
        if (activatingStrokeMask) {
          canvas.dataset.strokeReady = 'true'
          strokeMaskReady = true
          pendingStrokeMaskActivation = false
        }

        const deltaSeconds = Math.min((frameTime - previousFrameTime) / 1000, 0.05)
        previousFrameTime = frameTime
        const previousPointerX = viscousPointer.x
        const previousPointerY = viscousPointer.y
        const pointerEase = 1 - Math.exp(-deltaSeconds * 18)
        viscousPointer.x += (pointerRef.current.x - viscousPointer.x) * pointerEase
        viscousPointer.y += (pointerRef.current.y - viscousPointer.y) * pointerEase

        uniformFloats[0] = canvas.width
        uniformFloats[1] = canvas.height
        uniformFloats[2] = (frameTime - startedAt) / 1000
        uniformFloats[3] = themeRef.current === 'dark' ? 0 : 1
        uniformFloats[4] = viscousPointer.x
        uniformFloats[5] = viscousPointer.y
        uniformFloats[6] = previousPointerX
        uniformFloats[7] = previousPointerY
        const pointerSpeed =
          Math.hypot(viscousPointer.x - previousPointerX, viscousPointer.y - previousPointerY) /
          Math.max(deltaSeconds, 0.001)
        uniformFloats[8] = pointerSpeed
        uniformFloats[9] = deltaSeconds
        uniformFloats[10] = strokeMaskReady ? 1 : 0
        uniformFloats[11] = 0
        try {
          nextDevice.queue.writeBuffer(nextUniformBuffer, 0, uniformData)
          const commandEncoder = nextDevice.createCommandEncoder()

          if (pointerRef.current.lastMovedAt !== observedMoveStamp) {
            observedMoveStamp = pointerRef.current.lastMovedAt
            lastPointerMoveTime = observedMoveStamp
            idleTrailCleared = false
          }
          if (!idleTrailCleared && frameTime - lastPointerMoveTime >= TRAIL_IDLE_RESET_MS) {
            for (const view of trailViews) {
              const resetPass = commandEncoder.beginRenderPass({
                colorAttachments: [
                  {
                    view,
                    clearValue: { r: 0.5, g: 0.5, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                  },
                ],
              })
              resetPass.end()
            }
            idleTrailCleared = true
          }

          const nextTrailIndex = 1 - readTrailIndex
          const trailPass = commandEncoder.beginRenderPass({
            colorAttachments: [
              {
                view: trailViews[nextTrailIndex],
                clearValue: { r: 0.5, g: 0.5, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          })
          trailPass.setPipeline(trailPipeline)
          trailPass.setBindGroup(0, trailBindGroups[readTrailIndex])
          trailPass.draw(3)
          trailPass.end()

          const atmospherePass = commandEncoder.beginRenderPass({
            colorAttachments: [
              {
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          })
          atmospherePass.setPipeline(atmospherePipeline)
          atmospherePass.setBindGroup(0, atmosphereBindGroups[nextTrailIndex])
          atmospherePass.draw(3)
          atmospherePass.end()
          nextDevice.queue.submit([commandEncoder.finish()])
          readTrailIndex = nextTrailIndex
        } catch (error: unknown) {
          if (activatingStrokeMask) {
            strokeMaskReady = false
            pendingStrokeMaskActivation = true
            delete canvas.dataset.strokeReady
          }
          console.error('Unable to submit homepage WebGPU atmosphere frame.', error)
          frameHandle = requestAnimationFrame(render)
          return
        }
        if (!revealRequested) {
          revealRequested = true
          void nextDevice.queue.onSubmittedWorkDone().then(() => {
            if (!cancelled) {
              canvas.dataset.ready = 'true'
            }
          })
        }
        if (activatingStrokeMask) {
          void nextDevice.queue.onSubmittedWorkDone().catch((error: unknown) => {
            if (!cancelled) {
              strokeMaskReady = false
              pendingStrokeMaskActivation = true
              delete canvas.dataset.strokeReady
              console.error('Unable to confirm homepage SVG stroke mask frame.', error)
            }
          })
        }
        if (strokeMaskFencePending) {
          strokeMaskFencePending = false
          const retiredTextures = retiredStrokeMaskTextures.splice(0)
          void nextDevice.queue.onSubmittedWorkDone().then(() => {
            retiredTextures.forEach((texture) => texture.destroy())
          })
        }
        frameHandle = requestAnimationFrame(render)
      }

      frameHandle = requestAnimationFrame(render)
    }

    void mount().catch((error: unknown) => {
      if (!cancelled) {
        releaseGpuResources()
        console.error('Unable to initialize homepage WebGPU atmosphere.', error)
      }
    })

    return () => {
      cancelled = true
      delete canvas.dataset.ready
      delete canvas.dataset.strokeReady
      releaseGpuResources()
    }
  }, [pointerRef])

  return <canvas ref={canvasRef} className={classes.motionSurface} aria-hidden="true" />
}

type GPURenderPipelineLike = { getBindGroupLayout: (index: number) => object }

const GPU_BUFFER_USAGE_UNIFORM = 0x40
const GPU_BUFFER_USAGE_COPY_DST = 0x08
const GPU_TEXTURE_USAGE_COPY_DST = 0x02
const GPU_TEXTURE_USAGE_TEXTURE_BINDING = 0x04
const GPU_TEXTURE_USAGE_RENDER_ATTACHMENT = 0x10
const TRAIL_IDLE_RESET_MS = 5200
