import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { svgToPng } from '@/lib/sharp'

export async function POST(req: NextRequest) {
  try {
    const { svg } = await req.json()
    const image = await svgToPng(svg)
    return NextResponse.json({ image })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
