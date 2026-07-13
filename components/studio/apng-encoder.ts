const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
const textEncoder = new TextEncoder()

type PngChunk = {
  type: string
  data: Uint8Array
}

export function encodeApngFromPngFrames({
  pngFrames,
  width,
  height,
  fps,
}: {
  pngFrames: ArrayBuffer[]
  width: number
  height: number
  fps: number
}) {
  if (pngFrames.length === 0) {
    throw new Error('APNG requires at least one frame')
  }

  const parsedFrames = pngFrames.map(readPngChunks)
  const firstFrame = parsedFrames[0]
  const ihdr = firstFrame.find((chunk) => chunk.type === 'IHDR')

  if (!ihdr) {
    throw new Error('APNG frame is missing PNG header data')
  }

  const parts: Uint8Array[] = [PNG_SIGNATURE, createPngChunk('IHDR', ihdr.data)]
  const ancillaryChunks = firstFrame.filter((chunk) => (
    chunk.type !== 'IHDR' && chunk.type !== 'IDAT' && chunk.type !== 'IEND'
  ))

  parts.push(createPngChunk('acTL', createAnimationControl(pngFrames.length)))
  parts.push(...ancillaryChunks.map((chunk) => createPngChunk(chunk.type, chunk.data)))

  let sequenceNumber = 0

  parsedFrames.forEach((chunks, frameIndex) => {
    parts.push(createPngChunk(
      'fcTL',
      createFrameControl(sequenceNumber, width, height, fps),
    ))
    sequenceNumber += 1

    const imageDataChunks = chunks.filter((chunk) => chunk.type === 'IDAT')
    if (imageDataChunks.length === 0) {
      throw new Error('APNG frame is missing image data')
    }

    for (const imageData of imageDataChunks) {
      if (frameIndex === 0) {
        parts.push(createPngChunk('IDAT', imageData.data))
      } else {
        const frameData = new Uint8Array(imageData.data.length + 4)
        writeUint32(frameData, 0, sequenceNumber)
        frameData.set(imageData.data, 4)
        parts.push(createPngChunk('fdAT', frameData))
        sequenceNumber += 1
      }
    }
  })

  parts.push(createPngChunk('IEND', new Uint8Array()))

  return new Blob(parts.map((part) => part.buffer.slice(
    part.byteOffset,
    part.byteOffset + part.byteLength,
  ) as ArrayBuffer), { type: 'image/apng' })
}

function readPngChunks(buffer: ArrayBuffer): PngChunk[] {
  const bytes = new Uint8Array(buffer)

  if (bytes.length < PNG_SIGNATURE.length
    || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    throw new Error('APNG frame is not a valid PNG')
  }

  const chunks: PngChunk[] = []
  let offset = PNG_SIGNATURE.length

  while (offset + 12 <= bytes.length) {
    const dataLength = readUint32(bytes, offset)
    const chunkEnd = offset + 12 + dataLength

    if (chunkEnd > bytes.length) {
      throw new Error('APNG frame contains a truncated PNG chunk')
    }

    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    chunks.push({
      type,
      data: bytes.slice(offset + 8, offset + 8 + dataLength),
    })
    offset = chunkEnd

    if (type === 'IEND') {
      break
    }
  }

  return chunks
}

function createAnimationControl(frameCount: number) {
  const data = new Uint8Array(8)
  writeUint32(data, 0, frameCount)
  writeUint32(data, 4, 0)
  return data
}

function createFrameControl(
  sequenceNumber: number,
  width: number,
  height: number,
  fps: number,
) {
  const data = new Uint8Array(26)
  writeUint32(data, 0, sequenceNumber)
  writeUint32(data, 4, width)
  writeUint32(data, 8, height)
  writeUint32(data, 12, 0)
  writeUint32(data, 16, 0)
  writeUint16(data, 20, 1)
  writeUint16(data, 22, fps)
  data[24] = 0
  data[25] = 0
  return data
}

function createPngChunk(type: string, data: Uint8Array) {
  const typeBytes = textEncoder.encode(type)
  const chunk = new Uint8Array(data.length + 12)

  writeUint32(chunk, 0, data.length)
  chunk.set(typeBytes, 4)
  chunk.set(data, 8)
  writeUint32(chunk, data.length + 8, crc32(chunk.subarray(4, data.length + 8)))
  return chunk
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff

  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 0x1000000
    + bytes[offset + 1] * 0x10000
    + bytes[offset + 2] * 0x100
    + bytes[offset + 3]
  ) >>> 0
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 0xff
  bytes[offset + 1] = (value >>> 16) & 0xff
  bytes[offset + 2] = (value >>> 8) & 0xff
  bytes[offset + 3] = value & 0xff
}

function writeUint16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 8) & 0xff
  bytes[offset + 1] = value & 0xff
}
