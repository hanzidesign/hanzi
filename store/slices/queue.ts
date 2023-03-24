import _ from 'lodash'
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
        const cloned = _.clone(state.list)
        cloned[uid] = { ...job, startAt: Date.now() }
        state.list = cloned
      }
    },
    setIpfsUrl(state, action: PayloadAction<{ uid: string; ipfsUrl: string }>) {
      const { uid, ipfsUrl } = action.payload
      const job = state.list[uid]
      if (job) {
        const cloned = _.clone(state.list)
        cloned[uid] = { ...job, ipfsUrl }
        state.list = cloned
      }
    },
    setCancel(state, action: PayloadAction<string>) {
      const uid = action.payload
      const job = state.list[uid]
      if (job) {
        const { [uid]: i, ...rest } = state.list
        state.list = { ...rest }
      }
    },
    setSaved(state, action: PayloadAction<string>) {
      const uid = action.payload
      const job = state.list[uid]
      if (job) {
        const cloned = _.clone(state.list)
        cloned[uid] = { ...job, saved: true }
        state.list = cloned
      }
    },
    setFailed(state, action: PayloadAction<{ uid: string; failed: boolean }>) {
      const { uid, failed } = action.payload
      const job = state.list[uid]
      if (job) {
        const cloned = _.clone(state.list)
        cloned[uid] = { ...job, failed }
        state.list = cloned
      }
    },
  },
})

export const { addJob, setStart, setIpfsUrl, setCancel, setSaved } = slice.actions
export default slice.reducer
