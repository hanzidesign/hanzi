'use client'

import _ from 'lodash'
import { useEffect } from 'react'
import useAccount from '@/hooks/useAccount'
import useQueue from '@/hooks/useQueue'
import useNft from '@/hooks/useNft'
import useChain from '@/hooks/useChain'
import { useAppSelector } from '@/store'
import { useMediaQuery } from '@mantine/hooks'
import { Button, Box, Text } from '@mantine/core'
import { AspectRatio, Center } from '@mantine/core'
import { modals } from '@mantine/modals'
import SvgItem from '@/components/SvgItem'
import { Constants } from '@/types'

export default function Mint() {
  const { bgColor } = useAppSelector((state) => state.editor)
  const matches = useMediaQuery('(max-width: 756px)')

  // background tasks
  useAccount()
  useQueue()
  useNft()
  useChain()

  const openHint = () => {
    modals.closeAll()
    modals.open({
      id: 'hint',
      title: <span></span>,
      children: (
        <Center h="50dvh">
          <Box ta="center">
            <Text fz={16} c="dark" mb={64}>
              Open app on desktop for <br /> better experience
            </Text>
            <Button size="sm" radius="xl" onClick={() => modals.closeAll()}>
              Close
            </Button>
          </Box>
        </Center>
      ),
      fullScreen: true,
      styles: {
        inner: {
          width: '100vw',
        },
      },
    })
  }

  useEffect(() => {
    if (matches) {
      openHint()
    }
  }, [matches])

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
