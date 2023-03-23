import { useEffect } from 'react'
import { watchAccount } from '@wagmi/core'
import { useAppDispatch } from 'store'
import { setAccount } from 'store/slices/nft'

export default function useAccount() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // watch
    const unwatch = watchAccount(({ address }) => {
      dispatch(setAccount(address))
      if (address) {
        console.log(`Connect with ${address}`)
      }
    })
    return unwatch
  }, [])
}
