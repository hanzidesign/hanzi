'use client'

import { useAppSelector } from '@/store'
import { useAppContext } from '@/hooks/useAppContext'
import { useEffect } from 'react'
import { svgToPng } from '@/lib/svgToPng'

export default function useDalle() {
  const { accordion, ch, ptnUrl, distortion, blur, width, x, y, rotation, textColor, bgColor } = useAppSelector(
    (state) => state.editor
  )
  const isDalle = Number(accordion) >= 3
  const {
    state: { showDelle },
    updateState,
  } = useAppContext()

  useEffect(() => {
    // show
    if (isDalle && !showDelle) {
      svgToPng()
        .then((data) => {
          updateState({ dalleImages: [data], activeImg: 1, showDelle: true })
        })
        .catch((err) => console.error(err))
    }
  }, [isDalle, showDelle])

  useEffect(() => {
    // hide
    updateState({ dalleImages: [], showDelle: false })
  }, [ch, ptnUrl, distortion, blur, width, x, y, rotation, textColor, bgColor])
}
