'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  StudioRenderCanvas as Canvas,
  useStudioRenderMode,
} from '@/components/studio/studio-render-context'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  MeshStandardMaterial,
  Scene,
  Vector2,
  WebGLRenderTarget,
  type ShaderMaterial,
} from 'three'
import { useStudioStore } from '@/app/studio/studio-store'
import {
  createSourceRenderInvalidationState,
  markSourceRenderDirty,
  markSourceRenderRendered,
  shouldRenderSource,
} from './source-render-dirty'
import { withoutSharedControllerValues } from './studio-shared-controls'
import {
  applyEdgeDetectionUniforms,
  createEdgeDetectionShaderMaterial,
  disposeEdgeDetectionShaderMaterial,
} from '@/components/studio/edge-detection-material'
import {
  createCharacterMeshGeometries,
  type CharacterMeshGeometryResult,
} from '@/components/studio/character-mesh-geometry'
import { deriveCharacterMeshGeometrySignature } from '@/components/studio/character-mesh-geometry-signature'
import { useCharacterMeshAnimation } from '@/components/studio/character-mesh-animation'
import {
  attachCharacterMeshGpuDeform,
  type CharacterMeshGpuDeformBinding,
} from '@/components/studio/character-mesh-gpu-deform'
import { applyDeltaRotation } from '@/components/studio/shader-canvas-math'
import { getSignedRotationSpeed } from '@/components/studio/motion-speed'
import {
  addCharacterModelCopies,
  type CharacterRepeatSettings,
} from '@/components/studio/character-model-arrangement'

export default function CharacterEdgeDetectionCanvas() {
  const svgData = useStudioStore((store) => store.runtime.svgData)
  const svgLoadError = useStudioStore((store) => store.runtime.svgLoadError)
  const state = svgLoadError ? 'error' : svgData ? 'ready' : 'loading'

  return (
    <div
      data-testid="character-edge-detection-canvas"
      data-state={state}
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
        gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true }}
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#000000']} />
        <CharacterEdgeDetectionScene svgData={svgData} svgLoadError={svgLoadError} />
      </Canvas>
      {state !== 'ready' ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            color: svgLoadError ? 'var(--studio-danger)' : 'var(--studio-text-dim)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {svgLoadError ?? 'Loading selected Character for Edge Detection...'}
        </div>
      ) : null}
    </div>
  )
}

