import { NFTStorage, File } from 'nft.storage'

const token = process.env.NFT_STORAGE_TOKEN
const client = new NFTStorage({ token })

export async function uploadImage(file: BlobPart, name: string) {
  const fileName = `${name}.png`
  const imageFile = new File([file], fileName, { type: 'image/png' })
  const metadata = await client.store({
    name,
    description: "Just try to funge it. You can't do it.",
    image: imageFile,
  })
  return metadata
}
