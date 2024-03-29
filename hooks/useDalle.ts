'use client'

import { useAppSelector } from '@/store'
import { useAppContext } from '@/hooks/useAppContext'
import { useEffect, useState } from 'react'
import { svgToPng } from '@/lib/svgToPng'

export default function useDalle() {
  const { accordion, ch, ptnUrl, ptnData, distortion, blur, width, x, y, rotation, textColor, bgColor } =
    useAppSelector((state) => state.editor)
  const isDalle = Number(accordion) >= 4
  const {
    state: { showDelle, dalleImages },
    updateState,
  } = useAppContext()

  useEffect(() => {
    // show
    if (isDalle && !showDelle && ptnData) {
      svgToPng()
        .then((data) => {
          const [, ...rest] = dalleImages
          updateState({ dalleImages: [data, ...rest], activeImg: 1, showDelle: true })
        })
        .catch((err) => console.error(err))
    }
  }, [isDalle, showDelle, ptnData])

  useEffect(() => {
    // hide
    updateState({ showDelle: false })
  }, [ch, ptnUrl, ptnData, distortion, blur, width, x, y, rotation, textColor, bgColor])

  useEffect(() => {
    updateState({ activeBg: 1 })
  }, [bgColor])

  useEffect(() => {
    // background
    if (Number(accordion) === 3) {
      updateState({ showDelle: false })
    }
  }, [accordion])

  useEffect(() => {
    // reset
    updateState({ dalleImages: [], dalleBg: [''] })
  }, [ch])
}
