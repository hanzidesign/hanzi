import _ from 'lodash'
import { NFTStorage, File } from 'nft.storage'
import mimeTypes from 'mime-types'
import { png } from './data'
import type { NftMetadata } from 'types'

const token = process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN
if (!token) throw new Error('no api token of nft.storage')

const client = new NFTStorage({ token })

export async function uploadImage(dataURI: string, metadata: NftMetadata) {
  const { name } = metadata
  const image = dataURItoFile(dataURI, name)
  const token = await client.store({ ...metadata, image })
  // token {
  //   ipnft: 'bafyreifx7mlobbjxs6xftjeziwcid2ud7nx2ieyfmizzwplcvrzxuofzuu',
  //   url: 'ipfs://bafyreifx7mlobbjxs6xftjeziwcid2ud7nx2ieyfmizzwplcvrzxuofzuu/metadata.json',
  // }
  return token
}

const dataURItoFile = (dataURI: string, name: string) => {
  const arr = dataURI.split(',')
  const matches = arr[0].match(/:(.*?);/)
  const type = _.get(matches, [1], 'webp')
  const extension = mimeTypes.extension(type) || 'webp'
  const fileName = `${name}.${extension}`
  // to blob
  const bstr = decodeBase64(arr[1]) // atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  const file = new File([u8arr], fileName, { type })
  return file
}

const decodeBase64 = (data: string) => {
  return Buffer.from(data, 'base64').toString('binary')
}
