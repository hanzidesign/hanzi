'use client'

import _ from 'lodash'
import useAccount from '@/hooks/useAccount'
import useQueue from '@/hooks/useQueue'
import useNft from '@/hooks/useNft'
import useChain from '@/hooks/useChain'
import useDalle from '@/hooks/useDalle'
import useImageLoader from '@/hooks/useImageLoader'
import { useAppSelector } from '@/store'
import { AspectRatio, Center, Box, Text } from '@mantine/core'
import Img from '@/components/Img'
import SvgItem from '@/components/SvgItem'
import { Constants } from '@/types'
import { meaning, parseCharUrl } from '@/assets/chars'
import classes from './page.module.css'

export default function Mint() {
  const { bgColor, charUrl, textColor } = useAppSelector((state) => state.editor)
  const [country, year] = parseCharUrl(charUrl)
  const translation = _.get(meaning, [country, year])

  // background tasks
  useAccount()
  useQueue()
  useNft()
  useChain()
  useDalle()
  useImageLoader()

  return (
    <>
      <Center pos="relative" h="calc(100dvh - 72px)" bg={bgColor}>
        <AspectRatio pos="relative" ratio={1} w="100%" maw="calc(100dvh - 120px)">
          <Img />
        </AspectRatio>
        <Text fz={14} c={textColor} className="absolute-horizontal" top={20}>
          {translation}
        </Text>
      </Center>

      {/* for d3 */}
      <Box className={classes.d3}>
        <SvgItem uid={Constants.svgId} />
      </Box>
    </>
  )
}
