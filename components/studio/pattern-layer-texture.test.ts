import { describe, expect, it } from 'vitest'

import type { StudioPatternLayer } from '@/app/studio/studio-store'
import { DEFAULT_PATTERN_ASSET_URL } from '@/utils/patternAssets'
import {
  getPatternLayerTextureSource,
  groupPatternLayersByTarget,
  resolvePatternLayerTextureFailure,
} from './pattern-layer-texture'

const builtInLayer: StudioPatternLayer = {
  id: 'pattern-layer-1',
  source: { type: 'built-in', patternUrl: '/images/patterns/004.jpg' },
  target: 'foreground-shader',
  locked: false,
}

describe('pattern layer texture helpers', () => {
  it('resolves built-in pattern sources directly', () => {
    expect(getPatternLayerTextureSource(builtInLayer, {})).toBe(
      '/images/patterns/004.jpg',
    )
  })

  it('uses local-file runtime data when present and falls back without persisting data urls', () => {
    const localLayer: StudioPatternLayer = {
      id: 'pattern-layer-local',
      source: { type: 'local-file', fileName: 'local.png' },
      target: 'background-shader',
      locked: false,
    }

    expect(
      getPatternLayerTextureSource(localLayer, {
        'pattern-layer-local': 'data:image/png;base64,raw',
      }),
    ).toBe('data:image/png;base64,raw')
    expect(getPatternLayerTextureSource(localLayer, {})).toBe(
      DEFAULT_PATTERN_ASSET_URL,
    )
  })

  it('groups Pattern Layers by their single Character Surface selector target', () => {
    const groups = groupPatternLayersByTarget([
      builtInLayer,
      {
        ...builtInLayer,
        id: 'pattern-layer-2',
        target: 'background-shader',
      },
      {
        ...builtInLayer,
        id: 'pattern-layer-3',
        target: 'morph-stack',
      },
    ])

    expect(groups.foreground).toEqual([builtInLayer])
    expect(groups.background).toHaveLength(1)
    expect(groups.morphStack).toHaveLength(1)
  })

  it('keeps the last valid texture source after a load failure when possible', () => {
    expect(
      resolvePatternLayerTextureFailure({
        failedSource: '/images/patterns/404.jpg',
        lastValidSource: '/images/patterns/002.jpg',
      }),
    ).toEqual({
      source: '/images/patterns/002.jpg',
      error: 'Unable to load Pattern Layer source /images/patterns/404.jpg.',
    })
  })

  it('falls back to the first built-in pattern when no valid texture exists', () => {
    expect(
      resolvePatternLayerTextureFailure({
        failedSource: 'data:image/png;base64,broken',
        lastValidSource: null,
      }),
    ).toEqual({
      source: DEFAULT_PATTERN_ASSET_URL,
      error: 'Unable to load Pattern Layer source data:image/png;base64,broken.',
    })
  })
})
