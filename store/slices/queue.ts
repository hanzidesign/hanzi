import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { NftData, Job } from 'types'

export type QueueState = {
  list: { [uid: string]: Job | undefined }
}

const initialState: QueueState = {
  list: {},
}

export const slice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    addJob(state, action: PayloadAction<NftData>) {
      const createdAt = Date.now()
      const uid = `${createdAt}`
      const job: Job = { ...action.payload, uid, createdAt }
      state.list = { ...state.list, [uid]: job }
    },
    setStart(state, action: PayloadAction<string>) {
      const uid = action.payload
      const job = state.list[uid]
      if (job) {
        job.startAt = Date.now()
        state.list = { ...state.list, [uid]: job }
      }
    },
  },
})

export const { addJob, setStart } = slice.actions
export default slice.reducer
