'use client'

import {
  DEFAULT_ASCII_STATE,
  useStudioStore,
  type StudioAsciiCharsetStyle,
} from '@/app/studio/studio-store'
import StudioExportPanel from '@/components/studio/StudioExportPanel'
import TerminalSection from '@/components/studio/TerminalSection'
import {
  ASCII_SCALE_MAX,
  ASCII_SCALE_MIN,
  asciiCellSizeToScale,
  asciiScaleToCellSize,
} from '@/components/studio/ascii-cell-metrics'
import {
  TerminalColorRow,
  TerminalDropdownRow,
  TerminalRangeRow,
  TerminalRowGroup,
  TerminalTextRow,
  TerminalToggleRow,
  type TerminalSelectOption,
} from '@/components/studio/TerminalRows'
import {
  ASCII_OUTPUT_WIDTH_MAX,
  GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
  GRAINRAD_COMMON_PROCESSING_GROUPS,
  getGrainradEffectById,
  isGrainradControlVisible,
  type GrainradControlValue,
  type GrainradEffectControl,
  type GrainradEffectId,
  type GrainradSettingGroup,
} from '@/components/studio/grainrad-effects'
import classes from './StudioShell.module.css'

type StudioRightPanelProps = {
  includeExport?: boolean
}

const characterSetOptions: Array<TerminalSelectOption<StudioAsciiCharsetStyle>> =
  [
    { value: 'standard', label: 'STANDARD' },
    { value: 'blocks', label: 'BLOCKS' },
    { value: 'binary', label: 'BINARY' },
    { value: 'detailed', label: 'DETAILED' },
    { value: 'minimal', label: 'MINIMAL' },
    { value: 'alphabetic', label: 'ALPHABETIC' },
    { value: 'numeric', label: 'NUMERIC' },
    { value: 'math', label: 'MATH' },
    { value: 'symbols', label: 'SYMBOLS' },
    { value: 'custom', label: 'CUSTOM' },
  ]

const colorModeOptions: Array<TerminalSelectOption<string>> = [
  { value: 'mono', label: 'Mono' },
  { value: 'original', label: 'Original' },
]

