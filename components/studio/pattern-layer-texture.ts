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

export type PatternLayerTextureTargets = {
  foreground?: Texture
  background?: Texture
  morphStack?: Texture
}

type LoadedPatternLayerTexture = {
  source: string
  texture: Texture
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

  const groupedLayers = groupPatternLayersByTarget(layers)

  return {
    textures: {
      foreground: getFirstTexture(groupedLayers.foreground, loadedTexturesByLayerId),
      background: getFirstTexture(groupedLayers.background, loadedTexturesByLayerId),
      morphStack: getFirstTexture(groupedLayers.morphStack, loadedTexturesByLayerId),
    } satisfies PatternLayerTextureTargets,
    errorByLayerId,
  }
}

function getFirstTexture(
  layers: StudioPatternLayer[],
  loadedTexturesByLayerId: Record<string, LoadedPatternLayerTexture>,
) {
  for (const layer of layers) {
    const loadedTexture = loadedTexturesByLayerId[layer.id]

    if (loadedTexture) {
      return loadedTexture.texture
    }
  }

  return undefined
}

function preparePatternTexture(texture: Texture) {
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
}
