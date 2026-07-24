import { NextResponse } from 'next/server'

import {
  compressStudioExport,
  type SharpExportFormat,
} from '@/lib/studio-export-compression'

export const runtime = 'nodejs'
export const MAX_STUDIO_EXPORT_INPUT_BYTES = 128 * 1024 * 1024

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
    const input = await readRequestBody(request)
    const output = await compressStudioExport(input, format)

    return new NextResponse(new Uint8Array(output), {
      headers: {
        'Content-Type': CONTENT_TYPES[format],
        'Content-Length': String(output.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof RequestBodyLimitError) {
      return NextResponse.json({ error: error.message }, { status: 413 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sharp compression failed.' },
      { status: 422 },
    )
  }
}

export class RequestBodyLimitError extends Error {
  constructor(limit = MAX_STUDIO_EXPORT_INPUT_BYTES) {
    super(`Studio export input exceeds the ${Math.round(limit / (1024 * 1024))} MiB limit.`)
    this.name = 'RequestBodyLimitError'
  }
}

export async function readRequestBody(
  request: Request,
  maxBytes = MAX_STUDIO_EXPORT_INPUT_BYTES,
): Promise<Buffer> {
  const contentLength = request.headers.get('content-length')

  if (contentLength !== null) {
    const parsedLength = Number(contentLength)

    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      throw new Error('Invalid Content-Length header.')
    }

    if (parsedLength > maxBytes) {
      throw new RequestBodyLimitError(maxBytes)
    }
  }

  if (!request.body) {
    return Buffer.alloc(0)
  }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      if (!value) {
        continue
      }

      totalBytes += value.byteLength

      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new RequestBodyLimitError(maxBytes)
      }

      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  return Buffer.concat(chunks, totalBytes)
}

function isSharpExportFormat(value: string | null): value is SharpExportFormat {
  return value === 'png' || value === 'gif'
}
