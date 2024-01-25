import { metadataExample } from '@/assets/metadata'

export type Metadata = { country: string; year: string; ch: string; mintBy: string }
export type MetadataJson = typeof metadataExample

export type NftData = {
  charUrl: string
  svgData: string
  ptnUrl: string
  ptnData: string
  distortion: number
  blur: number
  width: number
  x: number
  y: number
  rotation: number
  textColor: string
  bgColor: string
  name: string
  description: string
}

export type NftTx = {
  createdAt: number
  ipfsUrl: string // nft.storage
  hash?: string // send tx
  image?: string
}

export type NftQueue = {
  uid: string
  createdAt: number
  startAt?: number
  ipfsUrl?: string // nft.storage
  saved?: boolean // save to nft
  failed?: boolean // no ipfs
}

export type Job = Metadata &
  NftQueue & {
    name: string
    description: string
    dataURI: string
  }

export type Trait = {
  trait_type: string
  value: string | number
}

export type NftMetadata = {
  name: string
  description: string
  external_url: string // web url
  attributes: Trait[]
}

export type Token = {
  ipnft: string
  url: string
}

export enum Constants {
  svgId = 'SVG-BOX',
}
