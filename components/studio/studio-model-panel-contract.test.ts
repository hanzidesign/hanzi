import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const studioDir = join(process.cwd(), 'components', 'studio')

describe('Studio shared Model panel contract', () => {
  it('does not render a reset button for controls without a reset action', async () => {
    const rowsSource = await readFile(join(studioDir, 'TerminalRows.tsx'), 'utf8')

    expect(rowsSource).toContain('{onReset ? (')
    expect(rowsSource).not.toContain('disabled={!onReset}')
  })

  it('separates Model, Model Deform, and 3D Motion ownership', async () => {
    const source = await readFile(join(studioDir, 'StudioLeftPanel.tsx'), 'utf8')
    const styles = await readFile(join(studioDir, 'StudioShell.module.css'), 'utf8')
    const characterIndex = source.indexOf('>Character</div>')
    const modelIndex = source.indexOf('>Model</div>')
    const deformIndex = source.indexOf('>Model Deform</div>')
    const motionIndex = source.indexOf('>3D Motion</div>')
    const modelSource = source.slice(
      source.indexOf('export function StudioModelPanel'),
      source.indexOf('export function StudioModelDeformPanel'),
    )
    const deformSource = source.slice(
      source.indexOf('export function StudioModelDeformPanel'),
      source.indexOf('export function StudioEffectsPanel'),
    )
    const deformResetSource = source.slice(
      source.indexOf('function StudioModelDeformReset'),
      source.indexOf('function StudioMotionReset'),
    )
    const motionSource = source.slice(source.indexOf('export function StudioMotionPanel'))
    const controllerIndex = motionSource.indexOf('<StudioRotationController')
    const scalarControlsIndex = motionSource.indexOf('className={classes.motionScalarControls}')

    expect(characterIndex).toBeGreaterThan(-1)
    expect(modelIndex).toBeGreaterThan(characterIndex)
    expect(deformIndex).toBeGreaterThan(modelIndex)
    expect(motionIndex).toBeGreaterThan(deformIndex)
    expect(source).toContain('data-studio-model-panel')
    expect(source).toContain('data-studio-model-deform-panel')
    expect(source).toContain('label="Extrude"')
    expect(source).toContain('label="Thickness"')
    expect(source).toContain('label="Bevel"')
    expect(source).toContain('label="Twist"')
    expect(source).toContain('label="Taper"')
    expect(source).toContain('label="Bend"')
    expect(modelSource).not.toContain('label="Repeat"')
    expect(deformSource).toContain('label="Repeat"')
    expect(deformSource).toContain('checked={mesh.repeat.enabled}')
    expect(deformSource).toContain('mesh.repeat.enabled ?')
    expect(deformSource).toContain('label="Count"')
    expect(deformSource).toMatch(/label="Count"[\s\S]*?min=\{1\}[\s\S]*?max=\{50\}/)
    expect(deformSource).toContain('label="Radius"')
    expect(deformSource).toContain('label="Orientation"')
    expect(deformSource).toContain('label="Size"')
    expect(deformSource).toMatch(/label="Size"[\s\S]*?min=\{0\.1\}[\s\S]*?max=\{3\}/)
    expect(deformSource).toContain('displayValue={`${Math.round(mesh.repeat.orientation)}°`}')
    expect(deformSource).toMatch(/label="Radius"[\s\S]*?min=\{0\}[\s\S]*?max=\{50\}/)
    expect(deformSource).toContain('className={classes.repeatSection}')
    expect(deformSource).toContain('data-enabled={mesh.repeat.enabled}')
    expect(deformSource).toContain('<StudioModelDeformReset />')
    expect(styles).toContain(".repeatSection[data-enabled='true'] > .inputGroupReset")
    expect(styles).toContain(".repeatSection[data-enabled='true'] > .controlRow:first-of-type .controlValue")
    expect(deformResetSource).toContain('if (!repeat.enabled)')
    expect(deformResetSource).toContain('enabled: true')
    expect(source).toMatch(/label="Bend"[\s\S]*?min=\{-360\}[\s\S]*?max=\{360\}/)
    expect(source).toContain('function StudioModelReset')
    expect(source).toContain('function StudioModelDeformReset')
    expect(source).toContain('function StudioMotionReset')
    expect(source.match(/Reset all/g)).toHaveLength(3)
    expect(source).toContain('repeat: { ...DEFAULT_MESH_STATE.repeat, enabled: true }')
    expect(source).toContain('rotation: { ...DEFAULT_MESH_STATE.rotation },')
    expect(source).toContain('scale: DEFAULT_MESH_STATE.scale,')
    expect(source).toContain('setAnimationControl({ playing: true, speed: 1 })')
    expect(motionSource).toContain('label="X"')
    expect(motionSource).toContain('label="Y"')
    expect(motionSource).toContain('label="Z"')
    expect(controllerIndex).toBeGreaterThan(-1)
    expect(scalarControlsIndex).toBeGreaterThan(controllerIndex)
    expect(styles).toContain('grid-template-columns: minmax(0, 1fr) 80px;')
    expect(styles).toMatch(/\.rotationController \{[\s\S]*?width: 80px;[\s\S]*?height: 80px;/)
    expect(styles).toMatch(/\.motionControls \.resetButton \{[\s\S]*?width: 42px;/)
    expect(styles).toContain('grid-template-columns: 16px minmax(0, 1fr) 42px;')
    expect(motionSource).toContain('label="Play"')
    expect(motionSource).toContain('checked={animation.playing}')
    expect(motionSource).toContain('onChange={(playing) => setAnimationControl({ playing })}')
    expect(motionSource).toContain('label="Scale"')
    expect(motionSource).toContain('value={mesh.scale}')
    expect(motionSource).toContain('onChange={(scale) => setMeshControl({ scale })}')
    expect(motionSource).toContain('onReset={() => setMeshControl({ scale: DEFAULT_MESH_STATE.scale })}')
    expect(motionSource).toMatch(/label="Scale"[\s\S]*?min=\{0\.1\}[\s\S]*?max=\{10\}/)
    expect(motionSource).toMatch(/label="Speed"[\s\S]*?min=\{-100\}[\s\S]*?max=\{100\}/)
    expect(motionSource).toContain('onReset={() => setAnimationControl({ speed: 1 })}')
    expect(styles).toMatch(/\.motionScalarControls \.resetButton \{[\s\S]*?width: 42px;/)
    expect(motionSource).not.toContain('motionPreview')
    expect(motionSource).not.toContain('label="Depth"')
  })

  it('routes every shared Model deformation into ASCII and Dithering geometry', async () => {
    const ascii = await readFile(join(studioDir, 'CharacterAsciiCanvas.tsx'), 'utf8')
    const dithering = await readFile(join(studioDir, 'CharacterDitheringCanvas.tsx'), 'utf8')

    for (const modelParam of ['bevel', 'twist', 'taper', 'bend']) {
      expect(ascii).toContain(`${modelParam}: mesh.${modelParam}`)
      expect(dithering).toContain(`${modelParam}: meshSettings.${modelParam}`)
    }

    expect(ascii).toContain('createCharacterRepeatTransforms(mesh.repeat)')
    expect(ascii).toContain('scale={transform.scale}')
    expect(dithering).toContain('addCharacterModelCopies(')
    expect(dithering).toContain('meshSettings.repeat')
  })

  it('routes Repeat through every Effect while 3D Motion rotates the center group', async () => {
    const effectCanvas = await readFile(join(studioDir, 'StudioEffectCanvas.tsx'), 'utf8')
    const canvasNames = Array.from(
      effectCanvas.matchAll(/from '@\/components\/studio\/(Character\w+Canvas)'/g),
      (match) => match[1],
    )

    expect(canvasNames).toHaveLength(15)

    for (const canvasName of canvasNames) {
      const source = await readFile(join(studioDir, `${canvasName}.tsx`), 'utf8')

      if (canvasName === 'CharacterAsciiCanvas') {
        expect(source).toContain('createCharacterRepeatTransforms(mesh.repeat)')
        expect(source).toContain('groupRef.current.rotation.y = applyDeltaRotation(')
      } else {
        expect(source).toContain('addCharacterModelCopies(')
        expect(source).toContain('meshSettings.repeat')
        expect(source).toContain('source.group.rotation.y = applyDeltaRotation(')
      }

      expect(source).toContain('animation.speed !== 0')
    }
  })
})
