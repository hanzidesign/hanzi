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
  Color,
  Group,
  NearestFilter,
  RGBAFormat,
  Scene,
  UnsignedByteType,
  WebGLRenderTarget,
} from 'three'
import { useStudioStore } from '@/app/studio/studio-store'
import { withoutSharedControllerValues } from './grainrad-shared-controls'
import {
  createCharacterMeshGeometries,
  type CharacterMeshGeometryResult,
} from '@/components/studio/character-mesh-geometry'
import { useCharacterMeshAnimation } from '@/components/studio/character-mesh-animation'
import {
  attachCharacterMeshGpuDeform,
  type CharacterMeshGpuDeformBinding,
} from '@/components/studio/character-mesh-gpu-deform'
import { readPixelSortSettings } from '@/components/studio/pixel-sort-settings'
import {
  createPixelSortPresentMaterial,
  setPixelSortPresentMode,
  setPixelSortPreviewResolution,
  setPixelSortPreviewSettings,
  setPixelSortPreviewSource,
  setPixelSortPreviewTrail,
} from '@/components/studio/pixel-sort-present-material'
import {
  createPixelSortTrailResources,
  disposePixelSortTrailResources,
  renderPixelSortTrails,
  resizePixelSortTrailResources,
  type PixelSortTrailResources,
} from '@/components/studio/pixel-sort-trail-material'
import { applyDeltaRotation } from '@/components/studio/shader-canvas-math'
import {
  addCharacterModelCopies,
  type CharacterRepeatSettings,
} from '@/components/studio/character-model-arrangement'
import { createCharacterModelToneMaterial } from '@/components/studio/character-model-tone-material'

const PIXEL_SORT_PREVIEW_MAX_DIMENSION = 768

export default function CharacterPixelSortCanvas() {
  const svgData = useStudioStore((store) => store.runtime.svgData)
  const svgLoadError = useStudioStore((store) => store.runtime.svgLoadError)
  const state = svgLoadError ? 'error' : svgData ? 'ready' : 'loading'

  return (
    <div
      data-testid="character-pixel-sort-canvas"
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
        <CharacterPixelSortScene svgData={svgData} svgLoadError={svgLoadError} />
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
          {svgLoadError ?? 'Loading selected Character for Pixel Sort...'}
        </div>
      ) : null}
    </div>
  )
}

