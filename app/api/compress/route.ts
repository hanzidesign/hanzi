import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { toWebp } from '@/lib/sharp'

export async function POST(req: NextRequest) {
  try {
    const { dataURI } = await req.json()
    const image = await toWebp(dataURI)
    return NextResponse.json({ image })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
