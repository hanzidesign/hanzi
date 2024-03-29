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

export async function createPrompt(apiKey: string, char: string) {
  const openai = new OpenAI({ apiKey })

  const fallback = `Inspired by the chinese character ${char}`

  try {
    const { choices } = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Write a prompt for DALL·E to create an image related to the following idea.' },
        { role: 'user', content: fallback },
      ],
      model: 'gpt-3.5-turbo',
    })

    const completion = _.get(choices, '0.message.content', fallback)
    return { completion }
  } catch (error: any) {
    return { completion: fallback, error }
  }
}
