'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import CharacterPanel from '@/components/studio/CharacterPanel'
import StudioRotationController from '@/components/studio/StudioRotationController'
import TerminalSection from '@/components/studio/TerminalSection'
import { TerminalDropdownRow, TerminalRangeRow, TerminalToggleRow } from '@/components/studio/TerminalRows'
import {
  DEFAULT_MESH_STATE,
  useStudioStore,
} from '@/app/studio/studio-store'
import type {
  CharacterMeshBulgePinch,
  CharacterMeshCurl,
  CharacterMeshDeformSettings,
  CharacterMeshInflate,
  CharacterMeshSurfaceNoise,
  CharacterMeshSquashStretch,
  CharacterMeshWave,
} from '@/components/studio/character-mesh-deform'
import { resetCharacterMeshDeformFeature } from '@/components/studio/character-mesh-deform'
import { GRAINRAD_EFFECTS } from '@/components/studio/grainrad-effects'
import classes from './StudioShell.module.css'

export default function StudioLeftPanel() {
  const theme = useStudioStore((store) => store.view.theme)

  return (
    <>
      <div className={classes.brandRow}>
        <Link href="/" className={classes.brandLink}>
          <Image
            src={theme === 'dark' ? '/images/logo-dark.svg' : '/images/logo.svg'}
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
          <div className={classes.inputLabel}>Model Deform</div>
        </div>
        <StudioModelDeformPanel />
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
      Reset
    </button>
  )
}

function StudioRepeatReset() {
  const setMeshControl = useStudioStore((store) => store.setMeshControl)
  const repeat = useStudioStore((store) => store.mesh.repeat)

  if (!repeat.enabled) {
    return null
  }

  return (
    <button
      type="button"
      className={classes.inputGroupReset}
      onClick={() => setMeshControl({
        repeat: { ...DEFAULT_MESH_STATE.repeat, enabled: true },
      })}
    >
      Reset
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
        setMeshControl({
          rotation: { ...DEFAULT_MESH_STATE.rotation },
          scale: DEFAULT_MESH_STATE.scale,
        })
        setAnimationControl({ playing: true, speed: 1 })
      }}
    >
      Reset
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

export function StudioModelDeformPanel() {
  const mesh = useStudioStore((store) => store.mesh)
  const setMeshControl = useStudioStore((store) => store.setMeshControl)
  const setMeshDeformControl = useStudioStore((store) => store.setMeshDeformControl)
  const update = <K extends keyof CharacterMeshDeformSettings>(key: K, partial: Partial<CharacterMeshDeformSettings[K]>) => {
    setMeshDeformControl(key, partial)
  }

  return (
    <div className={classes.modelPanel} data-studio-model-deform-panel>
      <section className={classes.meshDeformSection} data-enabled={mesh.repeat.enabled} aria-label="Repeat">
        <StudioRepeatReset />
        <TerminalToggleRow
          label="Repeat"
          checked={mesh.repeat.enabled}
          onChange={(enabled) => setMeshControl({ repeat: { ...mesh.repeat, enabled } })}
        />
        {mesh.repeat.enabled ? (
          <>
            <TerminalRangeRow label="Count" value={mesh.repeat.count} min={1} max={50} step={1}
              onChange={(count) => setMeshControl({ repeat: { ...mesh.repeat, count } })}
              onReset={() => setMeshControl({ repeat: { ...mesh.repeat, count: DEFAULT_MESH_STATE.repeat.count } })} />
            <TerminalRangeRow label="Radius" value={mesh.repeat.radius} min={0} max={50} step={0.01}
              onChange={(radius) => setMeshControl({ repeat: { ...mesh.repeat, radius } })}
              onReset={() => setMeshControl({ repeat: { ...mesh.repeat, radius: DEFAULT_MESH_STATE.repeat.radius } })} />
            <TerminalRangeRow label="Orientation" value={mesh.repeat.orientation} min={0} max={360} step={1}
              displayValue={`${Math.round(mesh.repeat.orientation)}°`}
              onChange={(orientation) => setMeshControl({ repeat: { ...mesh.repeat, orientation } })}
              onReset={() => setMeshControl({ repeat: { ...mesh.repeat, orientation: DEFAULT_MESH_STATE.repeat.orientation } })} />
            <TerminalRangeRow label="Size" value={mesh.repeat.size} min={0.1} max={3} step={0.01}
              onChange={(size) => setMeshControl({ repeat: { ...mesh.repeat, size } })}
              onReset={() => setMeshControl({ repeat: { ...mesh.repeat, size: DEFAULT_MESH_STATE.repeat.size } })} />
          </>
        ) : null}
      </section>
      <BulgeSection value={mesh.deform.bulgePinch} update={(partial) => update('bulgePinch', partial)} />
      <SquashSection value={mesh.deform.squashStretch} update={(partial) => update('squashStretch', partial)} />
      <WaveSection value={mesh.deform.wave} update={(partial) => update('wave', partial)} />
      <NoiseSection value={mesh.deform.surfaceNoise} update={(partial) => update('surfaceNoise', partial)} />
      <InflateSection value={mesh.deform.inflate} update={(partial) => update('inflate', partial)} />
      <CurlSection value={mesh.deform.curl} update={(partial) => update('curl', partial)} />
    </div>
  )
}

