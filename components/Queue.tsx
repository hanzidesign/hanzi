import _ from 'lodash'
import { useState, useEffect } from 'react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { writeContract } from '@wagmi/core'
import useChain from 'hooks/useChain'
import { prepareSafeMint } from 'lib/nftContract'
import { useAppSelector, useAppDispatch } from 'store'
import { setCancel, setHash } from 'store/slices/queue'
import { useInterval, useMediaQuery } from '@mantine/hooks'
import { SimpleGrid, AspectRatio, Box, Text, Group, Button } from '@mantine/core'
import Item, { SvgItemProps } from 'components/SvgItem/Item'
import { IoMdImage } from 'react-icons/io'
import type { Job } from 'types'

type ItemCardProps = {
  data: Job
}

function ItemCard(props: ItemCardProps) {
  const dispatch = useAppDispatch()
  const { account } = useAppSelector((state) => state.nft)

  const { openConnectModal } = useConnectModal()
  const { etherscanUrl } = useChain()

  const { data } = props
  const itemProps = getItemProps(data)
  const { uid, startAt, ipfsUrl, hash } = data

  const [progress, setProgress] = useState(0)
  const [minted, setMinted] = useState(false)

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

  const handleMint = async () => {
    try {
      if (!account) {
        if (openConnectModal) {
          openConnectModal()
        }
      } else if (!minted && ipfsUrl) {
        setMinted(true)
        const { hash } = await mint(ipfsUrl, account)
        dispatch(setHash({ uid, hash }))
      }
    } catch (error) {
      setMinted(false)
      console.log(error)
    }
  }

  useEffect(() => {
    if (startAt && !ipfsUrl) {
      interval.start()
    }
    return interval.stop
  }, [startAt, ipfsUrl])

  return (
    <Box>
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
                window.open(`${etherscanUrl}/tx/${hash}`, '_blank')
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
            {startAt ? (
              ipfsUrl ? (
                <Button size="xs" onClick={handleMint}>
                  Mint
                </Button>
              ) : null
            ) : (
              <Button variant="default" size="xs" onClick={() => dispatch(setCancel(uid))}>
                Cancel
              </Button>
            )}
          </>
        )}
      </Group>
    </Box>
  )
}

export default function Queue() {
  const { list } = useAppSelector((state) => state.queue)
  const arr = _.orderBy(_.compact(_.map(list, (v) => v)), ['createdAt'], ['desc'])
  const matches = useMediaQuery('(min-width: 992px)')

  return (
    <>
      {arr.length > 0 ? (
        <SimpleGrid cols={matches ? 4 : 3}>
          {arr.map((v) => (
            <ItemCard key={v.uid} data={v} />
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

async function mint(uri: string, account: string) {
  const config = await prepareSafeMint(account, uri)
  const result = await writeContract(config)
  if (!result.hash) {
    throw new Error('no hash')
  }
  console.log({ hash: result.hash })
  return result
}
