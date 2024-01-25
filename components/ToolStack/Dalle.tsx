'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { useAppContext } from '@/hooks/useAppContext'
import { Stack, Box, PasswordInput, Anchor, Pagination, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { setApiKey } from '@/store/slices/editor'
import { StyledBox, StyledText } from './common'
import { createVariation } from '@/lib/dalle'
import classes from './index.module.css'

export default function Dalle() {
  const dispatch = useAppDispatch()
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
    <StyledBox>
      <Stack gap="xl" mb={24}>
        <Box pos="relative">
          <StyledText mb={8}>API Key</StyledText>
          <PasswordInput
            description="Only store in your device"
            value={apiKey}
            placeholder="Paste your OpenAI api key"
            onChange={(e) => dispatch(setApiKey(e.currentTarget.value))}
          />
          <Anchor
            fz={12}
            href="https://platform.openai.com/api-keys"
            target="_blank"
            underline="always"
            style={{
              position: 'absolute',
              top: 2,
              right: 0,
            }}
          >
            Go to OpenAI
          </Anchor>
        </Box>

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
    </StyledBox>
  )
}

function getErrorMessage(err: any) {
  switch (err.status) {
    case 400: {
      return (
        <span>
          Billing hard limit has been reached. <br />
          Please go to upgrade your plan.
        </span>
      )
    }
    default: {
      return (
        <span>
          The API key is invalid. <br />
          Check your API key and try again.
        </span>
      )
    }
  }
}
