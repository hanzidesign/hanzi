import type { NextPage } from 'next'
import _ from 'lodash'
import useAccount from 'hooks/useAccount'
import useQueue from 'hooks/useQueue'
import useNft from 'hooks/useNft'
import useChain from 'hooks/useChain'
import { useAppSelector } from 'store'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { AppShell, Navbar, Modal, Group } from '@mantine/core'
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
          <Box sx={{ textAlign: 'center' }}>
            <Text fz={16} color="dark" mb={64}>
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
      <AppShell
        header={<PageHeader showButton />}
        navbar={
          <Navbar width={{ base: 400 }}>
            <ScrollArea p={20}>
              <ToolStack />
              <Box sx={{ height: 120 }} />
              <Group
                grow
                sx={{
                  position: 'fixed',
                  bottom: 0,
                  zIndex: 10,
                  left: 10,
                  width: 380,
                  padding: 20,
                  backgroundColor: 'white',
                }}
              >
                <Indicator label={unmint.length} size={24} disabled={unmint.length === 0}>
                  <Button
                    size="lg"
                    variant="outline"
                    color="dark"
                    radius="md"
                    w="100%"
                    onClick={openQueueModal}
                  >
                    Queue
                  </Button>
                </Indicator>
                <Button size="lg" variant="outline" color="dark" radius="md" onClick={open}>
                  Mint
                </Button>
              </Group>
            </ScrollArea>
          </Navbar>
        }
        padding={20}
        styles={{
          body: { background: bgColor },
        }}
      >
        <Center h="100%">
          <AspectRatio
            ratio={1}
            sx={{
              width: '100%',
              maxWidth: `calc(100vh - 120px)`,
            }}
          >
            <SvgItem />
          </AspectRatio>
        </Center>

        {/* for d3 */}
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: -1,
            width: 1200,
            height: 1200,
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          <SvgItem uid={Constants.svgId} />
        </Box>
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
