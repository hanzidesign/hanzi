import _ from 'lodash'
import { useAppDispatch, useAppSelector } from 'store'
import { Stack, ColorPicker } from '@mantine/core'
import { StyledBox, StyledText } from './common'
import { setColor } from 'store/slices/editor'

export default function Style() {
  const dispatch = useAppDispatch()
  const { textColor, bgColor } = useAppSelector((state) => state.editor)

  return (
    <StyledBox>
      <Stack align="center" spacing="xl">
        <div>
          <StyledText mb={4}>Text</StyledText>
          <ColorPicker
            format="rgba"
            value={textColor}
            onChange={(c) => dispatch(setColor({ k: 'text', c }))}
          />
        </div>
        <div>
          <StyledText mb={4}>Background</StyledText>
          <ColorPicker
            format="rgba"
            value={bgColor}
            onChange={(c) => dispatch(setColor({ k: 'bg', c }))}
          />
        </div>
        <div />
      </Stack>
    </StyledBox>
  )
}
