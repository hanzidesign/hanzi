import { Box, createPolymorphicComponent } from '@mantine/core'
import styled from '@emotion/styled'
import type { BoxProps } from '@mantine/core'

const _StyledBox = styled(Box)`
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.gray[0]};
`

const StyledBox = createPolymorphicComponent<'div', BoxProps>(_StyledBox)

export { StyledBox }
