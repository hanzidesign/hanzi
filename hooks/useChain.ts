'use client'

import { useNetwork } from 'wagmi'
import { switchNetwork } from '@wagmi/core'
import { optimismGoerli, optimism } from 'wagmi/chains'
import { useEffect } from 'react'
import { useAppDispatch } from '@/store'
import { setChainId } from '@/store/slices/nft'
import { publicEnv } from '@/utils/env'
import { getEtherscanUrl } from '@/utils/helper'

export default function useChain() {
  const dispatch = useAppDispatch()
  const { chain } = useNetwork()
  const etherscanUrl = getEtherscanUrl(chain?.id)
  const targetChain = publicEnv.isProd ? optimism : optimismGoerli

  const handleSwitch = async () => {
    try {
      await switchNetwork({ chainId: targetChain.id })
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (chain) {
      const { id: chainId } = chain
      const etherscan = getEtherscanUrl(chainId)
      dispatch(setChainId({ chainId, etherscan }))

      if (chain.id !== targetChain.id) {
        handleSwitch()
      }
    }
  }, [chain])

  return {
    chain,
    etherscanUrl,
  }
}
