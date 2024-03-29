'use client'

import { useAccountEffect } from 'wagmi'
import { useAppDispatch } from '@/store'
import { setAccount } from '@/store/slices/nft'

export default function useAccount() {
  const dispatch = useAppDispatch()

  useAccountEffect({
    onConnect({ address }) {
      dispatch(setAccount(address))
    },
    onDisconnect() {
      dispatch(setAccount(''))
    },
  })
}
