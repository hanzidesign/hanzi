import { NextResponse } from 'next/server'
import { createVariation } from '@/lib/openai'

export async function POST(request: Request) {
  try {
    const { apiKey, dataURI } = await request.json()
    const image = await createVariation(apiKey, dataURI)
    if (!image) throw new Error('no img')
    return Response.json({ image })
  } catch (err) {
    console.error(err)
    NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
