'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ClampToEdgeWrapping,
  LinearFilter,
  TextureLoader,
  type Texture,
} from 'three'
import type { StudioPatternLayer } from '@/app/studio/studio-store'
import { DEFAULT_PATTERN_ASSET_URL } from '@/utils/patternAssets'
import { clampLayerIntensity, sanitizeLayerBlendMode, type LayerBlendMode } from './layer-compositing'

export type PatternLayerTextureTargets = {
  foreground: PatternLayerTextureTarget[]
  background: PatternLayerTextureTarget[]
  morphStack: PatternLayerTextureTarget[]
}

type LoadedPatternLayerTexture = {
  source: string
  texture: Texture
}

export type PatternLayerTextureTarget = {
  id: string
  texture: Texture
  intensity: number
  blendMode: LayerBlendMode
}

export function getPatternLayerTextureSource(
  layer: StudioPatternLayer,
  uploadedPatternLayerDataById: Record<string, string>,
) {
  if (layer.source.type === 'local-file') {
    return uploadedPatternLayerDataById[layer.id] ?? DEFAULT_PATTERN_ASSET_URL
  }

  return layer.source.patternUrl
}

export function groupPatternLayersByTarget(layers: StudioPatternLayer[]) {
  return {
    foreground: layers.filter((layer) => layer.target === 'foreground-shader'),
    background: layers.filter((layer) => layer.target === 'background-shader'),
    morphStack: layers.filter((layer) => layer.target === 'morph-stack'),
  }
}

export function resolvePatternLayerTextureFailure({
  failedSource,
  lastValidSource,
}: {
  failedSource: string
  lastValidSource: string | null
}) {
  return {
    source: lastValidSource ?? DEFAULT_PATTERN_ASSET_URL,
    error: `Unable to load Pattern Layer source ${failedSource}.`,
  }
}

export function usePatternLayerTextures(
  layers: StudioPatternLayer[],
  uploadedPatternLayerDataById: Record<string, string>,
) {
  const [loadedTexturesByLayerId, setLoadedTexturesByLayerId] = useState<
    Record<string, LoadedPatternLayerTexture>
  >({})
  const loadedTexturesRef = useRef<Record<string, LoadedPatternLayerTexture>>({})
  const [errorByLayerId, setErrorByLayerId] = useState<Record<string, string>>({})

  const sourceByLayerId = useMemo(
    () =>
      Object.fromEntries(
        layers.map((layer) => [
          layer.id,
          getPatternLayerTextureSource(layer, uploadedPatternLayerDataById),
        ]),
      ),
    [layers, uploadedPatternLayerDataById],
  )

  useEffect(() => {
    let cancelled = false
    const loader = new TextureLoader()

    for (const layer of layers) {
      const source = sourceByLayerId[layer.id]

      if (!source) {
        continue
      }

      if (loadedTexturesRef.current[layer.id]?.source === source) {
        continue
      }

      loader.load(
        source,
        (texture) => {
          if (cancelled) {
            texture.dispose()
            return
          }

          preparePatternTexture(texture)

          const previousTexture = loadedTexturesRef.current[layer.id]
          const nextTexture = { source, texture }
          loadedTexturesRef.current = {
            ...loadedTexturesRef.current,
            [layer.id]: nextTexture,
          }
          setLoadedTexturesByLayerId(loadedTexturesRef.current)
          setErrorByLayerId((current) => {
            const next = { ...current }
            delete next[layer.id]
            return next
          })

          if (previousTexture && previousTexture.texture !== texture) {
            previousTexture.texture.dispose()
          }
        },
        undefined,
        () => {
          if (cancelled) {
            return
          }

          const fallback = resolvePatternLayerTextureFailure({
            failedSource: source,
            lastValidSource: loadedTexturesRef.current[layer.id]?.source ?? null,
          })

          setErrorByLayerId((current) => ({
            ...current,
            [layer.id]: fallback.error,
          }))
        },
      )
    }

    return () => {
      cancelled = true
    }
  }, [layers, sourceByLayerId])

  useEffect(() => {
    return () => {
      for (const loadedTexture of Object.values(loadedTexturesRef.current)) {
        loadedTexture.texture.dispose()
      }

      loadedTexturesRef.current = {}
    }
  }, [])

  return {
    textures: getPatternLayerTextureTargets(layers, loadedTexturesByLayerId),
    errorByLayerId,
  }
}

export function getPatternLayerTextureTargets(
  layers: StudioPatternLayer[],
  loadedTexturesByLayerId: Record<string, LoadedPatternLayerTexture>,
): PatternLayerTextureTargets {
  const groupedLayers = groupPatternLayersByTarget(layers)

  return {
    foreground: getActiveTextureTargets(groupedLayers.foreground, loadedTexturesByLayerId),
    background: getActiveTextureTargets(groupedLayers.background, loadedTexturesByLayerId),
    morphStack: getActiveTextureTargets(groupedLayers.morphStack, loadedTexturesByLayerId),
  }
}

function getActiveTextureTargets(
  layers: StudioPatternLayer[],
  loadedTexturesByLayerId: Record<string, LoadedPatternLayerTexture>,
) {
  const targets: PatternLayerTextureTarget[] = []

  for (const layer of layers) {
    if (!layer.enabled || clampLayerIntensity(layer.intensity) <= 0) {
      continue
    }

    const loadedTexture = loadedTexturesByLayerId[layer.id]

    if (loadedTexture) {
      targets.push({
        id: layer.id,
        texture: loadedTexture.texture,
        intensity: clampLayerIntensity(layer.intensity),
        blendMode: sanitizeLayerBlendMode(layer.blendMode),
      })
    }
  }

  return targets
}

function preparePatternTexture(texture: Texture) {
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
}
