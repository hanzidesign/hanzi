'use client'

import _ from 'lodash'
import { AspectRatio, Box, Center, Text } from '@mantine/core'
import { meaning, parseCharUrl } from '@/assets/chars'
import { useStudio } from '@/app/studio/studio-context'
import SvgEffectView from '@/components/studio/SvgEffectView'

export default function StudioCanvas() {
  const {
    state: { bgColor, charUrl, textColor },
  } = useStudio()
  const [country, year] = parseCharUrl(charUrl)
  const translation = _.get(meaning, [country, year])

  return (
    <Center pos="relative" h="calc(100dvh - 72px)" bg={bgColor}>
      <AspectRatio pos="relative" ratio={1} w="100%" maw="calc(100dvh - 120px)">
        <SvgEffectView />
      </AspectRatio>
      {translation ? (
        <Text fz={14} c={textColor} className="absolute-horizontal" top={20}>
          {translation}
        </Text>
      ) : null}
      <Box className="sr-only" aria-live="polite">
        Hanzi Studio SVG effect view
      </Box>
    </Center>
  )
}
