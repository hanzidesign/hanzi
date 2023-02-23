// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import connectMongo from 'utils/connectMongo'
import type { Token } from 'types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ token?: Token }>
) {
  try {
    // await connectMongo()

    if (req.method === 'POST') {
    }

    res.status(200).json({})
  } catch (error) {
    console.error(error)
    res.status(500).send({})
  }
}
