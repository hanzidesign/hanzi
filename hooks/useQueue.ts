import _ from 'lodash'
import { useEffect } from 'react'
import d3ToPng from 'd3-svg-to-png'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useAppSelector, useAppDispatch } from 'store'
import { setStart, setIpfsUrl } from 'store/slices/queue'
import { uploadImage } from 'lib/nftStorage'
import { setAttributes, setMetadata } from 'lib/metadata'
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
    try {
      if (account) {
        const ipfsUrl = await upload(job, account)
        dispatch(setIpfsUrl({ uid: job.uid, ipfsUrl }))
      }
    } catch (error) {
      console.error(error)
      // TODO: redo
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
        dispatch(setStart(firstJob.uid))
        handleUpdate(firstJob)
      }
    }
  }, [account, jobs.length])

  return firstJob
}

async function upload(job: Job, account: string) {
  const { country, year, ch } = job
  // metadata
  const name = `${country}-${year}-${ch}`
  const attributes = setAttributes({ country, year, ch })
  const metadata = setMetadata(name, account, attributes)
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
