import _ from 'lodash'

export function wait(milliseconds = 500, any: any = undefined) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(any)
    }, milliseconds)
  })
}

export function fillArray(n: number) {
  return _.fill(Array(n), '').map((x, i) => i)
}

export function getIpfsUrl(url: string) {
  // ipfs://bafybeibq7cvtnmpmvqhig47rdg62zz4l4vfun3gdf4zwwd43awzc2vgn
  const u = url.replace('ipfs://', '')
  return `https://ipfs.io/ipfs/${u}`
}

export function getName(year: string, country: string, ch: string) {
  return `${year}-${country}-${ch}`
}

export function getEtherscanUrl(id?: number) {
  switch (id) {
    case 1:
      return 'https://etherscan.io'
    case 5:
      return 'https://goerli.etherscan.io'
    case 11155420:
      return 'https://sepolia-optimism.etherscan.io'
    case 10:
    default:
      return 'https://optimistic.etherscan.io'
  }
}
