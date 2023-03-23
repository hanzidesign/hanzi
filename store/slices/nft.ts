import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { NftQueue } from 'types'

export type QueueState = {
  list: { [at: string]: NftQueue }
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
export const {} = slice.actions
export default slice.reducer
