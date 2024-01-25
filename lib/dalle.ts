import _ from 'lodash'
import OpenAI from '@/lib/openai'

export async function createVariation(apiKey: string, dataURI: string) {
  const openai = new OpenAI({ apiKey })
  const image = await fetch(dataURI)
  const { data } = await openai.images.createVariation({
    model: 'dall-e-2',
    image,
    n: 2,
    response_format: 'b64_json',
    size: '1024x1024',
  })
  return _.compact(data.map((o) => o.b64_json))
}
