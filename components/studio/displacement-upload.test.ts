import { describe, expect, it } from 'vitest'

import {
  DISPLACEMENT_UPLOAD_MAX_BYTES,
  getDisplacementUploadError,
} from './displacement-upload'

describe('displacement upload validation', () => {
  it('accepts png and jpeg images under 5MB', () => {
    expect(
      getDisplacementUploadError({
        name: 'pattern.png',
        type: 'image/png',
        size: DISPLACEMENT_UPLOAD_MAX_BYTES - 1,
      }),
    ).toBeNull()
    expect(
      getDisplacementUploadError({
        name: 'pattern.jpeg',
        type: 'image/jpeg',
        size: DISPLACEMENT_UPLOAD_MAX_BYTES - 1,
      }),
    ).toBeNull()
  })

  it('rejects unsupported image types and files at or above 5MB', () => {
    expect(
      getDisplacementUploadError({
        name: 'pattern.gif',
        type: 'image/gif',
        size: 1024,
      }),
    ).toMatch(/png\/jpg\/jpeg/i)
    expect(
      getDisplacementUploadError({
        name: 'pattern.jpg',
        type: 'image/jpeg',
        size: DISPLACEMENT_UPLOAD_MAX_BYTES,
      }),
    ).toMatch(/under 5MB/i)
  })
})
