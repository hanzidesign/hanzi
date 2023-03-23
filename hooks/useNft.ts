import _ from 'lodash'
import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from 'store'
import { setSaved } from 'store/slices/queue'
import { addNft } from 'store/slices/nft'

export default function useNft() {
  const dispatch = useAppDispatch()
  const { list: queue } = useAppSelector((state) => state.queue)

  useEffect(() => {
    const unsaved = _.compact(_.map(queue, (n) => n)).filter((n) => n.hash && !n.saved)

    unsaved.forEach((n) => {
      const { hash, ipfsUrl, uid } = n
      if (hash && ipfsUrl) {
        dispatch(setSaved(uid))
        dispatch(addNft({ hash, ipfsUrl }))
      }
    })
  }, [queue])
}
