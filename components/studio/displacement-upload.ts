export const DISPLACEMENT_UPLOAD_MAX_BYTES = 5 * 1024 * 1024

const ACCEPTED_DISPLACEMENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
])

export type DisplacementUploadCandidate = {
  name: string
  type: string
  size: number
}

export function getDisplacementUploadError(
  file: DisplacementUploadCandidate | null,
) {
  if (!file) {
    return null
  }

  if (!ACCEPTED_DISPLACEMENT_TYPES.has(file.type)) {
    return 'Use a PNG/JPG/JPEG image.'
  }

  if (file.size >= DISPLACEMENT_UPLOAD_MAX_BYTES) {
    return 'Use an image under 5MB.'
  }

  return null
}
