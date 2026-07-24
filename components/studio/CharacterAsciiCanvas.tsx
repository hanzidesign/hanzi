'use client'

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  StudioRenderCanvas as Canvas,
  useStudioRenderMode,
} from '@/components/studio/studio-render-context'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { Group, Vector2, type ShaderMaterial } from 'three'
import { useStudioStore } from '@/app/studio/studio-store'
import { withoutSharedControllerValues } from './studio-shared-controls'
import {
  createCharacterMeshGeometries,
  type CharacterMeshGeometryResult,
} from '@/components/studio/character-mesh-geometry'
import {
  deriveCharacterMeshGeometrySignature,
  type CharacterMeshGeometrySignatureOptions,
} from '@/components/studio/character-mesh-geometry-signature'
import { useCharacterMeshAnimation } from '@/components/studio/character-mesh-animation'
import {
  attachCharacterMeshGpuDeform,
  type CharacterMeshGpuDeformBinding,
} from '@/components/studio/character-mesh-gpu-deform'
import {
  updateAsciiShaderUniforms,
  createAsciiShaderMaterial,
  disposeAsciiShaderMaterial,
} from '@/components/studio/character-ascii-material'
import { compileStudioEffectRuntime } from '@/components/studio/studio-effect-runtime'
import { applyDeltaRotation } from '@/components/studio/shader-canvas-math'
import { getSignedRotationSpeed } from '@/components/studio/motion-speed'
import { createCharacterRepeatTransforms } from '@/components/studio/character-model-arrangement'

export type CharacterAsciiStatus = {
  state: 'idle' | 'loading' | 'error'
  message: string | null
}

export const IDLE_CHARACTER_ASCII_STATUS: CharacterAsciiStatus = {
  state: 'idle',
  message: null,
}

type CharacterAsciiCanvasProps = {
  onAsciiStatusChange: (status: CharacterAsciiStatus) => void
}

type CharacterAsciiSceneProps = CharacterAsciiCanvasProps & {
  svgData: string
  svgLoadError: string | null
}

export default function CharacterAsciiCanvas({
  onAsciiStatusChange,
}: CharacterAsciiCanvasProps) {
  const svgData = useStudioStore((store) => store.runtime.svgData)
  const svgLoadError = useStudioStore((store) => store.runtime.svgLoadError)
  const backgroundColor = useStudioStore((store) => store.ascii.backgroundColor)

  return (
    <div
      data-testid="character-ascii-canvas"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 320,
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 4.6], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <color attach="background" args={[backgroundColor]} />
        <CharacterAsciiScene
          svgData={svgData}
          svgLoadError={svgLoadError}
          onAsciiStatusChange={onAsciiStatusChange}
        />
      </Canvas>
    </div>
  )
}

