import sharp, { type Metadata } from 'sharp'

export type SharpExportFormat = 'png' | 'gif'
export const MAX_STUDIO_EXPORT_DECODED_PIXELS = 320_000_000

export async function compressStudioExport(
  input: Buffer,
  format: SharpExportFormat,
) {
  const animated = format === 'gif'
  const source = sharp(input, {
    animated,
    limitInputPixels: MAX_STUDIO_EXPORT_DECODED_PIXELS,
  })
  const metadata = await source.metadata()
  assertDecodedPixelBudget(metadata)

  if (format === 'gif') {
    return sharp(input, {
      animated: true,
      limitInputPixels: MAX_STUDIO_EXPORT_DECODED_PIXELS,
    })
      .gif({
        effort: 7,
        colours: 256,
        dither: 1,
        keepDuplicateFrames: true,
      })
      .toBuffer()
  }

  return sharp(input, { limitInputPixels: MAX_STUDIO_EXPORT_DECODED_PIXELS })
    .png({
      compressionLevel: 6,
      adaptiveFiltering: true,
    })
    .toBuffer()
}

export function assertDecodedPixelBudget(metadata: Metadata): number {
  const width = metadata.width
  const height = metadata.height
  const pages = metadata.pages ?? 1
  const pageHeight = metadata.pageHeight ?? (pages === 1 ? height : height === undefined ? undefined : height / pages)

  if (!isPositiveInteger(width) || !isPositiveInteger(height) || !isPositiveInteger(pages) || !isPositiveInteger(pageHeight)) {
    throw new Error('Sharp compression requires valid image dimensions')
  }

  const decodedPixels = width * pageHeight * pages

  if (!Number.isSafeInteger(decodedPixels) || decodedPixels <= 0 || decodedPixels > MAX_STUDIO_EXPORT_DECODED_PIXELS) {
    throw new Error(`Decoded image exceeds the ${MAX_STUDIO_EXPORT_DECODED_PIXELS.toLocaleString()}-pixel limit`)
  }

  return decodedPixels
}

function isPositiveInteger(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}
