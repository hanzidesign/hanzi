'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ClampToEdgeWrapping,
  LinearFilter,
  TextureLoader,
  Vector4,
  type Texture,
} from 'three'

export type DisplacementTextureTransform = {
  repeatX: number
  repeatY: number
  offsetX: number
  offsetY: number
}

export const DISPLACEMENT_TEXTURE_TRANSFORM_IDENTITY = {
  repeatX: 1,
  repeatY: 1,
  offsetX: 0,
  offsetY: 0,
} as const satisfies DisplacementTextureTransform

type LoadedDisplacementTexture = {
  source: string
  texture: Texture
  transform: Vector4
}

export function getCoverTextureTransform(
  width: number,
  height: number,
): DisplacementTextureTransform {
  if (width <= 0 || height <= 0) {
    return DISPLACEMENT_TEXTURE_TRANSFORM_IDENTITY
  }

  const aspect = width / height

  if (aspect > 1) {
    const repeatX = 1 / aspect

    return {
      repeatX,
      repeatY: 1,
      offsetX: (1 - repeatX) / 2,
      offsetY: 0,
    }
  }

  if (aspect < 1) {
    const repeatY = aspect

    return {
      repeatX: 1,
      repeatY,
      offsetX: 0,
      offsetY: (1 - repeatY) / 2,
    }
  }

  return DISPLACEMENT_TEXTURE_TRANSFORM_IDENTITY
}

export function toTextureTransformVector(transform: DisplacementTextureTransform) {
  return new Vector4(
    transform.repeatX,
    transform.repeatY,
    transform.offsetX,
    transform.offsetY,
  )
}

export function useDisplacementTexture(source: string) {
  const [loadedTexture, setLoadedTexture] =
    useState<LoadedDisplacementTexture | null>(null)
  const loadedTextureRef = useRef<LoadedDisplacementTexture | null>(null)

  useEffect(() => {
    let cancelled = false
    const loader = new TextureLoader()

    loader.load(
      source,
      (texture) => {
        if (cancelled) {
          texture.dispose()
          return
        }

        const nextTexture = createLoadedDisplacementTexture(source, texture)
        const previousTexture = loadedTextureRef.current
        loadedTextureRef.current = nextTexture
        setLoadedTexture(nextTexture)

        if (previousTexture && previousTexture.texture !== nextTexture.texture) {
          previousTexture.texture.dispose()
        }
      },
      undefined,
      () => {
        if (!cancelled) {
          setLoadedTexture((currentTexture) => currentTexture)
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [source])

  useEffect(() => {
    return () => {
      loadedTextureRef.current?.texture.dispose()
      loadedTextureRef.current = null
    }
  }, [])

  return {
    texture: loadedTexture?.texture,
    transform:
      loadedTexture?.transform ??
      toTextureTransformVector(DISPLACEMENT_TEXTURE_TRANSFORM_IDENTITY),
  }
}

function createLoadedDisplacementTexture(source: string, texture: Texture) {
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true

  const image = texture.image as { width?: number; height?: number } | undefined
  const transform = getCoverTextureTransform(image?.width ?? 0, image?.height ?? 0)

  return {
    source,
    texture,
    transform: toTextureTransformVector(transform),
  }
}
