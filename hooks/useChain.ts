'use client'

import { useAccount, useSwitchChain } from 'wagmi'
import { optimismSepolia, optimism } from 'wagmi/chains'
import { useEffect } from 'react'
import { useAppDispatch } from '@/store'
import { setChainId } from '@/store/slices/nft'
import { publicEnv } from '@/utils/env'
import { getEtherscanUrl } from '@/utils/helper'

export default function useChain() {
  const dispatch = useAppDispatch()
  const { switchChain } = useSwitchChain()

  const { chain } = useAccount()
  const etherscanUrl = getEtherscanUrl(chain?.id)
  const targetChain = publicEnv.isProd ? optimism : optimismSepolia

  useEffect(() => {
    if (chain) {
      const { id: chainId } = chain
      const etherscan = getEtherscanUrl(chainId)
      dispatch(setChainId({ chainId, etherscan }))

      if (chain.id !== targetChain.id) {
        switchChain(
          { chainId: targetChain.id },
          {
            onError(error, variables, context) {
              console.error(error)
            },
          }
        )
      }
    }
  }, [chain])

  return {
    chain,
    etherscanUrl,
  }
}
