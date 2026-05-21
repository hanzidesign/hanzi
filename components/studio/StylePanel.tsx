'use client'

import _ from 'lodash'
import { useState } from 'react'
import { Button, ColorSwatch, Group, SegmentedControl, Stack, useMantineTheme } from '@mantine/core'
import { useStudio } from '@/app/studio/studio-context'
import { PanelBox } from '@/components/studio/PanelPrimitives'
import type { ColorTarget } from '@/app/studio/studio-context'

export default function StylePanel() {
  const {
    state: { textColor, bgColor },
    setColor,
  } = useStudio()
  const theme = useMantineTheme()
  const [value, setValue] = useState<ColorTarget>('text')

  return (
    <PanelBox>
      <SegmentedControl
        size="md"
        color="dark.9"
        fullWidth
        value={value}
        onChange={(nextValue) => setValue(nextValue as ColorTarget)}
        data={[
          { label: 'Text', value: 'text' },
          { label: 'Canvas', value: 'bg' },
        ]}
        mt={8}
        styles={{
          root: {
            border: `2px solid ${theme.colors.dark[9]}`,
            borderRadius: 16,
          },
          indicator: {
            borderRadius: 12,
          },
        }}
      />

      <Stack gap={8} py={24}>
        {_.map(theme.colors, (palette, key) => {
          const colors = [...palette]
          if (key === 'dark') {
            colors[9] = '#000'
          }
          if (key === 'gray') {
            colors[0] = '#fff'
          }
          return (
            <Group key={key} gap={8} mx="auto">
              {_.map(colors, (color) => (
                <ColorSwatch
                  className="c-pointer"
                  key={color}
                  color={color}
                  size={22}
                  onClick={() => setColor(value, color)}
                  radius={8}
                  styles={{
                    shadowOverlay: {
                      boxShadow:
                        color === textColor || color === bgColor
                          ? 'rgb(0 0 0 / 10%) 0 0 0 0.0625rem inset, rgb(0 0 0 / 15%) 0 0 0.25rem inset'
                          : 'rgb(0 0 0 / 5%) 0 0 0 0.0625rem inset, rgb(0 0 0 / 10%) 0 0 0.25rem inset',
                    },
                  }}
                />
              ))}
            </Group>
          )
        })}
      </Stack>

      <Group align="right" pb={24} px={12}>
        <Button
          size="xs"
          onClick={() => {
            setColor('text', '#000')
            setColor('bg', '#fff')
          }}
        >
          Reset
        </Button>
      </Group>
    </PanelBox>
  )
}
