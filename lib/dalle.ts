import OpenAI from '@/lib/openai'

export async function createVariation(apiKey: string, dataURI: string) {
  const openai = new OpenAI({ apiKey })
  const image = await fetch(dataURI)
  const { data } = await openai.images.createVariation({
    image,
    n: 1,
    response_format: 'b64_json',
    size: '1024x1024',
  })
  return data[0].b64_json
}
