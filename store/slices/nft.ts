import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { NftTx } from 'types'

export type QueueState = {
  account?: string
  list: { [at: string]: NftTx }
}

const initialState: QueueState = {
  list: {},
}

export const slice = createSlice({
  name: 'nft',
  initialState,
  reducers: {
    setAccount(state, action) {
      state.account = action.payload
    },
    addNft(state, action: PayloadAction<{ ipfsUrl: string; hash: string }>) {
      const { ipfsUrl, hash } = action.payload
      const createdAt = Date.now()
      const key = `${createdAt}`
      const tx: NftTx = { createdAt, ipfsUrl, hash }
      state.list = { ...state.list, [key]: tx }
      console.log({ tx })
    },
  },
})

export const { setAccount, addNft } = slice.actions
export default slice.reducer
