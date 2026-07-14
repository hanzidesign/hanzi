import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Studio shared Model panel contract', () => {
  it('places Model directly below Character and keeps geometry out of 3D Motion', async () => {
    const source = await readFile(join(studioDir, 'StudioLeftPanel.tsx'), 'utf8')
    const characterIndex = source.indexOf('>Character</div>')
    const modelIndex = source.indexOf('>Model</div>')
    const motionIndex = source.indexOf('>3D Motion</div>')
    const motionSource = source.slice(source.indexOf('export function StudioMotionPanel'))

    expect(characterIndex).toBeGreaterThan(-1)
    expect(modelIndex).toBeGreaterThan(characterIndex)
    expect(motionIndex).toBeGreaterThan(modelIndex)
    expect(source).toContain('data-studio-model-panel')
    expect(source).toContain('label="Extrude"')
    expect(source).toContain('label="Thickness"')
    expect(source).toContain('label="Bevel"')
    expect(source).toContain('label="Twist"')
    expect(source).toContain('label="Taper"')
    expect(source).toContain('label="Bend"')
    expect(source).toMatch(/label="Bend"[\s\S]*?min=\{-360\}[\s\S]*?max=\{360\}/)
    expect(source).toContain('function StudioModelReset')
    expect(source).toContain('function StudioMotionReset')
    expect(source.match(/Reset all/g)).toHaveLength(2)
    expect(source).toContain('setMeshControl({ rotation: { ...DEFAULT_MESH_STATE.rotation } })')
    expect(source).toContain('setAnimationControl({ speed: 1 })')
    expect(motionSource).not.toContain('label="Depth"')
  })

  it('routes every shared Model deformation into ASCII and Dithering geometry', async () => {
    const ascii = await readFile(join(studioDir, 'CharacterAsciiCanvas.tsx'), 'utf8')
    const dithering = await readFile(join(studioDir, 'CharacterDitheringCanvas.tsx'), 'utf8')

    for (const modelParam of ['bevel', 'twist', 'taper', 'bend']) {
      expect(ascii).toContain(`${modelParam}: mesh.${modelParam}`)
      expect(dithering).toContain(`${modelParam}: meshSettings.${modelParam}`)
    }
  })
})