type DeformSectionProps<T> = { value: T; update: (partial: Partial<T>) => void }

function SectionFrame<T extends { enabled: boolean }>({ label, value, update, defaultValue, children }: DeformSectionProps<T> & { label: string; defaultValue: T; children: ReactNode }) {
  const reset = () => update({ ...defaultValue, ...({ enabled: true } as Partial<T>) })
  return (
    <section className={classes.meshDeformSection} data-enabled={value.enabled} aria-label={label}>
      {value.enabled ? <button type="button" className={classes.inputGroupReset} onClick={reset}>Reset</button> : null}
      <TerminalToggleRow label={label} checked={value.enabled} onChange={(enabled) => update({ enabled } as Partial<T>)} />
      {value.enabled ? children : null}
    </section>
  )
}

function BulgeSection({ value, update }: DeformSectionProps<CharacterMeshBulgePinch>) {
  return <SectionFrame label="Bulge" value={value} update={(partial) => update(partial)} defaultValue={resetCharacterMeshDeformFeature('bulgePinch')}>
    <TerminalRangeRow label="Amount" value={value.amount} min={-10} max={10} step={0.01} onChange={(amount) => update({ amount })} onReset={() => update({ amount: DEFAULT_MESH_STATE.deform.bulgePinch.amount })} />
    <TerminalRangeRow label="Radius" value={value.radius} min={0.05} max={5} step={0.01} onChange={(radius) => update({ radius })} onReset={() => update({ radius: DEFAULT_MESH_STATE.deform.bulgePinch.radius })} />
    <TerminalRangeRow label="Falloff" value={value.falloff} min={0} max={1} step={0.01} onChange={(falloff) => update({ falloff })} onReset={() => update({ falloff: DEFAULT_MESH_STATE.deform.bulgePinch.falloff })} />
    <TerminalRangeRow label="Center X" value={value.centerX} min={-1} max={1} step={0.01} onChange={(centerX) => update({ centerX })} onReset={() => update({ centerX: DEFAULT_MESH_STATE.deform.bulgePinch.centerX })} />
    <TerminalRangeRow label="Center Y" value={value.centerY} min={-1} max={1} step={0.01} onChange={(centerY) => update({ centerY })} onReset={() => update({ centerY: DEFAULT_MESH_STATE.deform.bulgePinch.centerY })} />
    <TerminalDropdownRow label="Axis" value={value.axis} options={[{ value: 'radial', label: 'Radial' }, { value: 'x', label: 'X' }, { value: 'y', label: 'Y' }]} onChange={(axis) => update({ axis })} onReset={() => update({ axis: DEFAULT_MESH_STATE.deform.bulgePinch.axis })} />
    <TerminalDropdownRow label="Profile" value={value.profile} options={[{ value: 'smooth', label: 'Smooth' }, { value: 'sharp', label: 'Sharp' }, { value: 'gaussian', label: 'Gaussian' }]} onChange={(profile) => update({ profile })} onReset={() => update({ profile: DEFAULT_MESH_STATE.deform.bulgePinch.profile })} />
  </SectionFrame>
}

