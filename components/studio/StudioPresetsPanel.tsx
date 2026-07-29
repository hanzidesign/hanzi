'use client'

import { useId, useRef, useState, type ChangeEvent } from 'react'
import { chars } from '@/assets/chars'
import {
  STUDIO_PRESET_NAME_MAX_LENGTH,
  useStudioStore,
  type StudioPresetActionResult,
} from '@/app/studio/studio-store'
import {
  parseStudioPresetsJson,
  serializeStudioPresets,
} from '@/components/studio/studio-presets'
import classes from './StudioShell.module.css'

type PresetStatus = {
  message: string
  tone: 'success' | 'error'
}

export default function StudioPresetsPanel() {
  const presets = useStudioStore((store) => store.presets)
  const selectedEffectId = useStudioStore((store) => store.studioEffect.selectedEffectId)
  const character = useStudioStore((store) => store.character)
  const saveStudioPreset = useStudioStore((store) => store.saveStudioPreset)
  const applyStudioPreset = useStudioStore((store) => store.applyStudioPreset)
  const renameStudioPreset = useStudioStore((store) => store.renameStudioPreset)
  const deleteStudioPreset = useStudioStore((store) => store.deleteStudioPreset)
  const importStudioPresets = useStudioStore((store) => store.importStudioPresets)
  const nameInputId = useId()
  const importInputRef = useRef<HTMLInputElement>(null)
  const characterScript = character.isTc ? 'tc' : 'sc'
  const characterGlyph = chars[characterScript][character.country][character.year]
  const defaultName = createDefaultPresetName(
    selectedEffectId,
    characterGlyph,
  )
  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState<string | null>(null)
  const [renamedValue, setRenamedValue] = useState('')
  const [status, setStatus] = useState<PresetStatus | null>(null)

  const handleActionResult = (
    result: StudioPresetActionResult,
    successMessage: string,
  ) => {
    if (result.ok) {
      setStatus({ message: successMessage, tone: 'success' })
      return true
    }

    setStatus({
      message: result.reason === 'invalid-name'
        ? `Enter a preset name between 1 and ${STUDIO_PRESET_NAME_MAX_LENGTH} characters.`
        : 'That preset no longer exists.',
      tone: 'error',
    })
    return false
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (!file) {
      return
    }

    try {
      const imported = parseStudioPresetsJson(await file.text())
      const result = importStudioPresets(imported)

      if (handleActionResult(result, `Imported ${imported.length} preset${imported.length === 1 ? '' : 's'}.`)) {
        setEditingName(null)
      }
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : 'Unable to import presets.',
        tone: 'error',
      })
    }
  }

  return (
    <div className={classes.presetsPanel} data-studio-presets-panel>
      <form
        className={classes.presetCreateForm}
        onSubmit={(event) => {
          event.preventDefault()
          const result = saveStudioPreset(name.trim() ? name : defaultName)

          if (handleActionResult(result, result.ok && result.overwritten ? 'Preset updated.' : 'Preset saved.')) {
            setName('')
          }
        }}
      >
        <label className={classes.presetNameLabel} htmlFor={nameInputId}>
          Preset name
        </label>
        <div className={classes.presetNameRow}>
          <input
            id={nameInputId}
            className={classes.presetNameInput}
            value={name}
            maxLength={STUDIO_PRESET_NAME_MAX_LENGTH}
            placeholder={defaultName}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <button type="submit" className={classes.presetPrimaryButton}>
            Save
          </button>
        </div>
      </form>

      {presets.length > 0 ? (
        <div className={classes.presetList}>
          {presets.map((preset) => editingName === preset.name ? (
            <form
              key={preset.name}
              className={classes.presetEditRow}
              onSubmit={(event) => {
                event.preventDefault()
                const result = renameStudioPreset(preset.name, renamedValue)

                if (handleActionResult(result, result.ok && result.overwritten ? 'Preset renamed and replaced.' : 'Preset renamed.')) {
                  setEditingName(null)
                }
              }}
            >
              <input
                className={classes.presetNameInput}
                aria-label={`Rename ${preset.name}`}
                value={renamedValue}
                maxLength={STUDIO_PRESET_NAME_MAX_LENGTH}
                autoFocus
                onChange={(event) => setRenamedValue(event.currentTarget.value)}
              />
              <div className={classes.presetEditActions}>
                <button type="submit" className={classes.presetActionButton}>Save</button>
                <button
                  type="button"
                  className={classes.presetActionButton}
                  onClick={() => setEditingName(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div key={preset.name} className={classes.presetItem}>
              <button
                type="button"
                className={classes.presetApplyButton}
                title={`Apply ${preset.name}`}
                onClick={() => handleActionResult(applyStudioPreset(preset.name), `Applied ${preset.name}.`)}
              >
                {preset.name}
              </button>
              <div className={classes.presetItemActions}>
                <button
                  type="button"
                  className={classes.presetActionButton}
                  onClick={() => {
                    setEditingName(preset.name)
                    setRenamedValue(preset.name)
                    setStatus(null)
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`${classes.presetActionButton} ${classes.presetDeleteButton}`}
                  onClick={() => {
                    if (handleActionResult(deleteStudioPreset(preset.name), 'Preset deleted.')) {
                      setEditingName(null)
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={classes.panelNote}>No saved presets.</p>
      )}

      <div className={classes.presetTransferActions}>
        <button
          type="button"
          className={classes.presetActionButton}
          disabled={presets.length === 0}
          onClick={() => {
            downloadPresetJson(serializeStudioPresets(presets))
            setStatus({ message: 'Presets exported.', tone: 'success' })
          }}
        >
          Export All
        </button>
        <button
          type="button"
          className={classes.presetActionButton}
          onClick={() => importInputRef.current?.click()}
        >
          Import
        </button>
        <input
          ref={importInputRef}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(event) => void handleImport(event)}
        />
      </div>

      {status ? (
        <p
          className={classes.presetStatus}
          data-tone={status.tone}
          role={status.tone === 'error' ? 'alert' : 'status'}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  )
}

function createDefaultPresetName(
  effectId: string,
  characterGlyph: string,
  date = new Date(),
) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${effectId}_${characterGlyph}_${year}-${month}-${day}`
}

function downloadPresetJson(contents: string) {
  const href = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const link = document.createElement('a')

  link.download = `hanzi-studio-presets-${new Date().toISOString().slice(0, 10)}.json`
  link.href = href
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 1000)
}
