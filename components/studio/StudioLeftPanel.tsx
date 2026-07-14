'use client'

import Image from 'next/image'
import Link from 'next/link'
import CharacterPanel from '@/components/studio/CharacterPanel'
import TerminalSection from '@/components/studio/TerminalSection'
import { TerminalRangeRow } from '@/components/studio/TerminalRows'
import {
  DEFAULT_MESH_STATE,
  getCharacterDisplayState,
  useStudioStore,
} from '@/app/studio/studio-store'
import { GRAINRAD_EFFECTS } from '@/components/studio/grainrad-effects'
import classes from './StudioShell.module.css'

export default function StudioLeftPanel() {
  return (
    <>
      <div className={classes.brandRow}>
        <Link href="/" className={classes.brandLink}>
          <Image
            src="/images/logo.svg"
            alt=""
            aria-hidden
            width={24}
            height={24}
          />
          <span>Hanzi Studio</span>
        </Link>
      </div>
      <TerminalSection id="input" title="Input">
        <div className={classes.inputLabel}>Character</div>
        <CharacterPanel />
        <div className={classes.inputGroupHeader}>
          <div className={classes.inputLabel}>Model</div>
          <StudioModelReset />
        </div>
        <StudioModelPanel />
        <div className={classes.inputGroupHeader}>
          <div className={classes.inputLabel}>3D Motion</div>
          <StudioMotionReset />
        </div>
        <StudioMotionPanel />
      </TerminalSection>
      <TerminalSection id="effects" title="Effects">
        <StudioEffectsPanel />
      </TerminalSection>
      <TerminalSection id="presets" title="Presets">
        <p className={classes.panelNote}>Effect-local presets will appear here.</p>
      </TerminalSection>
    </>
  )
}

function StudioModelReset() {
  const setMeshControl = useStudioStore((store) => store.setMeshControl)

  return (
    <button
      type="button"
      className={classes.inputGroupReset}
      onClick={() =>
        setMeshControl({
          extrusionDepth: DEFAULT_MESH_STATE.extrusionDepth,
          thickness: DEFAULT_MESH_STATE.thickness,
          bevel: DEFAULT_MESH_STATE.bevel,
          twist: DEFAULT_MESH_STATE.twist,
          taper: DEFAULT_MESH_STATE.taper,
          bend: DEFAULT_MESH_STATE.bend,
        })
      }
    >
      Reset all
    </button>
  )
}

function StudioMotionReset() {
  const setAnimationControl = useStudioStore((store) => store.setAnimationControl)
  const setMeshControl = useStudioStore((store) => store.setMeshControl)

  return (
    <button
      type="button"
      className={classes.inputGroupReset}
      onClick={() => {
        setMeshControl({ rotation: { ...DEFAULT_MESH_STATE.rotation } })
        setAnimationControl({ speed: 1 })
      }}
    >
      Reset all
    </button>
  )
}

