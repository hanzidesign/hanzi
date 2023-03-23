export type Metadata = { country: string; year: number; ch: string }

export type NftData = {
  charUrl: string
  svgData: string
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

export type NftTx = {
  createdAt: number
  ipfsUrl: string // nft.storage
  hash: string // send tx
}

export type NftQueue = Partial<NftTx> & {
  uid: string
  createdAt: number
  startAt?: number
}

export type Job = NftData & NftQueue

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