export default function StudioRightPanel({
  includeExport = true,
}: StudioRightPanelProps) {
  const ascii = useStudioStore((store) => store.ascii)
  const selectedEffectId = useStudioStore((store) => store.grainradEffect.selectedEffectId)
  const effectControls = useStudioStore((store) => store.grainradEffect.controls[selectedEffectId])
  const setAsciiControl = useStudioStore((store) => store.setAsciiControl)
  const setGrainradEffectControl = useStudioStore((store) => store.setGrainradEffectControl)
  const resetSelectedEffectControls = useStudioStore((store) => store.resetSelectedEffectControls)
  const selectedEffect = getGrainradEffectById(selectedEffectId)
  const asciiScale = asciiCellSizeToScale(ascii.cellSize)
  const defaultAsciiScale = asciiCellSizeToScale(DEFAULT_ASCII_STATE.cellSize)
  const setAsciiScale = (scale: number) => {
    setAsciiControl({ cellSize: asciiScaleToCellSize(scale) })
    setGrainradEffectControl('ascii', 'scale', scale)
  }
  const resetAsciiScale = () => {
    setAsciiControl({ cellSize: DEFAULT_ASCII_STATE.cellSize })
    setGrainradEffectControl('ascii', 'scale', defaultAsciiScale)
  }
  const setAsciiForegroundColor = (foregroundColor: string) => {
    setAsciiControl({ foregroundColor, palette: 'custom' })
    setGrainradEffectControl('ascii', 'foreground', foregroundColor)
  }
  const setAsciiBackgroundColor = (backgroundColor: string) => {
    setAsciiControl({ backgroundColor, palette: 'custom' })
    setGrainradEffectControl('ascii', 'background', backgroundColor)
  }

  return (
    <div className={classes.rightContent}>
      <TerminalSection
        id="settings"
        title="Settings"
        action={<button
          type="button"
          className={classes.sectionResetButton}
          onClick={resetSelectedEffectControls}
        >
          Reset
        </button>}
      >
        {selectedEffectId === 'ascii' ? (
          <>
            <TerminalRowGroup title="ASCII">
              <TerminalRangeRow
                label="Scale"
                value={asciiScale}
                min={ASCII_SCALE_MIN}
                max={ASCII_SCALE_MAX}
                step={0.1}
                displayValue={formatDecimal(asciiScale)}
                onChange={setAsciiScale}
                onReset={resetAsciiScale}
              />
              <TerminalRangeRow
                label="Spacing"
                value={readNumberControl(effectControls, 'spacing', 0)}
                min={0}
                max={1}
                step={0.01}
                displayValue={formatDecimal(readNumberControl(effectControls, 'spacing', 0))}
                onChange={(value) => setGrainradEffectControl('ascii', 'spacing', value)}
                onReset={() => setGrainradEffectControl('ascii', 'spacing', 0)}
              />
              <TerminalRangeRow
                label="Output Width"
                value={readNumberControl(effectControls, 'output-width', 0)}
                min={0}
                max={ASCII_OUTPUT_WIDTH_MAX}
                step={1}
                onChange={(value) => setGrainradEffectControl('ascii', 'output-width', value)}
                onReset={() => setGrainradEffectControl('ascii', 'output-width', 0)}
              />
              <TerminalDropdownRow
                label="Character Set"
                value={ascii.charsetStyle}
                options={characterSetOptions}
                onChange={(charsetStyle) => setAsciiControl({ charsetStyle })}
              />
              {ascii.charsetStyle === 'custom' ? (
                <TerminalTextRow
                  label="Custom Chars"
                  value={readStringControl(effectControls, 'custom-chars', '█▓▒░@#%*+=-:. ')}
                  onChange={(value) => setGrainradEffectControl('ascii', 'custom-chars', value)}
                  onReset={() => setGrainradEffectControl('ascii', 'custom-chars', '█▓▒░@#%*+=-:. ')}
                />
              ) : null}
            </TerminalRowGroup>

            <TerminalRowGroup title="Adjustments">
              <TerminalRangeRow
                label="Brightness"
                value={ascii.brightness}
                min={-1}
                max={1}
                step={0.01}
                onChange={(brightness) => setAsciiControl({ brightness })}
                onReset={() => setAsciiControl({ brightness: DEFAULT_ASCII_STATE.brightness })}
              />
              <TerminalRangeRow
                label="Contrast"
                value={ascii.contrast}
                min={0.2}
                max={2}
                step={0.01}
                onChange={(contrast) => setAsciiControl({ contrast })}
                onReset={() => setAsciiControl({ contrast: DEFAULT_ASCII_STATE.contrast })}
              />
              <TerminalRangeRow
                label="Saturation"
                value={ascii.saturation}
                min={-1}
                max={1}
                step={0.01}
                onChange={(saturation) => setAsciiControl({ saturation })}
                onReset={() => setAsciiControl({ saturation: DEFAULT_ASCII_STATE.saturation })}
              />
              <TerminalRangeRow
                label="Hue Rotation"
                value={ascii.hueRotation}
                min={-180}
                max={180}
                step={1}
                displayValue={`${Math.round(ascii.hueRotation)}°`}
                onChange={(hueRotation) => setAsciiControl({ hueRotation })}
                onReset={() => setAsciiControl({ hueRotation: DEFAULT_ASCII_STATE.hueRotation })}
              />
              <TerminalRangeRow
                label="Sharpness"
                value={ascii.sharpness}
                min={0}
                max={1}
                step={0.01}
                onChange={(sharpness) => setAsciiControl({ sharpness })}
                onReset={() => setAsciiControl({ sharpness: DEFAULT_ASCII_STATE.sharpness })}
              />
              <TerminalRangeRow
                label="Gamma"
                value={ascii.gamma}
                min={0.2}
                max={3}
                step={0.01}
                displayValue={formatDecimal(ascii.gamma)}
                onChange={(gamma) => setAsciiControl({ gamma })}
                onReset={() => setAsciiControl({ gamma: DEFAULT_ASCII_STATE.gamma })}
              />
            </TerminalRowGroup>

            <TerminalRowGroup title="Color">
              <TerminalDropdownRow
                label="Mode"
                value={readStringControl(effectControls, 'color-mode', 'mono')}
                options={colorModeOptions}
                onChange={(value) => setGrainradEffectControl('ascii', 'color-mode', value)}
              />
              <TerminalColorRow
                label="Foreground"
                value={ascii.foregroundColor}
                onChange={setAsciiForegroundColor}
              />
              <TerminalColorRow
                label="Background"
                value={ascii.backgroundColor}
                onChange={setAsciiBackgroundColor}
              />
              <TerminalRangeRow
                label="Intensity"
                value={ascii.colorIntensity}
                min={0}
                max={2}
                step={0.01}
                displayValue={formatDecimal(ascii.colorIntensity)}
                onChange={(colorIntensity) => setAsciiControl({ colorIntensity })}
                onReset={() => setAsciiControl({ colorIntensity: DEFAULT_ASCII_STATE.colorIntensity })}
              />
            </TerminalRowGroup>
          </>
        ) : (
          renderEffectSettings({
            selectedEffectId,
            groups: selectedEffect.settingGroups,
            controls: effectControls,
            onChange: setGrainradEffectControl,
          })
        )}
      </TerminalSection>

      <TerminalSection id="processing" title="Processing">
        {renderEffectSettings({
          selectedEffectId,
          groups: GRAINRAD_COMMON_PROCESSING_GROUPS,
          controls: effectControls,
          onChange: setGrainradEffectControl,
        })}
      </TerminalSection>

      <TerminalSection id="postProcessing" title="Post-Processing">
        {renderEffectSettings({
          selectedEffectId,
          groups: GRAINRAD_COMMON_POST_PROCESSING_GROUPS,
          controls: effectControls,
          onChange: setGrainradEffectControl,
        })}
      </TerminalSection>

      {includeExport ? (
        <TerminalSection id="export" title="Export">
          <StudioExportPanel />
        </TerminalSection>
      ) : null}
    </div>
  )
}

