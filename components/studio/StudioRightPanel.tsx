'use client'

import {
  DEFAULT_ASCII_STATE,
  useStudioStore,
  type StudioAsciiState,
  type StudioAsciiCharsetStyle,
  type StudioTheme,
} from '@/app/studio/studio-store'
import StudioExportPanel from '@/components/studio/StudioExportPanel'
import TerminalSection from '@/components/studio/TerminalSection'
import {
  ASCII_SCALE_MAX,
  ASCII_SCALE_MIN,
  DEFAULT_ASCII_SCALE,
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
  STUDIO_COMMON_POST_PROCESSING_GROUPS,
  getStudioControlDefaultValue,
  getStudioEffectById,
  getStudioProcessingGroups,
  isStudioControlVisible,
  type StudioControlValue,
  type StudioEffectControl,
  type StudioEffectId,
  type StudioSettingGroup,
} from '@/components/studio/studio-effects'
import classes from './StudioShell.module.css'

type StudioRightPanelProps = {
  includeExport?: boolean
  title?: string
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
  title = 'Settings',
}: StudioRightPanelProps) {
  const ascii = useStudioStore((store) => store.ascii)
  const theme = useStudioStore((store) => store.view.theme)
  const selectedEffectId = useStudioStore((store) => store.studioEffect.selectedEffectId)
  const effectControls = useStudioStore((store) => store.studioEffect.controls[selectedEffectId])
  const setAsciiControl = useStudioStore((store) => store.setAsciiControl)
  const setStudioEffectControl = useStudioStore((store) => store.setStudioEffectControl)
  const resetSelectedEffectControls = useStudioStore((store) => store.resetSelectedEffectControls)
  const selectedEffect = getStudioEffectById(selectedEffectId)
  const asciiScale = readNumberControl(effectControls, 'scale', DEFAULT_ASCII_SCALE)
  const setAsciiScale = (scale: number) => {
    setAsciiControl({ cellSize: asciiScaleToCellSize(scale) })
    setStudioEffectControl('ascii', 'scale', scale)
  }
  const resetAsciiScale = () => {
    setAsciiControl({ cellSize: DEFAULT_ASCII_STATE.cellSize })
    setStudioEffectControl('ascii', 'scale', DEFAULT_ASCII_SCALE)
  }
  const setAsciiForegroundColor = (foregroundColor: string) => {
    setAsciiControl({ foregroundColor, palette: 'custom' })
  }
  const setAsciiBackgroundColor = (backgroundColor: string) => {
    setAsciiControl({ backgroundColor, palette: 'custom' })
  }
  const resetAsciiAdjustments = () => {
    setAsciiControl({
      brightness: DEFAULT_ASCII_STATE.brightness,
      contrast: DEFAULT_ASCII_STATE.contrast,
      saturation: DEFAULT_ASCII_STATE.saturation,
      hueRotation: DEFAULT_ASCII_STATE.hueRotation,
      sharpness: DEFAULT_ASCII_STATE.sharpness,
      gamma: DEFAULT_ASCII_STATE.gamma,
    })
  }
  const resetAsciiColor = () => {
    resetAsciiColorGroup(theme, setAsciiControl, setStudioEffectControl)
  }
  const resetAsciiPrimary = () => {
    resetAsciiPrimaryGroup(theme, setAsciiControl, setStudioEffectControl)
  }
  const resetEffectGroups = (groups: StudioSettingGroup[]) => {
    resetStudioControlGroups(
      selectedEffectId,
      groups,
      theme,
      setStudioEffectControl,
    )
  }

  return (
    <div className={classes.rightContent}>
      <TerminalSection
        id="settings"
        title={title}
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
            <TerminalRowGroup
              title="ASCII"
              action={(
                <button
                  type="button"
                  className={classes.sectionResetButton}
                  onClick={resetAsciiPrimary}
                >
                  Reset
                </button>
              )}
            >
              <TerminalRangeRow
                label="Size"
                value={readNumberControl(effectControls, 'size', 1) * 10}
                min={1}
                max={100}
                step={1}
                displayValue={formatDecimal(readNumberControl(effectControls, 'size', 1) * 10)}
                onChange={(value) => setStudioEffectControl('ascii', 'size', value / 10)}
                onReset={() => setStudioEffectControl('ascii', 'size', 1)}
              />
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
              <TerminalDropdownRow
                label="Character Set"
                value={ascii.charsetStyle}
                options={characterSetOptions}
                onChange={(charsetStyle) => setAsciiControl({ charsetStyle })}
                onReset={() => setAsciiControl({ charsetStyle: DEFAULT_ASCII_STATE.charsetStyle })}
              />
              {ascii.charsetStyle === 'custom' ? (
                <TerminalTextRow
                  label="Custom Chars"
                  value={readStringControl(effectControls, 'custom-chars', '█▓▒░@#%*+=-:. ')}
                  onChange={(value) => setStudioEffectControl('ascii', 'custom-chars', value)}
                  onReset={() => setStudioEffectControl('ascii', 'custom-chars', '█▓▒░@#%*+=-:. ')}
                />
              ) : null}
            </TerminalRowGroup>

            <TerminalRowGroup
              title="Adjustments"
              action={(
                <button
                  type="button"
                  className={classes.sectionResetButton}
                  onClick={resetAsciiAdjustments}
                >
                  Reset
                </button>
              )}
            >
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

            <TerminalRowGroup
              title="Color"
              action={(
                <button
                  type="button"
                  className={classes.sectionResetButton}
                  onClick={resetAsciiColor}
                >
                  Reset
                </button>
              )}
            >
              <TerminalDropdownRow
                label="Mode"
                value={readStringControl(effectControls, 'color-mode', 'mono')}
                options={colorModeOptions}
                onChange={(value) => setStudioEffectControl('ascii', 'color-mode', value)}
                onReset={() => setStudioEffectControl('ascii', 'color-mode', 'mono')}
              />
              <TerminalColorRow
                label="Foreground"
                value={ascii.foregroundColor}
                onChange={setAsciiForegroundColor}
                onReset={() => setAsciiForegroundColor(
                  readThemeDefaultColor('ascii', 'foreground', theme),
                )}
              />
              <TerminalColorRow
                label="Background"
                value={ascii.backgroundColor}
                onChange={setAsciiBackgroundColor}
                onReset={() => setAsciiBackgroundColor(
                  readThemeDefaultColor('ascii', 'background', theme),
                )}
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
            theme,
            onChange: setStudioEffectControl,
            resetGroups: resetEffectGroups,
          })
        )}
      </TerminalSection>

      <TerminalSection
        id="processing"
        title="Processing"
        action={(
          <button
            type="button"
            className={classes.sectionResetButton}
            onClick={() => resetEffectGroups(getStudioProcessingGroups(selectedEffectId))}
          >
            Reset
          </button>
        )}
      >
        {renderEffectSettings({
          selectedEffectId,
          groups: getStudioProcessingGroups(selectedEffectId),
          controls: effectControls,
          theme,
          onChange: setStudioEffectControl,
          resetGroups: resetEffectGroups,
        })}
      </TerminalSection>

      <TerminalSection id="postProcessing" title="Post-Processing">
        <div className={classes.postProcessingGroups}>
          {renderPostProcessingSettings({
            selectedEffectId,
            groups: STUDIO_COMMON_POST_PROCESSING_GROUPS,
            controls: effectControls,
            theme,
            onChange: setStudioEffectControl,
          })}
        </div>
      </TerminalSection>

      {includeExport ? (
        <TerminalSection id="export" title="Export">
          <StudioExportPanel />
        </TerminalSection>
      ) : null}
    </div>
  )
}

