import { NextResponse } from 'next/server'

import {
  compressStudioExport,
  type SharpExportFormat,
} from '@/lib/studio-export-compression'

export const runtime = 'nodejs'

const CONTENT_TYPES: Record<SharpExportFormat, string> = {
  png: 'image/png',
  gif: 'image/gif',
}

export async function POST(request: Request) {
  const format = request.headers.get('x-hanzi-export-format')

  if (!isSharpExportFormat(format)) {
    return NextResponse.json(
      { error: 'Sharp compression supports PNG and GIF only.' },
      { status: 415 },
    )
  }

  try {
    const input = Buffer.from(await request.arrayBuffer())
    const output = await compressStudioExport(input, format)

    return new NextResponse(new Uint8Array(output), {
      headers: {
        'Content-Type': CONTENT_TYPES[format],
        'Content-Length': String(output.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sharp compression failed.' },
      { status: 422 },
    )
  }
}

function isSharpExportFormat(value: string | null): value is SharpExportFormat {
  return value === 'png' || value === 'gif'
}