function CharacterEdgeDetectionScene({
  svgData,
  svgLoadError,
}: {
  svgData: string
  svgLoadError: string | null
}) {
  const { camera, gl, size } = useThree()
  const meshSettings = useStudioStore((store) => store.mesh)
  const animation = useStudioStore((store) => store.animation)
  const {
    exportRender,
    requestId,
    markExportContentReady,
    readAnimationTime,
    reportCharacterRotationY,
    resolveVisualFrameSize,
  } = useStudioRenderMode()
  const controls = useStudioStore((store) => store.studioEffect.controls['edge-detection'])
  const [geometryResult, setGeometryResult] = useState<CharacterMeshGeometryResult | null>(null)
  const geometryResultRef = useRef<CharacterMeshGeometryResult | null>(null)
  const sourceRef = useRef<EdgeDetectionSourceScene | null>(null)
  const materialRef = useRef<ShaderMaterial | null>(null)
  const renderTarget = useMemo(() => new WebGLRenderTarget(1, 1, { depthBuffer: true }), [])
  const sourceRenderStateRef = useRef(createSourceRenderInvalidationState())
  const geometryOptionsRef = useRef({
    extrusionDepth: meshSettings.extrusionDepth,
    thickness: meshSettings.thickness,
    bevel: meshSettings.bevel,
    twist: meshSettings.twist,
    taper: meshSettings.taper,
    bend: meshSettings.bend,
    deform: meshSettings.deform,
    displacementSubdivisionLevel: 0,
  })
  const geometrySignature = deriveCharacterMeshGeometrySignature({
    ...meshSettings,
    displacementSubdivisionLevel: 0,
  })

  useEffect(() => {
    geometryOptionsRef.current = {
      extrusionDepth: meshSettings.extrusionDepth,
      thickness: meshSettings.thickness,
      bevel: meshSettings.bevel,
      twist: meshSettings.twist,
      taper: meshSettings.taper,
      bend: meshSettings.bend,
      deform: meshSettings.deform,
      displacementSubdivisionLevel: 0,
    }
  }, [
    meshSettings.bend,
    meshSettings.bevel,
    meshSettings.deform,
    meshSettings.extrusionDepth,
    meshSettings.taper,
    meshSettings.thickness,
    meshSettings.twist,
  ])

  useEffect(() => {
    if (!svgData || svgLoadError) {
      replaceGeometryResult(null, geometryResultRef, setGeometryResult)
      return
    }

    try {
      const svg = new SVGLoader().parse(svgData)
      const shapes = svg.paths.flatMap((path) => SVGLoader.createShapes(path))
      const nextGeometryResult = createCharacterMeshGeometries({
        shapes,
        ...geometryOptionsRef.current,
      })

      replaceGeometryResult(nextGeometryResult, geometryResultRef, setGeometryResult)
    } catch {
      replaceGeometryResult(null, geometryResultRef, setGeometryResult)
    }
  }, [
    geometrySignature,
    svgData,
    svgLoadError,
  ])

  useEffect(() => {
    return () => {
      disposeCurrentGeometryResult(geometryResultRef)
      renderTarget.dispose()
    }
  }, [renderTarget])

  useEffect(() => {
    const nextSource = geometryResult
      ? createEdgeDetectionSourceScene(geometryResult, meshSettings.repeat)
      : null
    sourceRef.current = nextSource
    markSourceRenderDirty(sourceRenderStateRef.current)

    return () => {
      if (sourceRef.current === nextSource) {
        sourceRef.current = null
      }
      nextSource?.dispose()
    }
  }, [geometryResult, meshSettings.repeat])

  const material = useMemo(() => createEdgeDetectionShaderMaterial({
    controls: {},
    sourceTexture: renderTarget.texture,
    sourceSize: new Vector2(1, 1),
    resolution: new Vector2(1, 1),
  }), [renderTarget.texture])

  useEffect(() => {
    materialRef.current = material
    return () => {
      if (materialRef.current === material) {
        materialRef.current = null
      }
      disposeEdgeDetectionShaderMaterial(material)
    }
  }, [material])

  useEffect(() => {
applyEdgeDetectionUniforms(material, withoutSharedControllerValues(controls))
  }, [controls, material])

  useEffect(() => {
    const source = sourceRef.current
    if (!source) {
      return
    }

    source.group.position.set(meshSettings.position.x, meshSettings.position.y, 0)
    source.group.rotation.set(
      meshSettings.rotation.x,
      meshSettings.rotation.y,
      meshSettings.rotation.z,
    )
    source.group.scale.setScalar(meshSettings.scale)
    markSourceRenderDirty(sourceRenderStateRef.current)
  }, [geometryResult, meshSettings.position, meshSettings.rotation, meshSettings.scale])

  useEffect(() => {
    markSourceRenderDirty(sourceRenderStateRef.current)
  }, [meshSettings.deform])

  useCharacterMeshAnimation(sourceRef, meshSettings.deform)

  useFrame((_, delta) => {
    const source = sourceRef.current
    if (!source || geometryResult?.geometries.length === 0) {
      return
    }

    if (meshSettings.autoRotate && animation.playing) {
      source.group.rotation.y = applyDeltaRotation(
        source.group.rotation.y,
        meshSettings.autoRotateSpeed * getSignedRotationSpeed(animation.speed, animation.reverse),
        delta,
      )
    }

    reportCharacterRotationY(source.group.rotation.y)

    const pixelRatio = gl.getPixelRatio()
    const width = Math.max(1, Math.round(size.width * pixelRatio))
    const height = Math.max(1, Math.round(size.height * pixelRatio))
    const visual = resolveVisualFrameSize('canvas', width, height)

    const sourceResized = renderTarget.width !== width || renderTarget.height !== height
    if (sourceResized) {
      renderTarget.setSize(width, height)
      markSourceRenderDirty(sourceRenderStateRef.current)
    }

    const sourceNeedsRender = shouldRenderSource(sourceRenderStateRef.current, {
      animationPlaying: animation.playing,
      autoRotateActive: meshSettings.autoRotate,
      gpuDeformActive: source.gpuDeform !== null,
      exportRender,
      requestId,
    })
    if (sourceNeedsRender) {
      const previousTarget = gl.getRenderTarget()
      gl.setRenderTarget(renderTarget)
      gl.clear()
      gl.render(source.scene, camera)
      gl.setRenderTarget(previousTarget)
      markSourceRenderRendered(sourceRenderStateRef.current, { exportRender, requestId })
      markExportContentReady()
    }

    const activeMaterial = materialRef.current
    if (activeMaterial) {
      activeMaterial.uniforms.u_sourceSize.value.set(width, height)
      activeMaterial.uniforms.u_resolution.value.set(visual.width, visual.height)
      activeMaterial.uniforms.u_time.value = readAnimationTime()
    }
  }, -1)

  if (!geometryResult || geometryResult.geometries.length === 0) {
    return null
  }

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

type EdgeDetectionSourceScene = {
  scene: Scene
  group: Group
  gpuDeform: CharacterMeshGpuDeformBinding | null
  dispose: () => void
}

function createEdgeDetectionSourceScene(
  geometryResult: CharacterMeshGeometryResult,
  repeat: CharacterRepeatSettings,
): EdgeDetectionSourceScene {
  const scene = new Scene()
  const group = new Group()
  const material = new MeshStandardMaterial({
    color: new Color('#ffffff'),
    roughness: 0.72,
    metalness: 0.05,
  })
  const gpuDeform = geometryResult.gpuDeformActive
    ? attachCharacterMeshGpuDeform(material, 'standard')
    : null
  const directional = new DirectionalLight('#ffffff', 1.4)
  directional.position.set(2, 3, 4)

  scene.background = new Color('#000000')
  scene.add(new AmbientLight('#ffffff', 0.85), directional)

  addCharacterModelCopies(group, geometryResult.geometries, material, repeat)
  scene.add(group)

  return {
    scene,
    group,
    gpuDeform,
    dispose: () => {
      gpuDeform?.dispose()
      material.dispose()
    },
  }
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

function disposeCurrentGeometryResult(
  resultRef: MutableRefObject<CharacterMeshGeometryResult | null>,
) {
  disposeGeometryResult(resultRef.current)
  resultRef.current = null
}
