import axios from 'axios'
import type { NftMetadata, Token } from 'types'

export async function mint(svg: string, metadata: NftMetadata) {
  const body = { svg, metadata }
  const { data } = await axios.post<{ token?: Token }>('/api', body)
  return data.token
}
