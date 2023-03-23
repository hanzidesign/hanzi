import { useNetwork } from 'wagmi'

export default function useChain() {
  const { chain } = useNetwork()
  const etherscanUrl = getEtherscanUrl(chain?.id)

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
