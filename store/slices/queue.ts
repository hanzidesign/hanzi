import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { NftData } from 'types'

export type QueueState = {
  list: { [at: string]: NftData }
}

const initialState: QueueState = {
  list: {},
}

export const slice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    addJob(state, action) {
      const createdAt = Date.now()
    },
  },
})

export default slice.reducer
