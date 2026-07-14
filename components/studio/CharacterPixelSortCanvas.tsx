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
  reportLatestPreviewAnimationTime,
  StudioRenderCanvas as Canvas,
  useStudioRenderMode,
} from '@/components/studio/studio-render-context'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import {
  AmbientLight,
  Color,
  DataTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
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
import { computeEffectiveAnimationTime } from '@/components/studio/animation-time'
import {
  createCharacterMeshGeometries,
  type CharacterMeshGeometryResult,
} from '@/components/studio/character-mesh-geometry'
import {
  type PixelSortSettings,
} from '@/components/studio/pixel-sort-core'
import { readPixelSortSettings } from '@/components/studio/pixel-sort-settings'
import {
  createPixelSortPresentMaterial,
  setPixelSortPresentFrame,
} from '@/components/studio/pixel-sort-present-material'
import {
  PixelSortWorkerClient,
  PixelSortWorkerDisposedError,
  PixelSortWorkerSupersededError,
} from '@/components/studio/pixel-sort-worker-client'
import { applyDeltaRotation } from '@/components/studio/shader-canvas-math'

const PREVIEW_MAX_DIMENSION = 768
const PREVIEW_FRAME_INTERVAL_SECONDS = 1 / 20

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
  const meshSettings = useStudioStore((store) => store.mesh)
  const animation = useStudioStore((store) => store.animation)
  const controls = useStudioStore((store) => store.grainradEffect.controls['pixel-sort'])
  const pixelSortControls = useMemo(
    () => withoutSharedControllerValues(controls),
    [controls],
  )
  const settings = useMemo(
    () => readPixelSortSettings(pixelSortControls),
    [pixelSortControls],
  )
  const settingsRef = useRef(settings)
  const [geometryResult, setGeometryResult] = useState<CharacterMeshGeometryResult | null>(null)
  const geometryResultRef = useRef<CharacterMeshGeometryResult | null>(null)
  const sourceRef = useRef<PixelSortSourceScene | null>(null)
  const workerRef = useRef<PixelSortWorkerClient | null>(null)
  const disposedRef = useRef(false)
  const jobInFlightRef = useRef(false)
  const captureQueuedRef = useRef(true)
  const lastPreviewCaptureRef = useRef(Number.NEGATIVE_INFINITY)
  const lastRequestedExportRef = useRef(0)
  const pendingExportAckRef = useRef(0)
  const acknowledgedExportRef = useRef(0)
  const [presentation] = useState(() => {
    const texture = createPixelSortTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
    return {
      currentTexture: texture,
      material: createPixelSortPresentMaterial(texture),
    }
  })
  const renderTarget = useMemo(() => createPixelSortRenderTarget(), [])

  useEffect(() => {
    settingsRef.current = settings
    captureQueuedRef.current = true
  }, [settings])

  useEffect(() => {
    disposedRef.current = false
    const worker = new PixelSortWorkerClient()
    workerRef.current = worker
    captureQueuedRef.current = true

    return () => {
      disposedRef.current = true
      workerRef.current = null
      worker.dispose()
    }
  }, [])

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
        extrusionDepth: meshSettings.extrusionDepth,
        thickness: meshSettings.thickness,
        bevel: meshSettings.bevel,
        twist: meshSettings.twist,
        taper: meshSettings.taper,
        bend: meshSettings.bend,
        displacementSubdivisionLevel: 0,
      })

      replaceGeometryResult(nextGeometryResult, geometryResultRef, setGeometryResult)
      captureQueuedRef.current = true
    } catch {
      replaceGeometryResult(null, geometryResultRef, setGeometryResult)
    }
  }, [
    meshSettings.bend,
    meshSettings.bevel,
    meshSettings.extrusionDepth,
    meshSettings.taper,
    meshSettings.thickness,
    meshSettings.twist,
    svgData,
    svgLoadError,
  ])

  useEffect(() => {
    return () => {
      disposeCurrentGeometryResult(geometryResultRef)
      presentation.currentTexture.dispose()
      presentation.material.dispose()
      renderTarget.dispose()
    }
  }, [presentation, renderTarget])

  useEffect(() => {
    const nextSource = geometryResult ? createPixelSortSourceScene(geometryResult) : null
    sourceRef.current = nextSource
    captureQueuedRef.current = true

    return () => {
      if (sourceRef.current === nextSource) sourceRef.current = null
      nextSource?.dispose()
    }
  }, [geometryResult])

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
  }, [geometryResult, meshSettings.position, meshSettings.rotation, meshSettings.scale])

  useFrame(({ clock }, delta) => {
    const source = sourceRef.current
    const worker = workerRef.current
    if (!source || !worker) return

    const animationTime = computeEffectiveAnimationTime({
      elapsedSeconds: clock.getElapsedTime(),
      speed: animation.playing ? animation.speed : 0,
      timeOffset: animation.timeOffset,
      playing: animation.playing,
    })
    if (!renderMode.exportRender) reportLatestPreviewAnimationTime(animationTime)

    if (meshSettings.autoRotate && animation.playing && animation.speed > 0) {
      source.group.rotation.y = applyDeltaRotation(
        source.group.rotation.y,
        meshSettings.autoRotateSpeed * animation.speed,
        delta,
      )
      captureQueuedRef.current = true
    }

    const dimensions = getPixelSortDimensions({
      width: size.width * gl.getPixelRatio(),
      height: size.height * gl.getPixelRatio(),
      maxDimension: renderMode.exportRender ? Number.POSITIVE_INFINITY : PREVIEW_MAX_DIMENSION,
    })
    if (renderTarget.width !== dimensions.width || renderTarget.height !== dimensions.height) {
      renderTarget.setSize(dimensions.width, dimensions.height)
      captureQueuedRef.current = true
    }

    const previousTarget = gl.getRenderTarget()
    gl.setRenderTarget(renderTarget)
    gl.clear()
    gl.render(source.scene, camera)
    gl.setRenderTarget(previousTarget)

    const exportCaptureRequested = renderMode.exportRender
      && renderMode.requestId > 0
      && renderMode.requestId !== lastRequestedExportRef.current
    const previewCaptureRequested = !renderMode.exportRender
      && captureQueuedRef.current
      && animationTime - lastPreviewCaptureRef.current >= PREVIEW_FRAME_INTERVAL_SECONDS

    if (
      !jobInFlightRef.current
      && (exportCaptureRequested || previewCaptureRequested)
    ) {
      captureQueuedRef.current = false
      lastPreviewCaptureRef.current = animationTime
      if (exportCaptureRequested) lastRequestedExportRef.current = renderMode.requestId
      void processPixelSortFrame({
        exportRequestId: exportCaptureRequested ? renderMode.requestId : 0,
        gl,
        height: dimensions.height,
        presentation,
        renderTarget,
        settings: settingsRef.current,
        width: dimensions.width,
        worker,
        captureQueuedRef,
        disposedRef,
        jobInFlightRef,
        lastRequestedExportRef,
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
      && requestId !== acknowledgedExportRef.current
    ) {
      acknowledgedExportRef.current = requestId
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

async function processPixelSortFrame({
  exportRequestId,
  gl,
  height,
  presentation,
  renderTarget,
  settings,
  width,
  worker,
  captureQueuedRef,
  disposedRef,
  jobInFlightRef,
  lastRequestedExportRef,
  pendingExportAckRef,
}: {
  exportRequestId: number
  gl: WebGLRenderer
  height: number
  presentation: PixelSortPresentation
  renderTarget: WebGLRenderTarget
  settings: PixelSortSettings
  width: number
  worker: PixelSortWorkerClient
  captureQueuedRef: MutableRefObject<boolean>
  disposedRef: MutableRefObject<boolean>
  jobInFlightRef: MutableRefObject<boolean>
  lastRequestedExportRef: MutableRefObject<number>
  pendingExportAckRef: MutableRefObject<number>
}) {
  jobInFlightRef.current = true
  try {
    const source = new Uint8Array(width * height * 4)
    const pixels = await gl.readRenderTargetPixelsAsync(
      renderTarget,
      0,
      0,
      width,
      height,
      source,
    )
    const result = await worker.render({
      height,
      rgba: pixels.buffer as ArrayBuffer,
      settings,
      width,
    })
    if (disposedRef.current) return

    const nextTexture = createPixelSortTexture(
      new Uint8Array(result.rgba),
      result.width,
      result.height,
    )
    const previousTexture = presentation.currentTexture
    presentation.currentTexture = nextTexture
    setPixelSortPresentFrame(presentation.material, nextTexture)
    previousTexture.dispose()
    pendingExportAckRef.current = exportRequestId
  } catch (error) {
    if (
      !(error instanceof PixelSortWorkerDisposedError)
      && !(error instanceof PixelSortWorkerSupersededError)
    ) {
      captureQueuedRef.current = true
      if (exportRequestId > 0) lastRequestedExportRef.current = 0
    }
  } finally {
    jobInFlightRef.current = false
  }
}

type PixelSortPresentation = {
  currentTexture: DataTexture
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
  dispose: () => void
}

function createPixelSortSourceScene(
  geometryResult: CharacterMeshGeometryResult,
): PixelSortSourceScene {
  const scene = new Scene()
  const group = new Group()
  const material = new MeshStandardMaterial({
    color: new Color('#ffffff'),
    roughness: 0.72,
    metalness: 0.05,
  })
  const directional = new DirectionalLight('#ffffff', 1.4)
  directional.position.set(2, 3, 4)

  scene.background = new Color('#000000')
  scene.add(new AmbientLight('#ffffff', 0.85), directional)

  for (const geometry of geometryResult.geometries) {
    group.add(new Mesh(geometry, material))
  }
  scene.add(group)

  return {
    scene,
    group,
    dispose: () => material.dispose(),
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
