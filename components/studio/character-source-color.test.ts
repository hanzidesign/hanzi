import { afterEach, describe, expect, it } from 'vitest'
import { BoxGeometry, Color, Mesh, ShaderMaterial, Vector3 } from 'three'

import {
  applyNoiseFieldSourceColors,
  createNoiseFieldSourceScene,
  type NoiseFieldSourceColors,
} from './CharacterNoiseFieldCanvas'
import {
  applyVhsSourceBackground,
  createVhsSourceScene,
} from './CharacterVhsCanvas'
import {
  createVoronoiSourceScene,
} from './CharacterVoronoiCanvas'
import { CHARACTER_MODEL_TONE_FRAGMENT_SHADER } from './character-model-tone-material'
import type { CharacterMeshGeometryResult } from './character-mesh-geometry'
import type { CharacterRepeatSettings } from './character-model-arrangement'

const repeat: CharacterRepeatSettings = {
  enabled: false,
  count: 6,
  radius: 1.25,
  orientation: 90,
  size: 0.5,
}

const sourceColors: NoiseFieldSourceColors = {
  foreground: '#123456',
  background: '#abcdef',
}

const geometries: BoxGeometry[] = []

describe('Pixel Sort and Noise Field source colors', () => {
  afterEach(() => {
    geometries.splice(0).forEach((geometry) => geometry.dispose())
  })

  it('keeps the white/black source defaults byte-compatible', () => {
    const result = createGeometryResult()
    const noiseSource = createNoiseFieldSourceScene(result, repeat)

    expect(findSourceMesh(noiseSource.scene).material.color.getHexString()).toBe('ffffff')
    expect((noiseSource.scene.background as Color).getHexString()).toBe('000000')

    noiseSource.dispose()
  })

  it('keeps Noise Field source colors live without resetting transforms', () => {
    const result = createGeometryResult()
    const noiseSource = createNoiseFieldSourceScene(result, repeat)

    noiseSource.group.position.set(-1, -2, -3)
    noiseSource.group.rotation.set(0.4, 0.5, 0.6)
    noiseSource.group.scale.setScalar(0.75)

    applyNoiseFieldSourceColors(noiseSource, sourceColors)

    expect(noiseSource.group.position.toArray()).toEqual([-1, -2, -3])
    expect(noiseSource.group.rotation.toArray().slice(0, 3)).toEqual([0.4, 0.5, 0.6])
    expect(noiseSource.group.scale.toArray()).toEqual([0.75, 0.75, 0.75])
    expect(noiseSource.material.color.getHexString()).toBe('123456')
    expect((noiseSource.scene.background as Color).getHexString()).toBe('abcdef')

    noiseSource.dispose()
  })

  it('updates the VHS source background while keeping the Voronoi mask background fixed', () => {
    const result = createGeometryResult()
    const vhs = createVhsSourceScene(result, repeat)
    const voronoi = createVoronoiSourceScene(result, repeat)
    const vhsScene = vhs.scene
    const vhsColor = vhsScene.background
    const vhsGroup = vhs.group
    const voronoiScene = voronoi.scene
    const voronoiGroup = voronoi.group

    vhs.group.position.set(1, 2, 3)
    voronoi.group.position.set(-1, -2, -3)
    applyVhsSourceBackground(vhs, '#123456')

    expect(vhs.scene).toBe(vhsScene)
    expect(vhs.scene.background).toBe(vhsColor)
    expect(vhs.group).toBe(vhsGroup)
    expect((vhs.scene.background as Color).getHexString()).toBe('123456')
    expect(vhs.group.position.toArray()).toEqual([1, 2, 3])
    expect(voronoi.scene).toBe(voronoiScene)
    expect(voronoi.group).toBe(voronoiGroup)
    expect((voronoi.scene.background as Color).getHexString()).toBe('000000')
    expect(voronoi.group.position.toArray()).toEqual([-1, -2, -3])

    const recreatedVhs = createVhsSourceScene(result, repeat)
    const recreatedVoronoi = createVoronoiSourceScene(result, repeat)
    applyVhsSourceBackground(recreatedVhs, '#654321')
    expect((recreatedVhs.scene.background as Color).getHexString()).toBe('654321')
    expect((recreatedVoronoi.scene.background as Color).getHexString()).toBe('000000')

    vhs.dispose()
    voronoi.dispose()
    recreatedVhs.dispose()
    recreatedVoronoi.dispose()
  })

  it('derives Voronoi model tone from camera distance and view-space normals', () => {
    const source = createVoronoiSourceScene(createGeometryResult(), repeat)
    const material = findSourceMesh(source.scene).material
    expect(material).toBeInstanceOf(ShaderMaterial)
    expect(CHARACTER_MODEL_TONE_FRAGMENT_SHADER).toContain(
      'smoothstep(3.2, 5.8, v_cameraDistance)',
    )
    expect(CHARACTER_MODEL_TONE_FRAGMENT_SHADER).toContain('dot(normalize(v_viewNormal)')
    source.dispose()
  })
})

function createGeometryResult(): CharacterMeshGeometryResult {
  const geometry = new BoxGeometry(1, 1, 1)
  geometries.push(geometry)
  return {
    geometries: [geometry],
    boundsMin: new Vector3(-0.5, -0.5, -0.5),
    boundsMax: new Vector3(0.5, 0.5, 0.5),
    shaderBoundsMin: new Vector3(-0.5, -0.5, -0.5),
    shaderBoundsMax: new Vector3(0.5, 0.5, 0.5),
    gpuDeformActive: false,
  }
}

function findSourceMesh(scene: { getObjectByProperty: (property: string, value: unknown) => unknown }) {
  const mesh = scene.getObjectByProperty('type', 'Mesh')
  if (!(mesh instanceof Mesh)) {
    throw new Error('Source scene did not contain a mesh')
  }
  if (Array.isArray(mesh.material)) {
    throw new Error('Source scene mesh unexpectedly has multiple materials')
  }
  return mesh
}
