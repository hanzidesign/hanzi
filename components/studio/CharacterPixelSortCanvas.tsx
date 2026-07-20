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
  DataTexture,
  Group,
  NearestFilter,
  RGBAFormat,
  Scene,
  UnsignedByteType,
  WebGLRenderTarget,
  type ShaderMaterial,
  type WebGLRenderer,
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
import {
  type PixelSortSettings,
} from '@/components/studio/pixel-sort-core'
import { readPixelSortSettings } from '@/components/studio/pixel-sort-settings'
import {
  createPixelSortPresentMaterial,
  setPixelSortExactFrame,
  setPixelSortPresentMode,
  setPixelSortPreviewResolution,
  setPixelSortPreviewSettings,
  setPixelSortPreviewSource,
} from '@/components/studio/pixel-sort-present-material'
import {
  PixelSortWorkerClient,
} from '@/components/studio/pixel-sort-worker-client'
import {
  createPixelSortExportGenerationCoordinator,
  type PixelSortExportGenerationCoordinator,
} from '@/components/studio/pixel-sort-export-generation'
import { applyDeltaRotation } from '@/components/studio/shader-canvas-math'
import {
  addCharacterModelCopies,
  type CharacterRepeatSettings,
} from '@/components/studio/character-model-arrangement'
import { createCharacterModelToneMaterial } from '@/components/studio/character-model-tone-material'

const PREVIEW_MAX_DIMENSION = 768

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
  const workerRef = useRef<PixelSortWorkerClient | null>(null)
  const disposedRef = useRef(false)
  const captureQueuedRef = useRef(true)
  const lastRequestedExportRef = useRef(0)
  const pendingExportAckRef = useRef(0)
  const [generation] = useState(() => createPixelSortExportGenerationCoordinator<
    Uint8Array,
    { rgba: ArrayBuffer; width: number; height: number },
    DataTexture
  >())
  const renderTarget = useMemo(() => createPixelSortRenderTarget(), [])
  const [presentation] = useState(() => {
    return {
      currentTexture: renderTarget.texture,
      material: createPixelSortPresentMaterial(renderTarget.texture),
    }
  })

  useEffect(() => {
    settingsRef.current = settings
    setPixelSortPreviewSettings(presentation.material, settings)
    invalidatePixelSortExport(generation, pendingExportAckRef, lastRequestedExportRef)
  }, [generation, presentation.material, settings])

  useEffect(() => {
    disposedRef.current = false
    captureQueuedRef.current = true

    return () => {
      disposedRef.current = true
      invalidatePixelSortExport(generation, pendingExportAckRef, lastRequestedExportRef)
      workerRef.current?.dispose()
      workerRef.current = null
    }
  }, [generation])

  useEffect(() => {
    if (renderMode.exportRender) return
    invalidatePixelSortExport(generation, pendingExportAckRef, lastRequestedExportRef)
    setPixelSortPresentMode(presentation.material, 'preview')
    setPixelSortPreviewSource(presentation.material, renderTarget.texture)
  }, [generation, renderMode.exportRender, presentation.material, renderTarget.texture])

  useEffect(() => {
    if (!svgData || svgLoadError) {
      replaceGeometryResult(null, geometryResultRef, setGeometryResult)
      invalidatePixelSortExport(generation, pendingExportAckRef, lastRequestedExportRef)
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
      invalidatePixelSortExport(generation, pendingExportAckRef, lastRequestedExportRef)
    } catch {
      replaceGeometryResult(null, geometryResultRef, setGeometryResult)
      invalidatePixelSortExport(generation, pendingExportAckRef, lastRequestedExportRef)
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
    generation,
  ])

  useEffect(() => {
    return () => {
      disposeCurrentGeometryResult(geometryResultRef)
      if (presentation.currentTexture !== renderTarget.texture) presentation.currentTexture.dispose()
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
    invalidatePixelSortExport(generation, pendingExportAckRef, lastRequestedExportRef)

    return () => {
      if (sourceRef.current === nextSource) sourceRef.current = null
      nextSource?.dispose()
    }
  }, [generation, geometryResult, meshSettings.repeat])

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
    invalidatePixelSortExport(generation, pendingExportAckRef, lastRequestedExportRef)
  }, [generation, geometryResult, meshSettings.position, meshSettings.rotation, meshSettings.scale])

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
      maxDimension: renderMode.exportRender ? Number.POSITIVE_INFINITY : PREVIEW_MAX_DIMENSION,
    })
    if (renderTarget.width !== dimensions.width || renderTarget.height !== dimensions.height) {
      renderTarget.setSize(dimensions.width, dimensions.height)
      captureQueuedRef.current = true
      setPixelSortPreviewResolution(presentation.material, dimensions.width, dimensions.height)
      invalidatePixelSortExport(generation, pendingExportAckRef, lastRequestedExportRef)
    }

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
    }

    // The preview samples the render target texture directly. No worker,
    // readback, or DataTexture is involved in this path.
    setPixelSortPreviewSource(presentation.material, renderTarget.texture)

    if (exportCaptureRequested) {
      lastRequestedExportRef.current = renderMode.requestId
      setPixelSortPresentMode(presentation.material, 'preview')
      const worker = workerRef.current ?? new PixelSortWorkerClient()
      workerRef.current = worker
      void processPixelSortExport({
        gl,
        height: dimensions.height,
        presentation,
        renderTarget,
        settings: settingsRef.current,
        width: dimensions.width,
        worker,
        captureQueuedRef,
        disposedRef,
        generation,
        lastRequestedExportRef,
        requestId: renderMode.requestId,
        pendingExportAckRef,
      })
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
  generation: PixelSortExportGenerationCoordinator<
    Uint8Array,
    { rgba: ArrayBuffer; width: number; height: number },
    DataTexture
  >,
  pendingExportAckRef: MutableRefObject<number>,
  lastRequestedExportRef: MutableRefObject<number>,
) {
  generation.invalidate()
  pendingExportAckRef.current = 0
  lastRequestedExportRef.current = 0
}

