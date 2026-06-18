import type {
  StudioPostFxLayer,
  StudioShaderLayer,
  StudioStoreState,
} from '@/app/studio/studio-store'

export const RANDOMIZE_PRESET_IDS = [
  'graphite-relief',
  'wet-ink-bloom',
  'carved-lacquer',
  'digital-slice',
  'oxidized-metal',
  'chrome-glass',
  'watercolor-paper',
] as const

export type RandomizePresetId = (typeof RANDOMIZE_PRESET_IDS)[number]

export type CoherentRandomizePreset = {
  shaderLayers: StudioShaderLayer[]
  postFx: StudioPostFxLayer[]
  animation: StudioStoreState['animation']
}

export function buildCoherentRandomizePreset({
  seed,
  presetId,
}: {
  seed: number
  presetId: RandomizePresetId
}): CoherentRandomizePreset {
  const variant = Math.abs(Math.trunc(seed)) % 7
  const baseAnimation: StudioStoreState['animation'] = {
    playing: true,
    speed: variant % 2 === 0 ? 0 : 0.24,
    timeOffset: variant,
    animateMorph: true,
    animateShaders: true,
    animatePatterns: true,
    animatePost: true,
  }

  switch (presetId) {
    case 'chrome-glass':
      return {
        shaderLayers: [
          shaderLayer(0, 'fluid-chrome', 'foreground-shader', 0.82, {
            flowStrength: 0.36 + variant * 0.04,
            metalness: 0.84,
            refraction: 0.2,
          }),
          shaderLayer(1, 'frosted-fluted-glass', 'foreground-shader', 0.42, {
            fluteScale: 10 + variant,
            frost: 0.32,
            distortion: 0.22,
          }),
        ],
        postFx: [postFxLayer(0, 'bloom', 0.18)],
        animation: baseAnimation,
      }
    case 'watercolor-paper':
      return {
        shaderLayers: [
          shaderLayer(0, 'paper-emboss', 'foreground-shader', 0.48, {
            bevelDepth: 0.34,
            rim: 0.22,
            paperPickup: 0.5,
          }),
          shaderLayer(1, 'watercolor-paper', 'background-shader', 0.74, {
            wash: 0.56,
            grain: 0.42,
            scale: 2.4,
          }),
        ],
        postFx: [postFxLayer(0, 'vignette', 0.14)],
        animation: { ...baseAnimation, speed: 0 },
      }
    case 'digital-slice':
      return {
        shaderLayers: [
          shaderLayer(0, 'dithered-reveal', 'foreground-shader', 0.76, {
            threshold: 0.42,
            contrast: 1.35,
            scale: 16,
          }),
          shaderLayer(1, 'damaged-sensor', 'foreground-shader', 0.52, {
            dropout: 0.22,
            scanlineStrength: 0.42,
            channelOffset: 0.018,
          }),
        ],
        postFx: [postFxLayer(0, 'scanline', 0.24)],
        animation: baseAnimation,
      }
    case 'carved-lacquer':
      return {
        shaderLayers: [
          shaderLayer(0, 'black-lacquer', 'foreground-shader', 0.86, {
            gloss: 0.74,
            rim: 0.42,
            readabilityClamp: 0.82,
          }),
          shaderLayer(1, 'edge-wear', 'foreground-shader', 0.34, {
            wear: 0.24,
            contrast: 1.1,
            seed,
          }),
        ],
        postFx: [postFxLayer(0, 'noise', 0.1)],
        animation: { ...baseAnimation, speed: 0 },
      }
    case 'oxidized-metal':
      return {
        shaderLayers: [
          shaderLayer(0, 'stone-relief', 'foreground-shader', 0.74, {
            edgeWidth: 0.42,
            bevelDepth: 0.72,
            grainScale: 0.44,
            highlight: 0.36,
          }),
          shaderLayer(1, 'holofoil', 'foreground-shader', 0.32, {
            iridescence: 0.4,
            banding: 0.3,
            sparkle: 0.16,
          }),
        ],
        postFx: [postFxLayer(0, 'brightness-contrast', 0.18)],
        animation: baseAnimation,
      }
    case 'wet-ink-bloom':
      return {
        shaderLayers: [
          shaderLayer(0, 'ink-graphite', 'foreground-shader', 0.7, {
            edgeWidth: 0.28,
            bevelDepth: 0.38,
            roughness: 0.22,
            readabilityClamp: 0.78,
          }),
          shaderLayer(1, 'halftone-ink', 'foreground-shader', 0.28, {
            scale: 20,
            threshold: 0.4,
            contrast: 1.05,
          }),
        ],
        postFx: [postFxLayer(0, 'bloom', 0.22)],
        animation: { ...baseAnimation, speed: 0.12 },
      }
    case 'graphite-relief':
    default:
      return {
        shaderLayers: [
          shaderLayer(0, 'ink-graphite', 'foreground-shader', 0.88, {
            edgeWidth: 0.32,
            bevelDepth: 0.52,
            roughness: 0.45,
            readabilityClamp: 0.78,
          }),
          shaderLayer(1, 'contour-topography', 'foreground-shader', 0.24, {
            contourSpacing: 0.42,
            lineWeight: 0.35,
            contrast: 1.1,
          }),
        ],
        postFx: [postFxLayer(0, 'noise', 0.12)],
        animation: { ...baseAnimation, speed: 0 },
      }
  }
}

function shaderLayer(
  index: number,
  effectId: StudioShaderLayer['effectId'],
  target: StudioShaderLayer['target'],
  intensity: number,
  params: StudioShaderLayer['params'],
): StudioShaderLayer {
  return {
    id: `shader-layer-${index + 1}`,
    effectId,
    target,
    enabled: true,
    intensity,
    blendMode: 'normal',
    params,
    locked: false,
  }
}

function postFxLayer(
  index: number,
  effectId: StudioPostFxLayer['effectId'],
  intensity: number,
): StudioPostFxLayer {
  return {
    id: `post-fx-layer-${index + 1}`,
    effectId,
    enabled: true,
    intensity,
    locked: false,
  }
}
