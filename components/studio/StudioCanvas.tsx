'use client'

import { useEffect, useState } from 'react'
import _ from 'lodash'
import { Text } from '@mantine/core'
import { meaning, parseCharUrl } from '@/assets/chars'
import { getCharacterDisplayState, useStudioStore } from '@/app/studio/studio-store'
import CharacterSurfaceCanvas, {
  IDLE_CHARACTER_SURFACE_STATUS,
  type CharacterSurfaceStatus,
} from '@/components/studio/CharacterSurfaceCanvas'
import { isAbortError } from '@/utils/dataUrl'

export default function StudioCanvas() {
  const character = useStudioStore((store) => store.character)
  const bgColor = useStudioStore((store) => store.view.backgroundColor)
  const setCharacterSvgLoading = useStudioStore(
    (store) => store.setCharacterSvgLoading,
  )
  const setCharacterSvgData = useStudioStore(
    (store) => store.setCharacterSvgData,
  )
  const setCharacterSvgError = useStudioStore(
    (store) => store.setCharacterSvgError,
  )
  const [surfaceStatus, setSurfaceStatus] = useState<CharacterSurfaceStatus>(
    IDLE_CHARACTER_SURFACE_STATUS,
  )
  const { charUrl } = getCharacterDisplayState(character)
  const [country, year] = parseCharUrl(charUrl)
  const translation = _.get(meaning, [country, year])
  const statusText =
    surfaceStatus.state === 'idle' ? null : surfaceStatus.message
  const statusColor = surfaceStatus.state === 'error' ? 'red.6' : 'dark.7'

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
      style={{
        position: 'relative',
        height: 'calc(100dvh - 72px)',
        background: bgColor,
      }}
    >
      <CharacterSurfaceCanvas onSurfaceStatusChange={setSurfaceStatus} />
      {translation ? (
        <Text
          fz={14}
          c="dark.7"
          ta="center"
          pos="absolute"
          top={20}
          left={16}
          right={16}
          style={{ pointerEvents: 'none' }}
        >
          {translation}
        </Text>
      ) : null}
      {statusText ? (
        <Text
          fz={13}
          c={statusColor}
          ta="center"
          pos="absolute"
          bottom={16}
          left={16}
          right={16}
          style={{
            pointerEvents: 'none',
            textWrap: 'balance',
          }}
        >
          {statusText}
        </Text>
      ) : null}
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
