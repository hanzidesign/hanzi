import sharp from 'sharp'

export type SharpExportFormat = 'png' | 'gif'

export async function compressStudioExport(
  input: Buffer,
  format: SharpExportFormat,
) {
  if (format === 'gif') {
    return sharp(input, { animated: true, limitInputPixels: false })
      .gif({
        effort: 10,
        colours: 256,
        dither: 1,
        keepDuplicateFrames: true,
      })
      .toBuffer()
  }

  return sharp(input, { limitInputPixels: false })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toBuffer()
}
