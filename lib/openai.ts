import OpenAI from 'openai'
import { toFile } from './toFile'

export async function createVariation(apiKey: string, dataURI: string) {
  const image = toFile(dataURI, 'img')
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  const { data } = await openai.images.createVariation({
    image,
    n: 1,
    response_format: 'b64_json',
    size: '1024x1024',
  })
  return data[0].b64_json
}
