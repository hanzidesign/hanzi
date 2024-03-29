'use client'

import { useState } from 'react'
import { useAppSelector } from '@/store'
import { useAppContext } from '@/hooks/useAppContext'
import { Stack, Box, Pagination, ActionIcon, Button, Textarea } from '@mantine/core'
import Wrapper, { getErrorMessage } from './Wrapper'
import { StyledText } from '@/components/ToolStack/common'
import { notifications } from '@mantine/notifications'
import { createPrompt, createImage } from '@/lib/dalle'
import { BsStars } from 'react-icons/bs'
import classes from '../index.module.css'

export default function BgImage() {
  const {
    state: { dalleBg, activeBg },
    updateState,
  } = useAppContext()

  const { apiKey, ch, bgColor } = useAppSelector((state) => state.editor)
  const [bgLoading, setBgLoading] = useState(false)
  const [bgTextLoading, setBgTextLoading] = useState(false)
  const [bgText, setBgText] = useState('')

  const handleBgText = async () => {
    setBgTextLoading(true)

    const { completion, error } = await createPrompt(apiKey, ch, bgColor)
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
          updateState({ dalleBg: newData, activeBg: newData.length })
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

  return (
    <Wrapper>
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
    </Wrapper>
  )
}
