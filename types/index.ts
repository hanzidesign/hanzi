export type Metadata = { country: string; year: number; ch: string }

export type NftData = {
  charUrl: string
  ptnUrl: string
  seed: number
  isTc: boolean
  distortion: number
  blur: number
  width: number
  x: number
  y: number
  rotation: number
  textColor: string
  bgColor: string
}

export type NFT = {
  createdAt: number
  imageUrl: string // nft.storage
  hash: string // send tx
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
