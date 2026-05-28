'use client'

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  ShaderMaterial,
  type Texture,
} from 'three'
import { useStudioStore } from '@/app/studio/studio-store'
import { rasterizeCharacterSurfaceMask } from '@/components/studio/character-surface-rasterize'
import { hexToVector3 } from '@/shaders/uniforms'

export type CharacterSurfaceStatus = {
  state: 'idle' | 'loading' | 'error'
  message: string | null
}

export const IDLE_CHARACTER_SURFACE_STATUS: CharacterSurfaceStatus = {
  state: 'idle',
  message: null,
}

type CharacterSurfaceCanvasProps = {
  onSurfaceStatusChange: (status: CharacterSurfaceStatus) => void
}

type CharacterSurfaceSceneProps = CharacterSurfaceCanvasProps & {
  svgData: string
  svgLoadError: string | null
  backgroundColor: string
}

const VERTEX_SHADER = `
  varying vec2 v_uv;

  void main() {
    v_uv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = `
  uniform sampler2D u_characterMask;
  uniform vec3 u_foregroundColor;
  uniform vec3 u_backgroundColor;

  varying vec2 v_uv;

  void main() {
    float mask = texture2D(u_characterMask, v_uv).a;
    vec3 color = mix(u_backgroundColor, u_foregroundColor, smoothstep(0.01, 0.99, mask));
    gl_FragColor = vec4(color, 1.0);
  }
`

export default function CharacterSurfaceCanvas({
  onSurfaceStatusChange,
}: CharacterSurfaceCanvasProps) {
  const svgData = useStudioStore((store) => store.runtime.svgData)
  const svgLoadError = useStudioStore((store) => store.runtime.svgLoadError)
  const backgroundColor = useStudioStore((store) => store.view.backgroundColor)

  return (
    <div
      data-testid="character-surface-canvas"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 320,
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[backgroundColor]} />
        <CharacterSurfaceScene
          svgData={svgData}
          svgLoadError={svgLoadError}
          backgroundColor={backgroundColor}
          onSurfaceStatusChange={onSurfaceStatusChange}
        />
      </Canvas>
    </div>
  )
}

function CharacterSurfaceScene({
  svgData,
  svgLoadError,
  backgroundColor,
  onSurfaceStatusChange,
}: CharacterSurfaceSceneProps) {
  const { size, viewport } = useThree()
  const [maskTexture, setMaskTexture] = useState<Texture | null>(null)
  const maskTextureRef = useRef<Texture | null>(null)

  useEffect(() => {
    if (svgLoadError) {
      replaceMaskTexture(null, maskTextureRef, setMaskTexture)
      onSurfaceStatusChange({
        state: 'error',
        message: svgLoadError,
      })
      return
    }

    if (!svgData) {
      replaceMaskTexture(null, maskTextureRef, setMaskTexture)
      onSurfaceStatusChange({
        state: 'loading',
        message: 'Loading character SVG...',
      })
      return
    }

    let cancelled = false

    onSurfaceStatusChange({
      state: 'loading',
      message: 'Rasterizing Character Surface...',
    })

    rasterizeCharacterSurfaceMask(svgData, {
      viewportWidth: size.width,
      viewportHeight: size.height,
    })
      .then(({ canvas }) => {
        if (cancelled) {
          return
        }

        const texture = new CanvasTexture(canvas)
        texture.wrapS = ClampToEdgeWrapping
        texture.wrapT = ClampToEdgeWrapping
        texture.minFilter = LinearFilter
        texture.magFilter = LinearFilter
        texture.needsUpdate = true

        replaceMaskTexture(texture, maskTextureRef, setMaskTexture)
        onSurfaceStatusChange(IDLE_CHARACTER_SURFACE_STATUS)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        replaceMaskTexture(null, maskTextureRef, setMaskTexture)
        onSurfaceStatusChange({
          state: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to rasterize Character Surface.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [onSurfaceStatusChange, size.height, size.width, svgData, svgLoadError])

  useEffect(() => {
    return () => {
      maskTextureRef.current?.dispose()
      maskTextureRef.current = null
    }
  }, [])

  const material = useMemo(() => {
    if (!maskTexture) {
      return null
    }

    return new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        u_characterMask: { value: maskTexture },
        u_foregroundColor: { value: hexToVector3('#000000') },
        u_backgroundColor: { value: readBackgroundColor(backgroundColor) },
      },
    })
  }, [backgroundColor, maskTexture])

  useEffect(() => {
    return () => {
      material?.dispose()
    }
  }, [material])

  if (!maskTexture || !material) {
    return null
  }

  return (
    <mesh material={material}>
      <planeGeometry args={[viewport.width, viewport.height]} />
    </mesh>
  )
}

function replaceMaskTexture(
  nextTexture: Texture | null,
  maskTextureRef: MutableRefObject<Texture | null>,
  setMaskTexture: (texture: Texture | null) => void,
) {
  const previousTexture = maskTextureRef.current
  maskTextureRef.current = nextTexture
  setMaskTexture(nextTexture)

  if (previousTexture && previousTexture !== nextTexture) {
    previousTexture.dispose()
  }
}

function readBackgroundColor(backgroundColor: string) {
  try {
    return hexToVector3(backgroundColor)
  } catch {
    return hexToVector3('#ffffff')
  }
}
