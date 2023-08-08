import { getProvider, getContract, prepareWriteContract } from '@wagmi/core'
import json from 'types/hanzi/Hanzi.json'
import type { Hanzi } from 'types/hanzi/Hanzi'

const address = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS
const nftContract = getContract({
  address,
  abi: json.abi,
  signerOrProvider: getProvider(),
}) as Hanzi

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