type SetStudioEffectControl = (
  effectId: StudioEffectId,
  controlId: string,
  value: StudioControlValue,
) => void

export function resetStudioControlGroups(
  effectId: StudioEffectId,
  groups: StudioSettingGroup[],
  theme: StudioTheme,
  onChange: SetStudioEffectControl,
) {
  groups.forEach((group) => group.controls.forEach((control) => {
    onChange(
      effectId,
      control.id,
      getStudioControlDefaultValue(control, theme),
    )
  }))
}

export function resetAsciiColorGroup(
  theme: StudioTheme,
  setAsciiControl: (partial: Partial<StudioAsciiState>) => void,
  setStudioEffectControl: SetStudioEffectControl,
) {
  setStudioEffectControl('ascii', 'color-mode', 'mono')
  setAsciiControl({
    foregroundColor: readThemeDefaultColor('ascii', 'foreground', theme),
    backgroundColor: readThemeDefaultColor('ascii', 'background', theme),
    colorIntensity: DEFAULT_ASCII_STATE.colorIntensity,
    palette: DEFAULT_ASCII_STATE.palette,
  })
}

export function resetAsciiPrimaryGroup(
  theme: StudioTheme,
  setAsciiControl: (partial: Partial<StudioAsciiState>) => void,
  setStudioEffectControl: SetStudioEffectControl,
) {
  const asciiGroup = getStudioEffectById('ascii').settingGroups.find(
    (group) => group.title === 'ASCII',
  )

  if (asciiGroup) {
    resetStudioControlGroups(
      'ascii',
      [asciiGroup],
      theme,
      setStudioEffectControl,
    )
  }

  setAsciiControl({
    cellSize: DEFAULT_ASCII_STATE.cellSize,
    charsetStyle: DEFAULT_ASCII_STATE.charsetStyle,
  })
}

