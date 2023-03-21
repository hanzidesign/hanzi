import { getProvider, getContract, prepareWriteContract } from '@wagmi/core'
import json from 'types/ch/CH.json'
import type { CH } from 'types/ch/CH'

const address = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS
const nftContract = getContract({ address, abi: json.abi, signerOrProvider: getProvider() }) as CH

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
