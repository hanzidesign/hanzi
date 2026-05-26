'use client'

import { useState } from 'react'
import _ from 'lodash'
import { AspectRatio, Center, Text } from '@mantine/core'
import { meaning, parseCharUrl } from '@/assets/chars'
import { getCharacterDisplayState, useStudioStore } from '@/app/studio/studio-store'
import {
  IDLE_CHARACTER_MESH_STATUS,
  type CharacterMeshStatus,
} from '@/components/studio/character-mesh-status'
import ShaderCanvas from '@/components/studio/ShaderCanvas'

export default function StudioCanvas() {
  const character = useStudioStore((store) => store.character)
  const bgColor = useStudioStore((store) => store.view.backgroundColor)
  const [meshStatus, setMeshStatus] = useState<CharacterMeshStatus>(
    IDLE_CHARACTER_MESH_STATUS,
  )
  const { charUrl } = getCharacterDisplayState(character)
  const [country, year] = parseCharUrl(charUrl)
  const translation = _.get(meaning, [country, year])
  const meshStatusText =
    meshStatus.state === 'idle' ? null : meshStatus.message
  const statusColor = meshStatus.state === 'error' ? 'red.6' : 'dark.7'

  return (
    <div
      style={{
        position: 'relative',
        height: 'calc(100dvh - 72px)',
        background: bgColor,
      }}
    >
      <Center pos="relative" h="100%" bg={bgColor}>
        <AspectRatio pos="relative" ratio={1} w="100%" maw="calc(100dvh - 120px)">
          <ShaderCanvas onMeshStatusChange={setMeshStatus} />
        </AspectRatio>
        {translation ? (
          <Text fz={14} c="dark.7" className="absolute-horizontal" top={20}>
            {translation}
          </Text>
        ) : null}
      </Center>
      {meshStatusText ? (
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
          {meshStatusText}
        </Text>
      ) : null}
    </div>
  )
}
