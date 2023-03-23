import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { NftData, Metadata, Job } from 'types'

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
    addJob(state, action: PayloadAction<NftData & Metadata>) {
      const createdAt = Date.now()
      const uid = `${createdAt}`
      const job: Job = { ...action.payload, uid, createdAt }
      state.list = { ...state.list, [uid]: job }
    },
    setStart(state, action: PayloadAction<string>) {
      const uid = action.payload
      const job = state.list[uid]
      if (job) {
        state.list = { ...state.list, [uid]: { ...job, startAt: Date.now() } }
      }
    },
    setIpfsUrl(state, action: PayloadAction<{ uid: string; ipfsUrl: string }>) {
      const { uid, ipfsUrl } = action.payload
      const job = state.list[uid]
      if (job) {
        state.list = { ...state.list, [uid]: { ...job, ipfsUrl } }
      }
    },
    setHash(state, action: PayloadAction<{ uid: string; hash: string }>) {
      const { uid, hash } = action.payload
      const job = state.list[uid]
      if (job) {
        state.list = { ...state.list, [uid]: { ...job, hash } }
      }
    },
    setCancel(state, action: PayloadAction<string>) {
      const uid = action.payload
      const job = state.list[uid]
      if (job && !job.startAt) {
        const { [uid]: i, ...rest } = state.list
        state.list = { ...rest }
      }
    },
    setSaved(state, action: PayloadAction<string>) {
      const uid = action.payload
      const job = state.list[uid]
      if (job) {
        state.list = { ...state.list, [uid]: { ...job, saved: true } }
      }
    },
  },
})

export const { addJob, setStart, setIpfsUrl, setHash, setCancel, setSaved } = slice.actions
export default slice.reducer
