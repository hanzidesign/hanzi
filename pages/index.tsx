import type { NextPage } from 'next'
import _ from 'lodash'
import Head from 'next/head'
import { useEffect } from 'react'
import { usePreviousDifferent } from 'rooks'
import useAccount from 'hooks/useAccount'
import useQueue from 'hooks/useQueue'
import useNft from 'hooks/useNft'
import useChain from 'hooks/useChain'
import { useAppSelector, useAppDispatch } from 'store'
import { addJob } from 'store/slices/queue'
import { selectNftData } from 'store/selectors'
import { AppShell, Navbar, Header, Text } from '@mantine/core'
import { Group, Button, Box, Title, Indicator } from '@mantine/core'
import { ScrollArea, AspectRatio, Center } from '@mantine/core'
import { modals } from '@mantine/modals'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import ToolStack from 'components/ToolStack'
import Queue from 'components/Queue'
import SvgItem from 'components/SvgItem'
import Lottie from 'components/Lottie'
import loadingAnim from 'assets/loading.json'
import { Constants } from 'types'

const Home: NextPage<{}> = () => {
  const dispatch = useAppDispatch()

  const { bgColor, country, year, ch } = useAppSelector((state) => state.editor)
  const nftData = useAppSelector(selectNftData)
  const { list: queue } = useAppSelector((state) => state.queue)
  const { list, account } = useAppSelector((state) => state.nft)

  const uploading = _.compact(
    _.filter(queue, (v) => Boolean(v?.startAt) && !Boolean(v?.ipfsUrl) && !Boolean(v?.failed))
  )
  const preUploading = usePreviousDifferent(uploading)

  const unmint = _.compact(_.map(list, (v) => v)).filter((el) => !el.hash)
  const preUnmint = usePreviousDifferent(unmint)

  // background tasks
  useAccount()
  useQueue()
  useNft()
  useChain()

  const openPreviewModal = () => {
    modals.openConfirmModal({
      title: (
        <span>
          <Title order={2} className="absolute-horizontal">
            Preview
          </Title>
        </span>
      ),
      centered: true,
      radius: 'lg',
      labels: { confirm: 'Upload', cancel: 'Back' },
      groupProps: {
        position: 'center',
        grow: true,
      },
      onConfirm: () => {
        dispatch(addJob({ ...nftData, country, year, ch }))
        // open connect
      },
      children: (
        <Box sx={{ margin: '32px 0 16px' }}>
          <AspectRatio
            ratio={1}
            sx={{
              width: '100%',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <SvgItem />
          </AspectRatio>
        </Box>
      ),
    })
  }

  const openQueueModal = () => {
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

  const openLoading = () => {
    modals.open({
      title: <span></span>,
      centered: true,
      children: (
        <Box pt={48} pb={64}>
          <Box w={160} mx="auto">
            <Lottie options={{ animationData: loadingAnim }} />
          </Box>
          <Text align="center" fz={32}>
            Please wait a moment
          </Text>
        </Box>
      ),
    })
  }

  useEffect(() => {
    if (unmint && preUnmint) {
      if (unmint.length > preUnmint.length) {
        openQueueModal()
      }
    }
  }, [unmint, preUnmint])

  useEffect(() => {
    if (account && uploading.length === 1 && preUploading?.length === 0) {
      openLoading()
    }
  }, [uploading, preUploading, account])

  return (
    <>
      <Head>
        <title>Chinese NFT</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AppShell
        header={
          <Header height={{ base: 72 }} p="md">
            <Group position="apart" spacing="xs">
              <Text>Chinese NFT</Text>
              <ConnectButton />
            </Group>
          </Header>
        }
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
                <Button
                  size="lg"
                  variant="outline"
                  color="dark"
                  radius="md"
                  onClick={openPreviewModal}
                >
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
    </>
  )
}

export default Home

export async function getStaticProps() {
  return {
    props: {},
    // Next.js will attempt to re-generate the page:
    // - When a request comes in
    // - At most once every 10 seconds
    revalidate: 60 * 60 * 24, // In seconds
  }
}
