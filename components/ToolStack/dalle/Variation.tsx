'use client'

import { useState } from 'react'
import { useAppSelector } from '@/store'
import { useAppContext } from '@/hooks/useAppContext'
import { Stack, Pagination, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import Wrapper, { getErrorMessage } from './Wrapper'
import { createVariation } from '@/lib/dalle'
import classes from '../index.module.css'

export default function Variation() {
  const {
    state: { dalleImages, activeImg },
    getActiveImg,
    updateState,
  } = useAppContext()

  const { apiKey } = useAppSelector((state) => state.editor)
  const [loading, setLoading] = useState(false)
  const img = getActiveImg()

  const handleCreate = async () => {
    setLoading(true)
    try {
      if (img && apiKey) {
        const data = await createVariation(apiKey, img)
        if (data.length) {
          const images = data.map((d) => `data:image/png;base64,${d}`)
          const newData = [...dalleImages, ...images]
          updateState({ dalleImages: newData, activeImg: newData.length - 1 })
        }
      }
    } catch (err: any) {
      console.error(err)

      notifications.show({
        title: 'OpenAI API Key Error',
        message: getErrorMessage(err),
        color: 'red',
      })
    }
    setLoading(false)
  }

  return (
    <Wrapper>
      {/* Variation */}
      <Stack>
        <Button disabled={!apiKey || !img} onClick={handleCreate} loading={loading}>
          {Boolean(img) ? 'Create Variation' : 'Loading...'}
        </Button>
        <Pagination
          className={classes.pagination}
          size="sm"
          total={dalleImages.length}
          value={activeImg}
          onChange={(activeImg) => updateState({ activeImg })}
        />
      </Stack>
    </Wrapper>
  )
}
