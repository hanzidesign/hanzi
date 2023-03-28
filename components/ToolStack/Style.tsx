import _ from 'lodash'
import { useState } from 'react'
import { useAppDispatch, useAppSelector } from 'store'
import { Stack, SegmentedControl } from '@mantine/core'
import { StyledBox } from './common'
import { setColor } from 'store/slices/editor'

export default function Style() {
  const dispatch = useAppDispatch()

  const { textColor, bgColor } = useAppSelector((state) => state.editor)
  const [value, setValue] = useState('color')

  return (
    <StyledBox>
      <Stack align="center" spacing="xl">
        <SegmentedControl
          size="md"
          value={value}
          onChange={setValue}
          data={[
            { label: 'Text', value: 'color' },
            { label: 'Background', value: 'bgcolor' },
          ]}
          styles={(theme) => ({
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
            controlActive: {
              color: theme.white,
            },
          })}
        />
      </Stack>
    </StyledBox>
  )
}