function CharacterAsciiScene({
  svgData,
  svgLoadError,
  onAsciiStatusChange,
}: CharacterAsciiSceneProps) {
  const { gl, size } = useThree()
  const groupRef = useRef<Group>(null)
  const materialRef = useRef<ShaderMaterial | null>(null)
  const geometryResultRef = useRef<CharacterMeshGeometryResult | null>(null)
  const gpuDeformRef = useRef<CharacterMeshGpuDeformBinding | null>(null)
  const mouseRef = useRef(new Vector2(0, 0))
  const [geometryResult, setGeometryResult] = useState<CharacterMeshGeometryResult | null>(null)
  const mesh = useStudioStore((store) => store.mesh)
  const ascii = useStudioStore((store) => store.ascii)
  const animation = useStudioStore((store) => store.animation)
  const theme = useStudioStore((store) => store.view.theme)
  const asciiEffectControls = useStudioStore((store) => store.studioEffect.controls.ascii)
  const geometryOptionsRef = useRef<CharacterMeshGeometrySignatureOptions>({
    extrusionDepth: mesh.extrusionDepth,
    thickness: mesh.thickness,
    bevel: mesh.bevel,
    twist: mesh.twist,
    taper: mesh.taper,
    bend: mesh.bend,
    deform: mesh.deform,
    displacementSubdivisionLevel: 0,
  })
  const {
    exportRender,
    markExportContentReady,
    readAnimationTime,
    readPointer,
    reportCharacterRotationY,
    reportPointer,
    resolveVisualFrameSize,
  } = useStudioRenderMode()

  const geometrySignature = useMemo(() => deriveCharacterMeshGeometrySignature({
    extrusionDepth: mesh.extrusionDepth,
    thickness: mesh.thickness,
    bevel: mesh.bevel,
    twist: mesh.twist,
    taper: mesh.taper,
    bend: mesh.bend,
    deform: mesh.deform,
    displacementSubdivisionLevel: 0,
  }), [
    mesh.bend,
    mesh.bevel,
    mesh.deform,
    mesh.extrusionDepth,
    mesh.taper,
    mesh.thickness,
    mesh.twist,
  ])

  useEffect(() => {
    geometryOptionsRef.current = {
      extrusionDepth: mesh.extrusionDepth,
      thickness: mesh.thickness,
      bevel: mesh.bevel,
      twist: mesh.twist,
      taper: mesh.taper,
      bend: mesh.bend,
      deform: mesh.deform,
      displacementSubdivisionLevel: 0,
    }
  }, [
    mesh.bend,
    mesh.bevel,
    mesh.deform,
    mesh.extrusionDepth,
    mesh.taper,
    mesh.thickness,
    mesh.twist,
  ])

  useEffect(() => {
    if (svgLoadError) {
      replaceGeometryResult(null, geometryResultRef, setGeometryResult)
      onAsciiStatusChange({
        state: 'error',
        message: svgLoadError,
      })
      return
    }

    if (!svgData) {
      replaceGeometryResult(null, geometryResultRef, setGeometryResult)
      onAsciiStatusChange({
        state: 'loading',
        message: 'Loading 3D ASCII source SVG...',
      })
      return
    }

    try {
      onAsciiStatusChange({
        state: 'loading',
        message: 'Building 3D ASCII mesh...',
      })

      const svg = new SVGLoader().parse(svgData)
      const shapes = svg.paths.flatMap((path) => SVGLoader.createShapes(path))
      const nextGeometryResult = createCharacterMeshGeometries({
        shapes,
        ...geometryOptionsRef.current,
      })

      replaceGeometryResult(nextGeometryResult, geometryResultRef, setGeometryResult)
      onAsciiStatusChange(IDLE_CHARACTER_ASCII_STATUS)
    } catch (error) {
      replaceGeometryResult(null, geometryResultRef, setGeometryResult)
      onAsciiStatusChange({
        state: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to build 3D ASCII character mesh.',
      })
    }
  }, [
    geometrySignature,
    onAsciiStatusChange,
    svgData,
    svgLoadError,
  ])

  useEffect(() => {
    return () => {
      disposeGeometryResult(geometryResultRef.current)
      geometryResultRef.current = null
    }
  }, [])

  const studioRuntime = useMemo(() => compileStudioEffectRuntime({
    selectedEffectId: 'ascii',
    controls: withoutSharedControllerValues(asciiEffectControls),
  }), [asciiEffectControls])
  const repeatTransforms = useMemo(
    () => createCharacterRepeatTransforms(mesh.repeat),
    [mesh.repeat],
  )

  const [material] = useState(() => createAsciiShaderMaterial({
    ascii,
    studioRuntime,
    theme,
    foregroundColor: ascii.foregroundColor,
    backgroundColor: ascii.backgroundColor,
  }))

  useEffect(() => {
    updateAsciiShaderUniforms(material, {
      ascii,
      studioRuntime,
      theme,
      foregroundColor: ascii.foregroundColor,
      backgroundColor: ascii.backgroundColor,
    })
  }, [ascii, material, studioRuntime, theme])

  useEffect(() => {
    materialRef.current = material

    return () => {
      if (materialRef.current === material) {
        materialRef.current = null
      }
      gpuDeformRef.current?.dispose()
      gpuDeformRef.current = null
      disposeAsciiShaderMaterial(material)
    }
  }, [material])

  useEffect(() => {
    if (!geometryResult?.gpuDeformActive) {
      gpuDeformRef.current = null
      return
    }

    const gpuDeform = attachCharacterMeshGpuDeform(material, 'custom')
    gpuDeformRef.current = gpuDeform

    return () => {
      if (gpuDeformRef.current === gpuDeform) {
        gpuDeformRef.current = null
        gpuDeform.dispose()
      }
    }
  }, [geometryResult?.gpuDeformActive, material])

  useCharacterMeshAnimation(gpuDeformRef, mesh.deform, animation)

  useFrame(({ pointer }, delta) => {
    const activeMaterial = materialRef.current
    const effectiveTime = animation.animateShaders
      ? readAnimationTime()
      : animation.timeOffset

    if (exportRender) {
      const previewPointer = readPointer(pointer.x, pointer.y)
      mouseRef.current.set(previewPointer.x, previewPointer.y)
    } else {
      mouseRef.current.set(pointer.x, pointer.y)
      reportPointer(pointer.x, pointer.y)
    }

    if (activeMaterial) {
      const actualWidth = gl.domElement.width || Math.round(size.width * gl.getPixelRatio())
      const actualHeight = gl.domElement.height || Math.round(size.height * gl.getPixelRatio())
      const visualSize = resolveVisualFrameSize('canvas', actualWidth, actualHeight)
      activeMaterial.uniforms.u_time.value = effectiveTime
      activeMaterial.uniforms.u_mouse.value.copy(mouseRef.current)
      activeMaterial.uniforms.u_resolution.value.set(actualWidth, actualHeight)
      activeMaterial.uniforms.u_visualResolution.value.set(visualSize.width, visualSize.height)
    }

    if (groupRef.current) {
      if (mesh.autoRotate && animation.playing) {
        groupRef.current.rotation.y = applyDeltaRotation(
          groupRef.current.rotation.y,
          mesh.autoRotateSpeed * getSignedRotationSpeed(animation.speed, animation.reverse),
          delta,
        )
      }

      reportCharacterRotationY(groupRef.current.rotation.y)

      if (geometryResult?.geometries.length) {
        markExportContentReady()
      }
    }
  })

  if (!geometryResult || geometryResult.geometries.length === 0) {
    return null
  }

  return (
    <group
      ref={groupRef}
      position={[mesh.position.x, mesh.position.y, 0]}
      rotation={[mesh.rotation.x, mesh.rotation.y, mesh.rotation.z]}
      scale={mesh.scale}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 3, 4]} intensity={1.4} />
      {repeatTransforms.map((transform, copyIndex) => (
        <group
          key={copyIndex}
          position={transform.position}
          rotation={[0, transform.rotationY, 0]}
          scale={transform.scale}
        >
          {geometryResult.geometries.map((geometry) => (
            <mesh key={geometry.uuid} geometry={geometry} material={material} />
          ))}
        </group>
      ))}
    </group>
  )
}

function replaceGeometryResult(
  nextResult: CharacterMeshGeometryResult | null,
  resultRef: MutableRefObject<CharacterMeshGeometryResult | null>,
  setGeometryResult: (result: CharacterMeshGeometryResult | null) => void,
) {
  const previousResult = resultRef.current
  resultRef.current = nextResult
  setGeometryResult(nextResult)

  if (previousResult && previousResult !== nextResult) {
    disposeGeometryResult(previousResult)
  }
}

function disposeGeometryResult(result: CharacterMeshGeometryResult | null) {
  for (const geometry of result?.geometries ?? []) {
    geometry.dispose()
  }
}
