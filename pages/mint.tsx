import type { NextPage } from 'next'
import _ from 'lodash'
import useAccount from 'hooks/useAccount'
import useQueue from 'hooks/useQueue'
import useNft from 'hooks/useNft'
import useChain from 'hooks/useChain'
import { useAppSelector } from 'store'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { AppShell, Modal, Group } from '@mantine/core'
import { Button, Box, Title, Indicator, Text } from '@mantine/core'
import { ScrollArea, AspectRatio, Center } from '@mantine/core'
import { modals } from '@mantine/modals'
import PageHeader from 'components/PageHeader'
import ToolStack from 'components/ToolStack'
import Preview from 'components/Preview'
import Queue from 'components/Queue'
import SvgItem from 'components/SvgItem'
import { Constants } from 'types'
import { useEffect } from 'react'

const Mint: NextPage<{}> = () => {
  const { bgColor } = useAppSelector((state) => state.editor)
  const { list } = useAppSelector((state) => state.nft)
  const [opened, { open, close }] = useDisclosure(false)
  const matches = useMediaQuery('(max-width: 756px)')
  const unmint = _.compact(_.map(list, (v) => v)).filter((el) => !el.hash)

  // background tasks
  useAccount()
  useQueue()
  useNft()
  useChain()

  const openQueueModal = () => {
    close()
    modals.open({
      title: <span></span>,
      centered: true,
      size: 'xl',
      children: <Queue />,
      styles: {
        content: {
          height: '100%',
        },
      },
    })
  }

  const openHint = () => {
    close()
    modals.open({
      title: <span></span>,
      children: (
        <Center h="50vh">
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
      <AppShell header={{ height: 72 }} navbar={{ width: 400, breakpoint: 'xs' }} p={0}>
        <AppShell.Header p={16} px={{ sm: 40 }}>
          <PageHeader showButton />
        </AppShell.Header>

        <AppShell.Navbar w={400}>
          <ScrollArea p={20}>
            <ToolStack />
            <Box h={120} />
            <Group
              grow
              pos="fixed"
              bottom={0}
              left={10}
              w={380}
              p={20}
              bg="white"
              style={{
                zIndex: 10,
              }}
            >
              <Indicator label={unmint.length} size={24} disabled={unmint.length === 0}>
                <Button size="lg" variant="outline" color="dark" radius="md" w="100%" onClick={openQueueModal}>
                  Queue
                </Button>
              </Indicator>
              <Button size="lg" variant="outline" color="dark" radius="md" onClick={open}>
                Mint
              </Button>
            </Group>
          </ScrollArea>
        </AppShell.Navbar>

        <AppShell.Main bg={bgColor}>
          <Center h="100%">
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
        </AppShell.Main>
      </AppShell>

      <Modal
        opened={opened}
        onClose={close}
        title={
          <span>
            <Title order={2} className="absolute-horizontal">
              Preview
            </Title>
          </span>
        }
        radius="lg"
        centered
      >
        <Preview onBack={close} />
      </Modal>
    </>
  )
}

export default Mint
