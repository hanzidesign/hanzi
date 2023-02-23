import type { Metadata, Trait, NftMetadata } from 'types'

export function setAttributes(metadata: Metadata): Trait[] {
  const { country, year, ch } = metadata
  const countryTrait: Trait = {
    trait_type: 'country',
    value: country,
  }
  const yearTrait: Trait = {
    trait_type: 'year',
    value: year,
  }
  const chTrait: Trait = {
    trait_type: 'ch',
    value: ch,
  }

  return [countryTrait, yearTrait, chTrait]
}

export function setMetadata(name: string, account: string, attributes: Trait[]): NftMetadata {
  return {
    name: `${name}`,
    description: `Created by ${account}`,
    external_url: `${window.location.origin}/token/${name}`,
    attributes,
  }
}
