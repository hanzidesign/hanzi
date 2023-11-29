'use client'

import { useNetwork } from 'wagmi'
import { switchNetwork } from '@wagmi/core'
import { goerli, optimism } from 'wagmi/chains'
import { useEffect } from 'react'
import { useAppDispatch } from '@/store'
import { setChainId } from '@/store/slices/nft'

export default function useChain() {
  const dispatch = useAppDispatch()
  const { chain } = useNetwork()
  const etherscanUrl = getEtherscanUrl(chain?.id)

  const handleSwitch = async () => {
    try {
      await switchNetwork({ chainId: optimism.id })
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (chain) {
      const { id: chainId } = chain
      const etherscan = getEtherscanUrl(chainId)
      dispatch(setChainId({ chainId, etherscan }))

      if (chain.id !== optimism.id) {
        handleSwitch()
      }
    }
  }, [chain])

  return {
    chain,
    etherscanUrl,
  }
}

function getEtherscanUrl(id?: number) {
  switch (id) {
    case 1:
      return 'https://etherscan.io'
    case 5:
      return 'https://goerli.etherscan.io'
    case 10:
    default:
      return 'https://optimistic.etherscan.io'
  }
}
