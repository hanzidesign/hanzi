import _ from 'lodash'
import { useEffect } from 'react'
import d3ToPng from 'd3-svg-to-png'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useAppSelector, useAppDispatch } from 'store'
import { setStart, setIpfsUrl, setFailed } from 'store/slices/queue'
import { uploadImage } from 'lib/nftStorage'
import { setAttributes, setMetadata } from 'lib/metadata'
import { getName } from 'utils/helper'
import { Constants } from 'types'
import type { Job } from 'types'

export default function useQueue() {
  const dispatch = useAppDispatch()
  const { openConnectModal } = useConnectModal()

  const { list } = useAppSelector((state) => state.queue)
  const account = useAppSelector((state) => state.nft.account)

  const jobs = _.orderBy(_.compact(_.map(list, (v) => v)), ['createdAt'], ['asc'])
  const [firstJob] = jobs.filter((el) => !el.ipfsUrl)

  const handleUpdate = async (job: Job) => {
    const { uid, failed } = job
    try {
      if (account) {
        const ipfsUrl = await upload(job, account)
        if (!ipfsUrl) throw new Error('no metadata url')

        dispatch(setIpfsUrl({ uid, ipfsUrl }))
      }
    } catch (error) {
      console.error(error)
      setFailed({ uid, failed: true })
    }
  }

  useEffect(() => {
    if (firstJob && !firstJob.startAt) {
      if (!account) {
        if (openConnectModal) {
          openConnectModal()
        }
      } else {
        // upload
        dispatch(setStart({ uid: firstJob.uid, startAt: Date.now() }))
        handleUpdate(firstJob)
      }
    }
  }, [account, firstJob])

  return firstJob
}

async function upload(job: Job, mintBy: string) {
  const { country, year, ch, name: n, description: d } = job
  // metadata
  const name = n || getName(year, country, ch)
  const description = d || `Created by ${mintBy}`
  const attributes = setAttributes({ country, year, ch, mintBy })
  const metadata = setMetadata(name, description, attributes)
  console.log(metadata)

  const dataURI = await d3ToPng(`#${Constants.svgId}`, name, {
    scale: 1,
    format: 'webp',
    download: false,
  })

  // ipfs
  const token = await uploadImage(dataURI, metadata)
  console.log({ ...token })

  if (!token?.url) throw new Error('invalid token url')
  const tokenURI = token.url.replace('ipfs://', '')
  return tokenURI
}
