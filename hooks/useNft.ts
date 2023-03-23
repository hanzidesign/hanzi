import _ from 'lodash'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from 'store'
import { setSaved } from 'store/slices/queue'
import { setNft, setImage } from 'store/slices/nft'
import { getIpfsUrl } from 'utils/helper'
import type { MetadataJson } from 'types'

export default function useNft() {
  const dispatch = useAppDispatch()
  const { list: queue } = useAppSelector((state) => state.queue)
  const { list: nft } = useAppSelector((state) => state.nft)
  const [downloads, setDownloads] = useState<{ [at: string]: boolean }>({})

  const handleMetadata = async (at: string, url: string) => {
    setDownloads((state) => ({ ...state, [at]: true }))
    try {
      const { image } = await getMetadata(url)
      if (!image) throw new Error(`no image in ${url}`)
      dispatch(setImage({ at, image }))
    } catch (error) {
      console.error(error)
      setDownloads((state) => ({ ...state, [at]: false }))
    }
  }

  // fetch image url from metadata
  useEffect(() => {
    const list = _.filter(nft, (n) => {
      if (!n) return false
      const d = downloads[n.createdAt]
      return !d && !Boolean(n.image)
    })
    list.map((n) => {
      if (n) {
        handleMetadata(`${n.createdAt}`, n.ipfsUrl)
      }
    })
  }, [nft])

  // save ipfsUrl into nft
  useEffect(() => {
    const unsaved = _.compact(_.map(queue, (n) => n)).filter((n) => n.ipfsUrl && !n.saved)
    unsaved.forEach((n) => {
      const { ipfsUrl, uid, createdAt } = n
      if (ipfsUrl) {
        const at = `${createdAt}`
        dispatch(setSaved(uid))
        dispatch(setNft({ at, ipfsUrl }))
      }
    })
  }, [queue])
}

async function getMetadata(url: string) {
  const u = getIpfsUrl(url)
  const { data } = await axios.get<MetadataJson>(u)
  return data
}
