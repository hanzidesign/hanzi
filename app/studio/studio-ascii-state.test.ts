import { describe, expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'

import {
  STUDIO_STORE_STORAGE_KEY,
  createInitialStudioStoreState,
  createStudioStore,
} from './studio-store'

function createMemoryStorage() {
  const values = new Map<string, string>()
  const storage: StateStorage = {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value)
    },
    removeItem: (name) => {
      values.delete(name)
    },
  }

  return {
    storage,
    readPersistedState: () => {
      const value = values.get(STUDIO_STORE_STORAGE_KEY)
      return value ? JSON.parse(value).state : null
    },
  }
}

describe('Phase 5C ASCII renderer state', () => {
  it('starts with serializable ASCII controls and Y-axis mesh auto-spin enabled', () => {
    const initial = createInitialStudioStoreState()

    expect(initial.mesh).toMatchObject({
      autoRotate: true,
      autoRotateSpeed: expect.any(Number),
    })
    expect(initial.ascii).toMatchObject({
      cellSize: expect.any(Number),
      density: expect.any(Number),
      contrast: expect.any(Number),
      brightness: 0,
      saturation: 0,
      hueRotation: 0,
      sharpness: 0,
      gamma: 1,
      invert: false,
      charsetStyle: 'standard',
      palette: 'custom',
      foregroundColor: '#f4f1e8',
      backgroundColor: '#101010',
      colorIntensity: 1,
      depthInfluence: expect.any(Number),
      normalInfluence: expect.any(Number),
      scanlineAmount: expect.any(Number),
      bloomAmount: expect.any(Number),
      curvature: expect.any(Number),
    })
  })

  it('sanitizes and persists compact ASCII choices', () => {
    const { storage, readPersistedState } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setAsciiControl({
      cellSize: 31.8,
      density: 1.4,
      contrast: 3,
      brightness: 2,
      saturation: -2,
      hueRotation: 270,
      sharpness: 2,
      gamma: 4,
      invert: true,
      charsetStyle: 'detailed',
      palette: 'amber',
      foregroundColor: 'bad',
      backgroundColor: '#0f0f0f',
      colorIntensity: 3,
      depthInfluence: 2,
      normalInfluence: -1,
      scanlineAmount: 1.4,
      bloomAmount: 1.5,
      curvature: 2,
    })

    expect(store.getState().ascii).toMatchObject({
      cellSize: 32,
      density: 1,
      contrast: 2,
      brightness: 1,
      saturation: -1,
      hueRotation: 180,
      sharpness: 1,
      gamma: 3,
      invert: true,
      charsetStyle: 'detailed',
      palette: 'amber',
      foregroundColor: '#f4f1e8',
      backgroundColor: '#0f0f0f',
      colorIntensity: 2,
      depthInfluence: 1,
      normalInfluence: 0,
      scanlineAmount: 1,
      bloomAmount: 1,
      curvature: 1,
    })
    expect(readPersistedState().ascii).toEqual(store.getState().ascii)
  })

  it('allows ASCII cell size across the corrected Scale 1-20 renderer range', () => {
    const { storage } = createMemoryStorage()
    const store = createStudioStore(storage)

    store.getState().setAsciiControl({ cellSize: 80 })
    expect(store.getState().ascii.cellSize).toBe(64)

    store.getState().setAsciiControl({ cellSize: -12 })
    expect(store.getState().ascii.cellSize).toBe(1)
  })
})