export function StudioModelPanel() {
  const mesh = useStudioStore((store) => store.mesh)
  const setMeshControl = useStudioStore((store) => store.setMeshControl)

  return (
    <div className={classes.modelPanel} data-studio-model-panel>
      <TerminalRangeRow
        label="Extrude"
        value={mesh.extrusionDepth}
        min={0.01}
        max={1}
        step={0.01}
        onChange={(extrusionDepth) => setMeshControl({ extrusionDepth })}
        onReset={() => setMeshControl({ extrusionDepth: DEFAULT_MESH_STATE.extrusionDepth })}
      />
      <TerminalRangeRow
        label="Thickness"
        value={mesh.thickness}
        min={-0.4}
        max={0.4}
        step={0.01}
        onChange={(thickness) => setMeshControl({ thickness })}
        onReset={() => setMeshControl({ thickness: DEFAULT_MESH_STATE.thickness })}
      />
      <TerminalRangeRow
        label="Bevel"
        value={mesh.bevel}
        min={0}
        max={0.3}
        step={0.01}
        onChange={(bevel) => setMeshControl({ bevel })}
        onReset={() => setMeshControl({ bevel: DEFAULT_MESH_STATE.bevel })}
      />
      <TerminalRangeRow
        label="Twist"
        value={mesh.twist}
        min={-360}
        max={360}
        step={1}
        displayValue={`${Math.round(mesh.twist)}°`}
        onChange={(twist) => setMeshControl({ twist })}
        onReset={() => setMeshControl({ twist: DEFAULT_MESH_STATE.twist })}
      />
      <TerminalRangeRow
        label="Taper"
        value={mesh.taper}
        min={-0.8}
        max={0.8}
        step={0.01}
        onChange={(taper) => setMeshControl({ taper })}
        onReset={() => setMeshControl({ taper: DEFAULT_MESH_STATE.taper })}
      />
      <TerminalRangeRow
        label="Bend"
        value={mesh.bend}
        min={-360}
        max={360}
        step={1}
        displayValue={`${Math.round(mesh.bend)}°`}
        onChange={(bend) => setMeshControl({ bend })}
        onReset={() => setMeshControl({ bend: DEFAULT_MESH_STATE.bend })}
      />
    </div>
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
          <span className={classes.effectHandle} aria-hidden>⠿</span>
          <span className={classes.effectLabel}>{effect.label}</span>
          <span className={classes.effectMarker} aria-hidden>
            {selectedEffectId === effect.id ? '●' : ''}
          </span>
        </button>
      ))}
    </div>
  )
}

export function StudioMotionPanel() {
  const animation = useStudioStore((store) => store.animation)
  const mesh = useStudioStore((store) => store.mesh)
  const character = useStudioStore((store) => store.character)
  const setAnimationControl = useStudioStore((store) => store.setAnimationControl)
  const setMeshControl = useStudioStore((store) => store.setMeshControl)
  const { ch } = getCharacterDisplayState(character)
  const setMeshRotation = (axis: 'x' | 'y' | 'z', degrees: number) => {
    setMeshControl({
      rotation: {
        ...mesh.rotation,
        [axis]: degreesToRadians(degrees),
      },
    })
  }

  return (
    <div className={classes.motionPanel} data-studio-motion-panel>
      <div className={classes.motionControls}>
        <TerminalRangeRow
          label="X"
          value={radiansToDegrees(mesh.rotation.x)}
          min={-180}
          max={180}
          step={1}
          displayValue={`${Math.round(radiansToDegrees(mesh.rotation.x))}°`}
          onChange={(degrees) => setMeshRotation('x', degrees)}
          onReset={() => setMeshRotation('x', radiansToDegrees(DEFAULT_MESH_STATE.rotation.x))}
        />
        <TerminalRangeRow
          label="Y"
          value={radiansToDegrees(mesh.rotation.y)}
          min={-180}
          max={180}
          step={1}
          displayValue={`${Math.round(radiansToDegrees(mesh.rotation.y))}°`}
          onChange={(degrees) => setMeshRotation('y', degrees)}
          onReset={() => setMeshRotation('y', radiansToDegrees(DEFAULT_MESH_STATE.rotation.y))}
        />
        <TerminalRangeRow
          label="Z"
          value={radiansToDegrees(mesh.rotation.z)}
          min={-180}
          max={180}
          step={1}
          displayValue={`${Math.round(radiansToDegrees(mesh.rotation.z))}°`}
          onChange={(degrees) => setMeshRotation('z', degrees)}
          onReset={() => setMeshRotation('z', radiansToDegrees(DEFAULT_MESH_STATE.rotation.z))}
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
      </div>
      <div className={classes.motionPreview} aria-hidden>
        <span className={classes.motionGlyph}>{ch}</span>
        <span className={classes.motionCubeFront} />
        <span className={classes.motionCubeBack} />
      </div>
    </div>
  )
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}