function renderEffectSettings({
  selectedEffectId,
  groups,
  controls,
  theme,
  onChange,
  resetGroups,
}: {
  selectedEffectId: StudioEffectId
  groups: StudioSettingGroup[]
  controls: Record<string, StudioControlValue> | undefined
  theme: 'light' | 'dark'
  onChange: (effectId: StudioEffectId, controlId: string, value: StudioControlValue) => void
  resetGroups: (groups: StudioSettingGroup[]) => void
}) {
  return (
    <>
      {groups.map((group, groupIndex) => (
        <TerminalRowGroup
          key={group.title ?? `group-${groupIndex}`}
          title={group.title}
          action={group.title ? (
            <button
              type="button"
              className={classes.sectionResetButton}
              onClick={() => resetGroups([group])}
            >
              Reset
            </button>
          ) : undefined}
        >
          {group.controls
            .filter((control) => isStudioControlVisible(control, controls))
            .map((control) => renderEffectControl({
              selectedEffectId,
              control,
              controls,
              theme,
              onChange,
            }))}
        </TerminalRowGroup>
      ))}
    </>
  )
}

function renderPostProcessingSettings({
  selectedEffectId,
  groups,
  controls,
  theme,
  onChange,
}: {
  selectedEffectId: StudioEffectId
  groups: StudioSettingGroup[]
  controls: Record<string, StudioControlValue> | undefined
  theme: 'light' | 'dark'
  onChange: (effectId: StudioEffectId, controlId: string, value: StudioControlValue) => void
}) {
  return groups.map((group) => {
    const toggle = group.controls[0]
    if (!toggle || toggle.kind !== 'toggle') {
      return null
    }

    const enabled = controls?.[toggle.id] === true

    return (
      <section
        key={toggle.id}
        className={classes.postProcessingGroup}
        data-enabled={enabled}
        aria-label={toggle.label}
      >
        {enabled ? (
          <button
            type="button"
            className={classes.inputGroupReset}
            onClick={() => group.controls.slice(1).forEach((control) => {
              onChange(
                selectedEffectId,
                control.id,
                getStudioControlDefaultValue(control, theme),
              )
            })}
          >
            Reset
          </button>
        ) : null}
        {group.controls
          .filter((control) => isStudioControlVisible(control, controls))
          .map((control) => renderEffectControl({
            selectedEffectId,
            control,
            controls,
            theme,
            onChange,
          }))}
      </section>
    )
  })
}

function renderEffectControl({
  selectedEffectId,
  control,
  controls,
  theme,
  onChange,
}: {
  selectedEffectId: StudioEffectId
  control: StudioEffectControl
  controls: Record<string, StudioControlValue> | undefined
  theme: 'light' | 'dark'
  onChange: (effectId: StudioEffectId, controlId: string, value: StudioControlValue) => void
}) {
  const value = controls?.[control.id] ?? control.defaultValue
  const defaultValue = getStudioControlDefaultValue(control, theme)

  if (control.kind === 'range') {
    const numberValue = typeof value === 'number' ? value : control.defaultValue
    const displayScale = control.displayScaleByTheme?.[theme] ?? control.displayScale ?? 1
    const displayNumberValue = numberValue * displayScale
    const scaledMinimum = control.min * displayScale
    const scaledMaximum = control.max * displayScale

    return (
      <TerminalRangeRow
        key={control.id}
        label={control.label}
        value={displayNumberValue}
        min={Math.min(scaledMinimum, scaledMaximum)}
        max={Math.max(scaledMinimum, scaledMaximum)}
        step={Math.abs(control.step * displayScale)}
        displayValue={formatControlValue(displayNumberValue, control.unit)}
        allowOutOfRangeValue={numberValue < control.min || numberValue > control.max}
        onChange={(nextValue) => onChange(selectedEffectId, control.id, nextValue / displayScale)}
        onReset={() => onChange(selectedEffectId, control.id, defaultValue)}
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
        onReset={() => onChange(selectedEffectId, control.id, defaultValue)}
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
        onReset={() => onChange(selectedEffectId, control.id, defaultValue)}
      />
    )
  }

  return (
    <TerminalColorRow
      key={control.id}
      label={control.label}
      value={typeof value === 'string' ? value : control.defaultValue}
      onChange={(nextValue) => onChange(selectedEffectId, control.id, nextValue)}
      onReset={() => onChange(selectedEffectId, control.id, defaultValue)}
    />
  )
}

function readThemeDefaultColor(
  effectId: StudioEffectId,
  controlId: string,
  theme: 'light' | 'dark',
) {
  const control = getStudioEffectById(effectId).settingGroups
    .flatMap((group) => group.controls)
    .find((candidate) => candidate.id === controlId)

  return control && typeof getStudioControlDefaultValue(control, theme) === 'string'
    ? getStudioControlDefaultValue(control, theme) as string
    : '#000000'
}

function readNumberControl(
  controls: Record<string, StudioControlValue> | undefined,
  controlId: string,
  fallback: number
) {
  const value = controls?.[controlId]

  return typeof value === 'number' ? value : fallback
}

function readStringControl(
  controls: Record<string, StudioControlValue> | undefined,
  controlId: string,
  fallback: string
) {
  const value = controls?.[controlId]

  return typeof value === 'string' ? value : fallback
}

function formatControlValue(value: number, unit?: string) {
  if (unit === 'deg' || unit === '°') {
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
