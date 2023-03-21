export type Metadata = { country: string; year: number; ch: string }

export type NftData = {
  charUrl: string
  ptnUrl: string
  distortion: number
  blur: number
  width: number
  x: number
  y: number
  rotation: number
  textColor: string
  bgColor: string
}

export type Queue = {
  createdAt: number
  uploaded: boolean // nft.storage
  imageUrl?: string
  minted: boolean // send tx
  hash?: string
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
