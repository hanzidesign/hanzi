import { useNetwork } from 'wagmi'
import { useEffect } from 'react'
import { useAppDispatch } from 'store'
import { setChainId } from 'store/slices/nft'

export default function useChain() {
  const dispatch = useAppDispatch()
  const { chain } = useNetwork()
  const etherscanUrl = getEtherscanUrl(chain?.id)

  useEffect(() => {
    if (chain) {
      const { id: chainId } = chain
      const etherscan = getEtherscanUrl(chainId)
      dispatch(setChainId({ chainId, etherscan }))
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
    default:
      return 'https://optimistic.etherscan.io'
  }
}
