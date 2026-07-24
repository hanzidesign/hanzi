import { describe, expect, it } from 'vitest'
import { GIFEncoder } from 'gifenc'
import sharp, { type Metadata } from 'sharp'

import {
  assertDecodedPixelBudget,
  compressStudioExport,
  MAX_STUDIO_EXPORT_DECODED_PIXELS,
} from './studio-export-compression'

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

  it('keeps decoded RGBA pixels exact through PNG compression', async () => {
    const pixels = Buffer.from([
      255, 0, 0, 255,
      0, 255, 0, 127,
      0, 0, 255, 64,
      255, 255, 255, 0,
    ])
    const input = await sharp(pixels, {
      raw: { width: 2, height: 2, channels: 4 },
    }).png().toBuffer()
    const output = await compressStudioExport(input, 'png')
    const decoded = await sharp(output).raw().toBuffer()

    expect(decoded).toEqual(pixels)
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

  it('accounts for aggregate animated decoded pixels and fails closed on dimensions', () => {
    expect(assertDecodedPixelBudget({ width: 10, height: 20 } as Metadata)).toBe(200)
    expect(assertDecodedPixelBudget({ width: 10, height: 40, pages: 2, pageHeight: 20 } as Metadata)).toBe(400)
    expect(() => assertDecodedPixelBudget({ width: 0, height: 1 } as Metadata)).toThrow('valid image dimensions')
    expect(() => assertDecodedPixelBudget({ width: 10, height: 10, pages: 2, pageHeight: 10 } as Metadata)).not.toThrow()
    expect(() => assertDecodedPixelBudget({ width: MAX_STUDIO_EXPORT_DECODED_PIXELS + 1, height: 1 } as Metadata)).toThrow('pixel limit')
  })

  it('allows the 302 GIF frames produced by Motion Speed 0.5 at 1024px', () => {
    const frameSize = 1024
    const pages = 302

    expect(assertDecodedPixelBudget({
      width: frameSize,
      height: frameSize * pages,
      pages,
      pageHeight: frameSize,
    } as Metadata)).toBe(frameSize * frameSize * pages)
  })
})
