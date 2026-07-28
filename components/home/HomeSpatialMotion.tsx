'use client'

import { useEffect, useRef } from 'react'
import classes from './HomePage.module.css'
import {
  formatKaishuStrokePlacementTransform,
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
  pressX: number
  pressY: number
  lastMovedAt: number
  lastPressedAt: number
}

type BackingSize = {
  width: number
  height: number
  strokeScale: number
}

type BackingSizeJob = BackingSize & { generation: number }

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
  uPressStrength: f32,
  uPressPointer: vec2f,
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
  let aspectRatio = uniforms.uResolution.x / max(uniforms.uResolution.y, 1.0);
  let aspect = vec2f(aspectRatio, 1.0);
  let pressBlurDistance = length((input.uv - uniforms.uPressPointer) * aspect);
  let pressBlurAmount =
    smoothstep(0.02, 0.28, uniforms.uPressStrength) *
    (1.0 - smoothstep(0.06, 0.24, pressBlurDistance));
  let pressBlurScale = mix(
    1.0,
    5.5,
    pressBlurAmount
  );
  let blurRadius =
    ${TRAIL_BLUR_TEXELS} * pressBlurScale / vec2f(textureDimensions(previousTrail));
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
  let movementDrawStrength = clamp(
    (1.0 - exp(-uniforms.uPointerSpeed * uniforms.uDeltaTime * 12.0)) * capsule * capsule,
    0.0,
    1.0
  );
  var pressDirection = movementDirection;
  var pressDrawStrength = 0.0;
  if (uniforms.uPressStrength > 0.0001) {
    let pressPointer = uniforms.uPressPointer * aspect;
    let pressVector = brushCenter - pressPointer;
    let pressDistance = length(pressVector);
    pressDirection = select(
      vec2f(cos(uniforms.uTime * 1.7), sin(uniforms.uTime * 1.7)),
      pressVector / max(pressDistance, 0.0001),
      pressDistance > 0.0001
    );
    let pressProgress = 1.0 - uniforms.uPressStrength;
    let pressRadiusScale = mix(0.18, 0.78, smoothstep(0.0, 0.72, pressProgress));
    let pressRadius = 0.14 * mix(aspectRatio, 1.0, 0.5) * pressRadiusScale;
    let pressAngle = atan2(pressVector.y, pressVector.x);
    let pressOrganicPhase = dot(uniforms.uPressPointer, vec2f(5.1, 7.7));
    let pressOrganicRadius = pressRadius * (
      1.0 +
      sin(pressAngle * 3.0 + pressOrganicPhase) * 0.11 +
      sin(pressAngle * 5.0 - pressOrganicPhase * 1.3) * 0.06
    );
    let pressBrush = 1.0 - smoothstep(0.0, pressOrganicRadius * 1.35, pressDistance);
    let pressFade =
      uniforms.uPressStrength * uniforms.uPressStrength * uniforms.uPressStrength;
    pressDrawStrength = clamp(
      (1.0 - exp(-pressFade * uniforms.uDeltaTime * 26.0)) * pressBrush,
      0.0,
      1.0
    );
  }
  let drawStrength = max(movementDrawStrength, pressDrawStrength);
  let drawDirection = select(
    movementDirection,
    pressDirection,
    pressDrawStrength > movementDrawStrength
  );
  let nextStrength = mix(previousStrength, 1.0, drawStrength);
  let mixedDirection = retainedDirection * (1.0 - drawStrength) + drawDirection * drawStrength;
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
  uPressStrength: f32,
  uPressPointer: vec2f,
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
  let trailColorInfluence = smoothstep(0.0, 0.52, trail.b * trailDirectionMagnitude);
  let trailRainbowBand =
    (1.0 - smoothstep(0.0, 0.46, abs(trail.b - 0.45))) *
    smoothstep(0.0, 0.34, trailDirectionMagnitude);
  let trailVisibility =
    smoothstep(0.0, 0.42, trail.b) *
    smoothstep(0.0, 0.24, trailDirectionMagnitude);
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
  let microCoord = warpedUv * uniforms.uResolution.y * 0.24;
  let cell = fract(microCoord) - vec2f(0.5);
  let microDot = 1.0 - smoothstep(0.05, 0.16, length(cell));
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
    amplifyChroma(mix(darkTrailIridescence, trailSpectrum, 0.4), 0.8) *
    (0.65 + darkTrailLuminance * 0.42);
  let darkRainbowMix = clamp(
    trailVisibility * 0.58 + trailRainbowBand * 0.28,
    0.0,
    0.7
  );
  darkColor = screenBlend(
    darkColor,
    darkRainbowTarget * darkRainbowMix * 1.48
  );

  let lightBase = mix(vec3f(0.88, 0.94, 0.99), vec3f(0.97, 0.9, 0.99), staticTexture);
  let lightDetailTint = anchoredPalette(
    staticTexture + 0.2,
    vec3f(0.18, 0.4, 0.74),
    vec3f(0.65, 0.38, 0.86),
    0.3
  );
  var lightAurora = mix(lightBase, lightThemeDarkSource, 0.2);
  lightAurora = mix(lightAurora, lightDetailTint, 0.055);
  lightAurora *= 1.0 - microTexture * 0.095;
  let staticRainbowPhase = lightRainbowPhase;
  let staticRainbowSpectrum = vec3f(0.5) + 0.5 * cos(
    6.2831853 * (staticRainbowPhase + vec3f(0.0, 0.333, 0.667))
  );
  let staticRainbowColor = amplifyChroma(
    mix(subtleIridescence(staticRainbowPhase), staticRainbowSpectrum, 0.55),
    1.45
  );
  let staticRainbowMix = clamp(
    0.055 + smoothstep(0.28, 0.78, primaryCell) * 0.14,
    0.055,
    0.265
  );
  lightAurora = mix(lightAurora, staticRainbowColor, staticRainbowMix);
  lightAurora = screenBlend(
    lightAurora,
    staticRainbowColor * 0.025
  );
  let staticHighlightField = smoothstep(
    0.46,
    0.68,
    primaryCell * 0.72 + staticTexture * 0.28
  );
  let staticHighlightBlocks = staticHighlightField * (
    0.38 + staticTexture * 0.2
  );
  lightAurora = mix(
    lightAurora,
    vec3f(1.0),
    clamp(staticHighlightBlocks, 0.0, 0.68)
  );
  let vividLightAurora = amplifyChroma(lightAurora, 1.54);
  lightAurora = mix(lightAurora, vividLightAurora, trailColorInfluence * 0.86);
  lightAurora = screenBlend(lightAurora, vividTrailColor * trailColorInfluence * 0.12);
  lightAurora = screenBlend(lightAurora, trailIridescence * trailRainbowBand * 0.16);
  let lightRainbowTarget = amplifyChroma(
    mix(trailIridescence, trailSpectrum, 0.76),
    1.72
  );
  let lightRainbowMix = clamp(
    trailVisibility * 0.52 + trailRainbowBand * 0.28,
    0.0,
    0.6
  );
  lightAurora = mix(lightAurora, lightRainbowTarget, lightRainbowMix);
  let lightContourHighlight = clamp(
    trailVisibility * 0.28 + trailRainbowBand * 0.22,
    0.0,
    0.38
  );
  let lightHighlightColor = amplifyChroma(
    mix(vec3f(0.98, 1.0, 1.0), trailIridescence, 0.42),
    1.2
  );
  lightAurora = screenBlend(lightAurora, lightHighlightColor * lightContourHighlight);
  lightAurora = clamp(
    (lightAurora - vec3f(0.5)) * 1.1 + vec3f(0.5),
    vec3f(0.0),
    vec3f(1.0)
  );
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
  const pointerRef = useRef<PointerTarget>({
    x: 0.5,
    y: 0.5,
    pressX: 0.5,
    pressY: 0.5,
    lastMovedAt: 0,
    lastPressedAt: Number.NEGATIVE_INFINITY,
  })
  const strokeFieldRef = useRef<SVGSVGElement>(null)
  const strokesRandomizedRef = useRef(false)

  useEffect(() => {
    const readPointerCoordinates = (event: PointerEvent) => ({
      x: event.clientX / Math.max(window.innerWidth, 1),
      screenY: event.clientY / Math.max(window.innerHeight, 1),
    })

    const updateStrokePointer = (x: number, screenY: number) => {
      const strokeField = strokeFieldRef.current
      strokeField?.style.setProperty('--stroke-pointer-x', `${x * 2 - 1}`)
      strokeField?.style.setProperty('--stroke-pointer-y', `${1 - screenY * 2}`)
    }

    const readPointer = (event: PointerEvent) => {
      const { x, screenY } = readPointerCoordinates(event)
      pointerRef.current.x = x
      pointerRef.current.y = screenY
      pointerRef.current.lastMovedAt = performance.now()
      updateStrokePointer(x, screenY)
    }

    const pressPointer = (event: PointerEvent) => {
      const { x, screenY } = readPointerCoordinates(event)
      const pressedAt = performance.now()
      pointerRef.current.pressX = x
      pointerRef.current.pressY = screenY
      pointerRef.current.lastMovedAt = pressedAt
      pointerRef.current.lastPressedAt = pressedAt
      updateStrokePointer(x, screenY)
    }

    window.addEventListener('pointermove', readPointer, { passive: true })
    window.addEventListener('pointerdown', pressPointer, { passive: true })
    return () => {
      window.removeEventListener('pointermove', readPointer)
      window.removeEventListener('pointerdown', pressPointer)
    }
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
        formatKaishuStrokePlacementTransform(placement)
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
    let device: GPUDevice | null = null
    let uniformBuffer: GPUBuffer | null = null
    let trailTextures: GPUTexture[] = []
    let strokeMaskTexture: GPUTexture | null = null
    let retiredStrokeMaskTextures: GPUTexture[] = []
    let strokeMaskGeneration = 0
    let resizeFrameHandle = 0
    let resizePending: BackingSizeJob | null = null
    let currentBackingSize: BackingSize | null = null
    let maskUploadInFlight = false
    let pendingMaskJob: BackingSizeJob | null = null
    let maskDebounceTimer: number | null = null
    let maskDebounceDueAt: number | null = null

    const releaseGpuResources = () => {
      cancelAnimationFrame(frameHandle)
      cancelAnimationFrame(resizeFrameHandle)
      resizeFrameHandle = 0
      if (maskDebounceTimer !== null) {
        window.clearTimeout(maskDebounceTimer)
        maskDebounceTimer = null
      }
      maskDebounceDueAt = null
      resizePending = null
      pendingMaskJob = null
      strokeMaskGeneration += 1
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

    const failToStaticFallback = (error: unknown, message: string) => {
      if (cancelled) {
        return
      }

      cancelled = true
      delete canvas.dataset.ready
      delete canvas.dataset.strokeReady
      releaseGpuResources()
      console.error(message, error)
    }

    const mount = async () => {
      // navigator.gpu is intentionally the only renderer entry point; CSS remains the graceful fallback.
      const gpu = navigator.gpu
      if (!gpu) {
        return
      }

      const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' })
      if (!adapter || cancelled) {
        return
      }

      const nextDevice = await adapter.requestDevice()
      device = nextDevice
      if (cancelled) {
        nextDevice.destroy()
        return
      }

      context = canvas.getContext('webgpu') as GPUCanvasContext | null
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
      if (cancelled) {
        return
      }

      const trailPipeline: GPURenderPipeline = await nextDevice.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module: trailModule, entryPoint: 'trailVertex' },
        fragment: { module: trailModule, entryPoint: 'trailFragment', targets: [{ format: 'rgba8unorm' }] },
        primitive: { topology: 'triangle-list' },
      })
      if (cancelled) {
        return
      }
      const atmospherePipeline: GPURenderPipeline = await nextDevice.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module: atmosphereModule, entryPoint: 'fullscreenVertex' },
        fragment: { module: atmosphereModule, entryPoint: 'atmosphereFragment', targets: [{ format }] },
        primitive: { topology: 'triangle-list' },
      })
      if (cancelled) {
        return
      }

      const nextUniformBuffer = nextDevice.createBuffer({
        size: 64,
        usage: GPU_BUFFER_USAGE_UNIFORM | GPU_BUFFER_USAGE_COPY_DST,
      })
      uniformBuffer = nextUniformBuffer
      const linearSampler = nextDevice.createSampler({
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
        magFilter: 'linear',
        minFilter: 'linear',
      })
      const uniformData = new ArrayBuffer(64)
      const uniformFloats = new Float32Array(uniformData)
      const viscousPointer = { x: 0.5, y: 0.5 }
      let previousFrameTime = performance.now()
      let readTrailIndex = 0
      let trailViews: GPUTextureView[] = []
      let trailBindGroups: GPUBindGroup[] = []
      let atmosphereBindGroups: GPUBindGroup[] = []
      let strokeMaskView: GPUTextureView
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

      const clearTrailViews = (commandEncoder: GPUCommandEncoder) => {
        for (const view of trailViews) {
          const clearPass = commandEncoder.beginRenderPass({
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
        clearTrailViews(clearEncoder)
        nextDevice.queue.submit([clearEncoder.finish()])
        readTrailIndex = 0
      }

      const uploadStrokeMask = async (job: BackingSizeJob) => {
        const { width, height, strokeScale } = job
        const placements = getKaishuStrokePlacements()
        let imageUrl: string | null = null
        let nextMaskTexture: GPUTexture | null = null

        try {
          const svg = serializeKaishuStrokeMaskSvg(width, height, placements, strokeScale)
          imageUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
          const image = new Image()
          image.decoding = 'async'
          image.src = imageUrl
          await image.decode()
          if (cancelled || job.generation !== strokeMaskGeneration) {
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
          if (cancelled || job.generation !== strokeMaskGeneration) {
            return
          }
          if (!strokeMaskReady) {
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

      const startPendingMaskUpload = () => {
        if (cancelled || maskUploadInFlight || !pendingMaskJob) {
          return
        }

        const job = pendingMaskJob
        pendingMaskJob = null
        maskUploadInFlight = true
        void uploadStrokeMask(job).finally(() => {
          maskUploadInFlight = false
          if (cancelled || !pendingMaskJob) {
            return
          }

          const debounceDueAt = maskDebounceDueAt
          if (debounceDueAt !== null && performance.now() < debounceDueAt) {
            return
          }

          if (maskDebounceTimer !== null) {
            window.clearTimeout(maskDebounceTimer)
            maskDebounceTimer = null
          }
          maskDebounceDueAt = null
          startPendingMaskUpload()
        })
      }

      const scheduleMaskUpload = (job: BackingSizeJob) => {
        pendingMaskJob = job
        if (maskDebounceTimer !== null) {
          window.clearTimeout(maskDebounceTimer)
        }
        maskDebounceDueAt = performance.now() + STROKE_MASK_RESIZE_DEBOUNCE_MS
        maskDebounceTimer = window.setTimeout(() => {
          maskDebounceTimer = null
          maskDebounceDueAt = null
          startPendingMaskUpload()
        }, STROKE_MASK_RESIZE_DEBOUNCE_MS)
      }

      const measureBackingSize = (target: HTMLCanvasElement): BackingSize => {
        const bounds = target.getBoundingClientRect()
        const maxPixelCount = 1_600_000
        const cssPixelCount = Math.max(bounds.width * bounds.height, 1)
        const pixelBudgetDpr = Math.sqrt(maxPixelCount / cssPixelCount)
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5, pixelBudgetDpr)
        return {
          width: Math.max(1, Math.floor(bounds.width * dpr)),
          height: Math.max(1, Math.floor(bounds.height * dpr)),
          strokeScale: dpr,
        }
      }

      const isSameBackingSize = (left: BackingSize, right: BackingSize) =>
        left.width === right.width && left.height === right.height && left.strokeScale === right.strokeScale

      const applyResize = (job: BackingSizeJob) => {
        if (cancelled || job.generation !== strokeMaskGeneration) {
          return
        }

        canvas.width = job.width
        canvas.height = job.height
        createTrailResources()
        currentBackingSize = job
        scheduleMaskUpload(job)
      }

      const initialSize = measureBackingSize(canvas)
      currentBackingSize = initialSize
      canvas.width = initialSize.width
      canvas.height = initialSize.height
      createTrailResources()
      pendingMaskJob = { ...initialSize, generation: strokeMaskGeneration }
      startPendingMaskUpload()

      resizeObserver = new ResizeObserver(() => {
        const measuredSize = measureBackingSize(canvas)
        const latestKnownSize = resizePending ?? currentBackingSize
        if (latestKnownSize && isSameBackingSize(measuredSize, latestKnownSize)) {
          return
        }

        const generation = ++strokeMaskGeneration
        resizePending = { ...measuredSize, generation }
        if (resizeFrameHandle === 0) {
          resizeFrameHandle = requestAnimationFrame(() => {
            resizeFrameHandle = 0
            const pendingResize = resizePending
            resizePending = null
            if (pendingResize) {
              applyResize(pendingResize)
            }
          })
        }
      })
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
        const pressAge = Math.max(frameTime - pointerRef.current.lastPressedAt, 0)
        uniformFloats[11] = Math.exp(-pressAge / 260)
        uniformFloats[12] = pointerRef.current.pressX
        uniformFloats[13] = pointerRef.current.pressY
        try {
          nextDevice.queue.writeBuffer(nextUniformBuffer, 0, uniformData)
          const commandEncoder = nextDevice.createCommandEncoder()

          if (pointerRef.current.lastMovedAt !== observedMoveStamp) {
            observedMoveStamp = pointerRef.current.lastMovedAt
            lastPointerMoveTime = observedMoveStamp
            idleTrailCleared = false
          }
          if (!idleTrailCleared && frameTime - lastPointerMoveTime >= TRAIL_IDLE_RESET_MS) {
            clearTrailViews(commandEncoder)
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
          failToStaticFallback(error, 'Unable to submit homepage WebGPU atmosphere frame.')
          return
        }
        if (!revealRequested) {
          revealRequested = true
          void nextDevice.queue.onSubmittedWorkDone().then(
            () => {
              if (!cancelled) {
                canvas.dataset.ready = 'true'
              }
            },
            (error: unknown) => {
              failToStaticFallback(error, 'Unable to confirm homepage WebGPU atmosphere frame.')
            }
          )
        }
        if (activatingStrokeMask) {
          void nextDevice.queue.onSubmittedWorkDone().then(undefined, (error: unknown) => {
            failToStaticFallback(error, 'Unable to confirm homepage SVG stroke mask frame.')
          })
        }
        if (strokeMaskFencePending) {
          strokeMaskFencePending = false
          const retiredTextures = retiredStrokeMaskTextures.splice(0)
          const destroyRetiredTextures = () => {
            retiredTextures.forEach((texture) => texture.destroy())
          }
          void nextDevice.queue.onSubmittedWorkDone().then(
            destroyRetiredTextures,
            (error: unknown) => {
              destroyRetiredTextures()
              failToStaticFallback(error, 'Unable to retire homepage SVG stroke mask texture.')
            }
          )
        }
        frameHandle = requestAnimationFrame(render)
      }

      frameHandle = requestAnimationFrame(render)
    }

    void mount().catch((error: unknown) => {
      failToStaticFallback(error, 'Unable to initialize homepage WebGPU atmosphere.')
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

const GPU_BUFFER_USAGE_UNIFORM = 0x40
const GPU_BUFFER_USAGE_COPY_DST = 0x08
const GPU_TEXTURE_USAGE_COPY_DST = 0x02
const GPU_TEXTURE_USAGE_TEXTURE_BINDING = 0x04
const GPU_TEXTURE_USAGE_RENDER_ATTACHMENT = 0x10
const TRAIL_IDLE_RESET_MS = 5200
const STROKE_MASK_RESIZE_DEBOUNCE_MS = 120