function SquashSection({ value, update }: DeformSectionProps<CharacterMeshSquashStretch>) {
  return <SectionFrame label="Squash" value={value} update={update} defaultValue={resetCharacterMeshDeformFeature('squashStretch')}>
    <TerminalRangeRow label="Amount" value={value.amount} min={-1} max={1} step={0.01} onChange={(amount) => update({ amount })} onReset={() => update({ amount: DEFAULT_MESH_STATE.deform.squashStretch.amount })} />
    <TerminalDropdownRow label="Axis" value={value.axis} options={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }, { value: 'z', label: 'Z' }]} onChange={(axis) => update({ axis })} onReset={() => update({ axis: DEFAULT_MESH_STATE.deform.squashStretch.axis })} />
    <TerminalRangeRow label="Pivot" value={value.pivot} min={-1} max={1} step={0.01} onChange={(pivot) => update({ pivot })} onReset={() => update({ pivot: DEFAULT_MESH_STATE.deform.squashStretch.pivot })} />
    <TerminalToggleRow label="Preserve Volume" checked={value.preserveVolume} onChange={(preserveVolume) => update({ preserveVolume })} onReset={() => update({ preserveVolume: DEFAULT_MESH_STATE.deform.squashStretch.preserveVolume })} />
    <TerminalRangeRow label="Secondary Scale" value={value.secondaryScale} min={0.1} max={3} step={0.01} onChange={(secondaryScale) => update({ secondaryScale })} onReset={() => update({ secondaryScale: DEFAULT_MESH_STATE.deform.squashStretch.secondaryScale })} />
    <TerminalRangeRow label="Falloff" value={value.falloff} min={0} max={1} step={0.01} onChange={(falloff) => update({ falloff })} onReset={() => update({ falloff: DEFAULT_MESH_STATE.deform.squashStretch.falloff })} />
  </SectionFrame>
}

function WaveSection({ value, update }: DeformSectionProps<CharacterMeshWave>) {
  return <SectionFrame label="Wave" value={value} update={update} defaultValue={resetCharacterMeshDeformFeature('wave')}>
    <TerminalRangeRow label="Amplitude" value={value.amplitude} min={-1} max={1} step={0.01} onChange={(amplitude) => update({ amplitude })} onReset={() => update({ amplitude: DEFAULT_MESH_STATE.deform.wave.amplitude })} />
    <TerminalRangeRow label="Speed" value={value.speed} min={1} max={20} step={0.01} onChange={(speed) => update({ speed })} onReset={() => update({ speed: DEFAULT_MESH_STATE.deform.wave.speed })} />
    <TerminalRangeRow label="Frequency" value={value.frequency} min={0.1} max={12} step={0.1} onChange={(frequency) => update({ frequency })} onReset={() => update({ frequency: DEFAULT_MESH_STATE.deform.wave.frequency })} />
    <TerminalRangeRow label="Phase" value={value.phase} min={-360} max={360} step={1} displayValue={`${Math.round(value.phase)}°`} onChange={(phase) => update({ phase })} onReset={() => update({ phase: DEFAULT_MESH_STATE.deform.wave.phase })} />
    <TerminalDropdownRow label="Direction" value={value.direction} options={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }, { value: 'diagonal', label: 'Diagonal' }, { value: 'radial', label: 'Radial' }]} onChange={(direction) => update({ direction })} onReset={() => update({ direction: DEFAULT_MESH_STATE.deform.wave.direction })} />
    <TerminalDropdownRow label="Waveform" value={value.waveform} options={[{ value: 'sine', label: 'Sine' }, { value: 'triangle', label: 'Triangle' }, { value: 'square', label: 'Square' }]} onChange={(waveform) => update({ waveform })} onReset={() => update({ waveform: DEFAULT_MESH_STATE.deform.wave.waveform })} />
    <TerminalRangeRow label="Offset" value={value.offset} min={-1} max={1} step={0.01} onChange={(offset) => update({ offset })} onReset={() => update({ offset: DEFAULT_MESH_STATE.deform.wave.offset })} />
    <TerminalRangeRow label="Decay" value={value.decay} min={0} max={1} step={0.01} onChange={(decay) => update({ decay })} onReset={() => update({ decay: DEFAULT_MESH_STATE.deform.wave.decay })} />
  </SectionFrame>
}

