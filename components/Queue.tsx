'use client'

import _ from 'lodash'
import useMint from '@/hooks/useMint'
import useProgress from '@/hooks/useProgress'
import { useAppSelector, useAppDispatch } from '@/store'
import { setCancel, setStart } from '@/store/slices/queue'
import { delNft } from '@/store/slices/nft'
import { useMediaQuery } from '@mantine/hooks'
import { SimpleGrid, AspectRatio, Box, Text, Group, Image } from '@mantine/core'
import { Button, CloseButton, useMantineTheme } from '@mantine/core'
import { getIpfsUrl } from '@/utils/helper'
import { IoMdImage } from 'react-icons/io'
import { IoWalletSharp } from 'react-icons/io5'
import { BiError } from 'react-icons/bi'
import type { Job, NftTx } from '@/types'

function JobCard(props: { data: Job }) {
  const dispatch = useAppDispatch()
  const { list: nftList, etherscan, account } = useAppSelector((state) => state.nft)
  const theme = useMantineTheme()

  const { data } = props
  const { uid, startAt, ipfsUrl, createdAt, failed, dataURI } = data
  const at = `${createdAt}`
  const { hash } = nftList[at] || {}

  const { handleMint, isPending } = useMint(at, ipfsUrl)
  const [progress] = useProgress(data)

  return (
    <Box pos="relative">
      <AspectRatio
        ratio={1}
        style={{
          borderRadius: 16,
          border: `1px solid ${theme.colors.gray[9]}`,
          overflow: 'hidden',
        }}
      >
        <Image src={dataURI} />
      </AspectRatio>

      <Group h={48} py={8} style={{ justifyContent: 'space-between' }}>
        {hash ? (
          <>
            <Box />
            <Button
              variant="default"
              size="xs"
              onClick={() => {
                window.open(`${etherscan}/tx/${hash}`, '_blank')
              }}
            >
              Open Tx
            </Button>
          </>
        ) : (
          <>
            <Group gap={4}>
              {failed ? <BiError size={20} /> : account ? <IoMdImage size={20} /> : <IoWalletSharp size={20} />}
              <Text fz={14}>
                {failed
                  ? 'Error'
                  : startAt
                    ? ipfsUrl
                      ? 'Ready'
                      : `Uploading ${progress}%`
                    : account
                      ? 'Waiting'
                      : 'Wait for wallet'}
              </Text>
            </Group>
            {failed ? (
              <Button size="xs" onClick={() => dispatch(setStart({ uid, startAt: undefined }))}>
                Retry
              </Button>
            ) : startAt && ipfsUrl ? (
              <Button size="xs" onClick={handleMint} disabled={isPending}>
                Mint
              </Button>
            ) : null}
          </>
        )}
      </Group>

      <CloseButton
        onClick={() => {
          dispatch(setCancel(at))
          dispatch(delNft(at))
        }}
        pos="absolute"
        top={8}
        right={8}
        bg="rgba(248, 249, 250, 0.12)"
        style={{
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      />
    </Box>
  )
}

function NftTxCard(props: { data: NftTx }) {
  const dispatch = useAppDispatch()
  const theme = useMantineTheme()
  const { etherscan } = useAppSelector((state) => state.nft)
  const { createdAt, ipfsUrl, image, hash } = props.data
  const at = `${createdAt}`
  const img = image ? getIpfsUrl(image) : ''

  const { handleMint, isPending } = useMint(at, ipfsUrl)

  return (
    <Box pos="relative">
      <AspectRatio
        ratio={1}
        style={{
          borderRadius: 16,
          border: `1px solid ${theme.colors.gray[9]}`,
          overflow: 'hidden',
        }}
      >
        <img src={img} width="100%" height="100%" style={{ objectFit: 'cover' }} />
      </AspectRatio>
      <Group h={48} py={8} style={{ justifyContent: 'space-between' }}>
        {hash ? (
          <span />
        ) : (
          <Group gap={4}>
            <IoMdImage size={20} />
            <Text fz={14}>Ready</Text>
          </Group>
        )}

        {hash ? (
          <Button
            variant="default"
            size="xs"
            onClick={() => {
              window.open(`${etherscan}/tx/${hash}`, '_blank')
            }}
          >
            Open Tx
          </Button>
        ) : (
          <Button size="xs" onClick={handleMint} disabled={isPending}>
            Mint
          </Button>
        )}
      </Group>

      <CloseButton
        onClick={() => {
          dispatch(setCancel(at))
          dispatch(delNft(at))
        }}
        pos="absolute"
        top={8}
        right={8}
        style={{
          '&:hover': {
            backgroundColor: 'rgba(248, 249, 250, 0.2)',
          },
        }}
      />
    </Box>
  )
}

export default function Queue() {
  const matchesMD = useMediaQuery('(min-width: 992px)')
  const matchesSM = useMediaQuery('(min-width: 576px)')

  const { list: nft } = useAppSelector((state) => state.nft)
  const { list: queue } = useAppSelector((state) => state.queue)
  const q = _.orderBy(_.compact(_.map(queue, (v) => v)), ['createdAt'], ['desc'])
  const n = _.orderBy(
    _.compact(_.map(nft, (v) => v)).filter((n) => !Boolean(queue[n.createdAt])),
    ['createdAt'],
    ['desc']
  )

  return (
    <>
      {q.length > 0 || n.length > 0 ? (
        <SimpleGrid cols={matchesMD ? 4 : matchesSM ? 3 : 2}>
          {q.map((v) => (
            <JobCard key={v.uid} data={v} />
          ))}
          {n.map((v) => (
            <NftTxCard key={v.createdAt} data={v} />
          ))}
        </SimpleGrid>
      ) : (
        <Box h="60vh">
          <Text className="absolute-center nowrap" fz={20} color="gray">
            Your NFT will appear here...
          </Text>
        </Box>
      )}
    </>
  )
}
