'use client'

import useAccount from '@/hooks/useAccount'
import useQueue from '@/hooks/useQueue'
import useNft from '@/hooks/useNft'
import useChain from '@/hooks/useChain'
import { useAppSelector } from '@/store'
import { Box } from '@mantine/core'
import { AspectRatio, Center } from '@mantine/core'
import SvgItem from '@/components/SvgItem'
import { Constants } from '@/types'

export default function Mint() {
  const { bgColor } = useAppSelector((state) => state.editor)

  // background tasks
  useAccount()
  useQueue()
  useNft()
  useChain()

  return (
    <>
      <Center h="calc(100dvh - 72px)" bg={bgColor}>
        <AspectRatio ratio={1} w="100%" maw="calc(100vh - 120px)">
          <SvgItem />
        </AspectRatio>
      </Center>

      {/* for d3 */}
      <Box
        pos="fixed"
        top={0}
        left={0}
        w={1200}
        h={1200}
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
