'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { StudioRenderCanvas as Canvas } from '@/components/studio/studio-render-context'
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
import { withoutSharedControllerValues } from './grainrad-shared-controls'
import { computeEffectiveAnimationTime } from '@/components/studio/animation-time'
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
  MATRIX_RAIN_CHARACTER_SETS,
  createMatrixRainGlyphAtlas,
  disposeMatrixRainGlyphAtlas,
  type MatrixRainCharacterSetId,
} from '@/components/studio/matrix-rain-charset'
import {
  applyMatrixRainUniforms,
  createMatrixRainShaderMaterial,
  disposeMatrixRainShaderMaterial,
} from '@/components/studio/matrix-rain-material'
import { applyDeltaRotation } from '@/components/studio/shader-canvas-math'
import {
  addCharacterModelCopies,
  type CharacterRepeatSettings,
} from '@/components/studio/character-model-arrangement'

export default function CharacterMatrixRainCanvas() {
  const svgData = useStudioStore((store) => store.runtime.svgData)
  const svgLoadError = useStudioStore((store) => store.runtime.svgLoadError)
  const state = svgLoadError ? 'error' : svgData ? 'ready' : 'loading'

  return (
    <div
      data-testid="character-matrix-rain-canvas"
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
        <CharacterMatrixRainScene svgData={svgData} svgLoadError={svgLoadError} />
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
          {svgLoadError ?? 'Loading selected Character for Matrix Rain...'}
        </div>
      ) : null}
    </div>
  )
}

function CharacterMatrixRainScene({
  svgData,
  svgLoadError,
}: {
  svgData: string
  svgLoadError: string | null
}) {
  const { camera, gl, size } = useThree()
  const meshSettings = useStudioStore((store) => store.mesh)
  const animation = useStudioStore((store) => store.animation)
  const controls = useStudioStore((store) => store.grainradEffect.controls['matrix-rain'])
  const selectedCharacterSet = typeof controls['character-set'] === 'string'
    ? controls['character-set']
    : 'standard'
  const characterSet: MatrixRainCharacterSetId = selectedCharacterSet in MATRIX_RAIN_CHARACTER_SETS
    ? selectedCharacterSet as MatrixRainCharacterSetId
    : 'standard'
  const customChars = typeof controls['custom-chars'] === 'string'
    ? controls['custom-chars']
    : ''
  const [geometryResult, setGeometryResult] = useState<CharacterMeshGeometryResult | null>(null)
  const geometryResultRef = useRef<CharacterMeshGeometryResult | null>(null)
  const sourceRef = useRef<MatrixRainSourceScene | null>(null)
  const materialRef = useRef<ShaderMaterial | null>(null)
  const renderTarget = useMemo(() => new WebGLRenderTarget(1, 1, { depthBuffer: true }), [])
  const glyphAtlas = useMemo(
    () => createMatrixRainGlyphAtlas(characterSet, customChars),
    [characterSet, customChars],
  )

  useEffect(() => {
    return () => disposeMatrixRainGlyphAtlas(glyphAtlas)
  }, [glyphAtlas])

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
        deform: meshSettings.deform,
        displacementSubdivisionLevel: 0,
      })

      replaceGeometryResult(nextGeometryResult, geometryResultRef, setGeometryResult)
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
    meshSettings.deform,
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
      ? createMatrixRainSourceScene(geometryResult, meshSettings.repeat)
      : null
    sourceRef.current = nextSource

    return () => {
      if (sourceRef.current === nextSource) {
        sourceRef.current = null
      }
      nextSource?.dispose()
    }
  }, [geometryResult, meshSettings.repeat])

  const material = useMemo(() => createMatrixRainShaderMaterial({
    controls: {},
    sourceTexture: renderTarget.texture,
    glyphAtlas,
    sourceSize: new Vector2(1, 1),
    resolution: new Vector2(1, 1),
  }), [glyphAtlas, renderTarget.texture])

  useEffect(() => {
    materialRef.current = material
    return () => {
      if (materialRef.current === material) {
        materialRef.current = null
      }
      disposeMatrixRainShaderMaterial(material)
    }
  }, [material])

  useEffect(() => {
    applyMatrixRainUniforms(material, withoutSharedControllerValues(controls), glyphAtlas)
  }, [controls, glyphAtlas, material])

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
  }, [geometryResult, meshSettings.position, meshSettings.rotation, meshSettings.scale])

  useCharacterMeshAnimation(sourceRef, meshSettings.deform, animation)

  useFrame(({ clock }, delta) => {
    const source = sourceRef.current
    if (!source) {
      return
    }

    if (meshSettings.autoRotate && animation.playing && animation.speed !== 0) {
      source.group.rotation.y = applyDeltaRotation(
        source.group.rotation.y,
        meshSettings.autoRotateSpeed * animation.speed,
        delta,
      )
    }

    const pixelRatio = gl.getPixelRatio()
    const width = Math.max(1, Math.round(size.width * pixelRatio))
    const height = Math.max(1, Math.round(size.height * pixelRatio))

    if (renderTarget.width !== width || renderTarget.height !== height) {
      renderTarget.setSize(width, height)
    }

    const previousTarget = gl.getRenderTarget()
    gl.setRenderTarget(renderTarget)
    gl.clear()
    gl.render(source.scene, camera)
    gl.setRenderTarget(previousTarget)

    const activeMaterial = materialRef.current
    if (activeMaterial) {
      activeMaterial.uniforms.u_sourceSize.value.set(width, height)
      activeMaterial.uniforms.u_resolution.value.set(width, height)
      activeMaterial.uniforms.u_time.value = computeEffectiveAnimationTime({
        elapsedSeconds: clock.getElapsedTime(),
        speed: animation.playing ? animation.speed : 0,
        timeOffset: animation.timeOffset,
        playing: animation.playing,
      })
    }
  }, -1)

  if (!geometryResult) {
    return null
  }

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

type MatrixRainSourceScene = {
  scene: Scene
  group: Group
  gpuDeform: CharacterMeshGpuDeformBinding | null
  dispose: () => void
}

function createMatrixRainSourceScene(
  geometryResult: CharacterMeshGeometryResult,
  repeat: CharacterRepeatSettings,
): MatrixRainSourceScene {
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
