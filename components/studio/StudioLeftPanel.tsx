'use client'

import CharacterPanel from '@/components/studio/CharacterPanel'
import TerminalSection from '@/components/studio/TerminalSection'
import {
  TerminalRangeRow,
  TerminalRowGroup,
  TerminalToggleRow,
} from '@/components/studio/TerminalRows'
import {
  DEFAULT_MESH_STATE,
  useStudioStore,
} from '@/app/studio/studio-store'
import { GRAINRAD_EFFECTS } from '@/components/studio/grainrad-effects'
import classes from './StudioShell.module.css'

export default function StudioLeftPanel() {
  return (
    <>
      <div className={classes.brandRow}>Hanzi Studio</div>
      <TerminalSection id="input" title="Input">
        <p className={classes.panelNote}>Character selector</p>
        <CharacterPanel />
      </TerminalSection>
      <TerminalSection id="effects" title="Effects">
        <StudioEffectsPanel />
      </TerminalSection>
      <TerminalSection id="animation" title="Animation">
        <StudioAnimationPanel />
      </TerminalSection>
    </>
  )
}

export function StudioEffectsPanel() {
  const selectedEffectId = useStudioStore((store) => store.grainradEffect.selectedEffectId)
  const setSelectedEffect = useStudioStore((store) => store.setSelectedEffect)

  return (
    <div className={classes.effectList}>
      {GRAINRAD_EFFECTS.map((effect) => (
        <button
          key={effect.id}
          type="button"
          className={classes.effectButton}
          data-active={selectedEffectId === effect.id}
          onClick={() => setSelectedEffect(effect.id)}
        >
          <span className={classes.effectMarker}>
            {selectedEffectId === effect.id ? '●' : '○'}
          </span>
          {effect.label}
        </button>
      ))}
    </div>
  )
}

export function StudioAnimationPanel() {
  const animation = useStudioStore((store) => store.animation)
  const mesh = useStudioStore((store) => store.mesh)
  const setAnimationControl = useStudioStore((store) => store.setAnimationControl)
  const setMeshControl = useStudioStore((store) => store.setMeshControl)
  const setMeshRotation = (axis: 'x' | 'y', degrees: number) => {
    setMeshControl({
      rotation: {
        ...mesh.rotation,
        [axis]: degreesToRadians(degrees),
      },
    })
  }
  const resetTransform = () => {
    setMeshControl({
      extrusionDepth: DEFAULT_MESH_STATE.extrusionDepth,
      rotation: { ...DEFAULT_MESH_STATE.rotation },
      scale: DEFAULT_MESH_STATE.scale,
      position: { ...DEFAULT_MESH_STATE.position },
    })
  }

  return (
    <>
      <TerminalRowGroup title="Motion">
        <TerminalToggleRow
          label="Play"
          checked={animation.playing}
          onChange={(playing) => setAnimationControl({ playing })}
        />
        <TerminalRangeRow
          label="Speed"
          value={animation.speed}
          min={0}
          max={4}
          step={0.01}
          onChange={(speed) => setAnimationControl({ speed })}
          onReset={() => setAnimationControl({ speed: 1 })}
        />
        <TerminalRangeRow
          label="Time"
          value={animation.timeOffset}
          min={0}
          max={60}
          step={0.1}
          onChange={(timeOffset) => setAnimationControl({ timeOffset })}
          onReset={() => setAnimationControl({ timeOffset: 0 })}
        />
        <TerminalToggleRow
          label="Auto Spin"
          checked={mesh.autoRotate}
          onChange={(autoRotate) => setMeshControl({ autoRotate })}
        />
        <TerminalRangeRow
          label="Spin"
          value={mesh.autoRotateSpeed}
          min={0}
          max={4}
          step={0.01}
          onChange={(autoRotateSpeed) => setMeshControl({ autoRotateSpeed })}
          onReset={() => setMeshControl({ autoRotateSpeed: DEFAULT_MESH_STATE.autoRotateSpeed })}
        />
      </TerminalRowGroup>

      <TerminalRowGroup title="Transform">
        <TerminalRangeRow
          label="Y Rotate"
          value={radiansToDegrees(mesh.rotation.y)}
          min={-180}
          max={180}
          step={1}
          displayValue={`${Math.round(radiansToDegrees(mesh.rotation.y))}°`}
          onChange={(degrees) => setMeshRotation('y', degrees)}
          onReset={() => setMeshRotation('y', radiansToDegrees(DEFAULT_MESH_STATE.rotation.y))}
        />
        <TerminalRangeRow
          label="X Rotate"
          value={radiansToDegrees(mesh.rotation.x)}
          min={-180}
          max={180}
          step={1}
          displayValue={`${Math.round(radiansToDegrees(mesh.rotation.x))}°`}
          onChange={(degrees) => setMeshRotation('x', degrees)}
          onReset={() => setMeshRotation('x', radiansToDegrees(DEFAULT_MESH_STATE.rotation.x))}
        />
        <TerminalRangeRow
          label="Depth"
          value={mesh.extrusionDepth}
          min={0.01}
          max={1}
          step={0.01}
          onChange={(extrusionDepth) => setMeshControl({ extrusionDepth })}
          onReset={() => setMeshControl({ extrusionDepth: DEFAULT_MESH_STATE.extrusionDepth })}
        />
        <TerminalRangeRow
          label="Scale"
          value={mesh.scale}
          min={0.25}
          max={3}
          step={0.01}
          onChange={(scale) => setMeshControl({ scale })}
          onReset={() => setMeshControl({ scale: DEFAULT_MESH_STATE.scale })}
        />
        <button
          type="button"
          className={classes.secondaryButton}
          onClick={resetTransform}
        >
          Reset Transform
        </button>
      </TerminalRowGroup>
    </>
  )
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}
