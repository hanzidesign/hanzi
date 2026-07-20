'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { Group, Vector2, type ShaderMaterial, type Texture, type Vector4 } from 'three'
import {
  createCharacterMeshGeometries,
  type CharacterMeshGeometryResult,
} from '@/components/studio/character-mesh-geometry'
import { useCharacterMeshAnimation } from '@/components/studio/character-mesh-animation'
import type { CharacterMeshDeformSettings } from '@/components/studio/character-mesh-deform'
import { useStudioStore } from '@/app/studio/studio-store'
import {
  IDLE_CHARACTER_MESH_STATUS,
  type CharacterMeshStatus,
} from '@/components/studio/character-mesh-status'
import { applyDeltaRotation } from '@/components/studio/shader-canvas-math'
import { createShaderMaterial, resolveShaderPresetForCanvas } from '@/components/studio/shader-material'
import type { ShaderParamValues } from '@/shaders/types'
import { isAbortError } from '@/utils/dataUrl'

type CharacterMeshProps = {
  characterUrl: string
  selectedPresetId: string
  params: ShaderParamValues
  mesh: {
    extrusionDepth: number
    thickness: number
    rotation: { x: number; y: number; z: number }
    scale: number
    position: { x: number; y: number }
    deform: CharacterMeshDeformSettings
    autoRotate: boolean
    autoRotateSpeed: number
  }
  displacementStrength: number
  displacementBias: number
  displacementSubdivisionLevel: number
  displacementMap?: Texture
  displacementMapTransform: Vector4
  mouse: RefObject<Vector2>
  onError: (error: string | null) => void
  onStatusChange: (status: CharacterMeshStatus) => void
}

export default function CharacterMesh({
  characterUrl,
  selectedPresetId,
  params,
  mesh,
  displacementStrength,
  displacementBias,
  displacementSubdivisionLevel,
  displacementMap,
  displacementMapTransform,
  mouse,
  onError,
  onStatusChange,
}: CharacterMeshProps) {
  const preset = resolveShaderPresetForCanvas(selectedPresetId)
  const groupRef = useRef<Group>(null)
  const materialRef = useRef<ShaderMaterial | null>(null)
  const resultRef = useRef<CharacterMeshGeometryResult | null>(null)
  const animation = useStudioStore((store) => store.animation)
  const [svgText, setSvgText] = useState<string | null>(null)
  const [geometryResult, setGeometryResult] =
    useState<CharacterMeshGeometryResult | null>(null)
  const materialState = useMemo(() => {
    if (!geometryResult) {
      return { error: null, material: null }
    }

    try {
      return {
        error: null,
        material: createShaderMaterial({
          preset,
          params,
          boundsMin: geometryResult.shaderBoundsMin,
          boundsMax: geometryResult.shaderBoundsMax,
          displacementMap,
          displacementMapTransform,
          displacementStrength,
          displacementBias,
        }),
      }
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to build shader material.',
        material: null,
      }
    }
  }, [
    displacementBias,
    displacementMap,
    displacementMapTransform,
    displacementStrength,
    geometryResult,
    params,
    preset,
  ])
  const material = materialState.material
  const { size } = useThree()

  useEffect(() => {
    onError(materialState.error)
  }, [materialState.error, onError])

  useEffect(() => {
    const controller = new AbortController()

    onStatusChange({
      state: 'loading',
      message: 'Loading character mesh...',
    })

    readText(characterUrl, controller.signal)
      .then((nextSvgText) => {
        setSvgText(nextSvgText)
      })
      .catch((error) => {
        if (isAbortError(error)) {
          return
        }

        onStatusChange({
          state: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to load character mesh.',
        })
      })

    return () => {
      controller.abort()
    }
  }, [characterUrl, onStatusChange])

  useEffect(() => {
    if (!svgText) {
      return
    }

    try {
      const nextResult = createGeometryResult(
        svgText,
        mesh.extrusionDepth,
        mesh.thickness,
        mesh.deform,
        displacementSubdivisionLevel,
      )
      replaceGeometryResult(nextResult, resultRef, setGeometryResult)
      onStatusChange(IDLE_CHARACTER_MESH_STATUS)
    } catch (error) {
      onStatusChange({
        state: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to build character mesh.',
      })
    }
  }, [
    displacementSubdivisionLevel,
    mesh.extrusionDepth,
    mesh.thickness,
    mesh.deform,
    onStatusChange,
    svgText,
  ])

  useEffect(() => {
    return () => {
      disposeGeometryResult(resultRef.current)
      resultRef.current = null
    }
  }, [])

  useEffect(() => {
    materialRef.current = material

    return () => {
      if (materialRef.current === material) {
        materialRef.current = null
      }

      material?.dispose()
    }
  }, [material])

  useCharacterMeshAnimation(resultRef, animation)

  useFrame(({ clock }, delta) => {
    const activeMaterial = materialRef.current

    if (!activeMaterial || !geometryResult) {
      return
    }

    activeMaterial.uniforms.u_time.value = clock.elapsedTime
    activeMaterial.uniforms.u_mouse.value.copy(mouse.current)
    activeMaterial.uniforms.u_resolution.value.set(size.width, size.height)
    activeMaterial.uniforms.u_boundsMin.value.copy(geometryResult.shaderBoundsMin)
    activeMaterial.uniforms.u_boundsMax.value.copy(geometryResult.shaderBoundsMax)
    activeMaterial.uniforms.u_displacementStrength.value = displacementStrength
    activeMaterial.uniforms.u_displacementBias.value = displacementBias
    activeMaterial.uniforms.u_displacementMapTransform.value.copy(
      displacementMapTransform,
    )

    if (groupRef.current && mesh.autoRotate) {
      groupRef.current.rotation.y = applyDeltaRotation(
        groupRef.current.rotation.y,
        mesh.autoRotateSpeed,
        delta,
      )
    }
  })

  if (!geometryResult || !material) {
    return null
  }

  return (
    <group
      ref={groupRef}
      position={[mesh.position.x, mesh.position.y, 0]}
      rotation={[mesh.rotation.x, mesh.rotation.y, mesh.rotation.z]}
      scale={mesh.scale}
    >
      {geometryResult.geometries.map((geometry) => (
        <mesh key={geometry.uuid} geometry={geometry} material={material} />
      ))}
    </group>
  )
}

function createGeometryResult(
  svgText: string,
  extrusionDepth: number,
  thickness: number,
  deform: CharacterMeshDeformSettings,
  displacementSubdivisionLevel: number,
) {
  const svg = new SVGLoader().parse(svgText)
  const shapes = svg.paths.flatMap((path) => SVGLoader.createShapes(path))

  return createCharacterMeshGeometries({
    shapes,
    extrusionDepth,
    thickness,
    deform,
    displacementSubdivisionLevel,
  })
}

function replaceGeometryResult(
  nextResult: CharacterMeshGeometryResult,
  resultRef: RefObject<CharacterMeshGeometryResult | null>,
  setGeometryResult: (result: CharacterMeshGeometryResult) => void,
) {
  disposeGeometryResult(resultRef.current)
  resultRef.current = nextResult
  setGeometryResult(nextResult)
}

function disposeGeometryResult(result: CharacterMeshGeometryResult | null) {
  for (const geometry of result?.geometries ?? []) {
    geometry.dispose()
  }
}

async function readText(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`Failed to load ${url}`)
  }

  return response.text()
}
