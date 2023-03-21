export type Metadata = { country: string; year: number; ch: string }

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
