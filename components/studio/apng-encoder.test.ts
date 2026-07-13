import { describe, expect, it } from 'vitest'

import { encodeApngFromPngFrames } from './apng-encoder'

describe('APNG encoder', () => {
  it('assembles looping frames with an exact rational frame rate', async () => {
    const pngFrame = createTestPng()
    const blob = encodeApngFromPngFrames({
      pngFrames: [pngFrame, pngFrame],
      width: 1024,
      height: 1024,
      fps: 24,
    })
    const chunks = readChunkData(await blob.arrayBuffer())

    expect(blob.type).toBe('image/apng')
    expect(chunks.map((chunk) => chunk.type)).toEqual([
      'IHDR', 'acTL', 'fcTL', 'IDAT', 'fcTL', 'fdAT', 'IEND',
    ])
    expect(readUint32(chunks[1].data, 0)).toBe(2)
    expect(readUint32(chunks[1].data, 4)).toBe(0)
    expect(readUint16(chunks[2].data, 20)).toBe(1)
    expect(readUint16(chunks[2].data, 22)).toBe(24)
    expect(readUint32(chunks[4].data, 0)).toBe(1)
    expect(readUint32(chunks[5].data, 0)).toBe(2)
  })
})

function createTestPng() {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  return concat([
    signature,
    createUncheckedChunk('IHDR', new Uint8Array(13)),
    createUncheckedChunk('IDAT', new Uint8Array([1, 2, 3])),
    createUncheckedChunk('IEND', new Uint8Array()),
  ]).buffer
}

function createUncheckedChunk(type: string, data: Uint8Array) {
  const chunk = new Uint8Array(data.length + 12)
  writeUint32(chunk, 0, data.length)
  chunk.set(new TextEncoder().encode(type), 4)
  chunk.set(data, 8)
  return chunk
}

function readChunkData(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const chunks: Array<{ type: string; data: Uint8Array }> = []
  let offset = 8

  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset)
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    chunks.push({ type, data: bytes.slice(offset + 8, offset + 8 + length) })
    offset += length + 12
  }

  return chunks
}

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 0x1000000
    + bytes[offset + 1] * 0x10000
    + bytes[offset + 2] * 0x100
    + bytes[offset + 3]
  ) >>> 0
}

function readUint16(bytes: Uint8Array, offset: number) {
  return bytes[offset] * 0x100 + bytes[offset + 1]
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 0xff
  bytes[offset + 1] = (value >>> 16) & 0xff
  bytes[offset + 2] = (value >>> 8) & 0xff
  bytes[offset + 3] = value & 0xff
}
