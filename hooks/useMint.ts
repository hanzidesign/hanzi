'use client'

import { useState } from 'react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { writeContract } from '@wagmi/core'
import { notifications } from '@mantine/notifications'
import { prepareSafeMint } from '@/lib/nftContract'
import { useAppSelector, useAppDispatch } from '@/store'
import { setNft } from '@/store/slices/nft'

export default function useMint(at: string, ipfsUrl?: string) {
  const dispatch = useAppDispatch()
  const { account } = useAppSelector((state) => state.nft)
  const nft = useAppSelector((state) => state.nft.list[at])

  const { openConnectModal } = useConnectModal()
  const [minted, setMinted] = useState(Boolean(nft?.hash))

  const handleMint = async () => {
    if (!ipfsUrl) return

    try {
      if (!account) {
        if (openConnectModal) {
          openConnectModal()
        }
      } else if (!minted && ipfsUrl) {
        setMinted(true)
        const response = await mint(ipfsUrl, account)
        dispatch(setNft({ at, hash: response.hash, ipfsUrl }))
        return response
      }
    } catch (error) {
      setMinted(false)
      console.log(error)
    }
  }

  return { nft, minted, handleMint }
}

async function mint(uri: string, account: string) {
  notifications.show({
    title: 'Confirm in wallet',
    message: 'Go to your wallet and send the transaction',
    color: 'dark',
  })
  const config = await prepareSafeMint(account, uri)
  const result = await writeContract(config)
  if (!result.hash) {
    throw new Error('no hash')
  }
  console.log({ hash: result.hash })
  return result
}
