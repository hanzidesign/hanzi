'use client'

import _ from 'lodash'
import useAccount from '@/hooks/useAccount'
import useQueue from '@/hooks/useQueue'
import useNft from '@/hooks/useNft'
import useChain from '@/hooks/useChain'
import useDalle from '@/hooks/useDalle'
import { useAppSelector } from '@/store'
import { AspectRatio, Center, Box, Text } from '@mantine/core'
import Img from '@/components/Img'
import SvgItem from '@/components/SvgItem'
import { Constants } from '@/types'
import { meaning, parseCharUrl } from '@/assets/chars'

export default function Mint() {
  const { bgColor, charUrl } = useAppSelector((state) => state.editor)
  const [country, year] = parseCharUrl(charUrl)
  const translation = _.get(meaning, [country, year])
  console.log({ translation })

  // background tasks
  useAccount()
  useQueue()
  useNft()
  useChain()
  useDalle()

  return (
    <>
      <Center pos="relative" h="calc(100dvh - 72px)" bg={bgColor}>
        <AspectRatio pos="relative" ratio={1} w="100%" maw="calc(100vh - 120px)">
          <Img />
        </AspectRatio>
        <Text fz={14} c="dark" className="absolute-horizontal" bottom={18}>
          {translation}
        </Text>
      </Center>

      {/* for d3 */}
      <Box
        pos="fixed"
        top={0}
        left={0}
        w={1024}
        h={1024}
        opacity={0}
        style={{
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        <SvgItem uid={Constants.svgId} />
      </Box>
    </>
  )
}
