import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { NFT } from 'types'

export type QueueState = {
  list: { [at: string]: NFT }
}

const initialState: QueueState = {
  list: {},
}

export const slice = createSlice({
  name: 'nft',
  initialState,
  reducers: {
    addNft(state, action) {
      const createdAt = Date.now()
    },
  },
})

export default slice.reducer
