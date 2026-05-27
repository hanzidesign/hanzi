'use client'

import { useRef, useState, type PointerEvent } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector2 } from 'three'
import { getCharacterDisplayState, useStudioStore } from '@/app/studio/studio-store'
import CharacterMesh from '@/components/studio/CharacterMesh'
import type { CharacterMeshStatus } from '@/components/studio/character-mesh-status'
import { useDisplacementTexture } from '@/components/studio/displacement-texture'
import ShaderErrorOverlay from '@/components/studio/ShaderErrorOverlay'
import { resolveShaderPresetForCanvas } from '@/components/studio/shader-material'
import { getViewportPointerUniformValue } from '@/components/studio/shader-canvas-math'

type ShaderCanvasProps = {
  onMeshStatusChange: (status: CharacterMeshStatus) => void
}

export default function ShaderCanvas({ onMeshStatusChange }: ShaderCanvasProps) {
  const character = useStudioStore((store) => store.character)
  const selectedPresetId = useStudioStore((store) => store.shader.selectedPresetId)
  const currentParams = useStudioStore((store) => store.shader.currentParams)
  const mesh = useStudioStore((store) => store.mesh)
  const displacement = useStudioStore((store) => store.displacement)
  const uploadedDisplacementImageData = useStudioStore(
    (store) => store.runtime.uploadedDisplacementImageData,
  )
  const backgroundColor = useStudioStore((store) => store.view.backgroundColor)
  const { charUrl } = getCharacterDisplayState(character)
  const preset = resolveShaderPresetForCanvas(selectedPresetId)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const mouse = useRef(new Vector2(0, 0))
  const displacementTexture = useDisplacementTexture(
    uploadedDisplacementImageData || displacement.patternUrl,
  )

  const updateViewportPointer = (event: PointerEvent<HTMLDivElement>) => {
    mouse.current.copy(
      getViewportPointerUniformValue(
        { clientX: event.clientX, clientY: event.clientY },
        event.currentTarget.getBoundingClientRect(),
      ),
    )
  }

  return (
    <div
      data-testid="shader-canvas"
      onPointerMove={updateViewportPointer}
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
        onCreated={() => {
          setPreviewError(null)
        }}
      >
        <color attach="background" args={[backgroundColor]} />
        <ambientLight intensity={0.35} />
        <CharacterMesh
          characterUrl={charUrl}
          selectedPresetId={selectedPresetId}
          params={currentParams}
          mesh={mesh}
          displacementStrength={displacement.strength}
          displacementBias={displacement.bias}
          displacementSubdivisionLevel={displacement.subdivisionLevel}
          displacementMap={displacementTexture.texture}
          displacementMapTransform={displacementTexture.transform}
          mouse={mouse}
          onError={setPreviewError}
          onStatusChange={onMeshStatusChange}
        />
        <OrbitControls enableDamping makeDefault />
      </Canvas>
      <ShaderErrorOverlay error={previewError} preset={preset} />
    </div>
  )
}
