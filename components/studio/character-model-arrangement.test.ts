import { BoxGeometry, Group, MeshBasicMaterial, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import {
  addCharacterModelCopies,
  createCharacterRepeatTransforms,
} from './character-model-arrangement'

describe('character model arrangement', () => {
  it('keeps one centered model when Repeat is disabled or Count is one', () => {
    expect(createCharacterRepeatTransforms({
      enabled: false,
      count: 6,
      radius: 1.5,
      orientation: 90,
      size: 0.4,
    })).toEqual([{ position: [0, 0, 0], rotationY: 0, scale: 1 }])

    expect(createCharacterRepeatTransforms({
      enabled: true,
      count: 1,
      radius: 1.5,
      orientation: 90,
      size: 0.4,
    })).toEqual([{ position: [0, 0, 0], rotationY: 0, scale: 0.4 }])
  })

  it('places repeated models on a circle with 90 degrees facing outward', () => {
    const transforms = createCharacterRepeatTransforms({
      enabled: true,
      count: 4,
      radius: 2,
      orientation: 90,
      size: 1,
    })

    expect(transforms).toHaveLength(4)

    for (const transform of transforms) {
      const radialNormal = new Vector3(...transform.position).normalize()
      const modelNormal = new Vector3(0, 0, 1)
        .applyAxisAngle(new Vector3(0, 1, 0), transform.rotationY)
        .normalize()

      expect(modelNormal.x).toBeCloseTo(radialNormal.x)
      expect(modelNormal.y).toBeCloseTo(radialNormal.y)
      expect(modelNormal.z).toBeCloseTo(radialNormal.z)
    }
  })

  it('adjusts every model relative to its radial normal', () => {
    const outward = createCharacterRepeatTransforms({
      enabled: true,
      count: 3,
      radius: 1.5,
      orientation: 90,
      size: 1,
    })
    const tangent = createCharacterRepeatTransforms({
      enabled: true,
      count: 3,
      radius: 1.5,
      orientation: 0,
      size: 1,
    })

    for (let index = 0; index < outward.length; index += 1) {
      expect(outward[index].rotationY - tangent[index].rotationY).toBeCloseTo(Math.PI / 2)
    }
  })

  it('scales every repeated model copy with Repeat Size', () => {
    const transforms = createCharacterRepeatTransforms({
      enabled: true,
      count: 4,
      radius: 1.5,
      orientation: 90,
      size: 0.65,
    })

    expect(transforms.every((transform) => transform.scale === 0.65)).toBe(true)
  })

  it('shares geometry and material across repeated model copies', () => {
    const root = new Group()
    const geometry = new BoxGeometry(1, 1, 1)
    const material = new MeshBasicMaterial()

    addCharacterModelCopies(root, [geometry], material, {
      enabled: true,
      count: 4,
      radius: 1.5,
      orientation: 90,
      size: 0.65,
    })

    expect(root.children).toHaveLength(4)
    for (const copy of root.children) {
      expect(copy.children).toHaveLength(1)
      expect(copy.scale.toArray()).toEqual([0.65, 0.65, 0.65])
      expect(copy.children[0]).toMatchObject({ geometry, material })
    }

    geometry.dispose()
    material.dispose()
  })
})
