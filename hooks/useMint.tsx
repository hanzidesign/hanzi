'use client'

import { useState } from 'react'
import { useAppSelector, useAppDispatch } from '@/store'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useWriteContract } from 'wagmi'
import { notifications } from '@mantine/notifications'
import { setNft } from '@/store/slices/nft'
import { Hanzi__factory } from '@/hardhat/typechain-types'

export default function useMint(at: string, ipfsUrl?: string) {
  const dispatch = useAppDispatch()
  const { account } = useAppSelector((state) => state.nft)
  const nft = useAppSelector((state) => state.nft.list[at])

  const { writeContract, isPending, data: hash } = useWriteContract()
  const { openConnectModal } = useConnectModal()
  const [minted, setMinted] = useState(Boolean(nft?.hash))

  const mint = (account: any, ipfsUrl: string) => {
    setMinted(true)

    notifications.show({
      title: 'Confirm in wallet',
      message: 'Go to your wallet and send the transaction',
      color: 'dark',
    })

    writeContract(
      {
        address: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as any,
        abi: Hanzi__factory.abi,
        functionName: 'safeMint',
        args: [account, ipfsUrl],
      },
      {
        onError(error) {
          setMinted(false)
          console.error(error)

          notifications.show({
            title: 'Error',
            message: (
              <span>
                Fail to mint. <br />
                Please check your wallet.
              </span>
            ),
            color: 'red',
          })
        },
        onSuccess(hash) {
          dispatch(setNft({ at, hash, ipfsUrl }))
          notifications.show({
            title: 'Minted',
            message: 'Your NFT has been minted',
            color: 'teal',
          })
        },
      }
    )
  }

  const handleMint = async () => {
    if (!ipfsUrl) return

    if (!account) {
      if (openConnectModal) {
        openConnectModal()
      }
    } else if (!minted && ipfsUrl) {
      mint(account, ipfsUrl)
    }
  }

  return { nft, isPending, minted, hash, handleMint }
}
