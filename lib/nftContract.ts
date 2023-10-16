import { getPublicClient, prepareWriteContract } from '@wagmi/core'
import { getContract } from 'viem'
import json from 'types/hanzi/Hanzi.json'

const address = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}`
const nftContract = getContract({
  address,
  abi: json.abi,
  publicClient: getPublicClient(),
})

export async function prepareSafeMint(account: string, tokenURI: string) {
  const config = await prepareWriteContract({
    address: nftContract.address as any,
    abi: json.abi,
    functionName: 'safeMint',
    args: [account, tokenURI],
  })
  return config
}

export { nftContract }
