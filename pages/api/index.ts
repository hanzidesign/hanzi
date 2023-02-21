// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import connectMongo from 'utils/connectMongo'
import { convertSvg } from 'lib/convertSvg'
import { uploadImage } from 'lib/nftStorage'

type Token = {
  ipnft: string
  url: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ token?: Token }>
) {
  try {
    // await connectMongo()

    if (req.method === 'POST') {
      // Process a POST request
      const { comp, metadata } = req.body
      if (!comp || !metadata) throw new Error('invalid comp or metadata')

      const dataURI = await convertSvg(comp)
      const token = await uploadImage(dataURI, metadata)

      res.status(200).json({
        token: {
          ipnft: token.ipnft,
          url: token.url,
        },
      })
    }

    res.status(200).json({})
  } catch (error) {
    res.status(500).send({})
  }
}
