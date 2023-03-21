import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { NftData, Queue } from 'types'

type NftJob = NftData & Queue

export type QueueState = {
  currentId?: string
  jobs: { [at: string]: NftJob }
}

const initialState: QueueState = {
  jobs: {},
}

export const slice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    addJob(state, action: PayloadAction<NftData>) {
      const createdAt = Date.now()
      const job: NftJob = {
        ...action.payload,
        createdAt,
        uploaded: false,
        minted: false,
      }
      state.jobs[createdAt] = job
    },
  },
})

export default slice.reducer
