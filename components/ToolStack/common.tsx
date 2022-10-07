import { Box, Text, createPolymorphicComponent } from '@mantine/core'
import styled from '@emotion/styled'
import type { BoxProps, TextProps } from '@mantine/core'

const _StyledBox = styled(Box)`
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.gray[0]};
`

const StyledBox = createPolymorphicComponent<'div', BoxProps>(_StyledBox)

const _StyledText = styled(Text)`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.gray[9]};
`

const StyledText = createPolymorphicComponent<'p', TextProps>(_StyledText)

export { StyledBox, StyledText }
