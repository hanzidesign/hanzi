// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import connectMongo from 'utils/connectMongo'
import { convertSvg } from 'lib/convertSvg'
import { uploadImage } from 'lib/nftStorage'
import type { Token } from 'types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ token?: Token }>
) {
  try {
    // await connectMongo()

    if (req.method === 'POST') {
      // Process a POST request
      const { svg, metadata } = req.body
      if (!svg || !metadata) throw new Error('invalid svg or metadata')

      const dataURI = await convertSvg(svg)
      const token = await uploadImage(dataURI, metadata)

      res.status(200).json({
        token: {
          ipnft: token.ipnft,
          url: token.url,
        },
      })
      return
    }

    res.status(200).json({})
  } catch (error) {
    console.error(error)
    res.status(500).send({})
  }
}
