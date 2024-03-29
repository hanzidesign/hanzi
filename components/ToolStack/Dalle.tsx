'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { useAppContext } from '@/hooks/useAppContext'
import { Stack, Box, PasswordInput, Anchor, Pagination, ActionIcon, Button, Textarea, Divider } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { setApiKey } from '@/store/slices/editor'
import { StyledBox, StyledText } from './common'
import { createVariation, createPrompt, createImage } from '@/lib/dalle'
import { BsStars } from 'react-icons/bs'
import classes from './index.module.css'

// TODO: split this component into smaller components

export default function Dalle() {
  const dispatch = useAppDispatch()
  const {
    state: { dalleImages, activeImg, dalleBg, activeBg },
    getActiveImg,
    updateState,
  } = useAppContext()

  const { apiKey, ch } = useAppSelector((state) => state.editor)
  const [loading, setLoading] = useState(false)
  const [bgLoading, setBgLoading] = useState(false)
  const [bgTextLoading, setBgTextLoading] = useState(false)
  const [bgText, setBgText] = useState('')
  const img = getActiveImg()

  const handleBgText = async () => {
    setBgTextLoading(true)

    const { completion, error } = await createPrompt(apiKey, ch)
    setBgText(completion)

    setBgTextLoading(false)

    if (error) {
      console.error(error)
      notifications.show({
        title: 'OpenAI API Key Error',
        message: getErrorMessage(error),
        color: 'red',
      })
    }
  }

  const handleBg = async () => {
    setBgLoading(true)

    try {
      if (bgText && apiKey) {
        const data = await createImage(apiKey, bgText)
        if (data.length) {
          const images = data.map((d) => `data:image/png;base64,${d}`)
          const newData = [...dalleBg, ...images]
          updateState({ dalleBg: newData, activeBg: newData.length - 1 })
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

    setBgLoading(false)
  }

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

        <Divider />

        {/* Background */}
        <Stack>
          <Box>
            <Box pos="relative">
              <StyledText mb={8}>Prompts for background image</StyledText>
              <ActionIcon
                onClick={handleBgText}
                loading={bgTextLoading}
                size="sm"
                variant="default"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                }}
              >
                <BsStars size={12} />
              </ActionIcon>
            </Box>
            <Textarea
              placeholder="Input your idea"
              value={bgText}
              onChange={(event) => setBgText(event.currentTarget.value)}
            />
          </Box>

          <Button onClick={handleBg} disabled={!apiKey || !bgText} loading={bgLoading} w="100%">
            Create Background
          </Button>

          <Pagination
            className={classes.pagination}
            size="sm"
            total={dalleBg.length}
            value={activeBg}
            onChange={(activeBg) => updateState({ activeBg })}
          />
        </Stack>

        <Divider />

        {/* Variation */}
        <Stack>
          <StyledText>Variations for the current image</StyledText>
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
      </Stack>
    </StyledBox>
  )
}

function getErrorMessage(err: any) {
  switch (err.status) {
    case 429: {
      return (
        <span>
          Exceeded your current quota. <br />
          Please go to upgrade your plan.
        </span>
      )
    }
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
