'use client'

import { Alert, Stack, Text } from '@mantine/core'
import type { ShaderPreset } from '@/shaders/types'

type ShaderErrorOverlayProps = {
  error: string | null
  preset: ShaderPreset
}

export default function ShaderErrorOverlay({ error, preset }: ShaderErrorOverlayProps) {
  if (!error) {
    return null
  }

  return (
    <Alert
      color="red"
      radius={8}
      variant="filled"
      style={{
        position: 'absolute',
        inset: 16,
        zIndex: 2,
      }}
    >
      <Stack gap={4}>
        <Text fw={700}>Shader preview error</Text>
        <Text size="sm">{preset.name}</Text>
        <Text size="xs">{preset.shaderPath}</Text>
        <Text size="xs">{error}</Text>
      </Stack>
    </Alert>
  )
}
