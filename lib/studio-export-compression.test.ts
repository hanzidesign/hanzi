import { describe, expect, it } from 'vitest'
import { GIFEncoder } from 'gifenc'
import sharp from 'sharp'

import { compressStudioExport } from './studio-export-compression'

describe('Sharp Studio export compression', () => {
  it('compresses PNG without changing its dimensions', async () => {
    const input = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 4,
        background: '#f4f1e8',
      },
    }).png().toBuffer()
    const output = await compressStudioExport(input, 'png')
    const metadata = await sharp(output).metadata()

    expect(metadata.format).toBe('png')
    expect(metadata.width).toBe(8)
    expect(metadata.height).toBe(8)
  })

  it('compresses GIF while preserving animation pages and loop metadata', async () => {
    const encoder = GIFEncoder()
    const palette = [[255, 0, 0], [0, 0, 255]]
    encoder.writeFrame(new Uint8Array([0, 0, 0, 0]), 2, 2, {
      palette,
      delay: 80,
      repeat: 0,
    })
    encoder.writeFrame(new Uint8Array([1, 1, 1, 1]), 2, 2, {
      palette,
      delay: 90,
      repeat: 0,
    })
    encoder.finish()

    const output = await compressStudioExport(Buffer.from(encoder.bytes()), 'gif')
    const metadata = await sharp(output, { animated: true }).metadata()

    expect(metadata.format).toBe('gif')
    expect(metadata.pages).toBe(2)
    expect(metadata.pageHeight).toBe(2)
    expect(metadata.loop).toBe(0)
    expect(metadata.delay).toEqual([80, 90])
  })
})
