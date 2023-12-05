'use client'

import { useRef, useState } from 'react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Stack, Group, Button, Box, Progress, Center, Text } from '@mantine/core'
import { useViewportSize } from '@mantine/hooks'
import useProgress from '@/hooks/useProgress'
import useMint from '@/hooks/useMint'
import { useAppSelector, useAppDispatch } from '@/store'
import { addJob, setStart } from '@/store/slices/queue'
import { useAppContext } from '@/hooks/useAppContext'
import { toDataURI } from '@/lib/toDataURI'
import Img from '@/components/Img'

type PreviewProps = {
  onBack: () => void
}

export default function Preview({ onBack }: PreviewProps) {
  const dispatch = useAppDispatch()
  const { openConnectModal } = useConnectModal()
  const { height } = useViewportSize()
  const uidRef = useRef('')

  const {
    state: { showDelle },
    getActiveImg,
  } = useAppContext()
  const { country, year, ch, name, description } = useAppSelector((state) => state.editor)
  const { etherscan, account } = useAppSelector((state) => state.nft)

  const job = useAppSelector((state) => state.queue.list[uidRef.current])
  const [progress] = useProgress(job)
  const { minted, handleMint } = useMint(uidRef.current, job?.ipfsUrl)
  const [hash, setHash] = useState('')

  const getDataURI = async () => {
    const imgData = getActiveImg()
    const dataURI = showDelle && imgData ? imgData : await toDataURI('NFT')
    if (!dataURI) throw new Error('no dataURI')
    return dataURI
  }

  const handleUpload = async () => {
    try {
      const dataURI = await getDataURI()

      if (!account && openConnectModal) {
        openConnectModal()
      }
      if (!job && account) {
        const createdAt = Date.now()
        const uid = `${createdAt}`
        uidRef.current = uid
        dispatch(addJob({ dataURI, name, description, country, year, ch, createdAt, uid, mintBy: account }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleClick = async () => {
    try {
      const response = await handleMint()
      if (response) {
        setHash(response.hash)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <Stack gap="xl" justify="space-between">
      <Box
        pos="relative"
        mx="auto"
        w={height / 2.2}
        h={height / 2.2}
        style={{
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <Img />
      </Box>
      <Center>
        {job ? (
          job.ipfsUrl ? (
            <Box w="100%" ta="center">
              {minted ? (
                hash ? (
                  <Button
                    px={32}
                    variant="default"
                    onClick={() => {
                      window.open(`${etherscan}/tx/${hash}`, '_blank')
                    }}
                  >
                    Open Tx
                  </Button>
                ) : (
                  <>
                    <Progress value={100} color="gray" size="xl" radius="xl" animated />

                    <Text fz={14} ta="center" mt={8} opacity={0.55}>
                      Wait for the transaction to be mined
                    </Text>
                  </>
                )
              ) : (
                <Button px={32} onClick={handleClick}>
                  Mint
                </Button>
              )}
            </Box>
          ) : job.failed ? (
            <Box w="100%" pos="relative">
              <Group grow>
                <Button variant="outline" onClick={onBack}>
                  Back
                </Button>
                <Button onClick={() => dispatch(setStart({ uid: job.uid, startAt: undefined }))}>Retry</Button>
              </Group>
              <Text
                className="absolute-horizontal"
                fz={14}
                opacity={0.55}
                bottom={-32}
                style={{
                  whiteSpace: 'nowrap',
                }}
              >
                Some error occurred while uploading
              </Text>
            </Box>
          ) : (
            <Box pos="relative" w="100%">
              <Progress.Root size="xl">
                <Progress.Section value={progress} animated>
                  <Progress.Label>{`${progress}%`}</Progress.Label>
                </Progress.Section>
              </Progress.Root>

              <Text fz={14} ta="center" mt={8} opacity={0.55}>
                {progress ? 'Wait for upload to complete' : 'Wait for upload to start'}
              </Text>
            </Box>
          )
        ) : (
          <Group grow w="100%">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={handleUpload}>Upload</Button>
          </Group>
        )}
      </Center>
    </Stack>
  )
}
