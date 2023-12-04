import _ from 'lodash'
import mimeTypes from 'mime-types'

export const toFile = (dataURI: string, name: string) => {
  const arr = dataURI.split(',')
  const matches = arr[0].match(/:(.*?);/)
  const type = _.get(matches, [1], 'webp')
  const extension = mimeTypes.extension(type) || 'webp'
  const fileName = `${name}.${extension}`
  // to blob
  const bstr = decodeBase64(arr[1]) // atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  const file = new File([u8arr], fileName, { type })
  return file
}

const decodeBase64 = (data: string) => {
  return Buffer.from(data, 'base64').toString('binary')
}