function processPixelSortExport({
  requestId,
  gl,
  height,
  presentation,
  renderTarget,
  settings,
  width,
  worker,
  captureQueuedRef,
  disposedRef,
  generation,
  lastRequestedExportRef,
  pendingExportAckRef,
}: {
  requestId: number
  gl: WebGLRenderer
  height: number
  presentation: PixelSortPresentation
  renderTarget: WebGLRenderTarget
  settings: PixelSortSettings
  width: number
  worker: PixelSortWorkerClient
  captureQueuedRef: MutableRefObject<boolean>
  disposedRef: MutableRefObject<boolean>
  generation: PixelSortExportGenerationCoordinator<
    Uint8Array,
    { rgba: ArrayBuffer; width: number; height: number },
    DataTexture
  >
  lastRequestedExportRef: MutableRefObject<number>
  pendingExportAckRef: MutableRefObject<number>
}) {
  void generation.request({
    requestId,
    readback: async () => {
      const source = new Uint8Array(width * height * 4)
      const pixels = await gl.readRenderTargetPixelsAsync(
        renderTarget,
        0,
        0,
        width,
        height,
        source,
      )
      return pixels as Uint8Array
    },
    render: async (pixels) => worker.render({
      height,
      rgba: pixels.buffer as ArrayBuffer,
      settings,
      width,
    }),
    createTexture: (result) => createPixelSortTexture(
      new Uint8Array(result.rgba),
      result.width,
      result.height,
    ),
    present: (nextTexture) => {
      const previousTexture = presentation.currentTexture
      presentation.currentTexture = nextTexture
      setPixelSortExactFrame(presentation.material, nextTexture)
      setPixelSortPresentMode(presentation.material, 'exact')
      if (previousTexture !== renderTarget.texture) previousTexture.dispose()
    },
    acknowledge: () => {
      if (!disposedRef.current) pendingExportAckRef.current = requestId
    },
    onError: () => {
      lastRequestedExportRef.current = 0
      captureQueuedRef.current = true
    },
  })
}

type PixelSortPresentation = {
  currentTexture: DataTexture | WebGLRenderTarget['texture']
  material: ShaderMaterial
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

function createPixelSortTexture(data: Uint8Array, width: number, height: number) {
  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType)
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
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
  const material = createCharacterModelToneMaterial()
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
