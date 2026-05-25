'use client'

import _ from 'lodash'
import { AspectRatio, Center, Text } from '@mantine/core'
import { meaning, parseCharUrl } from '@/assets/chars'
import { useStudio } from '@/app/studio/studio-context'
import ShaderCanvas from '@/components/studio/ShaderCanvas'

export default function StudioCanvas() {
  const {
    state: { bgColor, charUrl, textColor },
  } = useStudio()
  const [country, year] = parseCharUrl(charUrl)
  const translation = _.get(meaning, [country, year])

  return (
    <Center pos="relative" h="calc(100dvh - 72px)" bg={bgColor}>
      <AspectRatio pos="relative" ratio={1} w="100%" maw="calc(100dvh - 120px)">
        <ShaderCanvas />
      </AspectRatio>
      {translation ? (
        <Text fz={14} c={textColor} className="absolute-horizontal" top={20}>
          {translation}
        </Text>
      ) : null}
    </Center>
  )
}
