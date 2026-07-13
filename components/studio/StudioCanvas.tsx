'use client'

import { useEffect, useState } from 'react'
import { getCharacterDisplayState, useStudioStore } from '@/app/studio/studio-store'
import CharacterAsciiCanvas, {
  IDLE_CHARACTER_ASCII_STATUS,
  type CharacterAsciiStatus,
} from '@/components/studio/CharacterAsciiCanvas'
import CharacterDitheringCanvas from '@/components/studio/CharacterDitheringCanvas'
import CharacterDotsCanvas from '@/components/studio/CharacterDotsCanvas'
import CharacterHalftoneCanvas from '@/components/studio/CharacterHalftoneCanvas'
import CharacterMatrixRainCanvas from '@/components/studio/CharacterMatrixRainCanvas'
import { getGrainradEffectById } from '@/components/studio/grainrad-effects'
import { isAbortError } from '@/utils/dataUrl'
import classes from './StudioShell.module.css'

export default function StudioCanvas() {
  const character = useStudioStore((store) => store.character)
  const selectedEffectId = useStudioStore((store) => store.grainradEffect.selectedEffectId)
  const asciiBackgroundColor = useStudioStore((store) => store.ascii.backgroundColor)
  const effectControls = useStudioStore(
    (store) => store.grainradEffect.controls[selectedEffectId],
  )
  const previewZoom = useStudioStore((store) => store.view.previewZoom)
  const setPreviewZoom = useStudioStore((store) => store.setPreviewZoom)
  const resetPreviewView = useStudioStore((store) => store.resetPreviewView)
  const setCharacterSvgLoading = useStudioStore((store) => store.setCharacterSvgLoading)
  const setCharacterSvgData = useStudioStore((store) => store.setCharacterSvgData)
  const setCharacterSvgError = useStudioStore((store) => store.setCharacterSvgError)
  const [asciiStatus, setAsciiStatus] = useState<CharacterAsciiStatus>(
    IDLE_CHARACTER_ASCII_STATUS,
  )
  const { charUrl } = getCharacterDisplayState(character)
  const statusText =
    selectedEffectId === 'ascii' && asciiStatus.state !== 'idle'
      ? asciiStatus.message
      : null
  const selectedEffect = getGrainradEffectById(selectedEffectId)
  const backgroundColor = selectedEffectId === 'ascii'
    ? asciiBackgroundColor
    : typeof effectControls.background === 'string'
      ? effectControls.background
      : '#000000'

  useEffect(() => {
    const controller = new AbortController()

    setCharacterSvgLoading(charUrl)

    readText(charUrl, controller.signal)
      .then((svgData) => {
        setCharacterSvgData(charUrl, svgData)
      })
      .catch((error) => {
        if (isAbortError(error)) {
          return
        }

        setCharacterSvgError(
          charUrl,
          error instanceof Error
            ? error.message
            : 'Unable to load character SVG.',
        )
      })

    return () => {
      controller.abort()
    }
  }, [
    charUrl,
    setCharacterSvgData,
    setCharacterSvgError,
    setCharacterSvgLoading,
  ])

  return (
    <div
      className={classes.previewRoot}
      style={{ background: backgroundColor }}
    >
      <div
        className={classes.previewCanvasFrame}
        style={{ transform: `scale(${previewZoom})` }}
      >
        {selectedEffectId === 'ascii' ? (
          <CharacterAsciiCanvas onAsciiStatusChange={setAsciiStatus} />
        ) : selectedEffectId === 'dithering' ? (
          <CharacterDitheringCanvas />
        ) : selectedEffectId === 'halftone' ? (
          <CharacterHalftoneCanvas />
        ) : selectedEffectId === 'matrix-rain' ? (
          <CharacterMatrixRainCanvas />
        ) : selectedEffectId === 'dots' ? (
          <CharacterDotsCanvas />
        ) : (
          <div
            data-testid="effect-renderer-not-implemented"
            role="status"
            className={classes.previewMessage}
          >
            <div className={classes.previewMessageTitle}>
              {selectedEffect.label} renderer is not implemented yet.
            </div>
          </div>
        )}
      </div>
      {statusText ? (
        <div className={classes.previewMessage} data-state={asciiStatus.state}>
          <div className={classes.previewMessageTitle}>{statusText}</div>
        </div>
      ) : null}
      <div className={classes.zoomHud} aria-label="Preview zoom controls">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setPreviewZoom(previewZoom - 0.1)}
        >
          -
        </button>
        <span className={classes.zoomValue}>{Math.round(previewZoom * 100)}%</span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setPreviewZoom(previewZoom + 0.1)}
        >
          +
        </button>
        <span className={classes.zoomDivider} />
        <button
          type="button"
          aria-label="Reset preview zoom"
          onClick={resetPreviewView}
        >
          Reset
        </button>
        <span className={classes.zoomSpacer} />
        <button
          type="button"
          className={classes.fitButton}
          aria-label="Fit preview"
          onClick={resetPreviewView}
        >
          Fit <span className={classes.fitIcon} aria-hidden>⌗</span>
        </button>
      </div>
    </div>
  )
}

async function readText(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`Failed to load ${url}`)
  }

  return response.text()
}