function renderEffectSettings({
  selectedEffectId,
  groups,
  controls,
  onChange,
}: {
  selectedEffectId: GrainradEffectId
  groups: GrainradSettingGroup[]
  controls: Record<string, GrainradControlValue> | undefined
  onChange: (effectId: GrainradEffectId, controlId: string, value: GrainradControlValue) => void
}) {
  return (
    <>
      {groups.map((group, groupIndex) => (
        <TerminalRowGroup key={group.title ?? `group-${groupIndex}`} title={group.title}>
          {group.controls
            .filter((control) => isGrainradControlVisible(control, controls))
            .map((control) => renderEffectControl({
              selectedEffectId,
              control,
              controls,
              onChange,
            }))}
        </TerminalRowGroup>
      ))}
    </>
  )
}

function renderEffectControl({
  selectedEffectId,
  control,
  controls,
  onChange,
}: {
  selectedEffectId: GrainradEffectId
  control: GrainradEffectControl
  controls: Record<string, GrainradControlValue> | undefined
  onChange: (effectId: GrainradEffectId, controlId: string, value: GrainradControlValue) => void
}) {
  const value = controls?.[control.id] ?? control.defaultValue

  if (control.kind === 'range') {
    const numberValue = typeof value === 'number' ? value : control.defaultValue

    return (
      <TerminalRangeRow
        key={control.id}
        label={control.label}
        value={numberValue}
        min={control.min}
        max={control.max}
        step={control.step}
        displayValue={formatControlValue(numberValue, control.unit)}
        onChange={(nextValue) => onChange(selectedEffectId, control.id, nextValue)}
        onReset={() => onChange(selectedEffectId, control.id, control.defaultValue)}
      />
    )
  }

  if (control.kind === 'toggle') {
    return (
      <TerminalToggleRow
        key={control.id}
        label={control.label}
        checked={typeof value === 'boolean' ? value : control.defaultValue}
        onChange={(nextValue) => onChange(selectedEffectId, control.id, nextValue)}
      />
    )
  }

  if (control.kind === 'select') {
    const stringValue = typeof value === 'string' ? value : control.defaultValue

    return (
      <TerminalDropdownRow
        key={control.id}
        label={control.label}
        value={stringValue}
        options={control.options}
        onChange={(nextValue) => onChange(selectedEffectId, control.id, nextValue)}
      />
    )
  }

  if (control.kind === 'text') {
    const stringValue = typeof value === 'string' ? value : control.defaultValue

    return (
      <TerminalTextRow
        key={control.id}
        label={control.label}
        value={stringValue}
        onChange={(nextValue) => onChange(selectedEffectId, control.id, nextValue)}
        onReset={() => onChange(selectedEffectId, control.id, control.defaultValue)}
      />
    )
  }

  return (
    <TerminalColorRow
      key={control.id}
      label={control.label}
      value={typeof value === 'string' ? value : control.defaultValue}
      onChange={(nextValue) => onChange(selectedEffectId, control.id, nextValue)}
    />
  )
}

function readNumberControl(
  controls: Record<string, GrainradControlValue> | undefined,
  controlId: string,
  fallback: number
) {
  const value = controls?.[controlId]

  return typeof value === 'number' ? value : fallback
}

function readStringControl(
  controls: Record<string, GrainradControlValue> | undefined,
  controlId: string,
  fallback: string
) {
  const value = controls?.[controlId]

  return typeof value === 'string' ? value : fallback
}

function formatControlValue(value: number, unit?: string) {
  if (unit === 'deg') {
    return `${Math.round(value)}°`
  }

  if (unit === 'px') {
    return `${Math.round(value)}px`
  }

  return formatDecimal(value)
}

function formatDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)
}
