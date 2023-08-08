import type { Metadata, Trait, NftMetadata } from 'types'

export function setAttributes(metadata: Metadata): Trait[] {
  const { country, year, ch, mintBy } = metadata
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
  const mintByTrait: Trait = {
    trait_type: 'mintBy',
    value: mintBy,
  }

  return [countryTrait, yearTrait, chTrait, mintByTrait]
}

export function setMetadata(name: string, description: string, attributes: Trait[]): NftMetadata {
  const external_url = process.env.NEXT_PUBLIC_WEB_URL
  if (!external_url) throw new Error('no web url')
  return {
    name,
    description,
    external_url,
    attributes,
  }
}
