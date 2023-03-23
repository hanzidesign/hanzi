import { useState } from 'react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { writeContract } from '@wagmi/core'
import { prepareSafeMint } from 'lib/nftContract'
import { useAppSelector, useAppDispatch } from 'store'
import { setNft } from 'store/slices/nft'

export default function useMint(at: string, ipfsUrl?: string) {
  const { account } = useAppSelector((state) => state.nft)
  const dispatch = useAppDispatch()
  const { openConnectModal } = useConnectModal()
  const [minted, setMinted] = useState(false)

  const handleMint = async () => {
    if (!ipfsUrl) return

    try {
      if (!account) {
        if (openConnectModal) {
          openConnectModal()
        }
      } else if (!minted && ipfsUrl) {
        setMinted(true)
        const { hash } = await mint(ipfsUrl, account)
        dispatch(setNft({ at, hash, ipfsUrl }))
      }
    } catch (error) {
      setMinted(false)
      console.log(error)
    }
  }

  return { handleMint }
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
