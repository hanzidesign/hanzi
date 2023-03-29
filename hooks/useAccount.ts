import { useEffect } from 'react'
import { watchAccount, getAccount, switchNetwork } from '@wagmi/core'
import { goerli } from 'wagmi/chains'
import { useAppDispatch } from 'store'
import { setAccount } from 'store/slices/nft'

export default function useAccount() {
  const dispatch = useAppDispatch()

  const handleSwitch = async () => {
    try {
      await switchNetwork({ chainId: goerli.id })
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    const { address } = getAccount()
    dispatch(setAccount(address))

    // watch
    const unwatch = watchAccount(({ address }) => {
      dispatch(setAccount(address))
      if (address) {
        console.log(`Connect with ${address}`)
        handleSwitch()
      }
    })
    return unwatch
  }, [])
}
