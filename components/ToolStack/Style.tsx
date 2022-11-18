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
            format="rgb"
            value={textColor}
            onChange={(c) => dispatch(setColor({ k: 'text', c }))}
            swatches={[
              '#ff6f69',
              '#ffb3ba',
              '#ffdfba',
              '#ffcc5c',
              '#ffe28a',
              '#ffffba',
              '#baffc9',
              '#bae1ff',
              '#6fcb9f',
              '#88d8b0',
              '#fa5252',
              '#e64980',
              '#be4bdb',
              '#7950f2',
              '#4c6ef5',
              '#228be6',
              '#15aabf',
              '#12b886',
              '#40c057',
              '#82c91e',
            ]}
          />
        </div>
        <div>
          <StyledText mb={4}>Background</StyledText>
          <ColorPicker
            format="rgb"
            value={bgColor}
            onChange={(c) => dispatch(setColor({ k: 'bg', c }))}
            swatches={[
              '#999999',
              '#777777',
              '#555555',
              '#333333',
              '#111111',
              '#011f4b',
              '#03396c',
              '#005b96',
              '#6497b1',
              '#b3cde0',
              '#b2d8d8',
              '#66b2b2',
              '#008080',
              '#006666',
              '#004c4c',
              '#562424',
              '#6d3636',
              '#924444',
              '#a94c4c',
              '#c17171',
            ]}
          />
        </div>
        <div />
      </Stack>
    </StyledBox>
  )
}
