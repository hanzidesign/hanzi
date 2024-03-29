'use client'

import { useAppDispatch, useAppSelector } from '@/store'
import { Stack, Box, PasswordInput, Anchor } from '@mantine/core'
import { setApiKey } from '@/store/slices/editor'
import { StyledBox, StyledText } from '@/components/ToolStack/common'

export default function Wrapper({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const { apiKey } = useAppSelector((state) => state.editor)

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

        {children}
      </Stack>
    </StyledBox>
  )
}

export function getErrorMessage(err: any) {
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
