'use client'

import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector2, Vector3, type Mesh, type ShaderMaterial } from 'three'
import { useStudioStore } from '@/app/studio/studio-store'
import ShaderErrorOverlay from '@/components/studio/ShaderErrorOverlay'
import { createShaderMaterial, resolveShaderPresetForCanvas } from '@/components/studio/shader-material'
import type { ShaderParamValues } from '@/shaders/types'

export default function ShaderCanvas() {
  const selectedPresetId = useStudioStore((store) => store.shader.selectedPresetId)
  const currentParams = useStudioStore((store) => store.shader.currentParams)
  const mesh = useStudioStore((store) => store.mesh)
  const displacement = useStudioStore((store) => store.displacement)
  const backgroundColor = useStudioStore((store) => store.view.backgroundColor)
  const preset = resolveShaderPresetForCanvas(selectedPresetId)
  const [previewError, setPreviewError] = useState<string | null>(null)

  return (
    <div
      data-testid="shader-canvas"
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
        <PlaceholderShaderMesh
          selectedPresetId={selectedPresetId}
          params={currentParams}
          mesh={mesh}
          displacementStrength={displacement.strength}
          displacementBias={displacement.bias}
          onError={setPreviewError}
        />
        <OrbitControls enableDamping makeDefault />
      </Canvas>
      <ShaderErrorOverlay error={previewError} preset={preset} />
    </div>
  )
}

type PlaceholderShaderMeshProps = {
  selectedPresetId: string
  params: ShaderParamValues
  mesh: {
    extrusionDepth: number
    rotation: { x: number; y: number; z: number }
    scale: number
    position: { x: number; y: number }
    autoRotate: boolean
    autoRotateSpeed: number
  }
  displacementStrength: number
  displacementBias: number
  onError: (error: string | null) => void
}

function PlaceholderShaderMesh({
  selectedPresetId,
  params,
  mesh,
  displacementStrength,
  displacementBias,
  onError,
}: PlaceholderShaderMeshProps) {
  const preset = resolveShaderPresetForCanvas(selectedPresetId)
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<ShaderMaterial>(null)
  const mouse = useRef(new Vector2(0, 0))
  const boundsMin = useMemo(
    () => new Vector3(-1, -1, -Math.max(mesh.extrusionDepth, 0.01) / 2),
    [mesh.extrusionDepth],
  )
  const boundsMax = useMemo(
    () => new Vector3(1, 1, Math.max(mesh.extrusionDepth, 0.01) / 2),
    [mesh.extrusionDepth],
  )
  const material = useMemo(() => {
    try {
      onError(null)
      return createShaderMaterial({
        preset,
        params,
        boundsMin,
        boundsMax,
        displacementStrength,
        displacementBias,
      })
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to build shader material.')
      return null
    }
  }, [boundsMax, boundsMin, displacementBias, displacementStrength, onError, params, preset])
  const { size } = useThree()

  useFrame(({ clock }) => {
    if (!materialRef.current) {
      return
    }

    materialRef.current.uniforms.u_time.value = clock.elapsedTime
    materialRef.current.uniforms.u_mouse.value.copy(mouse.current)
    materialRef.current.uniforms.u_resolution.value.set(size.width, size.height)
    materialRef.current.uniforms.u_boundsMin.value.copy(boundsMin)
    materialRef.current.uniforms.u_boundsMax.value.copy(boundsMax)
    materialRef.current.uniforms.u_displacementStrength.value = displacementStrength
    materialRef.current.uniforms.u_displacementBias.value = displacementBias

    if (meshRef.current && mesh.autoRotate) {
      meshRef.current.rotation.y += mesh.autoRotateSpeed * 0.01
    }
  })

  if (!material) {
    return null
  }

  return (
    <mesh
      ref={meshRef}
      material={material}
      position={[mesh.position.x, mesh.position.y, 0]}
      rotation={[mesh.rotation.x, mesh.rotation.y, mesh.rotation.z]}
      scale={mesh.scale}
      onPointerMove={(event) => {
        mouse.current.set(event.uv?.x ?? 0, event.uv?.y ?? 0)
      }}
    >
      <boxGeometry args={[2, 2, Math.max(mesh.extrusionDepth, 0.01)]} />
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  )
}