function NoiseSection({ value, update }: DeformSectionProps<CharacterMeshSurfaceNoise>) {
  return <SectionFrame label="Noise" value={value} update={update} defaultValue={resetCharacterMeshDeformFeature('surfaceNoise')}>
    <TerminalRangeRow label="Amount" value={value.amount} min={0} max={2} step={0.01} onChange={(amount) => update({ amount })} onReset={() => update({ amount: DEFAULT_MESH_STATE.deform.surfaceNoise.amount })} />
    <TerminalRangeRow label="Speed" value={value.speed} min={1} max={20} step={0.01} onChange={(speed) => update({ speed })} onReset={() => update({ speed: DEFAULT_MESH_STATE.deform.surfaceNoise.speed })} />
    <TerminalRangeRow label="Scale" value={value.scale} min={0.1} max={20} step={0.1} onChange={(scale) => update({ scale })} onReset={() => update({ scale: DEFAULT_MESH_STATE.deform.surfaceNoise.scale })} />
    <TerminalRangeRow label="Seed" value={value.seed} min={-9999} max={9999} step={1} onChange={(seed) => update({ seed })} onReset={() => update({ seed: DEFAULT_MESH_STATE.deform.surfaceNoise.seed })} />
    <TerminalRangeRow label="Detail" value={value.detail} min={1} max={5} step={1} onChange={(detail) => update({ detail })} onReset={() => update({ detail: DEFAULT_MESH_STATE.deform.surfaceNoise.detail })} />
    <TerminalRangeRow label="Roughness" value={value.roughness} min={0} max={1} step={0.01} onChange={(roughness) => update({ roughness })} onReset={() => update({ roughness: DEFAULT_MESH_STATE.deform.surfaceNoise.roughness })} />
    <TerminalDropdownRow label="Direction" value={value.direction} options={[{ value: 'depth', label: 'Depth' }, { value: 'radial', label: 'Radial' }, { value: 'normal', label: 'Normal' }]} onChange={(direction) => update({ direction })} onReset={() => update({ direction: DEFAULT_MESH_STATE.deform.surfaceNoise.direction })} />
    <TerminalRangeRow label="Contrast" value={value.contrast} min={0} max={2} step={0.01} onChange={(contrast) => update({ contrast })} onReset={() => update({ contrast: DEFAULT_MESH_STATE.deform.surfaceNoise.contrast })} />
    <TerminalRangeRow label="Offset X" value={value.offsetX} min={-5} max={5} step={0.01} onChange={(offsetX) => update({ offsetX })} onReset={() => update({ offsetX: DEFAULT_MESH_STATE.deform.surfaceNoise.offsetX })} />
    <TerminalRangeRow label="Offset Y" value={value.offsetY} min={-5} max={5} step={0.01} onChange={(offsetY) => update({ offsetY })} onReset={() => update({ offsetY: DEFAULT_MESH_STATE.deform.surfaceNoise.offsetY })} />
  </SectionFrame>
}

function InflateSection({ value, update }: DeformSectionProps<CharacterMeshInflate>) {
  return <SectionFrame label="Inflate" value={value} update={update} defaultValue={resetCharacterMeshDeformFeature('inflate')}>
    <TerminalRangeRow label="Amount" value={value.amount} min={0} max={10} step={0.01} onChange={(amount) => update({ amount })} onReset={() => update({ amount: DEFAULT_MESH_STATE.deform.inflate.amount })} />
    <TerminalRangeRow label="Balance" value={value.balance} min={0} max={1} step={0.01} onChange={(balance) => update({ balance })} onReset={() => update({ balance: DEFAULT_MESH_STATE.deform.inflate.balance })} />
    <TerminalRangeRow label="Radius" value={value.radius} min={0.05} max={2} step={0.01} onChange={(radius) => update({ radius })} onReset={() => update({ radius: DEFAULT_MESH_STATE.deform.inflate.radius })} />
    <TerminalRangeRow label="Falloff" value={value.falloff} min={0} max={1} step={0.01} onChange={(falloff) => update({ falloff })} onReset={() => update({ falloff: DEFAULT_MESH_STATE.deform.inflate.falloff })} />
    <TerminalRangeRow label="Center X" value={value.centerX} min={-1} max={1} step={0.01} onChange={(centerX) => update({ centerX })} onReset={() => update({ centerX: DEFAULT_MESH_STATE.deform.inflate.centerX })} />
    <TerminalRangeRow label="Center Y" value={value.centerY} min={-1} max={1} step={0.01} onChange={(centerY) => update({ centerY })} onReset={() => update({ centerY: DEFAULT_MESH_STATE.deform.inflate.centerY })} />
    <TerminalToggleRow label="Uniform" checked={value.uniform} onChange={(uniform) => update({ uniform })} onReset={() => update({ uniform: DEFAULT_MESH_STATE.deform.inflate.uniform })} />
    <TerminalToggleRow label="Deflate" checked={value.deflate} onChange={(deflate) => update({ deflate })} onReset={() => update({ deflate: DEFAULT_MESH_STATE.deform.inflate.deflate })} />
  </SectionFrame>
}

