import _ from 'lodash'
import { useState, useEffect } from 'react'
import useMint from 'hooks/useMint'
import { useAppSelector, useAppDispatch } from 'store'
import { setCancel } from 'store/slices/queue'
import { delNft } from 'store/slices/nft'
import { useInterval, useMediaQuery } from '@mantine/hooks'
import { SimpleGrid, AspectRatio, Box, Text, Group } from '@mantine/core'
import { Button, CloseButton } from '@mantine/core'
import Item, { SvgItemProps } from 'components/SvgItem/Item'
import { getIpfsUrl } from 'utils/helper'
import { IoMdImage } from 'react-icons/io'
import type { Job, NftTx } from 'types'

function JobCard(props: { data: Job }) {
  const dispatch = useAppDispatch()
  const { list: nftList, etherscan } = useAppSelector((state) => state.nft)

  const { data } = props
  const itemProps = getItemProps(data)
  const { uid, startAt, ipfsUrl, createdAt } = data
  const at = `${createdAt}`
  const { hash } = nftList[at] || {}

  const { handleMint } = useMint(at, ipfsUrl)
  const [progress, setProgress] = useState(0)

  const interval = useInterval(() => {
    if (startAt && progress <= 100) {
      const diff = Date.now() - startAt
      const p = _.round(diff / 1000)
      setProgress(p)

      if (p >= 100 || ipfsUrl) {
        interval.stop()
      }
    }
  }, 1000)

  useEffect(() => {
    if (startAt && !ipfsUrl) {
      interval.start()
    }
    return interval.stop
  }, [startAt, ipfsUrl])

  return (
    <Box pos="relative">
      <AspectRatio
        ratio={1}
        sx={(theme) => ({
          borderRadius: 16,
          border: `1px solid ${theme.colors.gray[9]}`,
          overflow: 'hidden',
        })}
      >
        <Item {...itemProps} />
      </AspectRatio>

      <Group py={8} sx={{ justifyContent: 'space-between' }}>
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
            <Group spacing={4}>
              <IoMdImage size={20} />
              <Text fz={14}>
                {startAt ? (ipfsUrl ? 'Ready' : `Uploading ${progress}%`) : 'Waiting'}
              </Text>
            </Group>
            {startAt && ipfsUrl ? (
              <Button size="xs" onClick={handleMint}>
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
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          '&:hover': {
            backgroundColor: 'rgba(248, 249, 250, 0.2)',
          },
        }}
      />
    </Box>
  )
}

function NftTxCard(props: { data: NftTx }) {
  const dispatch = useAppDispatch()
  const { etherscan } = useAppSelector((state) => state.nft)
  const { createdAt, ipfsUrl, image, hash } = props.data
  const at = `${createdAt}`
  const img = image ? getIpfsUrl(image) : ''

  const { handleMint } = useMint(at, ipfsUrl)

  return (
    <Box pos="relative">
      <AspectRatio
        ratio={1}
        sx={(theme) => ({
          borderRadius: 16,
          border: `1px solid ${theme.colors.gray[9]}`,
          overflow: 'hidden',
        })}
      >
        <img src={img} width="100%" height="100%" style={{ objectFit: 'cover' }} />
      </AspectRatio>
      <Group py={8} sx={{ justifyContent: 'space-between' }}>
        {hash ? (
          <span />
        ) : (
          <Group spacing={4}>
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
          <Button size="xs" onClick={handleMint}>
            Mint
          </Button>
        )}
      </Group>

      <CloseButton
        onClick={() => {
          dispatch(setCancel(at))
          dispatch(delNft(at))
        }}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          '&:hover': {
            backgroundColor: 'rgba(248, 249, 250, 0.2)',
          },
        }}
      />
    </Box>
  )
}

export default function Queue() {
  const matches = useMediaQuery('(min-width: 992px)')

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
        <SimpleGrid cols={matches ? 4 : 3}>
          {q.map((v) => (
            <JobCard key={v.uid} data={v} />
          ))}
          {n.map((v) => (
            <NftTxCard key={v.createdAt} data={v} />
          ))}
        </SimpleGrid>
      ) : (
        <Box h="60vh">
          <Text className="absolute-center" fz={20} color="gray">
            Your NFT will appear here...
          </Text>
        </Box>
      )}
    </>
  )
}

function getItemProps(data: Job): SvgItemProps {
  const { uid, svgData, ptnUrl, width, distortion, blur, x, y, rotation, textColor, bgColor } = data
  return {
    fId: uid,
    svgData,
    ptnUrl,
    width,
    distortion,
    blur,
    x,
    y,
    rotation,
    textColor,
    bgColor,
  }
}
