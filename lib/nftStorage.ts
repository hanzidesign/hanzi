'use client'

import { NFTStorage } from 'nft.storage'
import { toFile } from './toFile'
import type { NftMetadata } from '@/types'

const token = process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN
if (!token) throw new Error('no api token of nft.storage')

const client = new NFTStorage({ token })

export async function uploadImage(dataURI: string, metadata: NftMetadata) {
  const { name } = metadata
  const image = toFile(dataURI, name)
  const token = await client.store({ ...metadata, image })
  // token {
  //   ipnft: 'bafyreifx7mlobbjxs6xftjeziwcid2ud7nx2ieyfmizzwplcvrzxuofzuu',
  //   url: 'ipfs://bafyreifx7mlobbjxs6xftjeziwcid2ud7nx2ieyfmizzwplcvrzxuofzuu/metadata.json',
  // }
  return token
}