function CurlSection({ value, update }: DeformSectionProps<CharacterMeshCurl>) {
  return <SectionFrame label="Curl" value={value} update={update} defaultValue={resetCharacterMeshDeformFeature('curl')}>
    <TerminalRangeRow label="Angle" value={value.angle} min={-360} max={360} step={1} displayValue={`${Math.round(value.angle)}°`} onChange={(angle) => update({ angle })} onReset={() => update({ angle: DEFAULT_MESH_STATE.deform.curl.angle })} />
    <TerminalDropdownRow label="Axis" value={value.axis} options={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }, { value: 'z', label: 'Z' }]} onChange={(axis) => update({ axis })} onReset={() => update({ axis: DEFAULT_MESH_STATE.deform.curl.axis })} />
    <TerminalRangeRow label="Tightness" value={value.tightness} min={0.1} max={4} step={0.01} onChange={(tightness) => update({ tightness })} onReset={() => update({ tightness: DEFAULT_MESH_STATE.deform.curl.tightness })} />
    <TerminalRangeRow label="Pivot" value={value.pivot} min={-1} max={1} step={0.01} onChange={(pivot) => update({ pivot })} onReset={() => update({ pivot: DEFAULT_MESH_STATE.deform.curl.pivot })} />
    <TerminalRangeRow label="Offset" value={value.offset} min={-1} max={1} step={0.01} onChange={(offset) => update({ offset })} onReset={() => update({ offset: DEFAULT_MESH_STATE.deform.curl.offset })} />
    <TerminalRangeRow label="Turns" value={value.turns} min={-5} max={5} step={1} onChange={(turns) => update({ turns })} onReset={() => update({ turns: DEFAULT_MESH_STATE.deform.curl.turns })} />
    <TerminalRangeRow label="Falloff" value={value.falloff} min={0} max={1} step={0.01} onChange={(falloff) => update({ falloff })} onReset={() => update({ falloff: DEFAULT_MESH_STATE.deform.curl.falloff })} />
    <TerminalToggleRow label="Clamp" checked={value.clamp} onChange={(clamp) => update({ clamp })} onReset={() => update({ clamp: DEFAULT_MESH_STATE.deform.curl.clamp })} />
  </SectionFrame>
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
  const setAnimationControl = useStudioStore((store) => store.setAnimationControl)
  const setMeshControl = useStudioStore((store) => store.setMeshControl)
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
      </div>
      <StudioRotationController
        rotation={mesh.rotation}
        onRotationChange={(rotation) => setMeshControl({ rotation })}
      />
      <div className={classes.motionScalarControls}>
        <TerminalToggleRow
          label="Play"
          checked={animation.playing}
          onChange={(playing) => setAnimationControl({ playing })}
        />
        <TerminalRangeRow
          label="Scale"
          value={mesh.scale}
          min={0.1}
          max={10}
          step={0.01}
          onChange={(scale) => setMeshControl({ scale })}
          onReset={() => setMeshControl({ scale: DEFAULT_MESH_STATE.scale })}
        />
        <TerminalRangeRow
          label="Speed"
          value={animation.speed}
          min={-100}
          max={100}
          step={0.01}
          onChange={(speed) => setAnimationControl({ speed })}
          onReset={() => setAnimationControl({ speed: 1 })}
        />
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
