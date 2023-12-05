import sharp from 'sharp'

export async function toWebp(dataURI: string) {
  const arr = dataURI.split(',')
  const buffer = await sharp(Buffer.from(arr[1], 'base64')).webp().toBuffer()
  const b64 = buffer.toString('base64')
  return `data:image/webp;base64,${b64}`
}
