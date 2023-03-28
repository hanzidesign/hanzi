import _ from 'lodash'
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { NftTx } from 'types'

export type NftState = {
  account?: string
  chainId?: number
  etherscan: string
  list: { [at: string]: NftTx | undefined }
}

const initialState: NftState = {
  list: {},
  etherscan: 'https://optimistic.etherscan.io',
}

export const slice = createSlice({
  name: 'nft',
  initialState,
  reducers: {
    setAccount(state, action) {
      state.account = action.payload
    },
    setNft(state, action: PayloadAction<{ at: string; ipfsUrl: string; hash?: string }>) {
      const { at, ipfsUrl, hash } = action.payload
      const nft = state.list[at]
      if (nft) {
        const cloned = _.clone(state.list)
        const createdAt = Number(at)
        cloned[at] = { ...nft, createdAt, ipfsUrl, hash }
        state.list = cloned
      }
    },
    setImage(state, action: PayloadAction<{ at: string; image: string }>) {
      const { at, image } = action.payload
      const nft = state.list[at]
      if (nft) {
        const cloned = _.clone(state.list)
        cloned[at] = { ...nft, image }
        state.list = cloned
      }
    },
    setChainId(state, action: PayloadAction<{ etherscan: string; chainId?: number }>) {
      const { etherscan, chainId } = action.payload
      state.chainId = chainId
      state.etherscan = etherscan
    },
    delNft(state, action: PayloadAction<string>) {
      const at = action.payload
      const nft = state.list[at]
      if (nft) {
        const { [at]: i, ...rest } = state.list
        state.list = { ...rest }
      }
    },
  },
})

export const { setAccount, setNft, setImage, setChainId, delNft } = slice.actions
export default slice.reducer
