import _ from 'lodash'
import { useState } from 'react'
import { useAppDispatch, useAppSelector } from 'store'
import { Stack, Group, SegmentedControl, ColorSwatch, Button, useMantineTheme } from '@mantine/core'
import { StyledBox } from './common'
import { setColor } from 'store/slices/editor'
import classes from './style.module.css'

export default function Style() {
  const dispatch = useAppDispatch()
  const theme = useMantineTheme()

  const { textColor, bgColor } = useAppSelector((state) => state.editor)
  const [value, setValue] = useState('text')

  return (
    <StyledBox>
      <SegmentedControl
        classNames={classes}
        size="md"
        value={value}
        onChange={setValue}
        data={[
          { label: 'Text', value: 'text' },
          { label: 'Background', value: 'bg' },
        ]}
        mt={8}
        styles={{
          root: {
            width: '100%',
            border: `2px solid ${theme.colors.dark[9]}`,
            borderRadius: 16,
          },
          indicator: {
            background: theme.colors.dark[9],
            borderRadius: 12,
          },
          label: {
            color: 'inherit !important',
          },
        }}
      />

      <Stack gap={8} py={24}>
        {_.map(theme.colors, (v, key) => {
          const colors = [...v]
          if (key === 'dark') {
            colors[9] = '#000'
          }
          if (key === 'gray') {
            colors[0] = '#fff'
          }
          return (
            <Group key={key} gap={8} mx="auto">
              {_.map(colors, (c) => (
                <ColorSwatch
                  className="c-pointer"
                  key={c}
                  color={c}
                  size={22}
                  onClick={() => dispatch(setColor({ k: value, c }))}
                  radius={8}
                  styles={{
                    shadowOverlay: {
                      boxShadow:
                        c === textColor || c === bgColor
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
            dispatch(setColor({ k: 'text', c: '#000' }))
            dispatch(setColor({ k: 'bg', c: '#fff' }))
          }}
        >
          Reset
        </Button>
      </Group>
    </StyledBox>
  )
}