function CharacterPixelSortScene({
  svgData,
  svgLoadError,
}: {
  svgData: string
  svgLoadError: string | null
}) {
  const { camera, gl, size } = useThree()
  const renderMode = useStudioRenderMode()
  const { reportCharacterRotationY } = renderMode
  const meshSettings = useStudioStore((store) => store.mesh)
  const theme = useStudioStore((store) => store.view.theme)
  const animation = useStudioStore((store) => store.animation)
  const controls = useStudioStore((store) => store.grainradEffect.controls['pixel-sort'])
  const pixelSortControls = useMemo(
    () => withoutSharedControllerValues(controls),
    [controls],
  )
  const settings = useMemo(
    () => readPixelSortSettings(pixelSortControls, theme),
    [pixelSortControls, theme],
  )
  const settingsRef = useRef(settings)
  const [geometryResult, setGeometryResult] = useState<CharacterMeshGeometryResult | null>(null)
  const geometryResultRef = useRef<CharacterMeshGeometryResult | null>(null)
  const sourceRef = useRef<PixelSortSourceScene | null>(null)
  const captureQueuedRef = useRef(true)
  const trailDirtyRef = useRef(true)
  const lastRequestedExportRef = useRef(0)
  const pendingExportAckRef = useRef(0)
  const preparedExportAckRef = useRef(0)
  const renderTarget = useMemo(() => createPixelSortRenderTarget(), [])
  const trailResourcesRef = useRef<PixelSortTrailResources | null>(null)
  const [presentation] = useState(() => {
    return {
      material: createPixelSortPresentMaterial(renderTarget.texture),
    }
  })

  useEffect(() => {
    settingsRef.current = settings
    setPixelSortPreviewSettings(presentation.material, settings)
    trailDirtyRef.current = true
    invalidatePixelSortExport(pendingExportAckRef, lastRequestedExportRef, preparedExportAckRef)
  }, [presentation.material, settings])

  useEffect(() => {
    captureQueuedRef.current = true

    return () => {
      invalidatePixelSortExport(pendingExportAckRef, lastRequestedExportRef, preparedExportAckRef)
      if (trailResourcesRef.current) {
        disposePixelSortTrailResources(trailResourcesRef.current)
        trailResourcesRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (renderMode.exportRender) return
    invalidatePixelSortExport(pendingExportAckRef, lastRequestedExportRef, preparedExportAckRef)
    setPixelSortPresentMode(presentation.material, 'preview')
    setPixelSortPreviewSource(presentation.material, renderTarget.texture)
  }, [renderMode.exportRender, presentation.material, renderTarget.texture])

  useEffect(() => {
    if (!svgData || svgLoadError) {
      replaceGeometryResult(null, geometryResultRef, setGeometryResult)
      invalidatePixelSortExport(pendingExportAckRef, lastRequestedExportRef, preparedExportAckRef)
      return
    }

    try {
      const svg = new SVGLoader().parse(svgData)
      const shapes = svg.paths.flatMap((path) => SVGLoader.createShapes(path))
      const nextGeometryResult = createCharacterMeshGeometries({
        shapes,
        extrusionDepth: meshSettings.extrusionDepth,
        thickness: meshSettings.thickness,
        bevel: meshSettings.bevel,
        twist: meshSettings.twist,
        taper: meshSettings.taper,
        bend: meshSettings.bend,
        deform: meshSettings.deform,
        displacementSubdivisionLevel: 0,
      })

      replaceGeometryResult(nextGeometryResult, geometryResultRef, setGeometryResult)
      captureQueuedRef.current = true
      invalidatePixelSortExport(pendingExportAckRef, lastRequestedExportRef, preparedExportAckRef)
    } catch {
      replaceGeometryResult(null, geometryResultRef, setGeometryResult)
      invalidatePixelSortExport(pendingExportAckRef, lastRequestedExportRef, preparedExportAckRef)
    }
  }, [
    meshSettings.bend,
    meshSettings.bevel,
    meshSettings.extrusionDepth,
    meshSettings.taper,
    meshSettings.thickness,
    meshSettings.twist,
    meshSettings.deform,
    svgData,
    svgLoadError,
  ])

  useEffect(() => {
    return () => {
      disposeCurrentGeometryResult(geometryResultRef)
      presentation.material.dispose()
      renderTarget.dispose()
    }
  }, [presentation, renderTarget])

  useEffect(() => {
    const nextSource = geometryResult
      ? createPixelSortSourceScene(geometryResult, meshSettings.repeat)
      : null
    sourceRef.current = nextSource
    captureQueuedRef.current = true
    invalidatePixelSortExport(pendingExportAckRef, lastRequestedExportRef, preparedExportAckRef)

    return () => {
      if (sourceRef.current === nextSource) sourceRef.current = null
      nextSource?.dispose()
    }
  }, [geometryResult, meshSettings.repeat])

  useEffect(() => {
    const source = sourceRef.current
    if (!source) return

    source.group.position.set(meshSettings.position.x, meshSettings.position.y, 0)
    source.group.rotation.set(
      meshSettings.rotation.x,
      meshSettings.rotation.y,
      meshSettings.rotation.z,
    )
    source.group.scale.setScalar(meshSettings.scale)
    captureQueuedRef.current = true
    invalidatePixelSortExport(pendingExportAckRef, lastRequestedExportRef, preparedExportAckRef)
  }, [geometryResult, meshSettings.position, meshSettings.rotation, meshSettings.scale])

  useCharacterMeshAnimation(sourceRef, meshSettings.deform)

  useFrame((_, delta) => {
    const source = sourceRef.current
    if (!source) return

    if (meshSettings.autoRotate && animation.playing && animation.speed !== 0) {
      source.group.rotation.y = applyDeltaRotation(
        source.group.rotation.y,
        meshSettings.autoRotateSpeed * animation.speed,
        delta,
      )
      captureQueuedRef.current = true
    }

    reportCharacterRotationY(source.group.rotation.y)

    const dimensions = getPixelSortDimensions({
      width: size.width * gl.getPixelRatio(),
      height: size.height * gl.getPixelRatio(),
      maxDimension: renderMode.exportRender
        ? Number.POSITIVE_INFINITY
        : PIXEL_SORT_PREVIEW_MAX_DIMENSION,
    })
    const visualDimensions = renderMode.resolveVisualFrameSize(
      'pixel-sort',
      dimensions.width,
      dimensions.height,
    )
    if (renderTarget.width !== dimensions.width || renderTarget.height !== dimensions.height) {
      renderTarget.setSize(dimensions.width, dimensions.height)
      if (!trailResourcesRef.current) {
        trailResourcesRef.current = createPixelSortTrailResources()
      }
      resizePixelSortTrailResources(
        trailResourcesRef.current,
        dimensions.width,
        dimensions.height,
        settingsRef.current.direction,
      )
      trailDirtyRef.current = true
      captureQueuedRef.current = true
      invalidatePixelSortExport(pendingExportAckRef, lastRequestedExportRef, preparedExportAckRef)
    }
    setPixelSortPreviewResolution(
      presentation.material,
      dimensions.width,
      dimensions.height,
      visualDimensions.width,
      visualDimensions.height,
    )

    const exportCaptureRequested = renderMode.exportRender
      && renderMode.requestId > 0
      && renderMode.requestId !== lastRequestedExportRef.current

    // Source capture is demand-driven. Settings update uniforms only; source
    // rendering is reserved for dirty geometry, transforms, resize, export,
    // auto-rotation, and active GPU Model Deform animation.
    const animated = (meshSettings.autoRotate && animation.playing && animation.speed !== 0)
      || (source.gpuDeform !== null && animation.playing && animation.speed !== 0)
    const sourceNeedsRender = captureQueuedRef.current || animated || exportCaptureRequested
    if (sourceNeedsRender) {
      const previousTarget = gl.getRenderTarget()
      gl.setRenderTarget(renderTarget)
      gl.clear()
      gl.render(source.scene, camera)
      gl.setRenderTarget(previousTarget)
      captureQueuedRef.current = false
      trailDirtyRef.current = true
    }

    // Preview and export sample the same render target and GPU trail directly;
    // neither path uses a worker or renderer readback.
    setPixelSortPreviewSource(presentation.material, renderTarget.texture)

    if (trailDirtyRef.current) {
      const trailResources = trailResourcesRef.current ?? createPixelSortTrailResources()
      trailResourcesRef.current = trailResources
      if (trailResources.width !== dimensions.width || trailResources.height !== dimensions.height) {
        resizePixelSortTrailResources(
          trailResources,
          dimensions.width,
          dimensions.height,
          settingsRef.current.direction,
        )
      }
      const trail = renderPixelSortTrails(
        gl,
        trailResources,
        renderTarget.texture,
        settingsRef.current,
      )
      if (trail) {
        setPixelSortPreviewTrail(presentation.material, trail.texture, {
          available: true,
          radial: trail.radial,
          maxRadius: trail.dimensions?.maxRadius,
          angularBins: trail.dimensions?.angularBins,
          radialBins: trail.dimensions?.radialBins,
        })
      } else {
        setPixelSortPreviewTrail(presentation.material, renderTarget.texture, {
          available: false,
        })
      }
      trailDirtyRef.current = false
    }

    if (exportCaptureRequested) {
      lastRequestedExportRef.current = renderMode.requestId
      setPixelSortPresentMode(presentation.material, 'preview')
      preparedExportAckRef.current = renderMode.requestId
    } else if (
      renderMode.exportRender
      && preparedExportAckRef.current === renderMode.requestId
      && !trailDirtyRef.current
    ) {
      preparedExportAckRef.current = 0
      pendingExportAckRef.current = renderMode.requestId
    }
  }, -1)

  useFrame(({ gl }) => {
    const requestId = pendingExportAckRef.current
    if (
      renderMode.exportRender
      && requestId > 0
      && requestId === renderMode.requestId
    ) {
      pendingExportAckRef.current = 0
      renderMode.onFrameRendered?.(requestId, gl.domElement)
    }
  }, 2)

  if (!geometryResult) return null

  return (
    <mesh frustumCulled={false} material={presentation.material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

function invalidatePixelSortExport(
  pendingExportAckRef: MutableRefObject<number>,
  lastRequestedExportRef: MutableRefObject<number>,
  preparedExportAckRef: MutableRefObject<number>,
) {
  pendingExportAckRef.current = 0
  lastRequestedExportRef.current = 0
  preparedExportAckRef.current = 0
}

function createPixelSortRenderTarget() {
  const renderTarget = new WebGLRenderTarget(1, 1, {
    depthBuffer: true,
    format: RGBAFormat,
    magFilter: NearestFilter,
    minFilter: NearestFilter,
    type: UnsignedByteType,
  })
  renderTarget.texture.generateMipmaps = false
  return renderTarget
}

export function getPixelSortDimensions({
  width,
  height,
  maxDimension,
}: {
  width: number
  height: number
  maxDimension: number
}) {
  const safeWidth = Math.max(1, Math.round(width))
  const safeHeight = Math.max(1, Math.round(height))
  const scale = Number.isFinite(maxDimension)
    ? Math.min(1, maxDimension / Math.max(safeWidth, safeHeight))
    : 1
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  }
}

type PixelSortSourceScene = {
  scene: Scene
  group: Group
  gpuDeform: CharacterMeshGpuDeformBinding | null
  dispose: () => void
}

export function createPixelSortSourceScene(
  geometryResult: CharacterMeshGeometryResult,
  repeat: CharacterRepeatSettings,
): PixelSortSourceScene {
  const scene = new Scene()
  const group = new Group()
  const material = createCharacterModelToneMaterial({ encodeDepthAlpha: true })
  const gpuDeform = geometryResult.gpuDeformActive
    ? attachCharacterMeshGpuDeform(material, 'custom')
    : null

  scene.background = new Color('#000000')

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

  if (previousResult && previousResult !== nextResult) disposeGeometryResult(previousResult)
}

function disposeGeometryResult(result: CharacterMeshGeometryResult | null) {
  for (const geometry of result?.geometries ?? []) geometry.dispose()
}

function disposeCurrentGeometryResult(
  resultRef: MutableRefObject<CharacterMeshGeometryResult | null>,
) {
  disposeGeometryResult(resultRef.current)
  resultRef.current = null
}
